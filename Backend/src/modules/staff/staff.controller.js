import { prisma, logger } from '../../server.js';
import { createStaffSchema, updateStaffSchema } from './staff.schema.js';
import { redis } from '../../lib/cache.js';
import { sendDynamicMail } from '../../services/email/email.service.js';
import { deleteTeacherProfile } from '../users/deleteUserRecords.js';

/**
 * Invalidates the Redis staff list cache for a given college.
 * Fails open if Redis is down.
 */
async function invalidateStaffCache(collegeId) {
  if (redis && redis.status === 'ready') {
    await redis.del(`staff:list:${collegeId}`).catch(() => {});
  }
}

export const getStaff = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;

  const staff = await prisma.teacher.findMany({
    where: { collegeId, deletedAt: null },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          customRoleId: true,
          customRole: { select: { id: true, name: true } },
          accountStatus: true,
        }
      },
      department: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  const formattedStaff = staff.map(t => {
    const name = t.user?.name || (() => {
      const emailPrefix = t.user?.email ? t.user.email.split('@')[0] : 'Staff';
      const parts = emailPrefix.split('.');
      return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    })();
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || 'Staff';
    const lastName = nameParts.slice(1).join(' ') || '';

    return {
      id: t.id,
      teacherId: t.teacherId || null,
      name,
      firstName,
      lastName,
      email: t.emailId || t.user?.email || '',
      phone: t.mobileNumber || '',
      department: t.department?.name || 'General',
      departmentId: t.departmentId,
      designation: t.designation,
      joiningDate: t.joiningDate,
      salaryGrade: t.salaryGrade || 'Grade A',
      userId: t.userId,
      role: t.user?.role || 'teacher',
      customRole: t.user?.customRole?.name || null,
      customRoleId: t.user?.customRoleId || null,
      status: t.user?.accountStatus || 'active',
      staffType: ['teacher', 'hod', 'faculty'].includes(t.user?.role) ? 'teaching' : 'non-teaching',
      createdAt: t.createdAt,
    };
  });

  res.json({ success: true, data: formattedStaff });
};

export const createStaff = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const payload = createStaffSchema.parse(req.body);

  if (!collegeId) {
    return res.status(400).json({ success: false, error: { code: 'COLLEGE_REQUIRED', message: 'College ID is required' } });
  }

  // teacherId is mandatory — reject if missing after schema parse
  if (!payload.teacherId || !payload.teacherId.trim()) {
    return res.status(400).json({
      success: false,
      error: { code: 'TEACHER_ID_REQUIRED', message: 'Teacher ID is required.' }
    });
  }

  // Normalize teacherId: trim and uppercase (schema already does this, belt-and-suspenders)
  const teacherId = payload.teacherId.trim();

  // Check teacherId uniqueness within this college before proceeding
  const existing = await prisma.teacher.findFirst({
    where: { teacherId, collegeId, deletedAt: null }
  });
  if (existing) {
    return res.status(409).json({
      success: false,
      error: { code: 'TEACHER_ID_DUPLICATE', message: `Teacher ID '${teacherId}' is already in use.` }
    });
  }

  // Validate customRoleId belongs to this college
  if (payload.customRoleId) {
    const role = await prisma.role.findFirst({
      where: { id: payload.customRoleId, collegeId }
    });
    if (!role) {
      return res.status(400).json({ success: false, error: { message: 'Invalid custom role' } });
    }
  }

  // Ensure department exists
  let deptId = payload.departmentId;
  if (!deptId) {
    let dept = await prisma.department.findFirst({
      where: { collegeId }
    });
    if (!dept) {
      dept = await prisma.department.create({
        data: {
          name: payload.department || 'Academics',
          code: 'ACAD',
          collegeId
        }
      });
    }
    deptId = dept.id;
  }

  // Determine final role for the User record.
  // SECURITY: The backend determines the role — never blindly trust the frontend.
  //   - 'hod' and 'faculty' are valid explicit teacher-tier roles.
  //   - Any other value (including 'staff' sent by mistake) is normalized to 'teacher'
  //     for teaching staff or 'staff' for non-teaching staff.
  //   - An account with a teacherId is always teaching staff.
  const TEACHER_TIER_ROLES = ['teacher', 'hod', 'faculty'];
  let accountRole;
  if (payload.staffType === 'non-teaching') {
    // Non-teaching staff have no teacherId and no teacher dashboard access.
    // Allow 'staff' or any custom role string; default to 'staff'.
    accountRole = 'staff';
  } else {
    // Teaching staff: must be 'teacher', 'hod', or 'faculty'.
    // If frontend sends 'staff' by mistake, normalize to 'teacher'.
    accountRole = TEACHER_TIER_ROLES.includes(payload.role) ? payload.role : 'teacher';
  }

  // Email is optional — the teacher will provide their own during registration.
  // If admin provides an email, use it as the initial user account email.
  // If not, use a unique placeholder that won't clash with real emails.
  const adminProvidedEmail = payload.email && payload.email.trim() ? payload.email.trim().toLowerCase() : null;
  // Placeholder format: teacher+<teacherId>+<collegeId_prefix>@pending.local
  // This placeholder can never be used to log in (no password, pending_setup status).
  const placeholderEmail = adminProvidedEmail || `teacher+${teacherId.toLowerCase()}+${collegeId.slice(0, 8)}@pending.local`;

  const teacher = await prisma.$transaction(async (tx) => {
    const softDeletedById = await tx.teacher.findMany({
      where: { collegeId, teacherId, deletedAt: { not: null } },
      select: { id: true, userId: true },
    });
    const softDeletedByEmail = adminProvidedEmail
      ? await tx.teacher.findMany({
        where: { collegeId, deletedAt: { not: null }, user: { is: { email: adminProvidedEmail } } },
        select: { id: true, userId: true },
      })
      : [];
    const staleTeachers = new Map([...softDeletedById, ...softDeletedByEmail].map((stale) => [stale.id, stale]));
    for (const stale of staleTeachers.values()) {
      await deleteTeacherProfile(tx, stale);
    }

    if (adminProvidedEmail) {
      // Only check for duplicate if admin actually provided an email
      const existingUser = await tx.user.findFirst({
        where: { email: adminProvidedEmail, collegeId }
      });
      if (existingUser) {
        const error = new Error('An account with this email already exists in this college.');
        error.statusCode = 409;
        error.code = 'STAFF_ACCOUNT_EXISTS';
        throw error;
      }
    }

    const user = await tx.user.create({
      data: {
        email: placeholderEmail,
        ...(payload.name ? { name: payload.name } : {}),
        collegeId,
        role: accountRole,
        customRoleId: payload.customRoleId || null,
        passwordHash: null,
        accountStatus: 'pending_setup'
      }
    });

    const newTeacher = await tx.teacher.create({
      data: {
        collegeId,
        userId: user.id,
        departmentId: deptId,
        designation: payload.designation,
        joiningDate: payload.joiningDate ? new Date(payload.joiningDate) : new Date(),
        salaryGrade: payload.salaryGrade || 'Grade A',
        mobileNumber: payload.phone || null,
        // emailId stores the admin-provided email (if any) — updated to teacher's real email after registration
        emailId: adminProvidedEmail || null,
        teacherId,
      },
      include: {
        user: true,
        department: true,
        college: { select: { name: true } },
      }
    });

    return newTeacher;
  }, { maxWait: 15000, timeout: 30000 });

  // Invalidate Redis staff cache for this college
  await invalidateStaffCache(collegeId);

  res.status(201).json({
    success: true,
    data: {
      id: teacher.id,
      teacherId: teacher.teacherId || null,
      name: payload.name,
      email: teacher.emailId || teacher.user?.email || null,
      phone: teacher.mobileNumber || '',
      department: teacher.department?.name,
      designation: teacher.designation,
      joiningDate: teacher.joiningDate,
      role: teacher.user?.role,
    },
  });
};

export const updateStaff = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;
  const payload = updateStaffSchema.parse(req.body);

  // Validate customRoleId belongs to this college
  if (payload.customRoleId) {
    const role = await prisma.role.findFirst({
      where: { id: payload.customRoleId, collegeId }
    });
    if (!role) {
      return res.status(400).json({ success: false, error: { message: 'Invalid custom role' } });
    }
  }

  const teacher = await prisma.teacher.findFirst({
    where: { id, collegeId, deletedAt: null },
    include: { user: true }
  });

  if (!teacher) {
    return res.status(404).json({ success: false, error: { code: 'STAFF_NOT_FOUND', message: 'Staff member not found' } });
  }

  // Normalize and validate teacherId update if provided
  let normalizedTeacherId = undefined;
  if (payload.teacherId !== undefined) {
    normalizedTeacherId = payload.teacherId ? payload.teacherId.trim() : null;
    if (normalizedTeacherId) {
      const duplicate = await prisma.teacher.findFirst({
        where: { teacherId: normalizedTeacherId, collegeId, deletedAt: null, NOT: { id } }
      });
      if (duplicate) {
        return res.status(409).json({
          success: false,
          error: { code: 'TEACHER_ID_DUPLICATE', message: `Teacher ID '${normalizedTeacherId}' is already in use.` }
        });
      }
    }
  }

  const normalizedEmail = payload.email?.trim().toLowerCase();
  if (normalizedEmail && teacher.userId) {
    const duplicateEmail = await prisma.user.findFirst({
      where: { email: normalizedEmail, collegeId, NOT: { id: teacher.userId } },
      select: { id: true },
    });
    if (duplicateEmail) {
      return res.status(409).json({
        success: false,
        error: { code: 'STAFF_EMAIL_ALREADY_EXISTS', message: 'An account with this email already exists in this college.' }
      });
    }
  }

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      if ((payload.name !== undefined || payload.role || payload.customRoleId !== undefined || payload.status || normalizedEmail) && teacher.userId) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: {
            ...(payload.name !== undefined ? { name: payload.name } : {}),
            ...(normalizedEmail ? { email: normalizedEmail } : {}),
            ...(payload.role ? { role: payload.role } : {}),
            ...(payload.customRoleId !== undefined ? { customRoleId: payload.customRoleId } : {}),
            ...(payload.status ? { accountStatus: payload.status } : {})
          }
        });
      }

      const t = await tx.teacher.update({
        where: { id }, // collegeId isolation enforced by findFirst pre-check above
        data: {
          ...(payload.designation ? { designation: payload.designation } : {}),
          ...(payload.salaryGrade ? { salaryGrade: payload.salaryGrade } : {}),
          ...(payload.joiningDate ? { joiningDate: new Date(payload.joiningDate) } : {}),
          ...(payload.departmentId ? { departmentId: payload.departmentId } : {}),
          ...(payload.phone !== undefined ? { mobileNumber: payload.phone || null } : {}),
          ...(normalizedEmail ? { emailId: normalizedEmail } : {}),
          ...(normalizedTeacherId !== undefined ? { teacherId: normalizedTeacherId } : {}),
        },
        include: {
          user: true,
          department: true
        }
      });

      return t;
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: { code: 'STAFF_UPDATE_CONFLICT', message: 'A teacher with that email or Teacher ID already exists in this college.' }
      });
    }
    throw error;
  }

  // Invalidate Redis staff cache for this college
  await invalidateStaffCache(collegeId);

  logger.info(`[info] req=${req.id || ''} college=${collegeId} teacherId=${id} actor=${actorId} Updated staff`);
  res.json({
    success: true,
    data: {
      ...updated,
      teacherId: updated.teacherId || null,
      phone: updated.mobileNumber || ''
    }
  });
};

export const deleteStaff = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;

  const teacher = await prisma.teacher.findFirst({
    where: { id, collegeId, deletedAt: null },
    select: { id: true, userId: true }
  });

  if (!teacher) {
    return res.status(404).json({ success: false, error: { code: 'STAFF_NOT_FOUND', message: 'Staff member not found' } });
  }

  await prisma.$transaction(async (tx) => {
    await deleteTeacherProfile(tx, teacher);
  }, { maxWait: 15000, timeout: 30000 });

  // Invalidate Redis staff cache for this college
  await invalidateStaffCache(collegeId);

  logger.info(`[info] req=${req.id || ''} college=${collegeId} teacherId=${id} actor=${actorId} Deleted staff`);
  res.json({ success: true, message: 'Staff member deleted successfully' });
};

export const bulkImportStaff = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { data } = req.body;

  if (!collegeId) {
    return res.status(400).json({ success: false, error: { message: 'College ID is required' } });
  }
  
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ success: false, error: { message: 'No data provided for import' } });
  }

  const results = { successful: 0, failed: 0, errors: [] };
  const departmentsCache = {};
  
  for (const [index, row] of data.entries()) {
    try {
      const employeeId = String(row['Employee_ID*'] || row['Employee_ID'] || '').trim();
      const staffName = String(row['Staff_Name*'] || row['Staff_Name'] || '').trim();
      const departmentName = String(row['Department*'] || row['Department'] || 'General').trim();

      if (!employeeId || !staffName) {
        throw new Error('Employee_ID and Staff_Name are required');
      }

      // Department lookup or creation
      let deptId = departmentsCache[departmentName];
      if (!deptId) {
        let dept = await prisma.department.findFirst({
          where: { collegeId, name: { equals: departmentName, mode: 'insensitive' } }
        });
        if (!dept) {
          dept = await prisma.department.create({
            data: {
              name: departmentName,
              code: departmentName.substring(0, 3).toUpperCase(),
              collegeId
            }
          });
        }
        departmentsCache[departmentName] = dept.id;
        deptId = dept.id;
      }

      const setupEmail = String(row['Email_ID'] || '').trim();
      if (!setupEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(setupEmail)) {
        throw new Error('A valid Email_ID is required for teacher setup');
      }
      const email = setupEmail.toLowerCase();

      await prisma.$transaction(async (tx) => {
        const staleTeachers = await tx.teacher.findMany({
          where: {
            collegeId,
            deletedAt: { not: null },
            OR: [
              { teacherId: employeeId },
              { user: { is: { email } } },
            ],
          },
          select: { id: true, userId: true },
        });
        for (const stale of staleTeachers) {
          await deleteTeacherProfile(tx, stale);
        }

        let user = await tx.user.findFirst({
          where: { email, collegeId }
        });

        if (!user) {
          user = await tx.user.create({
            data: {
              email,
              name: staffName,
              collegeId,
              role: 'teacher',
              passwordHash: null,
              accountStatus: 'pending_setup'
            }
          });
        }

        const joiningDate = row['Date_of_Joining*'] || row['Date_of_Joining'] ? new Date(row['Date_of_Joining*'] || row['Date_of_Joining']) : new Date();
        const dateOfBirth = row['Date_of_Birth'] ? new Date(row['Date_of_Birth']) : null;
        
        const createdTeacher = await tx.teacher.create({
          data: {
            collegeId,
            userId: user.id,
            departmentId: deptId,
            teacherId: employeeId,
            designation: String(row['Designation*'] || row['Designation'] || 'Staff'),
            joiningDate: isNaN(joiningDate) ? new Date() : joiningDate,
            salaryGrade: 'Grade A',
            
            // New fields mapped from Excel
            gender: row['Gender*'] || row['Gender'] ? String(row['Gender*'] || row['Gender']) : null,
            dateOfBirth: dateOfBirth && !isNaN(dateOfBirth) ? dateOfBirth : null,
            employmentType: row['Employment_Type*'] || row['Employment_Type'] ? String(row['Employment_Type*'] || row['Employment_Type']) : null,
            qualification: row['Qualification'] ? String(row['Qualification']) : null,
            experienceYears: row['Experience_Years'] ? parseInt(row['Experience_Years'], 10) : null,
            mobileNumber: row['Mobile_Number*'] || row['Mobile_Number'] ? String(row['Mobile_Number*'] || row['Mobile_Number']) : null,
            emailId: setupEmail,
            aadhaarNumber: row['Aadhaar_Number'] ? String(row['Aadhaar_Number']) : null,
            panNumber: row['PAN_Number'] ? String(row['PAN_Number']) : null,
            bloodGroup: row['Blood_Group'] ? String(row['Blood_Group']) : null,
            address: row['Address'] ? String(row['Address']) : null,
            city: row['City'] ? String(row['City']) : null,
            district: row['District'] ? String(row['District']) : null,
            state: row['State'] ? String(row['State']) : null,
            pincode: row['Pincode'] ? String(row['Pincode']) : null,
            emergencyContactName: row['Emergency_Contact_Name'] ? String(row['Emergency_Contact_Name']) : null,
            emergencyContactNumber: row['Emergency_Contact_Number'] ? String(row['Emergency_Contact_Number']) : null,
          },
          include: {
            user: true,
            department: true,
            college: { select: { name: true } },
          },
        });

      }, { maxWait: 15000, timeout: 30000 });

      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Row ${index + 2}: ${error.message}`);
    }
  }

  logger.info(`[info] req=${req.id || ''} college=${collegeId} actor=${actorId} Bulk imported staff: ${results.successful} success, ${results.failed} failed`);
  res.json({ success: true, data: results });
};
