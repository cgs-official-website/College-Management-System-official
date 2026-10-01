import jwt from 'jsonwebtoken';

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required for teacher setup links.');
  }
  return process.env.JWT_SECRET;
};

// ─────────────────────────────────────────────────────────────────────────────
// Teacher Registration Token
// Used in the Registration Link sent by the Admin.
// Does NOT embed an email — the teacher provides their own email during
// the registration step.
// ─────────────────────────────────────────────────────────────────────────────
export const createTeacherRegistrationToken = ({ teacherRecordId, teacherId, userId, collegeId }) =>
  jwt.sign(
    { type: 'teacher-registration', teacherRecordId, teacherId, userId, collegeId },
    getJwtSecret(),
    { expiresIn: '30d' }
  );

export const verifyTeacherRegistrationToken = (token) => {
  const claims = jwt.verify(token, getJwtSecret());
  if (
    claims.type !== 'teacher-registration' ||
    typeof claims.teacherRecordId !== 'string' ||
    typeof claims.teacherId !== 'string' ||
    typeof claims.userId !== 'string' ||
    typeof claims.collegeId !== 'string'
  ) {
    throw new Error('Invalid teacher registration token.');
  }
  return claims;
};

// ─────────────────────────────────────────────────────────────────────────────
// Staff Setup Token
// Generated AUTOMATICALLY after the teacher completes registration.
// Embeds the teacher's registered email.
// Sent to teacher.email — never to admin email.
// ─────────────────────────────────────────────────────────────────────────────
export const createStaffSetupToken = ({ teacherRecordId, teacherId, userId, collegeId, email }) =>
  jwt.sign(
    { type: 'staff-setup', teacherRecordId, teacherId, userId, collegeId, email },
    getJwtSecret(),
    { expiresIn: '7d' }
  );

export const verifyStaffSetupToken = (token) => {
  const claims = jwt.verify(token, getJwtSecret());
  if (
    claims.type !== 'staff-setup' ||
    typeof claims.teacherRecordId !== 'string' ||
    typeof claims.teacherId !== 'string' ||
    typeof claims.userId !== 'string' ||
    typeof claims.collegeId !== 'string' ||
    typeof claims.email !== 'string'
  ) {
    throw new Error('Invalid teacher setup token.');
  }
  return claims;
};