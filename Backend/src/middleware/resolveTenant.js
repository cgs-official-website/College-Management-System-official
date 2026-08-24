import { prisma } from '../server.js';

/**
 * Extracts and strictly enforces tenant context (collegeId).
 * Must run AFTER authenticate middleware.
 */
export const resolveTenant = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'User context missing' });
  }

  let collegeId = req.headers?.['x-college-id'] || req.query?.collegeId || req.body?.collegeId || req.user?.collegeId;

  if (!collegeId) {
    if (req.user.role === 'superadmin') {
      // Superadmin fallback: resolve to first active college if not explicitly passed
      const activeCollege = await prisma.college.findFirst({
        where: { status: 'active' },
        orderBy: { createdAt: 'asc' }
      });
      if (activeCollege) {
        collegeId = activeCollege.id;
      }
    } else {
      return res.status(403).json({ error: 'Tenant context (collegeId) missing for non-superadmin user' });
    }
  }

  req.tenant = { collegeId };
  if (!req.user.collegeId && collegeId) {
    req.user.collegeId = collegeId;
  }
  next();
};
