import bcrypt from 'bcryptjs';
import { prisma, logger } from '../../server.js';
import { updateProfileSchema, photoSchema, changePasswordSchema } from './staffProfile.schema.js';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB
const DATA_URL_RE = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/;

const ids = (req) => ({
  collegeId: req.tenant?.collegeId || req.user?.collegeId,
  userId: req.user?.id || req.user?.userId,
});

const findTeacher = (userId, collegeId) =>
  prisma.teacher.findFirst({
    where: { userId, collegeId, deletedAt: null },
    include: {
      department: { select: { name: true } },
      user: {
        select: {
          id: true, name: true, email: true, role: true, accountStatus: true,
          customRole: { select: { name: true } },
        },
      },
    },
  });

const toProfile = (t) => {
  const fullName = (t.user?.name || '').trim();
  const [firstName = '', ...rest] = fullName.split(' ');
  return {
    editable: {
      firstName,
      lastName: rest.join(' '),
      mobileNumber: t.mobileNumber || '',
      gender: t.gender || '',
      dateOfBirth: t.dateOfBirth ? t.dateOfBirth.toISOString().slice(0, 10) : '',
      bloodGroup: t.bloodGroup || '',
      qualification: t.qualification || '',
      experienceYears: t.experienceYears ?? '',
      designation: t.designation || '',
      joiningDate: t.joiningDate ? t.joiningDate.toISOString().slice(0, 10) : '',
      employmentType: t.employmentType || '',
      salaryGrade: t.salaryGrade || '',
      aadhaarNumber: t.aadhaarNumber || '',
      panNumber: t.panNumber || '',
      address: t.address || '',
      city: t.city || '',
      district: t.district || '',
      state: t.state || '',
      pincode: t.pincode || '',
      emergencyContactName: t.emergencyContactName || '',
      emergencyContactNumber: t.emergencyContactNumber || '',
    },
    locked: {
      email: t.user?.email || t.emailId || '',
      teacherId: t.teacherId || '',
      role: t.user?.customRole?.name || t.user?.role || '',
      department: t.department?.name || '',
    },
    profileImage: t.profileImageData
      ? `data:${t.profileImageMimeType || 'image/jpeg'};base64,${t.profileImageData}`
      : null,
  };
};

export const getMyProfile = async (req, res) => {
  const { collegeId, userId } = ids(req);
  const teacher = await findTeacher(userId, collegeId);
  if (!teacher) {
    return res.status(404).json({ success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Staff profile not found.' } });
  }
  res.json({ success: true, data: toProfile(teacher) });
};

export const updateMyProfile = async (req, res) => {
  const { collegeId, userId } = ids(req);
  const p = updateProfileSchema.parse(req.body);

  const teacher = await prisma.teacher.findFirst({ where: { userId, collegeId, deletedAt: null }, select: { id: true } });
  if (!teacher) {
    return res.status(404).json({ success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Staff profile not found.' } });
  }

  const fullName = `${p.firstName} ${p.lastName || ''}`.trim();

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: userId }, data: { name: fullName } });
    await tx.teacher.update({
      where: { id: teacher.id },
      data: {
        mobileNumber: p.mobileNumber ?? null,
        gender: p.gender ?? null,
        dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : null,
        bloodGroup: p.bloodGroup ?? null,
        qualification: p.qualification ?? null,
        experienceYears: p.experienceYears ?? null,
        designation: p.designation || undefined,
        joiningDate: p.joiningDate ? new Date(p.joiningDate) : undefined,
        employmentType: p.employmentType ?? null,
        salaryGrade: p.salaryGrade ?? null,
        aadhaarNumber: p.aadhaarNumber ?? null,
        panNumber: p.panNumber ?? null,
        address: p.address ?? null,
        city: p.city ?? null,
        district: p.district ?? null,
        state: p.state ?? null,
        pincode: p.pincode ?? null,
        emergencyContactName: p.emergencyContactName ?? null,
        emergencyContactNumber: p.emergencyContactNumber ?? null,
      },
    });
  });

  logger.info(`[info] req=${req.id || ''} college=${collegeId} user=${userId} Updated own staff profile`);
  const fresh = await findTeacher(userId, collegeId);
  res.json({ success: true, data: toProfile(fresh) });
};

export const updateMyPhoto = async (req, res) => {
  const { collegeId, userId } = ids(req);
  const { image } = photoSchema.parse(req.body);

  const match = DATA_URL_RE.exec(image);
  if (!match) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_IMAGE', message: 'Only JPEG, PNG or WebP images are allowed.' } });
  }
  const [, mime, b64] = match;
  if (Buffer.from(b64, 'base64').length > MAX_IMAGE_BYTES) {
    return res.status(400).json({ success: false, error: { code: 'IMAGE_TOO_LARGE', message: 'Image must be 2 MB or smaller.' } });
  }

  const result = await prisma.teacher.updateMany({
    where: { userId, collegeId, deletedAt: null },
    data: { profileImageData: b64, profileImageMimeType: mime },
  });
  if (result.count !== 1) {
    return res.status(404).json({ success: false, error: { code: 'PROFILE_NOT_FOUND', message: 'Staff profile not found.' } });
  }
  res.json({ success: true, data: { profileImage: image } });
};

export const removeMyPhoto = async (req, res) => {
  const { collegeId, userId } = ids(req);
  await prisma.teacher.updateMany({
    where: { userId, collegeId, deletedAt: null },
    data: { profileImageData: null, profileImageMimeType: null },
  });
  res.json({ success: true, data: { profileImage: null } });
};

export const changeMyPassword = async (req, res) => {
  const { userId } = ids(req);
  const { currentPassword, newPassword } = changePasswordSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, passwordHash: true } });
  const ok = user?.passwordHash && (await bcrypt.compare(currentPassword, user.passwordHash));
  if (!ok) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_CURRENT_PASSWORD', message: 'Current password is incorrect.' } });
  }
  if (await bcrypt.compare(newPassword, user.passwordHash)) {
    return res.status(400).json({ success: false, error: { code: 'SAME_PASSWORD', message: 'New password must be different from the current one.' } });
  }

  await prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });
  logger.info(`[info] req=${req.id || ''} user=${userId} Changed own password`);
  res.json({ success: true, message: 'Password updated successfully.' });
};
