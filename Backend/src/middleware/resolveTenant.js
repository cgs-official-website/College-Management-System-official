import { prisma } from '../server.js';
import { requireApprovedCollege, getLiveCollegeStatus, invalidateCollegeStatusCache } from './requireApprovedCollege.js';

export { requireApprovedCollege, getLiveCollegeStatus, invalidateCollegeStatusCache };

/**
 * Extracts and strictly enforces tenant context (collegeId) and verifies live approval status.
 * Must run AFTER authenticate middleware.
 */
export const resolveTenant = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User context missing' } });
  }

  // Strictly bind collegeId from authenticated user unless superadmin explicitly overrides
  let collegeId = req.user.role === 'superadmin'
    ? (req.headers?.['x-college-id'] || req.query?.collegeId || req.body?.collegeId || req.user?.collegeId)
    : req.user?.collegeId;

  if (!collegeId) {
    if (req.user.role === 'superadmin') {
      const activeCollege = await prisma.college.findFirst({
        where: { status: 'active' },
        orderBy: { createdAt: 'asc' }
      });
      if (activeCollege) {
        collegeId = activeCollege.id;
      }
    } else {
      return res.status(403).json({ success: false, error: { code: 'TENANT_REQUIRED', message: 'Tenant context (collegeId) missing for user' } });
    }
  }

  req.tenant = { collegeId };
  if (!req.user.collegeId && collegeId) {
    req.user.collegeId = collegeId;
  }

  // Authoritatively enforce approval status
  return requireApprovedCollege(req, res, next);
};
