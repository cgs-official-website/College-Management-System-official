import { prisma } from '../server.js';

/**
 * Dynamic Permission Middleware
 * Checks granular permissions per module action for tenant custom roles.
 * 
 * @param {string} moduleKey - e.g. 'students', 'staff', 'attendance', 'fees', 'exams', 'library', 'hostel', 'transport'
 * @param {'create' | 'read' | 'update' | 'delete'} action - The action required for the endpoint
 */
export const requirePermission = (moduleKey, action) => async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
      });
    }

    const { role, customRoleId, collegeId, userId } = req.user;

    // 1. System roles (superadmin, admin) have full access by default
    if (role === 'superadmin' || role === 'admin') {
      return next();
    }

    // 2. If no custom role is assigned, deny access
    if (!customRoleId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Your role '${role}' does not have permission to ${action} ${moduleKey}.`
        }
      });
    }

    // 3. Cache lookup per request on `req` to avoid redundant DB queries
    if (!req._permissionsCache) {
      const permissions = await prisma.rolePermission.findMany({
        where: {
          roleId: customRoleId,
          role: {
            collegeId: collegeId || undefined
          }
        },
        include: {
          module: true
        }
      });

      // Map permissions into an object { [moduleKey]: { canCreate, canRead, canUpdate, canDelete } }
      req._permissionsCache = {};
      for (const p of permissions) {
        if (p.module?.key) {
          req._permissionsCache[p.module.key] = {
            canCreate: p.canCreate,
            canRead: p.canRead,
            canUpdate: p.canUpdate,
            canDelete: p.canDelete,
          };
        }
      }
    }

    const modulePerm = req._permissionsCache[moduleKey];
    if (!modulePerm) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Permission denied for module '${moduleKey}'.`
        }
      });
    }

    const actionKeyMap = {
      create: 'canCreate',
      read: 'canRead',
      update: 'canUpdate',
      delete: 'canDelete'
    };

    const permField = actionKeyMap[action.toLowerCase()];
    if (!permField || !modulePerm[permField]) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Forbidden: You do not have permission to ${action} records in the ${moduleKey} module.`
        }
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default requirePermission;
