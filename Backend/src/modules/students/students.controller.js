import crypto from 'crypto';
import { prisma, logger } from '../../server.js';
import bcrypt from 'bcryptjs';
import { createStudentSchema, updateStudentSchema } from './students.schema.js';
import { sendDynamicMail } from '../../services/email/email.service.js';

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
          role: true,
          customRoleId: true,
          customRole: { select: { id: true, name: true } },
          accountStatus: true
        }
      },
      department: true,
      section: true,
      hostelBlock: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  const formatted = students.map(s => {
    // Determine firstName/lastName from user email or stored names
    const emailPrefix = s.user?.email ? s.user.email.split('@')[0] : 'Student';
    const parts = emailPrefix.split('.');
    const fName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Student';
    const lName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : '';

    return {
      id: s.id,
      admissionNo: s.admissionNumber || s.rollNumber,
      admissionNumber: s.admissionNumber,
      rollNumber: s.rollNumber,
      firstName: fName,
      lastName: lName,
      name: `${fName} ${lName}`.trim(),
      email: s.user?.email || '',
      department: s.department?.name || '',
      departmentId: s.departmentId,
      class: s.department?.name || '',
      section: s.section?.name || '',
      batchYear: s.batchYear,
      bloodGroup: s.bloodGroup,
      emergencyContact: s.emergencyContact,
      status: s.user?.accountStatus || 'active',
      residenceType: s.residenceType,
      hostelBlock: s.hostelBlock?.name || null,
      hostelBlockId: s.hostelBlockId,
      hostelRoom: s.hostelRoom,
      customRole: s.user?.customRole?.name || null,
      customRoleId: s.user?.customRoleId || null,
      createdAt: s.createdAt,
    };
  });

  res.json({ success: true, data: formatted });
};

export const getStudentById = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const { id } = req.params;

  const student = await prisma.student.findFirst({
    where: {
      id,
      ...(collegeId ? { collegeId } : {})
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          customRoleId: true,
          customRole: { select: { id: true, name: true } },
          accountStatus: true
        }
      },
      department: true,
      section: true,
      hostelBlock: true,
    }
  });

  if (!student) {
    return res.status(404).json({ success: false, error: { code: 'STUDENT_NOT_FOUND', message: 'Student not found' } });
  }

  const emailPrefix = student.user?.email ? student.user.email.split('@')[0] : 'Student';
  const parts = emailPrefix.split('.');
  const fName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Student';
  const lName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : '';

  res.json({
    success: true,
    data: {
      id: student.id,
      admissionNo: student.admissionNumber || student.rollNumber,
      admissionNumber: student.admissionNumber,
      rollNumber: student.rollNumber,
      firstName: fName,
      lastName: lName,
      name: `${fName} ${lName}`.trim(),
      email: student.user?.email || '',
      department: student.department?.name || '',
      departmentId: student.departmentId,
      class: student.department?.name || '',
      section: student.section?.name || '',
      batchYear: student.batchYear,
      bloodGroup: student.bloodGroup,
      emergencyContact: student.emergencyContact,
      status: student.user?.accountStatus || 'active',
      residenceType: student.residenceType,
      hostelBlock: student.hostelBlock?.name || null,
      hostelBlockId: student.hostelBlockId,
      hostelRoom: student.hostelRoom,
      createdAt: student.createdAt,
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

  if (payload.admissionNo || payload.admissionNumber) {
    const customAdmissionNo = (payload.admissionNo || payload.admissionNumber).trim();
    const existingStudentByAdm = await prisma.student.findFirst({
      where: {
        collegeId,
        admissionNumber: customAdmissionNo
      }
    });

    if (existingStudentByAdm) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ADMISSION_NUMBER_ALREADY_EXISTS',
          message: `Admission number '${customAdmissionNo}' already exists in this college.`
        }
      });
    }
  }

  const admissionNo = (payload.admissionNo || payload.admissionNumber || `ADM-${Date.now().toString().slice(-6)}`).trim();
  const rollNo = (payload.rollNo || payload.rollNumber || `R-${Date.now().toString().slice(-4)}`).trim();
  const temporaryPassword = payload.password || 'Student@123';
  const passwordHash = await bcrypt.hash(temporaryPassword, 10);

  let student;
  try {
    student = await prisma.$transaction(async (tx) => {
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
      } else {
        user = await tx.user.create({
          data: {
            email,
            collegeId,
            role: 'student',
            passwordHash,
            accountStatus: payload.status || 'active'
          }
        });
      }

      const newStudent = await tx.student.create({
        data: {
          collegeId,
          userId: user.id,
          departmentId: deptId,
          admissionNumber: admissionNo,
          rollNumber: rollNo,
          batchYear: payload.batchYear || `${new Date().getFullYear()}`,
          bloodGroup: payload.bloodGroup,
          emergencyContact: payload.emergencyContact || payload.phone || payload.parentPhone,
          residenceType: payload.residenceType || 'Day Scholar',
          ...(payload.hostelBlockId ? { hostelBlockId: payload.hostelBlockId } : {}),
          ...(payload.hostelRoom ? { hostelRoom: payload.hostelRoom } : {}),
          ...(payload.sectionId ? { sectionId: payload.sectionId } : {})
        },
        include: {
          user: true,
          department: true,
        }
      });

      return newStudent;
    });
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

  // Send welcome email with login credentials (isolated try/catch so mail glitch never turns 201 into 500)
  const loginUrl = `${process.env.FRONTEND_URL}/login`;
  
  try {
    await sendDynamicMail({
      to: email,
      templateName: 'Student Welcome',
      variables: {
        name: `${payload.firstName} ${payload.lastName || ''}`.trim(),
        email,
        password: temporaryPassword,
        loginUrl
      }
    });
  } catch (mailError) {
    logger.warn(`[warn] req=${req.id || ''} college=${collegeId} studentId=${student.id} Failed to send welcome email to ${email}: ${mailError.message}`);
  }

  res.status(201).json({
    success: true,
    data: {
      id: student.id,
      admissionNo: student.admissionNumber,
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
      ...(collegeId ? { collegeId } : {})
    },
    include: { user: true }
  });

  if (!student) {
    return res.status(404).json({ success: false, error: { code: 'STUDENT_NOT_FOUND', message: 'Student not found' } });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (payload.status && student.userId) {
      await tx.user.update({
        where: { id: student.userId },
        data: { accountStatus: payload.status }
      });
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

    const s = await tx.student.update({
      where: { id },
      data: {
        ...(payload.admissionNo || payload.admissionNumber ? { admissionNumber: payload.admissionNo || payload.admissionNumber } : {}),
        ...(payload.rollNo || payload.rollNumber ? { rollNumber: payload.rollNo || payload.rollNumber } : {}),
        ...(payload.batchYear !== undefined ? { batchYear: payload.batchYear } : {}),
        ...(payload.bloodGroup !== undefined ? { bloodGroup: payload.bloodGroup || null } : {}),
        ...(payload.emergencyContact || payload.phone ? { emergencyContact: payload.emergencyContact || payload.phone } : {}),
        ...(payload.residenceType ? { residenceType: payload.residenceType } : {}),
        ...(payload.hostelBlockId !== undefined ? { hostelBlockId: payload.hostelBlockId || null } : {}),
        ...(payload.hostelRoom !== undefined ? { hostelRoom: payload.hostelRoom || null } : {}),
        ...(deptId ? { departmentId: deptId } : {}),
        ...(payload.sectionId !== undefined ? { sectionId: payload.sectionId || null } : {})
      },
      include: {
        user: true,
        department: true
      }
    });

    return s;
  });

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
      ...(collegeId ? { collegeId } : {})
    }
  });

  if (!student) {
    return res.status(404).json({ success: false, error: { code: 'STUDENT_NOT_FOUND', message: 'Student not found' } });
  }

  // Soft-delete student record
  await prisma.student.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} studentId=${id} actor=${actorId} Deleted student`);
  res.json({ success: true, message: 'Student deleted successfully' });
};

export const bulkImportStudents = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { data } = req.body; // Expecting an array of parsed Excel rows

  if (!collegeId) {
    return res.status(400).json({ success: false, error: { message: 'College ID is required' } });
  }
  
  if (!Array.isArray(data) || data.length === 0) {
    return res.status(400).json({ success: false, error: { message: 'No data provided for import' } });
  }

  const results = { successful: 0, failed: 0, errors: [] };

  // Fetch or create a default department if none specified
  const departmentsCache = {};
  
  for (const [index, row] of data.entries()) {
    try {
      const admissionNo = String(row['Admission_No*'] || row['Admission_No'] || '').trim();
      const studentName = String(row['Student_Name*'] || row['Student_Name'] || '').trim();
      const departmentName = String(row['Department*'] || row['Department'] || 'General').trim();
      const rollNo = String(row['Roll_No'] || `R-${Date.now().toString().slice(-4)}`).trim();

      if (!admissionNo || !studentName) {
        throw new Error('Admission_No and Student_Name are required');
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

      // Split name
      const nameParts = studentName.split(' ');
      const fName = nameParts[0];
      const lName = nameParts.slice(1).join(' ');
      const email = String(row['Email_ID'] || `${admissionNo.toLowerCase()}@example.com`).toLowerCase().trim();

      await prisma.$transaction(async (tx) => {
        let user = await tx.user.findFirst({
          where: { email, collegeId }
        });

        if (!user) {
          const defaultPassword = await bcrypt.hash('Student@123', 10);
          user = await tx.user.create({
            data: {
              email,
              collegeId,
              role: 'student',
              passwordHash: defaultPassword,
              accountStatus: 'active'
            }
          });
        }

        const dateOfBirth = row['Date_of_Birth*'] || row['Date_of_Birth'] ? new Date(row['Date_of_Birth*'] || row['Date_of_Birth']) : null;
        const dateOfAdmission = row['Date_of_Admission*'] || row['Date_of_Admission'] ? new Date(row['Date_of_Admission*'] || row['Date_of_Admission']) : null;
        
        await tx.student.create({
          data: {
            collegeId,
            userId: user.id,
            departmentId: deptId,
            admissionNumber: admissionNo,
            rollNumber: rollNo,
            batchYear: String(row['Year_of_Study*'] || row['Year_of_Study'] || new Date().getFullYear()),
            bloodGroup: row['Blood_Group'] || null,
            emergencyContact: String(row['Parent_Mobile*'] || row['Parent_Mobile'] || row['Student_Mobile'] || ''),
            residenceType: String(row['Hostel_Required'] || '').toLowerCase() === 'yes' ? 'Hosteller' : 'Day Scholar',
            
            // New fields mapped from Excel
            aadhaarNumber: row['Aadhaar_Number'] ? String(row['Aadhaar_Number']) : null,
            communityCategory: row['Community_Category'] ? String(row['Community_Category']) : null,
            yearOfStudy: row['Year_of_Study*'] || row['Year_of_Study'] ? String(row['Year_of_Study*'] || row['Year_of_Study']) : null,
            fatherName: row['Father_Name*'] || row['Father_Name'] ? String(row['Father_Name*'] || row['Father_Name']) : null,
            motherName: row['Mother_Name'] ? String(row['Mother_Name']) : null,
            parentMobile: row['Parent_Mobile*'] || row['Parent_Mobile'] ? String(row['Parent_Mobile*'] || row['Parent_Mobile']) : null,
            studentMobile: row['Student_Mobile'] ? String(row['Student_Mobile']) : null,
            emailId: email,
            address: row['Address'] ? String(row['Address']) : null,
            city: row['City'] ? String(row['City']) : null,
            district: row['District'] ? String(row['District']) : null,
            state: row['State'] ? String(row['State']) : null,
            pincode: row['Pincode'] ? String(row['Pincode']) : null,
            nationality: row['Nationality'] ? String(row['Nationality']) : null,
            admissionQuota: row['Admission_Quota'] ? String(row['Admission_Quota']) : null,
            dateOfAdmission: dateOfAdmission && !isNaN(dateOfAdmission) ? dateOfAdmission : null,
            previousInstitution: row['Previous_Institution'] ? String(row['Previous_Institution']) : null,
            transportRequired: row['Transport_Required'] ? String(row['Transport_Required']) : null,
            hostelRequired: row['Hostel_Required'] ? String(row['Hostel_Required']) : null,
            semesterFees: row['Semester Fees'] ? parseFloat(row['Semester Fees']) : null,
          }
        });
      });

      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push(`Row ${index + 2}: ${error.message}`);
    }
  }

  logger.info(`[info] req=${req.id || ''} college=${collegeId} actor=${actorId} Bulk imported students: ${results.successful} success, ${results.failed} failed`);
  res.json({ success: true, data: results });
};

export const getRegistrationLink = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  if (!collegeId) {
    return res.status(400).json({ success: false, error: { code: 'COLLEGE_REQUIRED', message: 'College ID is required' } });
  }

  let link = await prisma.studentRegistrationLink.findFirst({
    where: { collegeId, isActive: true },
    orderBy: { createdAt: 'desc' }
  });

  let rawToken = null;

  if (!link) {
    rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    link = await prisma.studentRegistrationLink.create({
      data: {
        collegeId,
        tokenHash,
        isActive: true,
        createdById: req.user?.id || req.user?.userId
      }
    });
  }

  res.json({
    success: true,
    data: {
      id: link.id,
      isActive: link.isActive,
      expiresAt: link.expiresAt,
      createdAt: link.createdAt,
      rawToken,
      path: rawToken ? `/student/register?token=${rawToken}` : null
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
