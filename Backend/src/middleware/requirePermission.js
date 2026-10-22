import { prisma } from '../server.js';
import { redis } from '../lib/cache.js';

// Fast in-memory TTL cache for custom role permissions across requests (5 minutes)
const PERM_CACHE_TTL_MS = 5 * 60 * 1000;
const rolePermissionsCache = new Map();

export const invalidateRolePermissionsCache = (roleId) => {
  if (roleId) {
    for (const key of rolePermissionsCache.keys()) {
      if (key.endsWith(`:${roleId}`)) rolePermissionsCache.delete(key);
    }
  } else {
    rolePermissionsCache.clear();
  }
};

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

    const rawRole = (req.user.role || '').trim().toLowerCase();
    const { customRoleId, collegeId, userId } = req.user;
    console.log(`[requirePermission] role='${rawRole}', customRoleId='${customRoleId}', module='${moduleKey}', action='${action}'`);

    // 1. System roles (superadmin, admin) have full universal access by default
    if (rawRole === 'superadmin' || rawRole === 'admin') {
      return next();
    }
    // Teachers, faculty, hod and staff can read students and notices by default
    const TEACHER_STAFF_ROLES = ['teacher', 'hod', 'faculty', 'staff'];
    if (
      TEACHER_STAFF_ROLES.includes(rawRole) &&
      (moduleKey === 'students' || moduleKey === 'notices') &&
      action === 'read'
    ) {
      return next();
    }

    // 2. If no custom role is assigned, deny access
    if (!customRoleId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Your role '${rawRole}' does not have permission to ${action} ${moduleKey}.`
        }
      });
    }

    // 3. Fast TTL Cache lookup to avoid redundant DB queries per request
    const cacheKey = `${collegeId || 'global'}:${customRoleId}`;
    const now = Date.now();
    const cachedEntry = rolePermissionsCache.get(cacheKey);

    let permsMap;
    if (cachedEntry && cachedEntry.expiresAt > now) {
      permsMap = cachedEntry.data;
    } else {
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
      permsMap = {};
      for (const p of permissions) {
        if (p.module?.key) {
          permsMap[p.module.key] = {
            canCreate: p.canCreate,
            canRead: p.canRead,
            canUpdate: p.canUpdate,
            canDelete: p.canDelete,
          };
        }
      }
      rolePermissionsCache.set(cacheKey, { data: permsMap, expiresAt: now + PERM_CACHE_TTL_MS });
    }

    req._permissionsCache = permsMap;

    const modulePerm = req._permissionsCache[moduleKey];
    if (!modulePerm) {
      console.error(`[requirePermission] modulePerm not found for ${moduleKey}. customRoleId: ${customRoleId}, permissionsCache keys:`, Object.keys(req._permissionsCache));
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
