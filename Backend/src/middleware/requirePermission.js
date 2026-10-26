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

    // 1. System roles (superadmin, admin) have full universal access across all modules
    if (rawRole === 'superadmin' || rawRole === 'admin') {
      return next();
    }

    // 2. Broadcast / announcements reading is open to all authenticated college members
    if (moduleKey === 'notices' && action === 'read') {
      return next();
    }

    // 2. Resolve customRoleId or fallback to matching role in this college (e.g., HOD, Teacher, Staff)
    let effectiveRoleId = customRoleId;
    if (!effectiveRoleId && collegeId) {
      const roleNameMap = {
        hod: 'HOD',
        teacher: 'Teacher',
        staff: 'Staff',
        faculty: 'Teacher'
      };
      const targetRoleName = roleNameMap[rawRole] || rawRole;
      const matchedRole = await prisma.role.findFirst({
        where: {
          collegeId,
          name: { equals: targetRoleName, mode: 'insensitive' }
        },
        select: { id: true }
      });

      if (matchedRole) {
        effectiveRoleId = matchedRole.id;
        // Asynchronously link customRoleId on user record for fast future requests
        const targetUserId = req.user.userId || req.user.id;
        if (targetUserId) {
          prisma.user.update({
            where: { id: targetUserId },
            data: { customRoleId: matchedRole.id }
          }).catch((err) => {
            console.warn('[requirePermission] Background user customRoleId update failed:', err.message);
          });
        }
      }
    }

    // 3. If no role is assigned or found, deny access
    if (!effectiveRoleId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Access denied. Your role '${rawRole}' does not have permissions assigned by the college administrator.`
        }
      });
    }

    // 4. Fast TTL Cache lookup to avoid redundant DB queries per request
    const cacheKey = `${collegeId || 'global'}:${effectiveRoleId}`;
    const now = Date.now();
    const cachedEntry = rolePermissionsCache.get(cacheKey);

    let permsMap;
    if (cachedEntry && cachedEntry.expiresAt > now) {
      permsMap = cachedEntry.data;
    } else {
      const permissions = await prisma.rolePermission.findMany({
        where: {
          roleId: effectiveRoleId,
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

    // Default read access for essential operational modules (notices and students) for staff:
    // Unless explicitly restricted with canRead === false by the College Admin in the permissions matrix
    const TEACHER_STAFF_ROLES = ['teacher', 'hod', 'faculty', 'staff'];
    if (TEACHER_STAFF_ROLES.includes(rawRole) && action === 'read') {
      if (moduleKey === 'notices') {
        const noticePerm = req._permissionsCache?.['notices'];
        if (!noticePerm || noticePerm.canRead !== false) {
          return next();
        }
      }
      if (moduleKey === 'students') {
        const studentPerm = req._permissionsCache?.['students'];
        if (!studentPerm || studentPerm.canRead !== false) {
          return next();
        }
      }
    }

    const modulePerm = req._permissionsCache[moduleKey];
    if (!modulePerm) {
      if (action === 'read' && moduleKey === 'notices' && TEACHER_STAFF_ROLES.includes(rawRole)) {
        return next();
      }
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
