/**
 * RBAC middleware.
 * Usage: router.get('/', authorize('admin', 'teacher'), handler);
 */
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log(`[authorize] Forbidden! req.user.role='${req.user.role}', allowedRoles=[${allowedRoles.join(',')}]`);
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: `Requires one of: ${allowedRoles.join(', ')}` 
      });
    }

    next();
  };
};
