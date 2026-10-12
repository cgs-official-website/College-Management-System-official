/**
 * Audit Logging Skip-List and Action Filter
 * 
 * Enforces strict enterprise rules:
 * - Save a log ONLY when a member really changes something:
 *   add, edit (with real changes), delete, login, logout, failed login,
 *   role/password change, fee payment, export, or attendance submission.
 * - MUST NOT save logs for:
 *   session/token refresh, page views, list/search calls, polling, or saves with no change.
 * - Decide before saving, by action type.
 * - One submission = one log row.
 */

// Actions that represent a real change or security event
export const ALLOWED_AUDIT_ACTIONS = new Set([
  'CREATE',
  'ADD',
  'INSERT',
  'UPDATE',
  'EDIT',
  'MODIFY',
  'SETTINGS_UPDATE',
  'DELETE',
  'REMOVE',
  'LOGIN',
  'FAILED_LOGIN',
  'LOGOUT',
  'ASSIGN_ROLE',
  'ROLE_CHANGE',
  'PASSWORD_CHANGE',
  'RESET_PASSWORD',
  'COLLECT_FEE',
  'FEE_PAYMENT',
  'EXPORT',
  'MARK_ATTENDANCE'
]);

// Keywords in action names that MUST be skipped
export const SKIPPED_ACTION_KEYWORDS = [
  'REFRESH',
  'SESSION_REFRESH',
  'TOKEN_REFRESH',
  'VIEW',
  'PAGE_VIEW',
  'READ',
  'LIST',
  'SEARCH',
  'QUERY',
  'FILTER',
  'POLL',
  'POLLING',
  'HEALTH',
  'PING',
  'HEARTBEAT'
];

// URL route patterns that MUST be skipped
export const SKIPPED_ROUTE_PATTERNS = [
  '/auth/refresh',
  '/refresh',
  '/health',
  '/redis-test',
  '/notifications',
  '/socket.io',
  '/audit-logs',
  '/ping',
  '/status',
  '/live',
  '/metrics',
  '/favicon.ico'
];

// Internal keys ignored when comparing oldValue vs newValue
export const IGNORED_DIFF_KEYS = new Set([
  'id',
  '_id',
  'collegeid',
  'createdat',
  'updatedat',
  'password',
  'token',
  'otp',
  '__v',
  'ipaddress',
  'useragent'
]);

/**
 * Checks whether an edit / update operation actually contains real changes.
 * Returns false if values are identical, empty, or only ignored metadata changed.
 */
export function hasActualChanges(oldValue, newValue, changes = null) {
  // If a pre-filtered changes array is provided
  if (Array.isArray(changes)) {
    return changes.length > 0;
  }

  // If newValue is empty, null, or not an object, there are no changes
  if (!newValue || typeof newValue !== 'object' || Object.keys(newValue).length === 0) {
    return false;
  }

  // If oldValue is not provided, check if newValue has any meaningful non-ignored keys
  if (!oldValue || typeof oldValue !== 'object') {
    const validKeys = Object.keys(newValue).filter(k => !IGNORED_DIFF_KEYS.has(k.toLowerCase()));
    return validKeys.length > 0;
  }

  // Both oldValue and newValue exist: compare non-ignored fields
  const allKeys = Array.from(new Set([...Object.keys(oldValue), ...Object.keys(newValue)]));
  const diffKeys = allKeys.filter(k => {
    if (IGNORED_DIFF_KEYS.has(k.toLowerCase())) return false;
    const oldValStr = JSON.stringify(oldValue[k] ?? null);
    const newValStr = JSON.stringify(newValue[k] ?? null);
    return oldValStr !== newValStr;
  });

  return diffKeys.length > 0;
}

/**
 * Decides BEFORE SAVING whether an audit event should be logged.
 * 
 * Returns true if the event represents an allowed real change.
 * Returns false if it should be skipped (e.g. refresh, page view, list/search, polling, no-change).
 */
export function shouldLogAuditEvent({
  action,
  method = '',
  route = '',
  url = '',
  module = '',
  entity = '',
  oldValue = null,
  newValue = null,
  changes = null,
  status = 'SUCCESS'
}) {
  const normAction = String(action || '').toUpperCase().trim();
  const reqUrl = String(route || url || '').toLowerCase().trim();
  const reqMethod = String(method || '').toUpperCase().trim();
  const normEntity = String(entity || '').toUpperCase().trim();
  const normModule = String(module || '').toUpperCase().trim();

  // 1. Skip paths matching skip-list (refresh, polling, health, etc.)
  if (reqUrl && SKIPPED_ROUTE_PATTERNS.some(pattern => reqUrl.includes(pattern))) {
    return false;
  }

  // 2. Skip by action keyword (refresh, view, list, search, poll, etc.)
  if (SKIPPED_ACTION_KEYWORDS.some(kw => normAction.includes(kw))) {
    return false;
  }

  // 3. Skip entity or module if marked as refresh or session refresh
  if (normEntity.includes('REFRESH') || normModule.includes('REFRESH')) {
    return false;
  }

  // 4. Page views and list/search calls (GET requests without export)
  if (reqMethod === 'GET' || reqMethod === 'HEAD' || reqMethod === 'OPTIONS') {
    const isExport = normAction === 'EXPORT' || reqUrl.includes('/export');
    if (!isExport) {
      return false; // Skip all page views, list, search, and polling calls
    }
  }

  // 5. Check if action is in the allowed action set
  const isAllowedAction = ALLOWED_AUDIT_ACTIONS.has(normAction);
  if (!isAllowedAction) {
    return false;
  }

  // 6. Check for saves with no change (for edit / update actions)
  const isEditAction = ['UPDATE', 'EDIT', 'MODIFY', 'SETTINGS_UPDATE'].includes(normAction);
  if (isEditAction) {
    if (!hasActualChanges(oldValue, newValue, changes)) {
      return false; // Skip saves with no change
    }
  }

  return true;
}

/**
 * Quick preliminary check for HTTP requests in middleware.
 * Prevents attaching audit listeners on read-only, refresh, or polling routes.
 */
export function isAuditableRequest(req) {
  if (!req) return false;
  const url = (req.originalUrl || req.url || '').toLowerCase();
  const method = (req.method || '').toUpperCase();

  // Skip ignored routes (refresh, health, polling, etc.)
  if (SKIPPED_ROUTE_PATTERNS.some(p => url.includes(p))) {
    return false;
  }

  // Page views, list/search, polling: skip all GET/HEAD/OPTIONS unless it's an export
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return url.includes('/export');
  }

  // Mutations and special auth actions
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
  const isAuthAction = url.includes('/auth/login') || url.includes('/auth/logout') || url.includes('/auth/reset-password');
  const isExport = url.includes('/export');

  return isMutation || isAuthAction || isExport;
}
