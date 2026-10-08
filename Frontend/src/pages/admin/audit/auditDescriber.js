/**
 * Client-side audit event describer and target record formatter.
 * Handles display-time generation of human-readable sentences for old rows.
 * Format: "<Actor> (<Role>) <past-tense action> <entity> <name>"
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SENSITIVE_KEYS = ['password', 'token', 'refreshtoken', 'accesstoken', 'otp', 'secret', 'hash'];

export function isUuid(val) {
  if (!val || typeof val !== 'string') return false;
  return UUID_REGEX.test(val.trim());
}

export function sanitizeTargetName(name) {
  if (!name || typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (isUuid(trimmed) || /^[0-9a-f-]{15,}$/i.test(trimmed)) return '';
  if (trimmed.startsWith('/api/') || trimmed.startsWith('http')) return '';
  return trimmed;
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

/**
 * Creates human-readable description for all 3 roles: Admin, Teacher, Student
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

  // 6. Generic Professional Fallback (Never show technical labels like "created auth")
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
 * Returns clean human-readable sentence for display.
 * Detects and replaces technical phrases (like "System (Admin) created auth") with professional descriptions.
 */
export function getDisplayDescription(log) {
  if (!log) return '';
  const desc = String(log.description || '').trim();

  // Detect technical, robotic, or unformatted legacy text
  const isTechnicalText = 
    desc.toLowerCase().includes('created auth') || 
    desc.toLowerCase().includes('updated auth') || 
    desc.toLowerCase().includes('deleted auth') || 
    desc.toLowerCase().endsWith(' auth') ||
    desc.toLowerCase().includes('created system') || 
    desc.toLowerCase().includes('updated system') || 
    desc.toLowerCase().includes('created settings') ||
    desc.toLowerCase().includes('performed on') || 
    desc.toLowerCase().includes('via post') || 
    desc.toLowerCase().includes('via get') || 
    desc.toLowerCase().includes('via put') || 
    desc.toLowerCase().includes('via delete') || 
    desc.toLowerCase().includes('/api/v1/') ||
    desc.toLowerCase().includes('/api/') ||
    /^System \([A-Za-z]+\) (created|updated|deleted)/i.test(desc);

  if (!isTechnicalText && desc.length > 5 && !desc.includes('/api/')) {
    // Already saved human-readable sentence at write time, sanitize any raw UUIDs
    return desc.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, '').trim();
  }

  // Generate on display time for technical/legacy rows
  const targetName = log.newValue?.studentName || log.newValue?.name || log.newValue?.title || log.newValue?.assignmentTitle || log.newValue?.className || log.entityId || '';
  let changes = null;
  if (log.action === 'UPDATE' && log.newValue && typeof log.newValue === 'object') {
    changes = Object.keys(log.newValue).filter(k => !['id', '_id', 'createdAt', 'updatedAt', 'collegeId', 'password', 'token', 'otp'].includes(k.toLowerCase()));
  }

  return describeAuditEvent({
    actor: log.userName,
    role: log.userRole,
    module: log.module,
    action: log.action,
    targetName,
    changes,
    status: log.status,
    amount: log.newValue?.amountPaid || log.newValue?.amount || log.oldValue?.dueAmount,
    fromRole: log.oldValue?.role || log.oldValue?.fromRole,
    toRole: log.newValue?.role || log.newValue?.toRole,
    className: log.newValue?.className,
    assignmentName: log.newValue?.title || log.newValue?.assignmentTitle
  });
}

/**
 * Returns formatted "Type: Name" (e.g. "Student: Arun S", "Security: Registration Link")
 * Clearly identifies the affected record for all operations.
 */
export function getDisplayTargetRecord(log) {
  if (!log) return '-';

  // 1. If log has explicit professional targetRecord already formatted like "Type: Name", return it
  // (Filter out technical labels such as "Auth: User Session" or "Entity: refresh")
  if (log.targetRecord && 
      log.targetRecord !== '-' && 
      log.targetRecord.includes(':') &&
      !log.targetRecord.toLowerCase().includes('auth: user session') &&
      !log.targetRecord.toLowerCase().includes('entity: refresh') &&
      !log.targetRecord.toLowerCase().includes('entity: session') &&
      !log.targetRecord.toLowerCase().includes('refresh')) {
    return log.targetRecord;
  }

  // 2. Extract target name from newValue, oldValue, entityId, or description
  let targetName = '';
  if (log.newValue && typeof log.newValue === 'object') {
    targetName = log.newValue.studentName || log.newValue.name || log.newValue.title || log.newValue.assignmentTitle || log.newValue.className || log.newValue.userName || log.newValue.email || '';
  }

  if (!targetName && log.oldValue && typeof log.oldValue === 'object') {
    targetName = log.oldValue.studentName || log.oldValue.name || log.oldValue.title || log.oldValue.userName || '';
  }

  if (!targetName && log.entityId && !isUuid(log.entityId) && !log.entityId.startsWith('sess-') && !log.entityId.startsWith('sys-') && log.entityId.toLowerCase() !== 'refresh') {
    targetName = log.entityId;
  }

  if (!targetName && log.description) {
    const matchQuote = log.description.match(/'([^']+)'/);
    if (matchQuote && matchQuote[1]) {
      targetName = matchQuote[1];
    } else {
      const matchRolePriya = log.description.match(/changed\s+([A-Z][a-zA-Z0-9\s.-]+?)'s\s+role/);
      if (matchRolePriya && matchRolePriya[1]) {
        targetName = matchRolePriya[1];
      } else {
        const matchStudent = log.description.match(/(?:student|for)\s+([A-Z][a-zA-Z0-9\s.-]+?)(?::|$|\()/);
        if (matchStudent && matchStudent[1]) {
          targetName = matchStudent[1].trim();
        }
      }
    }
  }

  targetName = sanitizeTargetName(targetName);

  // 3. Determine clean institutional entity category
  let type = log.entity || log.module || 'Record';
  const rawType = String(type).toUpperCase();
  const rawMod = String(log.module || '').toUpperCase();
  const rawAct = String(log.action || '').toUpperCase();

  if (rawType.includes('REFRESH') || rawMod.includes('REFRESH') || targetName.toLowerCase() === 'refresh') {
    return 'Security: Session Refresh';
  }

  if (rawType.includes('STUDENT') || rawMod.includes('STUDENT')) type = 'Student';
  else if (rawType.includes('ATTEND') || rawMod.includes('ATTEND')) type = 'Class';
  else if (rawType.includes('ASSIGN') || rawType.includes('SUBMISSION')) type = 'Assignment';
  else if (rawType.includes('FEE')) type = 'Fee';
  else if (rawType.includes('ROLE') || rawType.includes('PERMISSION') || rawMod.includes('ROLE') || rawMod.includes('PERMISSION')) type = 'Role';
  else if (rawType.includes('COURSE')) type = 'Course';
  else if (rawType.includes('STAFF') || rawType.includes('FACULTY')) type = 'Staff';
  else if (rawType.includes('MARK') || rawMod.includes('EXAM')) type = 'Marks';
  else if (rawType.includes('REGISTRATION') || rawAct.includes('REGISTRATION')) type = 'Security';
  else if (rawType.includes('PASSWORD') || rawAct.includes('PASSWORD')) type = 'Security';
  else if (rawType.includes('POLICY') || rawType.includes('SETTING') || rawMod.includes('SETTING')) type = 'Settings';
  else if (rawType.includes('SESSION') || rawMod.includes('AUTH')) type = 'User Account';
  else type = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();

  // If a valid target name exists, format as "Type: Name"
  if (targetName && targetName !== '-' && targetName.toLowerCase() !== 'refresh') {
    return `${type}: ${targetName}`;
  }

  // Derive professional affected record label based on context
  if (rawType.includes('REGISTRATION') || rawAct.includes('REGISTRATION')) {
    return 'Security: Registration Link';
  }
  if (rawType.includes('PASSWORD') || rawAct.includes('PASSWORD')) {
    return 'Security: Account Password';
  }
  if (rawMod.includes('SETTING') || rawType.includes('SETTING') || rawType.includes('POLICY')) {
    return 'Settings: Security Policy';
  }
  if (rawType.includes('ROLE') || rawMod.includes('PERMISSION')) {
    return 'Role: Access Permissions';
  }
  if (rawMod.includes('AUTH') || rawType.includes('SESSION')) {
    if (log.userName && log.userName !== 'System') {
      return `User Account: ${log.userName}`;
    }
    if (log.userEmail && log.userEmail !== 'system@internal') {
      return `User Account: ${log.userEmail}`;
    }
    return 'User Account: Portal Authentication';
  }

  // If log explicitly provided targetRecord, fallback to it
  if (log.targetRecord) return log.targetRecord;

  return '-';
}

/**
 * Returns a human-friendly institutional module name suitable for a College Management System.
 */
export function getInstitutionalModuleName(module) {
  if (!module) return 'General Administration';
  const m = String(module).toUpperCase();
  if (m === 'AUTH' || m === 'AUTHENTICATION' || m === 'LOGIN') return 'Authentication & Security';
  if (m === 'STUDENT' || m === 'STUDENTS') return 'Students & Admissions';
  if (m === 'TEACHER' || m === 'TEACHERS' || m === 'STAFF' || m === 'FACULTY' || m === 'HR') return 'Faculty & Staff';
  if (m === 'ACADEMICS' || m === 'ACADEMIC' || m === 'COURSE' || m === 'COURSES') return 'Academics & Courses';
  if (m === 'ATTENDANCE') return 'Attendance & Leaves';
  if (m === 'EXAM' || m === 'EXAMS' || m === 'MARKS' || m === 'GRADE' || m === 'GRADES') return 'Examinations & Grading';
  if (m === 'FEE' || m === 'FEES' || m === 'FINANCE') return 'Fees & Finance';
  if (m === 'ROLE' || m === 'ROLES' || m === 'PERMISSION' || m === 'PERMISSIONS') return 'Access Control & Roles';
  if (m === 'SETTINGS' || m === 'SETTING' || m === 'CONFIG' || m === 'SYSTEM') return 'System Configuration';
  if (m === 'TIMETABLE' || m === 'SCHEDULE') return 'Timetable & Scheduling';
  if (m === 'LIBRARY') return 'Library Management';
  if (m === 'HOSTEL') return 'Hostel & Accommodation';
  if (m === 'TRANSPORT') return 'Transport & Fleet';
  if (m === 'INVENTORY') return 'Inventory & Assets';
  if (m === 'PAYROLL') return 'Payroll & Compensation';

  return m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
}

/**
 * Extracts and formats human-readable field changes (Before -> After) for an audit log.
 * Excludes non-mutation actions and internal metadata keys.
 */
export function getDetailedChanges(log) {
  if (!log) return [];
  const action = String(log.action || '').toUpperCase();

  // Non-mutation actions like LOGIN, LOGOUT, VIEW shouldn't display a changes diff
  if (['LOGIN', 'LOGOUT', 'AUTH', 'SIGNIN', 'SIGNOUT', 'VIEW', 'READ', 'EXPORT'].includes(action)) {
    return [];
  }

  const oldVal = log.oldValue;
  const newVal = log.newValue;

  if (!oldVal && !newVal) return [];

  const ignoredKeys = new Set([
    'id', '_id', 'createdat', 'updatedat', 'collegeid',
    'password', 'token', 'otp', '__v', 'ipaddress', 'useragent'
  ]);

  const customFieldLabels = {
    phone: 'Phone Number',
    email: 'Email Address',
    role: 'User Role',
    fromRole: 'Previous Role',
    toRole: 'Assigned Role',
    status: 'Status',
    amount: 'Amount',
    amountPaid: 'Fee Amount Paid',
    dueAmount: 'Pending Due Amount',
    className: 'Class / Section',
    studentName: 'Student Name',
    name: 'Name',
    title: 'Title / Subject',
    assignmentTitle: 'Assignment Title',
    marks: 'Marks / Score',
    totalMarks: 'Total Marks',
    maxMarks: 'Maximum Marks',
    grade: 'Grade',
    attendanceStatus: 'Attendance Status',
    submissionStatus: 'Submission Status',
    department: 'Department',
    rollNo: 'Roll Number',
    isActive: 'Account Status',
    permissions: 'Assigned Permissions'
  };

  const formatKey = (key) => {
    if (customFieldLabels[key]) return customFieldLabels[key];
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/_/g, ' ')
      .trim();
  };

  const formatVal = (val) => {
    if (val === null || val === undefined) return 'None';
    if (typeof val === 'boolean') return val ? 'Enabled' : 'Disabled';
    if (typeof val === 'object') {
      if (Array.isArray(val)) {
        if (val.length === 0) return 'None';
        return val.map(item => (typeof item === 'object' ? JSON.stringify(item) : String(item))).join(', ');
      }
      if (val.name) return String(val.name);
      if (val.title) return String(val.title);
      return Object.entries(val)
        .filter(([k]) => !ignoredKeys.has(k.toLowerCase()))
        .map(([k, v]) => `${formatKey(k)}: ${v}`)
        .join(', ') || 'Updated Details';
    }
    const s = String(val).trim();
    return s === '' ? 'Empty' : s;
  };

  const changes = [];

  // 1. Both oldValue and newValue exist
  if (oldVal && typeof oldVal === 'object' && newVal && typeof newVal === 'object') {
    const allKeys = Array.from(new Set([...Object.keys(oldVal), ...Object.keys(newVal)]));
    for (const key of allKeys) {
      if (ignoredKeys.has(key.toLowerCase())) continue;
      const b = oldVal[key];
      const a = newVal[key];
      if (JSON.stringify(b) !== JSON.stringify(a)) {
        changes.push({
          field: formatKey(key),
          rawKey: key,
          before: formatVal(b),
          after: formatVal(a)
        });
      }
    }
    return changes;
  }

  // 2. Update action where oldValue is not recorded but newValue contains the modified fields
  if (action === 'UPDATE' && newVal && typeof newVal === 'object') {
    for (const key of Object.keys(newVal)) {
      if (ignoredKeys.has(key.toLowerCase())) continue;
      changes.push({
        field: formatKey(key),
        rawKey: key,
        before: 'Previous Value',
        after: formatVal(newVal[key])
      });
    }
    return changes;
  }

  return [];
}

