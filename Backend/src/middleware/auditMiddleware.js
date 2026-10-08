import { createAuditLog } from '../modules/audit/audit.service.js';
import { describeAuditEvent } from '../modules/audit/auditDescriber.js';
import { isAuditableRequest, shouldLogAuditEvent } from '../modules/audit/auditFilter.js';

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

/**
 * System-wide audit logging middleware.
 * Automatically records mutations and security events across the entire institution.
 * 
 * Strict skip-list & filter:
 * - Saves a log ONLY when a member really changes something:
 *   add, edit, delete, login, logout, failed login, role/password change, fee payment, export, or attendance.
 * - Skips session/token refresh, page views, list/search calls, polling, and saves with no change.
 * - One submission = one log row.
 */
export const auditMiddleware = (req, res, next) => {
  // Pre-filter: skip refresh, page views, list/search, polling, health checks
  if (!isAuditableRequest(req)) {
    return next();
  }

  const url = (req.originalUrl || req.url || '').toLowerCase();
  // Preserve request body snapshot for audit log (strip sensitive credentials)
  const requestBodySnapshot = req.body ? JSON.parse(JSON.stringify(req.body)) : null;

  res.on('finish', () => {
    // Extra safety: Ignore any refresh or session refresh routes
    if (url.includes('/refresh') || url.includes('/session-refresh')) {
      return;
    }

    // Determine module
    const matched = MODULE_ROUTE_MAP.find(m => url.startsWith(m.prefix));
    const module = matched ? matched.module : 'SYSTEM';

    // Determine action
    let action = METHOD_ACTION_MAP[req.method] || 'ACTION';
    if (url.includes('/export')) action = 'EXPORT';
    if (url.includes('/auth/login')) action = 'LOGIN';
    if (url.includes('/auth/logout')) action = 'LOGOUT';
    if (url.includes('/permissions') || url.includes('/roles')) action = 'ASSIGN_ROLE';
    if (url.includes('/password') || url.includes('/reset-password')) action = 'PASSWORD_CHANGE';
    if (url.includes('/registration-link')) action = 'SETTINGS_UPDATE';
    if (url.includes('/attendance')) action = 'MARK_ATTENDANCE';
    if (url.includes('/fees') || url.includes('/payment')) action = 'COLLECT_FEE';

    const statusCode = res.statusCode;
    const isSuccess = statusCode >= 200 && statusCode < 400;
    const status = isSuccess ? 'SUCCESS' : 'FAILURE';

    // Extract changed fields for updates (filter out passwords and internal timestamps)
    let changes = null;
    if ((req.method === 'PUT' || req.method === 'PATCH') && requestBodySnapshot) {
      const ignoredKeys = ['id', '_id', 'collegeId', 'createdAt', 'updatedAt', 'password', 'token', 'otp', '__v'];
      changes = Object.keys(requestBodySnapshot).filter(k => !ignoredKeys.includes(k.toLowerCase()));
      // If an update save has no actual changes, skip immediately (0 rows saved)
      if (changes.length === 0) {
        return;
      }
    }

    // Decide before saving: check skip-list and action filter
    if (!shouldLogAuditEvent({
      action,
      method: req.method,
      route: url,
      module,
      newValue: requestBodySnapshot,
      changes,
      status
    })) {
      return;
    }

    const collegeId = req.tenant?.collegeId || req.user?.collegeId;
    const userId = req.user?.id || req.user?.userId;
    const userName = req.user?.name || req.body?.name || req.body?.studentName || (action === 'LOGIN' ? req.body?.email : 'System');
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

    // Extract human-readable target attributes
    const targetName = req.body?.studentName || req.body?.name || req.body?.title || req.body?.assignmentName || req.body?.email || '';
    const amount = req.body?.amount || req.body?.amountPaid || null;
    const className = req.body?.className || req.body?.section || req.body?.batch || '';
    const fromRole = req.body?.oldRole || req.body?.fromRole || 'Teacher';
    const toRole = req.body?.newRole || req.body?.toRole || req.body?.role || 'Admin';

    // Generate human-readable sentence at write time
    const description = describeAuditEvent({
      actor: userName,
      role: userRole,
      method: req.method,
      route: url,
      module,
      action,
      targetName,
      changes,
      status,
      failureReason: isSuccess ? '' : (statusCode === 403 || statusCode === 401 ? 'permission denied' : 'operation failed'),
      amount,
      fromRole,
      toRole,
      className,
      assignmentName: req.body?.assignmentName || req.body?.title
    });

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
      changes,
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
