import type { PermissionsMap } from '../types/auth';

export const normalizeRole = (role: unknown): string =>
  typeof role === 'string' ? role.trim().toLowerCase() : '';

export const isTeacherRole = (role: string): boolean => ['teacher', 'hod', 'faculty'].includes(role);

/** Same destination logic as the web `getRoleDestination`. */
export const getRoleLabel = (role: string): string => {
  switch (role) {
    case 'superadmin':
      return 'Super Admin';
    case 'admin':
      return 'Administrator';
    case 'teacher':
    case 'faculty':
      return 'Teacher';
    case 'hod':
      return 'Head of Department';
    case 'student':
      return 'Student';
    case 'parent':
      return 'Parent';
    default:
      return role;
  }
};

type Action = 'create' | 'read' | 'update' | 'delete';

/**
 * Admin users always have full access; staff with a custom role are limited by the
 * permission map returned from /auth/me. Modules missing from the map are denied
 * only when a map exists (non-empty).
 */
export const can = (
  role: string,
  permissions: PermissionsMap,
  moduleKey: string,
  action: Action = 'read',
): boolean => {
  if (role === 'superadmin' || role === 'admin') return true;
  const p = permissions?.[moduleKey];
  if (!p) return Object.keys(permissions || {}).length === 0;
  switch (action) {
    case 'create':
      return !!p.canCreate;
    case 'read':
      return !!p.canRead;
    case 'update':
      return !!p.canUpdate;
    case 'delete':
      return !!p.canDelete;
  }
};
