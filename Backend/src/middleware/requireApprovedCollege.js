import { prisma } from '../server.js';
import { redis } from '../lib/cache.js';

/**
 * Fetches the live, authoritative status of a College from Redis cache or PostgreSQL.
 */
export const getLiveCollegeStatus = async (collegeId) => {
  if (!collegeId) return null;

  const cacheKey = `college_status:${collegeId}`;
  if (redis && redis.status === 'ready') {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return cached;
    } catch (err) {
      // Fail open to DB query
    }
  }

  const college = await prisma.college.findUnique({
    where: { id: collegeId },
    select: { id: true, name: true, status: true }
  });

  if (!college) return null;

  if (redis && redis.status === 'ready') {
    try {
      await redis.set(cacheKey, college.status, 'EX', 3600);
    } catch (err) {}
  }

  return college.status;
};

/**
 * Invalidates only the College/Tenant status cache in Redis upon approval/rejection/suspension.
 * NEVER deletes authentication keys or refresh tokens (e.g. refresh:*, auth:*).
 */
export const invalidateCollegeStatusCache = async (collegeId) => {
  if (!collegeId) return;
  const cacheKey = `college_status:${collegeId}`;
  const tenantKey = `tenant:${collegeId}`;
  if (redis && redis.status === 'ready') {
    try {
      await Promise.all([
        redis.del(cacheKey).catch(() => {}),
        redis.del(tenantKey).catch(() => {})
      ]);
    } catch (err) {}
  }
};

/**
 * Authorizes request based on live, authoritative College status.
 * Rejects pending, suspended, or rejected colleges from accessing protected APIs.
 */
export const requireApprovedCollege = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
  }

  // Super Admin bypasses college approval check unconditionally
  if (req.user.role === 'superadmin') {
    return next();
  }

  const collegeId = req.tenant?.collegeId || req.user?.collegeId;
  if (!collegeId) {
    return res.status(403).json({ success: false, error: { code: 'TENANT_REQUIRED', message: 'Tenant context is missing' } });
  }

  const currentStatus = await getLiveCollegeStatus(collegeId);

  if (!currentStatus) {
    return res.status(404).json({ success: false, error: { code: 'COLLEGE_NOT_FOUND', message: 'College institution not found' } });
  }

  if (currentStatus === 'active' || currentStatus === 'trial') {
    req.tenant = req.tenant || {};
    req.tenant.status = currentStatus;
    return next();
  }

  if (currentStatus === 'pending') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'COLLEGE_PENDING_APPROVAL',
        message: 'Your college registration is currently pending approval by the Super Admin.'
      }
    });
  }

  if (currentStatus === 'suspended') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'COLLEGE_SUSPENDED',
        message: 'Your college account is suspended. Please contact support.'
      }
    });
  }

  if (currentStatus === 'rejected') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'COLLEGE_REJECTED',
        message: 'Your college registration was rejected.'
      }
    });
  }

  return res.status(403).json({
    success: false,
    error: {
      code: 'COLLEGE_INACTIVE',
      message: `Access denied. College status is ${currentStatus}.`
    }
  });
};
