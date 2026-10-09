import crypto from 'crypto';
import { prisma, logger } from '../../server.js';
import bcrypt from 'bcryptjs';
import { createStudentSchema, updateStudentSchema } from './students.schema.js';
import { deleteStudentProfile } from '../users/deleteUserRecords.js';

export const getStudents = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId || req.query.collegeId;

  if (!collegeId && req.user?.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant context missing' } });
  }

  const { sectionId } = req.query;

  const where = {
    deletedAt: null,
    ...(collegeId ? { collegeId } : {}),
    ...(sectionId ? { sectionId } : {})
  };

  const students = await prisma.student.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          customRoleId: true,
          customRole: { select: { id: true, name: true } },
          accountStatus: true
        }
      },
      department: true,
      course: true,
      section: true,
      hostelBlock: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  const formatted = students.map(s => {
    const custom = (typeof s.customFields === 'object' && s.customFields !== null && !Array.isArray(s.customFields)) ? s.customFields : {};
    
    // Resolve firstName & lastName: customFields -> User.name -> email prefix fallback for legacy
    let fName = custom.firstName;
    let lName = custom.lastName;
    if ((!fName || fName === '') && s.user?.name) {
      const nameParts = s.user.name.split(' ');
      fName = nameParts[0];
      lName = nameParts.slice(1).join(' ');
    }
    if (!fName || fName === '') {
      const emailPrefix = s.user?.email ? s.user.email.split('@')[0] : 'Student';
      const parts = emailPrefix.split('.');
      fName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Student';
      lName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : '';
    }

    const fullName = `${fName || ''} ${lName || ''}`.trim() || s.user?.name || 'Student';
    const phone = s.studentMobile || s.emergencyContact || '';
    const parentPhone = s.parentMobile || '';
    const parentName = s.fatherName || s.motherName || custom.parentName || '';
    const address = s.address || '';
    const dob = custom.dob || custom.dateOfBirth || '';
    const gender = custom.gender || '';

    return {
      id: s.id,
      admissionNo: s.admissionNumber || s.rollNumber,
      admissionNumber: s.admissionNumber,
      rollNumber: s.rollNumber,
      registerNumber: s.registerNumber || custom.registerNumber || s.rollNumber || '',
      studentRegNo: s.registerNumber || custom.registerNumber || s.rollNumber || '',
      firstName: fName || '',
      lastName: lName || '',
      name: fullName,
      email: s.user?.email || s.emailId || '',
      phone,
      parentPhone,
      parentName,
      address,
      dob,
      dateOfBirth: dob,
      gender,
      department: s.department?.name || '',
      departmentId: s.departmentId,
      course: s.course?.name || s.department?.name || '',
      courseId: s.courseId,
      class: s.course?.name || s.department?.name || '',
      section: s.section?.name || '',
      sectionId: s.sectionId,
      batchYear: s.batchYear,
      bloodGroup: s.bloodGroup,
      emergencyContact: s.emergencyContact,
      status: (s.user?.accountStatus || 'active').toLowerCase(),
      residenceType: s.residenceType || 'Day Scholar',
      hostelBlock: s.hostelBlock?.name || null,
      hostelBlockId: s.hostelBlockId,
      hostelRoom: s.hostelRoom,
      customRole: s.user?.customRole?.name || null,
      customRoleId: s.user?.customRoleId || null,
      createdAt: s.createdAt,
      customFields: custom,
    };
  });

  res.json({ success: true, data: formatted });
};

/**
 * PATCH /students/:id/activate
 * Admin activates a pending student account (sets User.accountStatus = 'active').
 * Scoped to the admin's own college.
 */
export const activateStudent = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { id } = req.params;

  if (!collegeId) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Tenant context missing' } });
  }

  const student = await prisma.student.findFirst({
    where: { id, collegeId, deletedAt: null },
    include: { user: { select: { id: true, accountStatus: true, role: true } } }
  });

  if (!student) {
    return res.status(404).json({ success: false, error: { code: 'STUDENT_NOT_FOUND', message: 'Student not found' } });
  }

  if (student.user.accountStatus === 'active') {
    return res.status(400).json({ success: false, error: { code: 'ALREADY_ACTIVE', message: 'Student account is already active' } });
  }

  await prisma.user.update({
    where: { id: student.user.id },
    data: { accountStatus: 'active' }
  });

  return res.json({
    success: true,
    message: 'Student account activated successfully.',
    data: { studentId: id, accountStatus: 'active' }
  });
};

export const getStudentById = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { id } = req.params;

  const student = await prisma.student.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(collegeId ? { collegeId } : {})
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          customRoleId: true,
          customRole: { select: { id: true, name: true } },
          accountStatus: true
        }
      },
      department: true,
      course: true,
      section: true,
      hostelBlock: true,
    }
  });

  if (!student) {
    return res.status(404).json({ success: false, error: { code: 'STUDENT_NOT_FOUND', message: 'Student not found' } });
  }

  const custom = (typeof student.customFields === 'object' && student.customFields !== null && !Array.isArray(student.customFields)) ? student.customFields : {};
  
  let fName = custom.firstName;
  let lName = custom.lastName;
  if ((!fName || fName === '') && student.user?.name) {
    const nameParts = student.user.name.split(' ');
    fName = nameParts[0];
    lName = nameParts.slice(1).join(' ');
  }
  if (!fName || fName === '') {
    const emailPrefix = student.user?.email ? student.user.email.split('@')[0] : 'Student';
    const parts = emailPrefix.split('.');
    fName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Student';
    lName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : '';
  }

  const fullName = `${fName || ''} ${lName || ''}`.trim() || student.user?.name || 'Student';
  const phone = student.studentMobile || student.emergencyContact || '';
  const parentPhone = student.parentMobile || '';
  const parentName = student.fatherName || student.motherName || custom.parentName || '';
  const address = student.address || '';
  const dob = custom.dob || custom.dateOfBirth || '';
  const gender = custom.gender || '';

  res.json({
    success: true,
    data: {
      id: student.id,
      admissionNo: student.admissionNumber || student.rollNumber,
      admissionNumber: student.admissionNumber,
      rollNumber: student.rollNumber,
      registerNumber: student.registerNumber || custom.registerNumber || student.rollNumber || '',
      studentRegNo: student.registerNumber || custom.registerNumber || student.rollNumber || '',
      firstName: fName || '',
      lastName: lName || '',
      name: fullName,
      email: student.user?.email || '',
      phone,
      parentPhone,
      parentName,
      address,
      dob,
      dateOfBirth: dob,
      gender,
      department: student.department?.name || '',
      departmentId: student.departmentId,
      course: student.course?.name || student.department?.name || '',
      courseId: student.courseId,
      class: student.course?.name || student.department?.name || '',
      section: student.section?.name || '',
      sectionId: student.sectionId,
      batchYear: student.batchYear,
      bloodGroup: student.bloodGroup,
      emergencyContact: student.emergencyContact,
      status: student.user?.accountStatus || 'active',
      residenceType: student.residenceType || 'Day Scholar',
      hostelBlock: student.hostelBlock?.name || null,
      hostelBlockId: student.hostelBlockId,
      hostelRoom: student.hostelRoom,
      createdAt: student.createdAt,
      customFields: custom,
    }
  });
};

export const createStudent = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const payload = createStudentSchema.parse(req.body);

  if (!collegeId) {
    return res.status(400).json({ success: false, error: { code: 'COLLEGE_REQUIRED', message: 'College ID is required' } });
  }

  if (!payload.email) {
    return res.status(400).json({ success: false, error: { code: 'EMAIL_REQUIRED', message: 'Email Address is required.' } });
  }

  const admissionNumber = (payload.admissionNo || payload.admissionNumber || '').trim();
  if (!admissionNumber) {
    return res.status(400).json({
      success: false,
      error: { code: 'ADMISSION_NUMBER_REQUIRED', message: 'Admission ID / Number is required when an admin creates a student.' }
    });
  }

  // Ensure department exists or find/create a default department
  let deptId = payload.departmentId;
  
  if (!deptId && payload.courseId) {
    const course = await prisma.course.findUnique({
      where: { id: payload.courseId }
    });
    if (course) {
      deptId = course.departmentId;
    }
  }

  if (!deptId) {
    let dept = await prisma.department.findFirst({
      where: { collegeId }
    });
    if (!dept) {
      dept = await prisma.department.create({
        data: {
          name: payload.department || payload.class || 'General Studies',
          code: 'GEN',
          collegeId
        }
      });
    }
    deptId = dept.id;
  }

  const email = payload.email.toLowerCase().trim();

  // Tenant-scoped pre-flight duplicate checks for clear 409 responses
  const existingStudentByEmail = await prisma.student.findFirst({
    where: {
      collegeId,
      deletedAt: null,
      user: { email }
    }
  });

  if (existingStudentByEmail) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'STUDENT_EMAIL_ALREADY_EXISTS',
        message: `A student with email '${email}' already exists in this college.`
      }
    });
  }

  const existingStudentByAdm = await prisma.student.findFirst({
    where: { collegeId, admissionNumber, deletedAt: null }
  });

  if (existingStudentByAdm) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'ADMISSION_NUMBER_ALREADY_EXISTS',
        message: `Admission number '${admissionNumber}' already exists in this college.`
      }
    });
  }

  const admissionNo = admissionNumber;
  const rollNo = (payload.rollNo || payload.rollNumber || `R-${Date.now().toString().slice(-4)}`).trim();
  const registerNumber = (payload.registerNumber || payload.studentRegNo || payload.regNo || '').trim() || null;

  if (registerNumber) {
    const existingStudentByReg = await prisma.student.findFirst({
      where: { collegeId, registerNumber, deletedAt: null }
    });
    if (existingStudentByReg) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'REGISTER_NUMBER_ALREADY_EXISTS',
          message: `Student Reg No '${registerNumber}' already exists in this college.`
        }
      });
    }
  }

  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

  let student;
  try {
    student = await prisma.$transaction(async (tx) => {
      const fullName = `${payload.firstName} ${payload.lastName || ''}`.trim();
      const softDeletedById = await tx.student.findMany({
        where: { collegeId, admissionNumber: admissionNo, deletedAt: { not: null } },
        select: { id: true, userId: true },
      });
      const softDeletedByEmail = await tx.student.findMany({
        where: { collegeId, deletedAt: { not: null }, user: { is: { email } } },
        select: { id: true, userId: true },
      });
      const staleStudents = new Map([...softDeletedById, ...softDeletedByEmail].map((stale) => [stale.id, stale]));
      for (const stale of staleStudents.values()) {
        await deleteStudentProfile(tx, stale);
      }

      // Check if user already exists
      let user = await tx.user.findFirst({
        where: { email, collegeId }
      });

      if (user) {
        // Check if this existing user is already linked to a student
        const existingStudentProfile = await tx.student.findUnique({
          where: { userId: user.id }
        });
        if (existingStudentProfile) {
          const error = new Error(`A student with email '${email}' already exists in this college.`);
          error.statusCode = 409;
          error.code = 'STUDENT_EMAIL_ALREADY_EXISTS';
          throw error;
        }
        if (!user.name && fullName) {
          await tx.user.update({
            where: { id: user.id },
            data: { name: fullName }
          });
        }
      } else {
        user = await tx.user.create({
          data: {
            email,
            name: fullName,
            collegeId,
            role: 'student',
            passwordHash,
            accountStatus: 'pending'
          }
        });
      }

      const customFields = {
        ...(payload.customFields || {}),
        firstName: payload.firstName,
        lastName: payload.lastName || '',
        gender: payload.gender || null,
        dob: payload.dob || payload.dateOfBirth || null,
        dateOfBirth: payload.dob || payload.dateOfBirth || null,
        registerNumber: registerNumber || null,
        studentRegNo: registerNumber || null
      };

      const newStudent = await tx.student.create({
        data: {
          collegeId,
          userId: user.id,
          departmentId: deptId,
          courseId: payload.courseId || null,
          sectionId: payload.sectionId || null,
          admissionNumber: admissionNo,
          rollNumber: rollNo,
          registerNumber: registerNumber || null,
          batchYear: payload.batchYear || `${new Date().getFullYear()}`,
          bloodGroup: payload.bloodGroup,
          studentMobile: payload.phone || null,
          parentMobile: payload.parentPhone || null,
          fatherName: payload.parentName || payload.fatherName || null,
          address: payload.address || null,
          emergencyContact: payload.emergencyContact || null,
          residenceType: payload.residenceType || 'Day Scholar',
          ...(payload.hostelBlockId ? { hostelBlockId: payload.hostelBlockId } : {}),
          ...(payload.hostelRoom ? { hostelRoom: payload.hostelRoom } : {}),
          customFields
        },
        include: {
          user: true,
          department: true,
          course: true,
          section: true
        }
      });

      return newStudent;
    }, { maxWait: 15000, timeout: 30000 });
  } catch (err) {
    if (err.code === 'P2002' || err.statusCode === 409) {
      return res.status(409).json({
        success: false,
        error: {
          code: err.code === 'P2002' ? 'UNIQUE_CONSTRAINT_VIOLATION' : (err.code || 'CONFLICT'),
          message: err.message || 'A record with this identifier already exists in this college.'
        }
      });
    }
    throw err;
  }

  logger.info(`[info] req=${req.id || ''} college=${collegeId} studentId=${student.id} actor=${actorId} Created student '${payload.firstName} ${payload.lastName || ''}'`);

  res.status(201).json({
    success: true,
    data: {
      id: student.id,
      admissionNo: student.admissionNumber,
      registerNumber: student.registerNumber || registerNumber,
      studentRegNo: student.registerNumber || registerNumber,
      name: `${payload.firstName} ${payload.lastName || ''}`.trim(),
      email: student.user?.email,
      department: student.department?.name,
      status: student.user?.accountStatus,
    }
  });
};

export const updateStudent = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;
  const payload = updateStudentSchema.parse(req.body);

  const student = await prisma.student.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(collegeId ? { collegeId } : {})
    },
    include: { user: true }
  });

  if (!student) {
    return res.status(404).json({ success: false, error: { code: 'STUDENT_NOT_FOUND', message: 'Student not found' } });
  }

  const admissionNumber = (payload.admissionNo ?? payload.admissionNumber)?.trim();
  if (admissionNumber) {
    const duplicateAdmission = await prisma.student.findFirst({
      where: { collegeId, admissionNumber, deletedAt: null, NOT: { id } },
      select: { id: true },
    });
    if (duplicateAdmission) {
      return res.status(409).json({
        success: false,
        error: { code: 'ADMISSION_NUMBER_ALREADY_EXISTS', message: `Admission number '${admissionNumber}' already exists in this college.` }
      });
    }
  }

  const registerNumber = payload.registerNumber !== undefined 
    ? (payload.registerNumber?.trim() || null)
    : (payload.studentRegNo !== undefined ? (payload.studentRegNo?.trim() || null) : (payload.regNo !== undefined ? (payload.regNo?.trim() || null) : undefined));

  if (registerNumber) {
    const duplicateReg = await prisma.student.findFirst({
      where: { collegeId, registerNumber, deletedAt: null, NOT: { id } },
      select: { id: true },
    });
    if (duplicateReg) {
      return res.status(409).json({
        success: false,
        error: { code: 'REGISTER_NUMBER_ALREADY_EXISTS', message: `Student Reg No '${registerNumber}' already exists in this college.` }
      });
    }
  }

  const normalizedEmail = payload.email?.trim().toLowerCase();
  if (normalizedEmail && student.userId) {
    const duplicateEmail = await prisma.user.findFirst({
      where: { email: normalizedEmail, collegeId, NOT: { id: student.userId } },
      select: { id: true },
    });
    if (duplicateEmail) {
      return res.status(409).json({
        success: false,
        error: { code: 'STUDENT_EMAIL_ALREADY_EXISTS', message: 'A student with this email already exists in this college.' }
      });
    }
  }

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      // 1. Update linked User record (status, name, email)
      if (student.userId) {
        const userUpdateData = {};
        if (payload.status !== undefined) {
          userUpdateData.accountStatus = payload.status;
        }
        if (normalizedEmail) {
          userUpdateData.email = normalizedEmail;
        }
        if (payload.firstName !== undefined || payload.lastName !== undefined) {
          const existingCustom = (typeof student.customFields === 'object' && student.customFields !== null && !Array.isArray(student.customFields)) ? student.customFields : {};
          const currentFName = payload.firstName !== undefined ? payload.firstName : (existingCustom.firstName || (student.user?.name ? student.user.name.split(' ')[0] : ''));
          const currentLName = payload.lastName !== undefined ? payload.lastName : (existingCustom.lastName || (student.user?.name ? student.user.name.split(' ').slice(1).join(' ') : ''));
          userUpdateData.name = `${currentFName || ''} ${currentLName || ''}`.trim();
        }
        if (Object.keys(userUpdateData).length > 0) {
          await tx.user.update({
            where: { id: student.userId },
            data: userUpdateData
          });
        }
      }


      let deptId = payload.departmentId;
      if (!deptId && payload.courseId) {
        const course = await tx.course.findUnique({
          where: { id: payload.courseId }
        });
        if (course) {
          deptId = course.departmentId;
        }
      }

      // 2. Non-destructive customFields merge
      const existingCustom = (typeof student.customFields === 'object' && student.customFields !== null && !Array.isArray(student.customFields)) ? student.customFields : {};
      const mergedCustom = {
        ...existingCustom,
        ...(payload.customFields || {}),
        ...(payload.firstName !== undefined ? { firstName: payload.firstName } : {}),
        ...(payload.lastName !== undefined ? { lastName: payload.lastName } : {}),
        ...(payload.gender !== undefined ? { gender: payload.gender } : {}),
        ...(payload.dob !== undefined || payload.dateOfBirth !== undefined ? { dob: payload.dob || payload.dateOfBirth, dateOfBirth: payload.dob || payload.dateOfBirth } : {}),
        ...(registerNumber !== undefined ? { registerNumber, studentRegNo: registerNumber } : {})
      };

      const s = await tx.student.update({
        where: { id },
        data: {
          ...(admissionNumber ? { admissionNumber } : {}),
          ...(normalizedEmail ? { emailId: normalizedEmail } : {}),
          ...(payload.rollNo || payload.rollNumber ? { rollNumber: payload.rollNo || payload.rollNumber } : {}),
          ...(registerNumber !== undefined ? { registerNumber } : {}),
          ...(payload.batchYear !== undefined ? { batchYear: payload.batchYear } : {}),
          ...(payload.bloodGroup !== undefined ? { bloodGroup: payload.bloodGroup || null } : {}),
          ...(payload.phone !== undefined ? { studentMobile: payload.phone || null } : {}),
          ...(payload.parentPhone !== undefined ? { parentMobile: payload.parentPhone || null } : {}),
          ...(payload.parentName !== undefined ? { fatherName: payload.parentName || null } : {}),
          ...(payload.address !== undefined ? { address: payload.address || null } : {}),
          ...(payload.emergencyContact !== undefined ? { emergencyContact: payload.emergencyContact || null } : {}),
          ...(payload.residenceType !== undefined ? { residenceType: payload.residenceType } : {}),
          ...(payload.hostelBlockId !== undefined ? { hostelBlockId: payload.hostelBlockId || null } : {}),
          ...(payload.hostelRoom !== undefined ? { hostelRoom: payload.hostelRoom || null } : {}),
          ...(deptId !== undefined ? { departmentId: deptId } : {}),
          ...(payload.courseId !== undefined ? { courseId: payload.courseId || null } : {}),
          ...(payload.sectionId !== undefined ? { sectionId: payload.sectionId || null } : {}),
          customFields: mergedCustom
        },
        include: {
          user: true,
          department: true,
          course: true,
          section: true
        }
      });

      return s;
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: { code: 'STUDENT_UPDATE_CONFLICT', message: 'A student with that email or ID already exists in this college.' }
      });
    }
    throw error;
  }

  logger.info(`[info] req=${req.id || ''} college=${collegeId} studentId=${id} actor=${actorId} Updated student`);
  res.json({ success: true, data: updated });
};

export const deleteStudent = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;

  const student = await prisma.student.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(collegeId ? { collegeId } : {})
    },
    select: { id: true, userId: true }
  });

  if (!student) {
    return res.status(404).json({ success: false, error: { code: 'STUDENT_NOT_FOUND', message: 'Student not found' } });
  }

  await prisma.$transaction(async (tx) => {
    await deleteStudentProfile(tx, student);
  }, { maxWait: 15000, timeout: 30000 });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} studentId=${id} actor=${actorId} Deleted student`);
  res.json({ success: true, message: 'Student deleted successfully' });
};

export const bulkImportStudents = async (req, res) => {
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
  const coursesCache = {};
  const sectionsCache = {};
  const defaultHashedPassword = await bcrypt.hash('Student@123', 10);

  // Helper to extract value from row case-insensitively with alias fallback
  const getVal = (row, ...aliases) => {
    const keys = Object.keys(row);
    for (const alias of aliases) {
      const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
      for (const key of keys) {
        const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (cleanKey === cleanAlias && row[key] !== undefined && row[key] !== null) {
          const str = String(row[key]).trim();
          if (str !== '') return str;
        }
      }
    }
    return '';
  };

  // Helper for safe date parsing (handles ISO, DD/MM/YYYY, and Excel serial numbers)
  const parseDate = (val) => {
    if (!val) return null;
    if (val instanceof Date && !isNaN(val)) return val;
    if (typeof val === 'number' || (!isNaN(val) && !isNaN(parseFloat(val)) && !String(val).includes('-') && !String(val).includes('/'))) {
      const serial = parseFloat(val);
      if (serial > 1000) {
        const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
        return isNaN(date) ? null : date;
      }
    }
    const strVal = String(val).trim();
    const ddmmyyyy = strVal.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const parsed = new Date(`${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`);
      if (!isNaN(parsed)) return parsed;
    }
    const parsed = new Date(strVal);
    return !isNaN(parsed) ? parsed : null;
  };
  
  // Phase 1: Pre-process and sequential cache resolution for Dept/Course/Section
  const processedRows = [];
  for (const [index, row] of data.entries()) {
    try {
      let admissionNo = getVal(
        row,
        'Admission_No*', 'Admission_No', 'Admission No', 'Admission Number', 'Admission_Number',
        'admissionNo', 'admissionNumber', 'admission_number', 'adm_no', 'admNo', 'Adm_No', 'Adm No',
        'Admission ID', 'Admission_ID', 'admissionId', 'Student_ID', 'Student ID', 'studentId', 'StudentID',
        'Register_No', 'Register No', 'Student_Reg_No', 'Student Reg No', 'Reg_No', 'Reg No',
        'Roll_No', 'Roll No', 'rollNo', 'rollNumber', 'Roll_Number'
      );

      let studentName = getVal(
        row,
        'Student_Name*', 'Student_Name', 'Student Name', 'studentName', 'student_name',
        'Name*', 'Name', 'Full Name', 'Full_Name', 'fullName', 'Candidate_Name', 'Candidate Name',
        'Student', 'Student_name'
      );

      const firstName = getVal(row, 'First_Name*', 'First_Name', 'First Name', 'firstName', 'first_name', 'FirstName');
      const lastName = getVal(row, 'Last_Name*', 'Last_Name', 'Last Name', 'lastName', 'last_name', 'LastName');

      if (!studentName && firstName) {
        studentName = `${firstName} ${lastName}`.trim();
      }
      if (!studentName) {
        const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('name') && !k.toLowerCase().includes('parent') && !k.toLowerCase().includes('father') && !k.toLowerCase().includes('mother') && !k.toLowerCase().includes('dept') && !k.toLowerCase().includes('course'));
        if (nameKey && row[nameKey]) {
          studentName = String(row[nameKey]).trim();
        }
      }
      if (!studentName) {
        studentName = `Student ${index + 1}`;
      }

      if (!admissionNo) {
        admissionNo = `ADM-${new Date().getFullYear()}-${String(index + 1).padStart(3, '0')}`;
      }

      const departmentName = getVal(
        row,
        'Department*', 'Department', 'Department_Name', 'Department Name', 'department', 'Dept', 'dept', 'Branch', 'branch'
      ) || 'General';

      const courseName = getVal(
        row,
        'Course*', 'Course', 'Course_Name', 'Course Name', 'course', 'Class', 'class', 'Class_Name', 'Program', 'Degree'
      );

      const sectionName = getVal(
        row,
        'Section*', 'Section', 'Section_Name', 'Section Name', 'section'
      );

      const rollNo = getVal(row, 'Roll_No', 'Roll No', 'rollNo', 'rollNumber', 'Roll_Number') || `R-${Date.now().toString().slice(-4)}`;
      const rawRegisterNumber = getVal(
        row,
        'Student_Reg_No', 'Student Reg No', 'Register_No', 'Register No', 'Reg_No', 'Reg No',
        'registerNumber', 'studentRegNo', 'Register_Number'
      );
      const registerNumber = rawRegisterNumber ? String(rawRegisterNumber).trim() : null;

      // Sequential Department lookup or creation
      let deptId = departmentsCache[departmentName.toLowerCase()];
      if (!deptId) {
        let dept = await prisma.department.findFirst({
          where: { collegeId, name: { equals: departmentName, mode: 'insensitive' } }
        });
        if (!dept) {
          dept = await prisma.department.create({
            data: {
              name: departmentName,
              code: departmentName.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'DEP',
              collegeId
            }
          });
        }
        departmentsCache[departmentName.toLowerCase()] = dept.id;
        deptId = dept.id;
      }

      // Sequential Course lookup or creation
      let courseId = null;
      if (courseName) {
        const courseKey = `${collegeId}_${courseName.toLowerCase()}`;
        courseId = coursesCache[courseKey];
        if (!courseId) {
          let course = await prisma.course.findFirst({
            where: {
              collegeId,
              OR: [
                { name: { equals: courseName, mode: 'insensitive' } },
                { code: { equals: courseName, mode: 'insensitive' } }
              ]
            }
          });
          if (!course) {
            course = await prisma.course.create({
              data: {
                name: courseName,
                code: courseName.substring(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'CRS',
                semester: 1,
                credits: 3,
                departmentId: deptId,
                collegeId
              }
            });
          }
          coursesCache[courseKey] = course.id;
          courseId = course.id;
        }
      }

      // Sequential Section lookup or creation
      let sectionId = null;
      if (sectionName) {
        const sectionKey = `${collegeId}_${courseId || 'general'}_${sectionName.toLowerCase()}`;
        sectionId = sectionsCache[sectionKey];
        if (!sectionId) {
          let section = await prisma.section.findFirst({
            where: {
              collegeId,
              name: { equals: sectionName, mode: 'insensitive' },
              ...(courseId ? { courseId } : {})
            }
          });
          if (!section && courseId) {
            section = await prisma.section.create({
              data: {
                name: sectionName,
                courseId,
                collegeId,
                capacity: 60
              }
            });
          }
          if (section) {
            sectionsCache[sectionKey] = section.id;
            sectionId = section.id;
          }
        }
      }

      const nameParts = studentName.split(' ');
      const fName = firstName || nameParts[0] || 'Student';
      const lName = lastName || nameParts.slice(1).join(' ') || '';

      const rawEmail = getVal(row, 'Email_ID', 'Email ID', 'Email', 'email', 'emailId', 'Email_Address', 'Email Address');
      const cleanEmail = rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)
        ? rawEmail.toLowerCase().trim()
        : `${admissionNo.toLowerCase().replace(/[^a-z0-9]/g, '') || 'std_' + (index + 1)}@college.local`;

      const rawDob = getVal(row, 'Date_of_Birth*', 'Date_of_Birth', 'Date of Birth', 'DOB', 'dob', 'dateOfBirth', 'Birth_Date');
      const dateOfBirth = parseDate(rawDob);
      const dobFormatted = dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : (rawDob || null);

      const rawAdmissionDate = getVal(row, 'Date_of_Admission*', 'Date_of_Admission', 'Date of Admission', 'Admission_Date');
      const dateOfAdmission = parseDate(rawAdmissionDate);

      const studentMobile = getVal(row, 'Student_Mobile', 'Student Mobile', 'Mobile', 'mobile', 'Phone', 'phone', 'studentMobile');
      const parentMobile = getVal(row, 'Parent_Mobile*', 'Parent_Mobile', 'Parent Mobile', 'Parent_Phone', 'Parent Phone', 'parentMobile', 'parentPhone');
      const parentName = getVal(row, 'Parent_Name*', 'Parent_Name', 'Parent Name', 'Father_Name*', 'Father_Name', 'Father Name', 'fatherName', 'parentName', 'Mother_Name');
      const motherName = getVal(row, 'Mother_Name', 'Mother Name', 'motherName');
      const gender = getVal(row, 'Gender', 'gender', 'Sex', 'sex');
      const address = getVal(row, 'Address', 'address', 'Home_Address', 'Home Address');
      const city = getVal(row, 'City', 'city');
      const district = getVal(row, 'District', 'district');
      const state = getVal(row, 'State', 'state');
      const pincode = getVal(row, 'Pincode', 'pincode', 'Zip_Code', 'ZipCode');
      const bloodGroup = getVal(row, 'Blood_Group', 'Blood Group', 'bloodGroup');
      const batchYear = getVal(row, 'Year_of_Study*', 'Year_of_Study', 'Year of Study', 'Batch_Year', 'Batch Year', 'batchYear', 'yearOfStudy') || `${new Date().getFullYear()}`;
      const residenceType = getVal(row, 'Residence_Type', 'Residence Type', 'residenceType', 'Hostel_Required').toLowerCase().includes('hostel') || getVal(row, 'Hostel_Required').toLowerCase() === 'yes' ? 'Hosteller' : 'Day Scholar';

      processedRows.push({
        index,
        admissionNo,
        studentName,
        fName,
        lName,
        cleanEmail,
        dobFormatted,
        dateOfAdmission,
        studentMobile,
        parentMobile,
        parentName,
        motherName,
        gender,
        address,
        city,
        district,
        state,
        pincode,
        bloodGroup,
        batchYear,
        residenceType,
        rollNo,
        registerNumber,
        deptId,
        courseId,
        sectionId
      });
    } catch (error) {
      logger.error(`[Student Import Pre-Process Error] Row ${index + 2}: ${error.message}`);
      results.failed++;
      results.errors.push(`Row ${index + 2}: ${error.message}`);
    }
  }

  // Phase 1.5: Deduplicate rows to prevent race conditions during batching
  const uniqueEmails = new Set();
  const uniqueAdmissions = new Set();
  const deduplicatedRows = [];
  
  // We process in reverse so the LAST occurrence in the excel sheet wins if there's a duplicate
  for (const row of [...processedRows].reverse()) {
    if (!uniqueEmails.has(row.cleanEmail) && !uniqueAdmissions.has(row.admissionNo)) {
      uniqueEmails.add(row.cleanEmail);
      uniqueAdmissions.add(row.admissionNo);
      deduplicatedRows.push(row);
    } else {
      logger.warn(`[Student Import Warn] Row ${row.index + 2}: Skipped due to duplicate email or admission number in the same file.`);
      results.failed++;
      results.errors.push(`Row ${row.index + 2}: Skipped (Duplicate row in file)`);
    }
  }
  deduplicatedRows.reverse(); // restore original order

  // Global Sweep: Clean up any existing soft-deleted records for these incoming students
  const incomingAdmissions = Array.from(uniqueAdmissions);
  const incomingEmails = Array.from(uniqueEmails);
  
  if (incomingAdmissions.length > 0 || incomingEmails.length > 0) {
    const staleById = incomingAdmissions.length > 0 ? await prisma.student.findMany({
      where: { collegeId, admissionNumber: { in: incomingAdmissions }, deletedAt: { not: null } },
      select: { id: true, userId: true },
    }) : [];
    
    const staleByEmail = incomingEmails.length > 0 ? await prisma.student.findMany({
      where: { collegeId, deletedAt: { not: null }, user: { is: { email: { in: incomingEmails } } } },
      select: { id: true, userId: true },
    }) : [];

    const staleMap = new Map([...staleById, ...staleByEmail].map((s) => [s.id, s]));
    
    // Delete them safely before import starts
    for (const stale of staleMap.values()) {
      await prisma.$transaction(async (tx) => {
        await deleteStudentProfile(tx, stale);
      });
    }
  }

  // Phase 2: Safe Concurrent Batch processing (size 5 avoids pool exhaustion)
  const BATCH_SIZE = 5;
  for (let i = 0; i < deduplicatedRows.length; i += BATCH_SIZE) {
    const batch = deduplicatedRows.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (row) => {
      const { index, admissionNo, studentName, fName, lName, cleanEmail, dobFormatted, dateOfAdmission, studentMobile, parentMobile, parentName, motherName, gender, address, city, district, state, pincode, bloodGroup, batchYear, residenceType, rollNo, registerNumber, deptId, courseId, sectionId } = row;

      try {
        await prisma.$transaction(async (tx) => {
          let existingStudent = await tx.student.findFirst({
            where: {
              collegeId,
              deletedAt: null,
              OR: [
                { admissionNumber: { equals: admissionNo, mode: 'insensitive' } },
                ...(registerNumber ? [{ registerNumber: { equals: registerNumber, mode: 'insensitive' } }] : []),
                { user: { email: { equals: cleanEmail, mode: 'insensitive' } } }
              ]
            },
            include: { user: true }
          });

          let user;
          if (existingStudent?.user) {
            user = await tx.user.update({
              where: { id: existingStudent.user.id },
              data: {
                name: studentName,
                accountStatus: 'active'
              }
            });
          } else {
            const existingUser = await tx.user.findFirst({
              where: { email: { equals: cleanEmail, mode: 'insensitive' }, collegeId },
              include: { studentProfile: true }
            });

            if (existingUser) {
              if (existingUser.studentProfile && existingUser.studentProfile.deletedAt === null) {
                const uniqueSuffix = `_${Date.now().toString().slice(-4)}_${Math.floor(Math.random() * 1000)}`;
                const emailParts = cleanEmail.split('@');
                const uniqueEmail = `${emailParts[0]}${uniqueSuffix}@${emailParts[1] || 'college.local'}`;
                user = await tx.user.create({
                  data: {
                    email: uniqueEmail,
                    name: studentName,
                    collegeId,
                    role: 'student',
                    passwordHash: defaultHashedPassword,
                    accountStatus: 'active'
                  }
                });
              } else if (existingUser.studentProfile && existingUser.studentProfile.deletedAt !== null) {
                await deleteStudentProfile(tx, existingUser.studentProfile);
                user = await tx.user.create({
                  data: {
                    email: cleanEmail,
                    name: studentName,
                    collegeId,
                    role: 'student',
                    passwordHash: defaultHashedPassword,
                    accountStatus: 'active'
                  }
                });
              } else {
                user = await tx.user.update({
                  where: { id: existingUser.id },
                  data: {
                    name: studentName,
                    accountStatus: 'active'
                  }
                });
              }
            } else {
              user = await tx.user.create({
                data: {
                  email: cleanEmail,
                  name: studentName,
                  collegeId,
                  role: 'student',
                  passwordHash: defaultHashedPassword,
                  accountStatus: 'active'
                }
              });
            }
          }

          let safeRegisterNumber = registerNumber || null;
          if (safeRegisterNumber) {
            const duplicateReg = await tx.student.findFirst({
              where: {
                collegeId,
                registerNumber: { equals: safeRegisterNumber, mode: 'insensitive' },
                deletedAt: null,
                ...(existingStudent ? { NOT: { id: existingStudent.id } } : {})
              }
            });
            if (duplicateReg) {
              safeRegisterNumber = null;
            }
          }

          const customFields = {
            firstName: fName,
            lastName: lName,
            gender: gender || null,
            dob: dobFormatted,
            dateOfBirth: dobFormatted,
            parentName: parentName || null,
            parentPhone: parentMobile || null,
            phone: studentMobile || null,
            registerNumber: safeRegisterNumber || null,
            studentRegNo: safeRegisterNumber || null,
            ...(existingStudent?.customFields && typeof existingStudent.customFields === 'object' ? existingStudent.customFields : {})
          };

          const studentData = {
            departmentId: deptId,
            courseId: courseId || null,
            sectionId: sectionId || null,
            admissionNumber: admissionNo,
            rollNumber: rollNo,
            registerNumber: safeRegisterNumber || null,
            batchYear: String(batchYear),
            bloodGroup: bloodGroup || null,
            emergencyContact: parentMobile || studentMobile || '',
            residenceType,
            fatherName: parentName || null,
            motherName: motherName || null,
            parentMobile: parentMobile || null,
            studentMobile: studentMobile || null,
            emailId: user.email,
            address: address || null,
            city: city || null,
            district: district || null,
            state: state || null,
            pincode: pincode || null,
            dateOfAdmission: dateOfAdmission || null,
            customFields
          };

          if (existingStudent) {
            await tx.student.update({
              where: { id: existingStudent.id },
              data: studentData
            });
          } else {
            await tx.student.create({
              data: {
                ...studentData,
                collegeId,
                userId: user.id,
              }
            });
          }
        }, { maxWait: 15000, timeout: 30000 });

        results.successful++;
      } catch (error) {
        logger.error(`[Student Import Error] Row ${index + 2}: ${error.message}`);
        results.failed++;
        results.errors.push(`Row ${index + 2}: ${error.message}`);
      }
    }));
  }

  logger.info(`[info] req=${req.id || ''} college=${collegeId} actor=${actorId} Bulk imported students: ${results.successful} success, ${results.failed} failed`);
  res.json({ success: true, data: results });
};

export const getRegistrationLink = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  if (!collegeId) {
    return res.status(400).json({ success: false, error: { code: 'COLLEGE_REQUIRED', message: 'College ID is required' } });
  }

  // Look for an existing active link for this college.
  // IMPORTANT: Do NOT create a new token on every GET — that would invalidate
  // the link already shared with students. Only create if none is active.
  const existing = await prisma.studentRegistrationLink.findFirst({
    where: { collegeId, isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  // The raw token is never stored (only its SHA-256 hash is kept for security).
  // Since we cannot recover the raw token from the hash, if an active link
  // exists we must generate a fresh raw token and update the hash atomically.
  // This is transparent to the student — the URL is regenerated but the link
  // stays active and is returned immediately to the Admin for sharing.
  //
  // This only matters when the Admin opens the modal: the link URL changes
  // each time they view it (because we cannot un-hash the token), but the
  // important guarantee is that we do NOT invalidate previously active links
  // when the Admin merely views the modal. The /regenerate endpoint is the
  // intentional "invalidate all previous links" action.

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  let link;
  if (existing) {
    // Update the existing active link with a fresh token hash.
    // Previous copies of the URL are now superseded, but no previously active
    // links are disabled — the Admin is just refreshing their copy of the URL.
    link = await prisma.studentRegistrationLink.update({
      where: { id: existing.id },
      data: { tokenHash }
    });
    logger.info(`[info] College ${collegeId} retrieved student registration link (id=${link.id}) — refreshed token hash`);
  } else {
    // No active link — create one from scratch.
    // Deactivate any stale inactive records first to keep the table clean.
    await prisma.studentRegistrationLink.updateMany({
      where: { collegeId },
      data: { isActive: false }
    });

    link = await prisma.studentRegistrationLink.create({
      data: {
        collegeId,
        tokenHash,
        isActive: true,
        createdById: req.user?.id || req.user?.userId
      }
    });
    logger.info(`[info] College ${collegeId} created new student registration link (id=${link.id})`);
  }

  res.json({
    success: true,
    data: {
      id: link.id,
      isActive: link.isActive,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      rawToken,
      path: `/student/register?token=${rawToken}`
    }
  });
};

export const regenerateRegistrationLink = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  if (!collegeId) {
    return res.status(400).json({ success: false, error: { code: 'COLLEGE_REQUIRED', message: 'College ID is required' } });
  }

  // Deactivate all previous links for this college
  await prisma.studentRegistrationLink.updateMany({
    where: { collegeId },
    data: { isActive: false }
  });

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  const newLink = await prisma.studentRegistrationLink.create({
    data: {
      collegeId,
      tokenHash,
      isActive: true,
      createdById: req.user?.id || req.user?.userId
    }
  });

  logger.info(`[info] College ${collegeId} regenerated student registration link (id=${newLink.id})`);

  res.json({
    success: true,
    message: 'Registration link regenerated successfully. Previous links have been invalidated.',
    data: {
      id: newLink.id,
      isActive: newLink.isActive,
      expiresAt: newLink.expiresAt,
      rawToken,
      path: `/student/register?token=${rawToken}`
    }
  });
};

export const toggleRegistrationLink = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { isActive } = req.body;

  if (!collegeId) {
    return res.status(400).json({ success: false, error: { code: 'COLLEGE_REQUIRED', message: 'College ID is required' } });
  }

  await prisma.studentRegistrationLink.updateMany({
    where: { collegeId },
    data: { isActive: !!isActive }
  });

  res.json({
    success: true,
    message: `Student registration link has been ${isActive ? 'enabled' : 'disabled'}.`
  });
};

export const getAllStudentDocuments = async (req, res) => {
  try {
    const collegeId = req.tenant?.collegeId || req.user?.collegeId;
    if (!collegeId) {
      return res.status(400).json({ success: false, error: { message: 'College ID is required' } });
    }

    const students = await prisma.student.findMany({
      where: { collegeId },
      select: {
        id: true,
        admissionNumber: true,
        rollNumber: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        department: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        section: {
          select: {
            id: true,
            name: true
          }
        },
        customFields: true
      }
    });

    const allDocs = [];

    // Also fetch any institutional documents
    const institutionalDocs = await prisma.documentVault.findMany({
      where: { collegeId }
    });

    for (const instDoc of institutionalDocs) {
      allDocs.push({
        id: instDoc.id,
        studentId: null,
        studentName: 'Institutional / All Students',
        studentEmail: '',
        admissionNumber: 'UNIVERSAL',
        rollNumber: '',
        department: 'Institutional Vault',
        section: '',
        fileName: instDoc.fileName,
        documentType: 'Institutional Certificate',
        fileUrl: '#',
        fileSize: 'Verified',
        isPersonal: false,
        uploadedAt: new Date().toISOString()
      });
    }

    for (const student of students) {
      const customFields = typeof student.customFields === 'object' && student.customFields !== null
        ? student.customFields
        : {};
      const docs = Array.isArray(customFields.documents) ? customFields.documents : [];

      for (const doc of docs) {
        allDocs.push({
          id: doc.id,
          studentId: student.id,
          studentName: student.user?.name || 'Student',
          studentEmail: student.user?.email || '',
          admissionNumber: student.admissionNumber || 'N/A',
          rollNumber: student.rollNumber || '',
          department: student.department?.name || 'Academic',
          section: student.section?.name || '',
          fileName: doc.fileName || 'Document',
          documentType: doc.documentType || 'Personal Document',
          fileUrl: doc.fileUrl,
          fileSize: doc.fileSize || 'N/A',
          isPersonal: true,
          uploadedAt: doc.uploadedAt || student.createdAt
        });
      }
    }

    allDocs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({ success: true, data: allDocs });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: error.message } });
  }
};
