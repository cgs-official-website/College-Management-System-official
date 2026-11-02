import { prisma } from '../../lib/prisma.js';
import { sendDynamicMail } from '../../services/email/email.service.js';
import { createStudentSetupToken } from '../auth/staffSetupToken.js';

const httpError = (message, statusCode, code) =>
  Object.assign(new Error(message), { statusCode, code });

export const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email || '';
  const [user, domain] = email.split('@');
  return `${user.charAt(0)}***@${domain}`;
};

const resolveFrontendUrl = (req) => {
  let origin = null;
  if (req) {
    const reqOrigin = req.get ? req.get('origin') : req.headers?.origin;
    if (reqOrigin && reqOrigin !== 'null') origin = reqOrigin;
    else {
      const referer = req.get ? req.get('referer') : req.headers?.referer;
      if (referer) { try { origin = new URL(referer).origin; } catch (_) {} }
    }
  }
  return (origin || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
};

export const getStudentSetupDetails = async (id, collegeId, req = null) => {
  const student = await prisma.student.findFirst({
    where: { id, collegeId, deletedAt: null },
    include: { user: true, college: { select: { id: true, name: true } } }
  });
  if (!student || !student.user) throw httpError('Student not found', 404, 'STUDENT_NOT_FOUND');

  if (student.user.accountStatus !== 'pending_setup' || student.user.passwordHash !== null) {
    throw httpError('Account already activated', 409, 'ACCOUNT_ALREADY_ACTIVATED');
  }
  const email = student.user.email;
  if (!email || email.includes('@pending.local')) {
    throw httpError('No email registered for this student', 400, 'EMAIL_REQUIRED');
  }

  const token = createStudentSetupToken({
    studentId: student.id, userId: student.userId, collegeId: student.collegeId, email
  });
  const frontendUrl = resolveFrontendUrl(req);
  const setupUrl = `${frontendUrl}/student/setup?token=${encodeURIComponent(token)}`;
  return { student, email, setupUrl, frontendUrl };
};

export const deliverStudentSetupMail = async ({ student, email, setupUrl, frontendUrl }) => {
  const send = sendDynamicMail({
    to: email,
    templateName: 'Student Account Setup',
    headerTitle: student.college?.name || 'College Portal',
    fromName: student.college?.name,
    variables: {
      name: student.user?.name || 'Student',
      email,
      admissionNumber: student.admissionNumber || '',
      collegeName: student.college?.name || '',
      setupUrl,
      loginUrl: `${frontendUrl}/login`,
      expiresIn: '7 days'
    }
  });
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Email send timed out after 15 seconds')), 15000));
  return Promise.race([send, timeout]);
};