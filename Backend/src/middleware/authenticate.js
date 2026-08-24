import jwt from 'jsonwebtoken';
import { redis, redisKeys } from '../lib/cache.js';
import { prisma, logger } from '../server.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization token' } });
  }

  const token = authHeader.split(' ')[1];

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

    // If not superadmin, ensure college is active or trial
    if (user.role !== 'superadmin' && user.college) {
      const blockedStatuses = ['rejected'];
      if (blockedStatuses.includes(user.college.status)) {
        return res.status(403).json({ success: false, error: { code: 'COLLEGE_REJECTED', message: 'College was rejected' } });
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
