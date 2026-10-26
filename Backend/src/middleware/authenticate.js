import jwt from 'jsonwebtoken';
import { redis, redisKeys } from '../lib/cache.js';
import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';
import { isEmailAllowedForCollege, isExemptRole } from '../modules/domains/domains.service.js';

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is required but missing.');
}
const JWT_SECRET = process.env.JWT_SECRET;

export const authenticate = async (req, res, next) => {
  let token = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query?.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization token' } });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if token/session is revoked in Redis (with fail-open safety)
    if (decoded.jti) {
      if (redis.status === 'ready') {
        const isRevoked = await redis.get(redisKeys.revokedToken(decoded.jti)).catch(() => null);
        if (isRevoked) {
          return res.status(401).json({ success: false, error: { code: 'TOKEN_REVOKED', message: 'Token has been revoked' } });
        }
      }
    }

    // Verify User and College Status from DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { college: true }
    });

    if (!user || user.accountStatus !== 'active') {
      return res.status(403).json({ success: false, error: { code: 'ACCOUNT_INACTIVE', message: 'Account is disabled or deleted' } });
    }

    if (user.role !== 'superadmin' && user.college) {
      const blockedStatuses = ['rejected'];
      if (blockedStatuses.includes(user.college.status)) {
        return res.status(403).json({ success: false, error: { code: 'COLLEGE_REJECTED', message: 'College was rejected' } });
      }
    }

    if (user.collegeId && !isExemptRole(user.role)) {
      let domainCheck = null;
      try {
        domainCheck = await isEmailAllowedForCollege(user.collegeId, user.email, user.role);
      } catch (domainErr) {
        logger.warn(`[warn] Domain check failed in authenticate for user ${user.id}: ${domainErr.message}`);
      }
      if (domainCheck && !domainCheck.allowed) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'EMAIL_DOMAIN_NOT_ALLOWED',
            message: "Please sign in with your institution's email address."
          }
        });
      }
    }

    req.user = {
      ...decoded,
      userId: user.id,
      id: user.id,
      role: user.role,
      collegeId: user.collegeId,
      customRoleId: user.customRoleId,
      email: user.email,
      name: user.name
    };
    req.tenant = user.collegeId ? { collegeId: user.collegeId } : null;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'Access token expired' } });
    }
    logger.warn(`[warn] JWT Authentication Failed: ${error.message}`);
    return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' } });
  }
};