import jwt from 'jsonwebtoken';

const getJwtSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required for teacher setup links.');
  }
  return process.env.JWT_SECRET;
};

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