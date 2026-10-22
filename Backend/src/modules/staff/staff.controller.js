import { prisma, logger } from '../../server.js';
import { createStaffSchema, updateStaffSchema } from './staff.schema.js';
import { redis } from '../../lib/cache.js';
import { sendDynamicMail } from '../../services/email/email.service.js';
import { deleteTeacherProfile } from '../users/deleteUserRecords.js';
import { createStaffSetupToken } from '../auth/staffSetupToken.js';

/**
 * Invalidates the Redis staff list cache for a given college.
 * Fails open if Redis is down.
 */
async function invalidateStaffCache(collegeId) {
  if (redis && redis.status === 'ready') {
    await redis.del(`staff:list:${collegeId}`).catch(() => {});
  }
}

/**
 * Resolves or creates the dedicated "Administration" department for non-teaching staff.
 * Reuses an existing department if named 'Administration' (case-insensitive) or with code 'ADMIN' (case-insensitive).
 * If none exists, creates one with { name: 'Administration', code: 'ADMIN', collegeId }.
 */
async function getOrCreateAdministrationDepartment(collegeId) {
  let dept = await prisma.department.findFirst({
    where: {
      collegeId,
      OR: [
        { name: { equals: 'Administration', mode: 'insensitive' } },
        { code: { equals: 'ADMIN', mode: 'insensitive' } }
      ]
    }
  });

  if (!dept) {
    dept = await prisma.department.create({
      data: {
        name: 'Administration',
        code: 'ADMIN',
        collegeId
      }
    });
  }

  return dept;
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
      joiningDate: t.joiningDate || t.createdAt,
      joinDate: t.joiningDate || t.createdAt,
      salaryGrade: t.salaryGrade || 'Grade A',
      userId: t.userId,
      role: t.user?.role || 'teacher',
      customRole: t.user?.customRole?.name || null,
      customRoleId: t.user?.customRoleId || null,
      status: t.user?.accountStatus || 'active',
      accountStatus: t.user?.accountStatus || 'active',
      staffType: ['teacher', 'hod', 'faculty'].includes(t.user?.role) ? 'teaching' : 'non-teaching',
      createdAt: t.createdAt,
      customFields: (typeof t.customFields === 'object' && t.customFields !== null && !Array.isArray(t.customFields)) ? t.customFields : {},
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
    const wanted = payload.staffType === 'non-teaching' ? 'non_teaching' : 'teaching';
    if (role.category !== wanted) {
      return res.status(400).json({
        success: false,
        error: { code: 'ROLE_CATEGORY_MISMATCH', message: `This role is for ${role.category.replace('_', '-')} staff.` }
      });
    }
  }

  // Ensure department exists
  let deptId = payload.departmentId;
  if (!deptId) {
    if (payload.staffType === 'non-teaching') {
      const adminDept = await getOrCreateAdministrationDepartment(collegeId);
      deptId = adminDept.id;
    } else {
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

  const resolvedStaffName = (payload.name && payload.name.trim()) || `${payload.firstName || ''} ${payload.lastName || ''}`.trim();

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
        ...(resolvedStaffName ? { name: resolvedStaffName } : {}),
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
        joiningDate: (payload.joiningDate || payload.joinDate) ? new Date(payload.joiningDate || payload.joinDate) : new Date(),
        salaryGrade: payload.salaryGrade || 'Grade A',
        mobileNumber: payload.phone || null,
        // emailId stores the admin-provided email (if any) — updated to teacher's real email after registration
        emailId: adminProvidedEmail || null,
        teacherId,
        customFields: payload.customFields || {},
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

  const teacher = await prisma.teacher.findFirst({
    where: { id, collegeId, deletedAt: null },
    include: { user: true }
  });

  if (!teacher) {
    return res.status(404).json({ success: false, error: { code: 'STAFF_NOT_FOUND', message: 'Staff member not found' } });
  }

    // Validate customRoleId belongs to this college and matches the staff category
  if (payload.customRoleId) {
    const role = await prisma.role.findFirst({
      where: { id: payload.customRoleId, collegeId }
    });
    if (!role) {
      return res.status(400).json({ success: false, error: { message: 'Invalid custom role' } });
    }
    const effectiveRole = payload.role || teacher.user?.role;
    const currentType = ['teacher', 'hod', 'faculty'].includes(effectiveRole) ? 'teaching' : 'non_teaching';
    if (role.category !== currentType) {
      return res.status(400).json({
        success: false,
        error: { code: 'ROLE_CATEGORY_MISMATCH', message: `This role is for ${role.category.replace('_', '-')} staff.` }
      });
    }
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

  const isNonTeaching = payload.staffType === 'non-teaching' || teacher.user?.role === 'staff';
  let targetDepartmentId = payload.departmentId;
  if (isNonTeaching && !targetDepartmentId && !teacher.departmentId) {
    const adminDept = await getOrCreateAdministrationDepartment(collegeId);
    targetDepartmentId = adminDept.id;
  }

  const resolvedUpdateName = payload.name !== undefined
    ? payload.name
    : (payload.firstName !== undefined ? `${payload.firstName || ''} ${payload.lastName || ''}`.trim() : undefined);

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      if ((resolvedUpdateName !== undefined || payload.role || payload.customRoleId !== undefined || payload.status || normalizedEmail || isNonTeaching) && teacher.userId) {
        await tx.user.update({
          where: { id: teacher.userId },
          data: {
            ...(resolvedUpdateName !== undefined ? { name: resolvedUpdateName } : {}),
            ...(normalizedEmail ? { email: normalizedEmail } : {}),
            ...(payload.role ? { role: payload.role } : (isNonTeaching ? { role: 'staff' } : {})),
            ...(payload.customRoleId !== undefined ? { customRoleId: payload.customRoleId } : {}),
            ...(payload.status ? { accountStatus: payload.status } : {})
          }
        });
      }

      const existingCustom = (typeof teacher.customFields === 'object' && teacher.customFields !== null && !Array.isArray(teacher.customFields)) ? teacher.customFields : {};

      const t = await tx.teacher.update({
        where: { id }, // collegeId isolation enforced by findFirst pre-check above
        data: {
          ...(payload.designation ? { designation: payload.designation } : {}),
          ...(payload.salaryGrade ? { salaryGrade: payload.salaryGrade } : {}),
          ...((payload.joiningDate || payload.joinDate) ? { joiningDate: new Date(payload.joiningDate || payload.joinDate) } : {}),
          ...(targetDepartmentId ? { departmentId: targetDepartmentId } : {}),
          ...(payload.phone !== undefined ? { mobileNumber: payload.phone || null } : {}),
          ...(normalizedEmail ? { emailId: normalizedEmail } : {}),
          ...(normalizedTeacherId !== undefined ? { teacherId: normalizedTeacherId } : {}),
          customFields: { ...existingCustom, ...(payload.customFields || {}) },
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
      phone: updated.mobileNumber || '',
      customFields: (typeof updated.customFields === 'object' && updated.customFields !== null && !Array.isArray(updated.customFields)) ? updated.customFields : {},
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
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const cell = (row, ...names) => {
    const keys = Object.keys(row || {});
    for (const n of names) {
      const key = keys.find((k) => norm(k) === norm(n));
      if (key !== undefined && row[key] !== null && row[key] !== undefined && String(row[key]).trim() !== '') {
        return String(row[key]).trim();
      }
    }
    return '';
  };

  const parseDate = (raw) => {
    if (!raw) return { value: null };
    const s = String(raw).trim();
    if (/^\d{5}$/.test(s)) {
      const d = new Date(Math.round((Number(s) - 25569) * 86400 * 1000));
      return isNaN(d) ? { error: true } : { value: d };
    }
    let m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (m) {
      const d = new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));
      return d.getUTCMonth() === +m[2] - 1 ? { value: d } : { error: true };
    }
    m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) {
      const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
      return d.getUTCMonth() === +m[2] - 1 ? { value: d } : { error: true };
    }
    const d = new Date(s);
    return isNaN(d) ? { error: true } : { value: d };
  };

  const results = { successful: 0, failed: 0, errors: [] };
  const departmentsCache = {};
  const seenIds = new Set();
  const seenEmails = new Set();

  for (const [index, row] of data.entries()) {
    const rowNo = index + 2;
    try {
      if (!Object.values(row || {}).some((v) => String(v ?? '').trim() !== '')) continue;

      const employeeId = cell(row, 'Employee_ID');
      const staffName = cell(row, 'Staff_Name');
      const departmentName = cell(row, 'Department');
      const designation = cell(row, 'Designation');
      const setupEmail = cell(row, 'Email_ID');

      const missing = [];
      if (!employeeId) missing.push('Employee_ID');
      if (!staffName) missing.push('Staff_Name');
      if (!setupEmail) missing.push('Email_ID');
      if (!departmentName) missing.push('Department');
      if (!designation) missing.push('Designation');
      if (!cell(row, 'Date_of_Joining')) missing.push('Date_of_Joining');
      if (missing.length) throw new Error(`Missing required: ${missing.join(', ')}`);

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(setupEmail)) throw new Error('Email_ID is not a valid email');
      const email = setupEmail.toLowerCase();

      if (seenIds.has(employeeId.toLowerCase())) throw new Error(`Employee_ID ${employeeId} appears twice in the file`);
      if (seenEmails.has(email)) throw new Error(`Email ${email} appears twice in the file`);

      const joining = parseDate(cell(row, 'Date_of_Joining'));
      const dob = parseDate(cell(row, 'Date_of_Birth'));
      if (joining.error) throw new Error('Date_of_Joining is invalid (use YYYY-MM-DD or DD-MM-YYYY)');
      if (dob.error) throw new Error('Date_of_Birth is invalid (use YYYY-MM-DD or DD-MM-YYYY)');

      const expRaw = cell(row, 'Experience_Years');
      const experienceYears = expRaw ? parseInt(expRaw, 10) : null;
      if (expRaw && isNaN(experienceYears)) throw new Error('Experience_Years must be a number');

      let deptId = departmentsCache[departmentName.toLowerCase()];
      if (!deptId) {
        let dept = await prisma.department.findFirst({
          where: { collegeId, name: { equals: departmentName, mode: 'insensitive' } },
        });
        if (!dept) {
          dept = await prisma.department.create({
            data: {
              name: departmentName,
              code: departmentName.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'DEP',
              collegeId,
            },
          });
        }
        departmentsCache[departmentName.toLowerCase()] = dept.id;
        deptId = dept.id;
      }

      await prisma.$transaction(async (tx) => {
        const staleTeachers = await tx.teacher.findMany({
          where: {
            collegeId,
            deletedAt: { not: null },
            OR: [{ teacherId: employeeId }, { user: { is: { email } } }],
          },
          select: { id: true, userId: true },
        });
        for (const stale of staleTeachers) await deleteTeacherProfile(tx, stale);

        const duplicateId = await tx.teacher.findFirst({
          where: { collegeId, teacherId: employeeId, deletedAt: null },
          select: { id: true },
        });
        if (duplicateId) throw new Error(`Employee_ID ${employeeId} already exists`);

        let user = await tx.user.findFirst({ where: { email, collegeId }, include: { teacherProfile: true } });
        if (user?.teacherProfile) throw new Error(`Email ${email} already belongs to a staff member`);

        if (!user) {
          user = await tx.user.create({
            data: { email, name: staffName, collegeId, role: 'teacher', passwordHash: null, accountStatus: 'pending_setup' },
          });
        }

        await tx.teacher.create({
          data: {
            collegeId,
            userId: user.id,
            departmentId: deptId,
            teacherId: employeeId,
            designation,
            joiningDate: joining.value,
            salaryGrade: 'Grade A',
            gender: cell(row, 'Gender') || null,
            dateOfBirth: dob.value,
            employmentType: cell(row, 'Employment_Type') || null,
            qualification: cell(row, 'Qualification') || null,
            experienceYears,
            mobileNumber: cell(row, 'Mobile_Number') || null,
            emailId: setupEmail,
            aadhaarNumber: cell(row, 'Aadhaar_Number') || null,
            panNumber: cell(row, 'PAN_Number') || null,
            bloodGroup: cell(row, 'Blood_Group') || null,
            address: cell(row, 'Address') || null,
            city: cell(row, 'City') || null,
            district: cell(row, 'District') || null,
            state: cell(row, 'State') || null,
            pincode: cell(row, 'Pincode') || null,
            emergencyContactName: cell(row, 'Emergency_Contact_Name') || null,
            emergencyContactNumber: cell(row, 'Emergency_Contact_Number') || null,
          },
        });
      }, { maxWait: 15000, timeout: 30000 });

      seenIds.add(employeeId.toLowerCase());
      seenEmails.add(email);
      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Row ${rowNo}: ${error.message}`);
    }
  }

  await invalidateStaffCache(collegeId);

  logger.info(`[info] req=${req.id || ''} college=${collegeId} actor=${actorId} Bulk imported staff: ${results.successful} success, ${results.failed} failed`);
  res.json({ success: true, data: results });
};

const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email || '';
  const [user, domain] = email.split('@');
  if (!user) return `***@${domain}`;
  const firstChar = user.charAt(0);
  return `${firstChar}***@${domain}`;
};

const getTeacherSetupDetails = async (id, collegeId, req = null) => {
  const teacher = await prisma.teacher.findFirst({
    where: { id, collegeId, deletedAt: null },
    include: {
      user: true,
      college: { select: { id: true, name: true, slug: true } }
    }
  });

  if (!teacher || !teacher.user) {
    const error = new Error('Staff member not found');
    error.statusCode = 404;
    error.code = 'NOT_FOUND';
    throw error;
  }

  if (teacher.user.accountStatus !== 'pending_setup' || teacher.user.passwordHash !== null) {
    const error = new Error('Account already activated');
    error.statusCode = 409;
    error.code = 'ACCOUNT_ALREADY_ACTIVATED';
    throw error;
  }

  const email = teacher.emailId || teacher.user.email;
  if (!email || email.includes('@pending.local')) {
    const error = new Error('No email registered for this teacher');
    error.statusCode = 400;
    error.code = 'EMAIL_REQUIRED';
    throw error;
  }

  const token = createStaffSetupToken({
    teacherRecordId: teacher.id,
    teacherId: teacher.teacherId,
    userId: teacher.userId,
    collegeId: teacher.collegeId,
    email,
  });

  let clientOrigin = null;
  if (req) {
    const reqOrigin = req.get ? req.get('origin') : req.headers?.origin;
    if (reqOrigin && reqOrigin !== 'null') {
      clientOrigin = reqOrigin;
    } else {
      const referer = req.get ? req.get('referer') : req.headers?.referer;
      if (referer) {
        try {
          clientOrigin = new URL(referer).origin;
        } catch (_) {}
      }
    }
  }

  const frontendUrl = (clientOrigin || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const setupUrl = `${frontendUrl}/teacher/setup?token=${encodeURIComponent(token)}`;

  return { teacher, email, token, setupUrl, frontendUrl };
};

export const generateStaffSetupLink = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { id } = req.params;

  const { setupUrl } = await getTeacherSetupDetails(id, collegeId, req);

  res.json({
    success: true,
    data: { setupUrl }
  });
};

export const sendStaffSetupMail = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { id } = req.params;

  const { teacher, email, setupUrl, frontendUrl } = await getTeacherSetupDetails(id, collegeId, req);

  let emailResult;
  try {
    const emailPromise = sendDynamicMail({
      to: email,
      templateName: 'Teacher Account Setup',
      headerTitle: teacher.college?.name || 'College Portal',
      fromName: teacher.college?.name,
      variables: {
        name: teacher.user?.name || teacher.name || 'Staff Member',
        email,
        teacherId: teacher.teacherId,
        collegeName: teacher.college?.name || '',
        setupUrl,
        loginUrl: `${frontendUrl}/login`,
      },
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Email send timed out after 15 seconds'));
      }, 15000);
    });

    emailResult = await Promise.race([emailPromise, timeoutPromise]);
  } catch (err) {
    logger.warn(`[STAFF-SETUP] Exception/timeout sending setup email to ${email} for teacher ${teacher.id}: ${err.message}`);
    return res.status(502).json({
      success: false,
      error: { message: 'Could not send the email. Please try again or use Generate Link.' }
    });
  }

  if (!emailResult || !emailResult.success) {
    const reason = emailResult?.error || 'sendDynamicMail returned unsuccessful';
    logger.warn(`[STAFF-SETUP] Failed sending setup email to ${email} for teacher ${teacher.id}: ${reason}`);
    return res.status(502).json({
      success: false,
      error: { message: 'Could not send the email. Please try again or use Generate Link.' }
    });
  }

  res.json({
    success: true,
    data: { maskedEmail: maskEmail(email) }
  });
};
