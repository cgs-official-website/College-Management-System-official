import { prisma, logger } from '../../server.js';
import bcrypt from 'bcryptjs';
import { createStudentSchema, updateStudentSchema } from './students.schema.js';

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

  const email = payload.email.toLowerCase();
  const admissionNo = payload.admissionNo || payload.admissionNumber || `ADM-${Date.now().toString().slice(-6)}`;
  const rollNo = payload.rollNo || payload.rollNumber || `R-${Date.now().toString().slice(-4)}`;
  const defaultPassword = await bcrypt.hash('Student@123', 10);

  const student = await prisma.$transaction(async (tx) => {
    // Check if user already exists
    let user = await tx.user.findFirst({
      where: { email, collegeId }
    });

    if (!user) {
      user = await tx.user.create({
        data: {
          email,
          collegeId,
          role: 'student',
          passwordHash: defaultPassword,
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
        ...(payload.sectionId ? { sectionId: payload.sectionId } : {})
      },
      include: {
        user: true,
        department: true,
      }
    });

    return newStudent;
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} studentId=${student.id} actor=${actorId} Created student '${payload.firstName} ${payload.lastName || ''}'`);

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
        ...(payload.batchYear ? { batchYear: payload.batchYear } : {}),
        ...(payload.bloodGroup ? { bloodGroup: payload.bloodGroup } : {}),
        ...(payload.emergencyContact || payload.phone ? { emergencyContact: payload.emergencyContact || payload.phone } : {}),
        ...(deptId ? { departmentId: deptId } : {}),
        ...(payload.sectionId ? { sectionId: payload.sectionId } : {})
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
