import { prisma, logger } from '../../server.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createStaffSchema, updateStaffSchema } from './staff.schema.js';
import { sendDynamicMail } from '../../services/email/email.service.js';

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
      name,
      firstName,
      lastName,
      email: t.user?.email || '',
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
      phone: t.mobileNumber || '',
      createdAt: t.createdAt,
    };
  });

  res.json({ success: true, data: formattedStaff });
};

export const createStaff = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const payload = createStaffSchema.parse(req.body);

  if (!collegeId) {
    return res.status(400).json({ success: false, error: { code: 'COLLEGE_REQUIRED', message: 'College ID is required' } });
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

  const email = payload.email.toLowerCase();
  const defaultPassword = await bcrypt.hash('Staff@123', 10);

  const teacher = await prisma.$transaction(async (tx) => {
    let user = await tx.user.findFirst({
      where: { email, collegeId }
    });

    if (!user) {
      user = await tx.user.create({
        data: {
          email,
          ...(payload.name ? { name: payload.name } : {}),
          collegeId,
          role: payload.role || 'teacher',
          customRoleId: payload.customRoleId || null,
          passwordHash: defaultPassword,
          accountStatus: 'pending_setup'
        }
      });
    } else if (payload.name && !user.name) {
      user = await tx.user.update({
        where: { id: user.id },
        data: { name: payload.name }
      });
    }

    const newTeacher = await tx.teacher.create({
      data: {
        collegeId,
        userId: user.id,
        departmentId: deptId,
        designation: payload.designation,
        joiningDate: payload.joiningDate ? new Date(payload.joiningDate) : new Date(),
        salaryGrade: payload.salaryGrade || 'Grade A',
        ...(payload.phone !== undefined ? { mobileNumber: payload.phone || null } : {}),
      },
      include: {
        user: true,
        department: true,
      }
    });

    return newTeacher;
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} teacherId=${teacher.id} actor=${actorId} Created staff '${payload.name}'`);

  // Send Welcome Email asynchronously
  const loginUrl = `${process.env.FRONTEND_URL}/login`;
  
  await sendDynamicMail({
    to: email,
    templateName: 'Staff Welcome',
    variables: {
      name: payload.name,
      email,
      password: 'Staff@123',
      loginUrl
    }
  });

  res.status(201).json({
    success: true,
    data: {
      id: teacher.id,
      name: payload.name,
      email: teacher.user?.email,
      phone: teacher.mobileNumber || '',
      department: teacher.department?.name,
      designation: teacher.designation,
      joiningDate: teacher.joiningDate,
      role: teacher.user?.role,
    }
  });
};

export const generateSetupLink = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { id } = req.params;

  const teacher = await prisma.teacher.findUnique({
    where: { id, collegeId },
    include: { user: true }
  });

  if (!teacher) {
    return res.status(404).json({ success: false, error: { message: 'Staff member not found' } });
  }

  const token = jwt.sign(
    { teacherId: teacher.id, userId: teacher.user.id, email: teacher.user.email, type: 'staff-setup' },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '7d' }
  );

  res.json({ success: true, data: { token } });
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
    where: { id, collegeId },
    include: { user: true }
  });

  if (!teacher) {
    return res.status(404).json({ success: false, error: { code: 'STAFF_NOT_FOUND', message: 'Staff member not found' } });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if ((payload.name || payload.role || payload.customRoleId !== undefined || payload.status) && teacher.userId) {
      await tx.user.update({
        where: { id: teacher.userId },
        data: {
          ...(payload.name ? { name: payload.name } : {}),
          ...(payload.role ? { role: payload.role } : {}),
          ...(payload.customRoleId !== undefined ? { customRoleId: payload.customRoleId } : {}),
          ...(payload.status ? { accountStatus: payload.status } : {})
        }
      });
    }

    const t = await tx.teacher.update({
      where: { id },
      data: {
        ...(payload.designation ? { designation: payload.designation } : {}),
        ...(payload.salaryGrade ? { salaryGrade: payload.salaryGrade } : {}),
        ...(payload.joiningDate ? { joiningDate: new Date(payload.joiningDate) } : {}),
        ...(payload.departmentId ? { departmentId: payload.departmentId } : {}),
        ...(payload.phone !== undefined ? { mobileNumber: payload.phone || null } : {}),
      },
      include: {
        user: true,
        department: true
      }
    });

    return t;
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} teacherId=${id} actor=${actorId} Updated staff`);
  res.json({
    success: true,
    data: {
      ...updated,
      phone: updated.mobileNumber || ''
    }
  });
};

export const deleteStaff = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;

  const teacher = await prisma.teacher.findFirst({
    where: { id, collegeId }
  });

  if (!teacher) {
    return res.status(404).json({ success: false, error: { code: 'STAFF_NOT_FOUND', message: 'Staff member not found' } });
  }

  await prisma.teacher.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} teacherId=${id} actor=${actorId} Soft-deleted staff`);
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

      const email = String(row['Email_ID'] || `${employeeId.toLowerCase()}@example.com`).toLowerCase().trim();

      await prisma.$transaction(async (tx) => {
        let user = await tx.user.findFirst({
          where: { email, collegeId }
        });

        if (!user) {
          const defaultPassword = await bcrypt.hash('Staff@123', 10);
          user = await tx.user.create({
            data: {
              email,
              collegeId,
              role: 'teacher',
              passwordHash: defaultPassword,
              accountStatus: 'active'
            }
          });
        }

        const joiningDate = row['Date_of_Joining*'] || row['Date_of_Joining'] ? new Date(row['Date_of_Joining*'] || row['Date_of_Joining']) : new Date();
        const dateOfBirth = row['Date_of_Birth'] ? new Date(row['Date_of_Birth']) : null;
        
        await tx.teacher.create({
          data: {
            collegeId,
            userId: user.id,
            departmentId: deptId,
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
            emailId: email,
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
          }
        });
      });

      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Row ${index + 2}: ${error.message}`);
    }
  }

  logger.info(`[info] req=${req.id || ''} college=${collegeId} actor=${actorId} Bulk imported staff: ${results.successful} success, ${results.failed} failed`);
  res.json({ success: true, data: results });
};
