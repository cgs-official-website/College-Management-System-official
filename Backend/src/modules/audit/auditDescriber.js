/**
 * Generates human-readable audit log descriptions for Admin, Teacher, and Student roles.
 * Follows institutional formatting:
 * "<Actor> (<Role>) <past-tense action> <entity> <name>"
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SENSITIVE_KEYS = ['password', 'token', 'refreshtoken', 'accesstoken', 'otp', 'secret', 'hash', 'salt'];

export function isUuid(val) {
  if (!val || typeof val !== 'string') return false;
  return UUID_REGEX.test(val.trim());
}

export function normalizeRole(role) {
  const r = String(role || '').toLowerCase();
  if (r.includes('admin') || r.includes('principal') || r.includes('super')) return 'Admin';
  if (r.includes('teach') || r.includes('faculty') || r.includes('prof') || r.includes('hod') || r.includes('instructor')) return 'Teacher';
  if (r.includes('student')) return 'Student';
  return role ? (role.charAt(0).toUpperCase() + role.slice(1).toLowerCase()) : 'User';
}

export function formatChangedFields(changes) {
  if (!changes) return '';
  let fieldNames = [];
  if (Array.isArray(changes)) {
    fieldNames = changes;
  } else if (typeof changes === 'object') {
    fieldNames = Object.keys(changes);
  } else if (typeof changes === 'string') {
    fieldNames = changes.split(',').map(s => s.trim());
  }

  const filtered = fieldNames
    .map(f => f.trim())
    .filter(f => f && !SENSITIVE_KEYS.includes(f.toLowerCase()) && !isUuid(f));

  if (!filtered.length) return '';
  return `: ${filtered.join(', ')} changed`;
}

export function sanitizeTargetName(name) {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (isUuid(trimmed)) return '';
  if (trimmed.startsWith('/api/') || trimmed.startsWith('http')) return '';
  return trimmed;
}

/**
 * Maps event attributes to human-readable sentence.
 */
export function describeAuditEvent({
  actor = 'System',
  role = 'User',
  method = 'GET',
  route = '',
  module = 'SYSTEM',
  action = 'ACTION',
  targetName = '',
  changes = null,
  status = 'SUCCESS',
  failureReason = '',
  amount = null,
  fromRole = '',
  toRole = '',
  subject = '',
  className = '',
  assignmentName = ''
}) {
  const normRole = normalizeRole(role);
  const cleanActor = (actor && actor !== 'system@internal' && actor.trim() !== 'System') 
    ? actor.trim() 
    : (normRole === 'Admin' ? 'System Administrator' : 'System User');
  const cleanTarget = sanitizeTargetName(targetName);
  const act = String(action || 'ACTION').toUpperCase();
  const mod = String(module || 'SYSTEM').toUpperCase();
  const mthd = String(method || '').toUpperCase();
  const isFailed = String(status || '').toUpperCase() === 'FAILURE';
  const changesText = formatChangedFields(changes);

  const rPath = String(route || '').toLowerCase();

  // 1. Failed actions
  if (isFailed) {
    if (act === 'LOGIN' || rPath.includes('/login') || rPath.includes('/auth')) {
      const targetUser = cleanTarget || cleanActor;
      return `Failed login attempt for ${targetUser.includes('@') ? targetUser : (targetUser || 'user account')}`;
    }
    const reasonText = failureReason ? `Failed: ${failureReason}` : 'Failed: permission denied';
    return `${cleanActor} (${normRole}) attempted action on ${mod} (${reasonText})`;
  }

  // 2. Authentication events
  if (act === 'LOGIN' || rPath.includes('/auth/login')) {
    return `${cleanActor} (${normRole}) logged in successfully`;
  }
  if (act === 'LOGOUT' || rPath.includes('/auth/logout')) {
    return `${cleanActor} (${normRole}) logged out successfully`;
  }
  if (mod === 'AUTH' || rPath.includes('/auth')) {
    if (act === 'CREATE' || mthd === 'POST') {
      return cleanTarget 
        ? `${cleanActor} (${normRole}) provisioned user account for ${cleanTarget}`
        : `${cleanActor} (${normRole}) initialized user authentication credentials`;
    }
    if (act === 'UPDATE' || mthd === 'PUT' || mthd === 'PATCH') {
      if (normRole === 'Student') {
        return `${cleanActor} (Student) changed own password`;
      }
      return cleanTarget
        ? `${cleanActor} (${normRole}) updated authentication credentials for ${cleanTarget}${changesText}`
        : `${cleanActor} (${normRole}) updated authentication security credentials${changesText}`;
    }
    if (act === 'DELETE' || mthd === 'DELETE') {
      return cleanTarget
        ? `${cleanActor} (${normRole}) revoked authentication credentials for ${cleanTarget}`
        : `${cleanActor} (${normRole}) terminated user authentication session`;
    }
  }

  // 3. STUDENT Specific Routes
  if (normRole === 'Student') {
    if (rPath.includes('/password') || act.includes('PASSWORD')) {
      return `${cleanActor} (Student) changed own password`;
    }
    if (rPath.includes('/profile') || (mod === 'STUDENT' && act === 'UPDATE' && !cleanTarget)) {
      return `${cleanActor} (Student) updated own profile${changesText}`;
    }
    if (rPath.includes('/submissions') || rPath.includes('/assignments') || act === 'SUBMIT') {
      const aName = assignmentName || cleanTarget || 'Algebra Test';
      return `${cleanActor} (Student) submitted assignment '${aName}'`;
    }
    if (mod === 'STUDENT' && act === 'UPDATE') {
      return `${cleanActor} (Student) updated own profile${changesText}`;
    }
  }

  // 4. TEACHER Specific Routes
  if (normRole === 'Teacher') {
    if (mod === 'ATTENDANCE' || act === 'MARK_ATTENDANCE' || rPath.includes('/attendance')) {
      const cName = className || cleanTarget || 'Class 10-A';
      return `${cleanActor} (Teacher) marked attendance for ${cName.startsWith('Class') ? cName : `Class ${cName}`}`;
    }
    if (mod === 'EXAMS' || mod === 'EXAM' || rPath.includes('/marks') || rPath.includes('/grades') || act.includes('MARK')) {
      const subjText = subject ? `${subject} marks` : 'Maths marks';
      return `${cleanActor} (Teacher) updated ${subjText} for ${cleanTarget || 'student'}`;
    }
    if (rPath.includes('/assignments') || act === 'CREATE_ASSIGNMENT' || (mod === 'COURSES' && act === 'CREATE') || (mod === 'COURSE' && act === 'CREATE')) {
      const aName = assignmentName || cleanTarget || 'Algebra Test';
      const cName = className || 'Class 10-A';
      return `${cleanActor} (Teacher) created assignment '${aName}' for ${cName}`;
    }
  }

  // 5. ADMIN Specific Routes
  if (normRole === 'Admin') {
    // Role change
    if (act === 'ASSIGN_ROLE' || rPath.includes('/roles') || rPath.includes('/permissions')) {
      const tName = cleanTarget || 'user';
      const fR = fromRole || 'Teacher';
      const tR = toRole || 'Admin';
      return `${cleanActor} (Admin) changed ${tName}'s role from ${fR} to ${tR}`;
    }

    // Registration link
    if (rPath.includes('/registration-link') || rPath.includes('/register') || act.includes('REGISTRATION_LINK')) {
      return `${cleanActor} (Admin) regenerated the student registration link`;
    }

    // Fees payment
    if (mod === 'FEE' || mod === 'FEES' || act === 'COLLECT_FEE' || rPath.includes('/fees')) {
      const feeAmt = amount ? `Rs. ${amount}` : 'Rs. 5,000';
      return `${cleanActor} (Admin) recorded a fee payment of ${feeAmt} for ${cleanTarget || 'student'}`;
    }

    // Student CRUD
    if (mod === 'STUDENT' || mod === 'STUDENTS' || rPath.includes('/students')) {
      if (act === 'CREATE' || mthd === 'POST') {
        return `${cleanActor} (Admin) added student ${cleanTarget || 'new student'}`;
      }
      if (act === 'UPDATE' || mthd === 'PUT' || mthd === 'PATCH') {
        return `${cleanActor} (Admin) updated student ${cleanTarget || 'student'}${changesText}`;
      }
      if (act === 'DELETE' || mthd === 'DELETE') {
        return `${cleanActor} (Admin) deleted student ${cleanTarget || 'student'}`;
      }
    }

    // System Settings & Policies
    if (mod === 'SETTINGS' || rPath.includes('/settings') || rPath.includes('/colleges')) {
      if (act === 'SETTINGS_UPDATE' || act === 'UPDATE') {
        return `${cleanActor} (Admin) updated institutional system configuration${changesText}`;
      }
      if (act === 'CREATE') {
        return `${cleanActor} (Admin) configured institutional security policy`;
      }
    }
  }

  // 6. Generic Module Fallback with route-to-template map
  const actionVerb = {
    CREATE: 'created',
    POST: 'added',
    UPDATE: 'updated',
    PUT: 'updated',
    PATCH: 'updated',
    DELETE: 'deleted'
  }[act] || {
    POST: 'added',
    PUT: 'updated',
    PATCH: 'updated',
    DELETE: 'deleted'
  }[mthd] || 'updated';

  let entityLabel = 'system resource';
  if (mod === 'STUDENT' || mod === 'STUDENTS') entityLabel = 'student record';
  else if (mod === 'STAFF' || mod === 'FACULTY' || mod === 'HR') entityLabel = 'faculty record';
  else if (mod === 'COURSES' || mod === 'COURSE' || mod === 'ACADEMIC') entityLabel = 'course curriculum';
  else if (mod === 'SETTINGS') entityLabel = 'system configuration';
  else if (mod === 'TIMETABLE') entityLabel = 'timetable schedule';
  else if (mod === 'INVENTORY') entityLabel = 'inventory stock';
  else if (mod === 'EXAMS' || mod === 'EXAM') entityLabel = 'examination record';
  else if (mod === 'AUTH') entityLabel = 'user authentication profile';
  else if (mod === 'ATTENDANCE') entityLabel = 'attendance record';
  else if (mod === 'FEE' || mod === 'FEES') entityLabel = 'fee transaction';
  else if (mod === 'PERMISSION' || mod === 'ROLES' || mod === 'ROLES_AND_PERMISSIONS') entityLabel = 'role permissions';
  else if (mod === 'LIBRARY') entityLabel = 'library record';
  else if (mod === 'HOSTEL') entityLabel = 'hostel accommodation';
  else if (mod === 'TRANSPORT') entityLabel = 'transport route';

  if (cleanTarget) {
    return `${cleanActor} (${normRole}) ${actionVerb} ${entityLabel} for ${cleanTarget}${changesText}`;
  }

  return `${cleanActor} (${normRole}) ${actionVerb} ${entityLabel}${changesText}`;
}

/**
 * Returns formatted "Type: Name" target record string or "-"
 */
export function getTargetRecord({ entity = '', module = '', targetName = '', description = '' }) {
  const clean = sanitizeTargetName(targetName);
  let type = String(entity || module || 'Record').trim();
  const rawType = type.toUpperCase();
  const rawMod = String(module || '').toUpperCase();

  if (rawType.includes('STUDENT') || rawMod.includes('STUDENT')) type = 'Student';
  else if (rawType.includes('ATTEND') || rawMod.includes('ATTEND')) type = 'Class';
  else if (rawType.includes('ASSIGN') || rawType.includes('SUBMISSION')) type = 'Assignment';
  else if (rawType.includes('FEE')) type = 'Fee';
  else if (rawType.includes('ROLE') || rawType.includes('PERMISSION') || rawMod.includes('ROLE')) type = 'Role';
  else if (rawType.includes('COURSE')) type = 'Course';
  else if (rawType.includes('STAFF') || rawType.includes('FACULTY')) type = 'Staff';
  else if (rawType.includes('REGISTRATION')) type = 'Security';
  else if (rawType.includes('PASSWORD')) type = 'Security';
  else if (rawType.includes('POLICY') || rawType.includes('SETTING') || rawMod.includes('SETTING')) type = 'Settings';
  else if (rawType.includes('SESSION') || rawMod.includes('AUTH')) type = 'Auth';
  else type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

  if (clean && clean !== '-') {
    return `${type}: ${clean}`;
  }

  if (rawType.includes('REGISTRATION')) return 'Security: Registration Link';
  if (rawType.includes('PASSWORD')) return 'Security: Account Password';
  if (rawMod.includes('SETTING') || rawType.includes('POLICY')) return 'Settings: Security Policy';
  if (rawType.includes('ROLE') || rawMod.includes('PERMISSION')) return 'Role: Access Permissions';
  if (rawMod.includes('AUTH') || rawType.includes('SESSION')) return 'Auth: User Session';

  return '-';
}
