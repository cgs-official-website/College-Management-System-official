import { prisma, logger } from '../../server.js';
import bcrypt from 'bcryptjs';
import { assignUserRoleSchema } from '../roles/roles.schema.js';
import { changePasswordSchema } from './users.schema.js';
import { assertEmailAllowedForCollege } from '../domains/domains.service.js';

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
  const { email, currentPassword, newPassword, firstName, lastName, phone, designation } = req.body;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' }
    });
  }

  // --- (a) VALIDATION FIRST (NO WRITES) ---
  // 1. Determine if email is changing
  const normalizedEmail = email ? email.trim().toLowerCase() : null;
  const willUpdateEmail = Boolean(normalizedEmail && normalizedEmail !== user.email.toLowerCase());

  // 2. Password verification if email is changing or newPassword given
  const requiresPasswordVerification = willUpdateEmail || Boolean(newPassword);
  let newPasswordHash = null;
  if (requiresPasswordVerification) {
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
    if (newPassword) {
      newPasswordHash = await bcrypt.hash(newPassword, 10);
    }
  }

  // 3. Email domain check & duplicate check (only if email is changing)
  if (willUpdateEmail) {
    await assertEmailAllowedForCollege(user.collegeId, normalizedEmail, user.role);

    const existing = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        collegeId: user.collegeId
      }
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_IN_USE', message: 'Email already in use in this college' }
      });
    }
  }

  // 3. Phone 10-digit check
  if (phone !== undefined && phone !== null && phone !== '') {
    const cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PHONE', message: 'Mobile Phone Number must be exactly 10 digits' }
      });
    }
  }

  // --- (b) DATABASE WRITES IN ONE TRANSACTION ---
  const userData = {};
  if (willUpdateEmail) {
    userData.email = normalizedEmail;
  }
  if (newPasswordHash) {
    userData.passwordHash = newPasswordHash;
  }
  if (firstName || lastName) {
    userData.name = `${firstName || ''} ${lastName || ''}`.trim() || user.name;
  }

  const phoneValue = phone !== undefined ? (phone ? String(phone).replace(/\D/g, '') : null) : undefined;

  await prisma.$transaction(async (tx) => {
    if (Object.keys(userData).length > 0) {
      await tx.user.update({
        where: { id: userId },
        data: userData
      });
    }

    if (willUpdateEmail) {
      if (user.role === 'student') {
        const studentProfile = await tx.student.findFirst({ where: { userId } });
        if (studentProfile) {
          await tx.student.update({
            where: { id: studentProfile.id },
            data: { emailId: normalizedEmail }
          });
        }
      } else if (user.role === 'teacher' || user.role === 'hod') {
        const teacherProfile = await tx.teacher.findFirst({ where: { userId } });
        if (teacherProfile) {
          await tx.teacher.update({
            where: { id: teacherProfile.id },
            data: { emailId: normalizedEmail }
          });
        }
      }
    }

    if (phoneValue !== undefined) {
      if (user.role === 'student') {
        const studentProfile = await tx.student.findFirst({ where: { userId } });
        if (studentProfile) {
          await tx.student.update({
            where: { id: studentProfile.id },
            data: { studentMobile: phoneValue }
          });
        }
      } else if (user.role === 'teacher' || user.role === 'hod') {
        const teacherProfile = await tx.teacher.findFirst({ where: { userId } });
        if (teacherProfile) {
          await tx.teacher.update({
            where: { id: teacherProfile.id },
            data: { mobileNumber: phoneValue }
          });
        }
      }
    }

    if (designation && (user.role === 'teacher' || user.role === 'hod')) {
      const teacherProfile = await tx.teacher.findFirst({ where: { userId } });
      if (teacherProfile) {
        await tx.teacher.update({
          where: { id: teacherProfile.id },
          data: { designation }
        });
      }
    }
  });

  res.json({ success: true, message: 'Profile updated' });
};

export const changePassword = async (req, res) => {
  const userId = req.user?.userId || req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
    });
  }

  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User not found' }
    });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect.' }
    });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash }
  });

  logger.info(`[info] req=${req.id || ''} userId=${userId} Password updated successfully`);

  return res.json({
    success: true,
    message: 'Password updated successfully.'
  });
};
