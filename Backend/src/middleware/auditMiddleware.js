import { createAuditLog } from '../modules/audit/audit.service.js';

// Map URL prefixes to institutional modules
const MODULE_ROUTE_MAP = [
  { prefix: '/api/v1/auth', module: 'AUTH' },
  { prefix: '/api/v1/students', module: 'STUDENTS' },
  { prefix: '/api/v1/hr', module: 'STAFF' },
  { prefix: '/api/v1/staff', module: 'STAFF' },
  { prefix: '/api/v1/fees', module: 'FEES' },
  { prefix: '/api/v1/attendance', module: 'ATTENDANCE' },
  { prefix: '/api/v1/courses', module: 'COURSES' },
  { prefix: '/api/v1/departments', module: 'COURSES' },
  { prefix: '/api/v1/academic', module: 'COURSES' },
  { prefix: '/api/v1/sections', module: 'COURSES' },
  { prefix: '/api/v1/roles', module: 'ROLES_AND_PERMISSIONS' },
  { prefix: '/api/v1/permissions', module: 'ROLES_AND_PERMISSIONS' },
  { prefix: '/api/v1/colleges', module: 'SETTINGS' },
  { prefix: '/api/v1/settings', module: 'SETTINGS' },
  { prefix: '/api/v1/exams', module: 'EXAMS' },
  { prefix: '/api/v1/timetable', module: 'TIMETABLE' },
  { prefix: '/api/v1/transport', module: 'TRANSPORT' },
  { prefix: '/api/v1/hostel', module: 'HOSTEL' },
  { prefix: '/api/v1/library', module: 'LIBRARY' },
  { prefix: '/api/v1/notices', module: 'NOTICES' },
  { prefix: '/api/v1/inventory', module: 'INVENTORY' },
  { prefix: '/api/v1/payroll', module: 'PAYROLL' },
  { prefix: '/api/v1/admissions', module: 'ADMISSIONS' },
  { prefix: '/api/v1/infrastructure', module: 'INFRASTRUCTURE' },
  { prefix: '/api/v1/complaints', module: 'COMPLAINTS' },
  { prefix: '/api/v1/placements', module: 'PLACEMENTS' },
];

const METHOD_ACTION_MAP = {
  POST: 'CREATE',
  PUT: 'UPDATE',
  PATCH: 'UPDATE',
  DELETE: 'DELETE'
};

const IGNORED_PATHS = [
  '/api/v1/audit-logs',
  '/health',
  '/redis-test',
  '/notifications',
  '/socket.io'
];

/**
 * System-wide audit logging middleware.
 * Automatically records mutations and security events across the entire institution.
 */
export const auditMiddleware = (req, res, next) => {
  const url = req.originalUrl || req.url;

  // Ignore static assets, health probes, and audit-log reads themselves
  if (IGNORED_PATHS.some(p => url.startsWith(p))) {
    return next();
  }

  // Only audit state-changing methods or special auth routes
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const isAuthAction = url.includes('/auth/login') || url.includes('/auth/logout') || url.includes('/auth/reset-password');

  if (!isMutation && !isAuthAction) {
    return next();
  }

  // Preserve request body snapshot for audit log
  const requestBodySnapshot = req.body ? JSON.parse(JSON.stringify(req.body)) : null;

  res.on('finish', () => {
    // Determine module
    const matched = MODULE_ROUTE_MAP.find(m => url.startsWith(m.prefix));
    const module = matched ? matched.module : 'SYSTEM';

    // Determine action
    let action = METHOD_ACTION_MAP[req.method] || 'ACTION';
    if (url.includes('/auth/login')) action = 'LOGIN';
    if (url.includes('/auth/logout')) action = 'LOGOUT';
    if (url.includes('/permissions')) action = 'PERMISSION_CHANGE';

    const statusCode = res.statusCode;
    const isSuccess = statusCode >= 200 && statusCode < 400;
    const status = isSuccess ? 'SUCCESS' : 'FAILURE';

    const collegeId = req.tenant?.collegeId || req.user?.collegeId;
    const userId = req.user?.id || req.user?.userId;
    const userName = req.user?.name || req.body?.name || (action === 'LOGIN' ? req.body?.email : 'System');
    const userEmail = req.user?.email || req.body?.email || 'system@internal';
    const userRole = req.user?.role || (action === 'LOGIN' ? 'user' : 'admin');

    const ipAddress = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown Device';

    // Extract entity details from URL or body
    const pathParts = url.split('?')[0].split('/').filter(Boolean);
    const lastPart = pathParts[pathParts.length - 1];
    const isIdInUrl = /^[0-9a-f-]{4,}$/i.test(lastPart) || /^\d+$/.test(lastPart);
    const entityId = isIdInUrl ? lastPart : (req.body?.id || null);
    const entity = pathParts[pathParts.length - (isIdInUrl ? 2 : 1)] || module;

    const description = `${action} performed on ${entity}${entityId ? ` (#${entityId})` : ''} via ${req.method} ${url}`;

    // Execute asynchronously to avoid delaying response delivery
    createAuditLog({
      collegeId,
      userId,
      userName,
      userEmail,
      userRole,
      action,
      module,
      entity,
      entityId,
      description,
      oldValue: null,
      newValue: requestBodySnapshot,
      ipAddress,
      userAgent,
      status
    }).catch(err => {
      // Non-fatal background error
    });
  });

  next();
};

export default auditMiddleware;
