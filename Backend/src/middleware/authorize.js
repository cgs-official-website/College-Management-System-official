/**
 * RBAC middleware.
 * Usage: router.get('/', authorize('admin', 'teacher'), handler);
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userRole = (req.user.role || '').trim().toLowerCase();
    const normalizedAllowed = allowedRoles.map((r) => String(r).trim().toLowerCase());

    // Superadmin has universal administrative access
    if (userRole === 'superadmin') {
      return next();
    }

    // College admin has access to tenant administrative and staff routes (unless exclusively superadmin)
    if (userRole === 'admin' && (normalizedAllowed.includes('admin') || !normalizedAllowed.includes('superadmin'))) {
      return next();
    }

    if (!normalizedAllowed.includes(userRole)) {
      console.log(`[authorize] Forbidden! req.user.role='${req.user.role}', allowedRoles=[${allowedRoles.join(',')}]`);
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: `Requires one of: ${allowedRoles.join(', ')}` 
      });
    }

    next();
  };
};
