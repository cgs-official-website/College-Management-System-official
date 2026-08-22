import jwt from 'jsonwebtoken';
import { redis } from '../lib/cache.js';
import { prisma } from '../server.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if token/session is revoked in Redis
    if (decoded.jti) {
      const isRevoked = await redis.get(`revoked:${decoded.jti}`).catch(() => null);
      if (isRevoked) {
        return res.status(401).json({ error: 'Token revoked' });
      }
    }

    // Verify User and College Status from DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { college: true }
    });

    if (!user || user.accountStatus !== 'active') {
      return res.status(403).json({ error: 'Account disabled or deleted' });
    }

    // If not superadmin, ensure college is active or trial
    if (user.role !== 'superadmin' && user.college) {
      const blockedStatuses = ['rejected'];
      if (blockedStatuses.includes(user.college.status)) {
        return res.status(403).json({ error: { code: 'COLLEGE_REJECTED', message: 'College was rejected' } });
      }
    }

    req.user = { ...decoded, userId: decoded.userId || decoded.id };
    req.tenant = user.collegeId ? { collegeId: user.collegeId } : null;
    next();
  } catch (error) {
    console.error('Authentication Error:', error);
    return res.status(403).json({ error: 'Token expired or invalid' });
  }
};
