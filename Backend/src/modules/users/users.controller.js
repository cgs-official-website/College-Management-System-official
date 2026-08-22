import { prisma, logger } from '../../server.js';
import bcrypt from 'bcryptjs';
import { assignUserRoleSchema } from '../roles/roles.schema.js';

export const getUsers = async (req, res) => {
  const { role, collegeId: queryCollegeId } = req.query;
  const collegeId = req.tenant?.collegeId || req.user?.collegeId || queryCollegeId;

  const where = {};
  if (role) where.role = role;
  if (collegeId && req.user?.role !== 'superadmin') {
    where.collegeId = collegeId;
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      role: true,
      customRoleId: true,
      customRole: {
        select: { id: true, name: true }
      },
      accountStatus: true,
      createdAt: true,
      collegeId: true,
    }
  });

  res.json({ success: true, data: users });
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  
  // Security check: Only allow superadmin or college admin managing users in their college
  if (req.user.role !== 'superadmin' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Unauthorized to delete users' }
    });
  }

  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const user = await prisma.user.findFirst({
    where: {
      id,
      ...(req.user.role !== 'superadmin' ? { collegeId } : {})
    }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' }
    });
  }

  await prisma.user.delete({ where: { id } });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} userId=${id} actor=${req.user?.userId || req.user?.id} Deleted user`);
  res.json({ success: true, message: 'User deleted successfully' });
};

export const assignUserRole = async (req, res) => {
  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  const actorId = req.user?.id || req.user?.userId;
  const { id } = req.params;
  const { customRoleId } = assignUserRoleSchema.parse(req.body);

  const user = await prisma.user.findFirst({
    where: {
      id,
      ...(req.user?.role !== 'superadmin' ? { collegeId } : {})
    }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found in your college.' }
    });
  }

  if (customRoleId) {
    const role = await prisma.role.findFirst({
      where: {
        id: customRoleId,
        ...(req.user?.role !== 'superadmin' ? { collegeId } : {})
      }
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        error: { code: 'ROLE_NOT_FOUND', message: 'The specified custom role was not found.' }
      });
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: { customRoleId: customRoleId || null },
    select: {
      id: true,
      email: true,
      role: true,
      customRoleId: true,
      customRole: {
        select: { id: true, name: true }
      },
      accountStatus: true,
      collegeId: true
    }
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} userId=${id} customRoleId=${customRoleId || 'none'} actor=${actorId} Assigned custom role`);
  res.json({ success: true, data: updatedUser });
};

export const updateProfile = async (req, res) => {
  const userId = req.user?.userId || req.user?.id;
  const { email, currentPassword, newPassword } = req.body;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' }
    });
  }

  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'PASSWORD_REQUIRED', message: 'Current password required' }
      });
    }
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Invalid current password' }
      });
    }
    
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });
  }

  if (email && email !== user.email) {
    const existing = await prisma.user.findFirst({
      where: {
        email,
        collegeId: user.collegeId
      }
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_IN_USE', message: 'Email already in use in this college' }
      });
    }
    await prisma.user.update({
      where: { id: userId },
      data: { email }
    });
  }

  const { firstName, lastName, phone, designation } = req.body;
  if (firstName || lastName || phone !== undefined) {
    const fullName = `${firstName || ''} ${lastName || ''}`.trim() || user.name;
    await prisma.user.update({
      where: { id: userId },
      data: { 
        name: fullName,
        phone: phone 
      }
    });
  }

  if (designation && user.role === 'teacher' || user.role === 'hod') {
    const teacherProfile = await prisma.teacher.findFirst({ where: { userId } });
    if (teacherProfile) {
      await prisma.teacher.update({
        where: { id: teacherProfile.id },
        data: { designation }
      });
    }
  }

  res.json({ success: true, message: 'Profile updated' });
};
