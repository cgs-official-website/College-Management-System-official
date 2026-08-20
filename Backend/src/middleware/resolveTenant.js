/**
 * Extracts and strictly enforces tenant context (collegeId).
 * Must run AFTER authenticate middleware.
 */
export const resolveTenant = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'User context missing' });
  }

  const { collegeId, role } = req.user;

  if (!collegeId && role !== 'superadmin') {
    return res.status(403).json({ error: 'Tenant context (collegeId) missing for non-superadmin user' });
  }

  req.tenant = { collegeId };
  next();
};
