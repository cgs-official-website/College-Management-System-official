import { prisma, logger } from '../../server.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createStaffSchema, updateStaffSchema } from './staff.schema.js';

export const getStaff = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;

  const staff = await prisma.teacher.findMany({
    where: { collegeId, deletedAt: null },
    include: {
      user: {
        select: {
          id: true,
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
    const emailPrefix = t.user?.email ? t.user.email.split('@')[0] : 'Staff';
    const parts = emailPrefix.split('.');
    const name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');

    return {
      id: t.id,
      name,
      firstName: parts[0] || 'Staff',
      lastName: parts.slice(1).join(' ') || '',
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
          collegeId,
          role: payload.role || 'teacher',
          customRoleId: payload.customRoleId || null,
          passwordHash: defaultPassword,
          accountStatus: 'pending_setup'
        }
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
      },
      include: {
        user: true,
        department: true,
      }
    });

    return newTeacher;
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} teacherId=${teacher.id} actor=${actorId} Created staff '${payload.name}'`);

  res.status(201).json({
    success: true,
    data: {
      id: teacher.id,
      name: payload.name,
      email: teacher.user?.email,
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

  const teacher = await prisma.teacher.findFirst({
    where: { id, collegeId },
    include: { user: true }
  });

  if (!teacher) {
    return res.status(404).json({ success: false, error: { code: 'STAFF_NOT_FOUND', message: 'Staff member not found' } });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if ((payload.role || payload.customRoleId !== undefined || payload.status) && teacher.userId) {
      await tx.user.update({
        where: { id: teacher.userId },
        data: {
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
      },
      include: {
        user: true,
        department: true
      }
    });

    return t;
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} teacherId=${id} actor=${actorId} Updated staff`);
  res.json({ success: true, data: updated });
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
