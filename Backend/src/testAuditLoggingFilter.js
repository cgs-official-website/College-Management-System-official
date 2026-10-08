/**
 * Test Suite: Audit Logging Skip-List and Action Filter
 * 
 * Verifies that:
 * 1. Session / token refresh adds 0 rows.
 * 2. Page views, list/search calls, and polling add 0 rows.
 * 3. Saves with no change add 0 rows.
 * 4. Real changes (add, edit with changes, delete, login, failed login, logout,
 *    role/password change, fee payment, export, attendance) add exactly 1 row.
 * 5. One attendance submission = exactly one log row.
 */

import {
  shouldLogAuditEvent,
  hasActualChanges,
  isAuditableRequest,
  ALLOWED_AUDIT_ACTIONS,
  SKIPPED_ACTION_KEYWORDS,
  SKIPPED_ROUTE_PATTERNS
} from './modules/audit/auditFilter.js';
import { createAuditLog } from './modules/audit/audit.service.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

async function runAuditFilterTests() {
  console.log('====================================================');
  console.log('AUDIT LOGGING SKIP-LIST & ACTION FILTER TEST SUITE');
  console.log('====================================================\n');

  // ─────────────────────────────────────────────────────────────────
  // TEST GROUP 1: REFRESH ADDS 0 ROWS
  // ─────────────────────────────────────────────────────────────────
  console.log('--- 1. Testing Session & Token Refresh (Must add 0 rows) ---');

  // 1.1 Action type is REFRESH
  const refreshActionDecision = shouldLogAuditEvent({
    action: 'REFRESH',
    module: 'AUTH',
    entity: 'UserSession'
  });
  assert(refreshActionDecision === false, 'Action REFRESH is rejected by filter (adds 0 rows)');

  // 1.2 Action type is SESSION_REFRESH
  const sessionRefreshDecision = shouldLogAuditEvent({
    action: 'SESSION_REFRESH',
    module: 'AUTH',
    entity: 'UserSession'
  });
  assert(sessionRefreshDecision === false, 'Action SESSION_REFRESH is rejected by filter (adds 0 rows)');

  // 1.3 Route is /api/v1/auth/refresh
  const refreshRouteDecision = shouldLogAuditEvent({
    action: 'CREATE',
    route: '/api/v1/auth/refresh',
    module: 'AUTH'
  });
  assert(refreshRouteDecision === false, 'Route /api/v1/auth/refresh is rejected by filter (adds 0 rows)');

  // 1.4 Entity contains "refresh"
  const refreshEntityDecision = shouldLogAuditEvent({
    action: 'UPDATE',
    module: 'AUTH',
    entity: 'refresh'
  });
  assert(refreshEntityDecision === false, 'Entity "refresh" is rejected by filter (adds 0 rows)');

  // 1.5 createAuditLog call for refresh returns null and creates 0 rows
  const refreshLogResult = await createAuditLog({
    action: 'REFRESH',
    module: 'AUTH',
    entity: 'UserSession',
    description: 'User refreshed auth token'
  });
  assert(refreshLogResult === null, 'createAuditLog({ action: "REFRESH" }) returns null (adds 0 rows)');

  // 1.6 isAuditableRequest rejects refresh endpoint
  const isReqRefresh = isAuditableRequest({
    method: 'POST',
    url: '/api/v1/auth/refresh'
  });
  assert(isReqRefresh === false, 'isAuditableRequest rejects /api/v1/auth/refresh');


  // ─────────────────────────────────────────────────────────────────
  // TEST GROUP 2: PAGE VIEWS, LIST/SEARCH, AND POLLING ADD 0 ROWS
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- 2. Testing Page Views, List/Search & Polling (Must add 0 rows) ---');

  // 2.1 Page view GET /dashboard
  const pageViewGetDecision = shouldLogAuditEvent({
    action: 'VIEW',
    method: 'GET',
    route: '/api/v1/dashboards/admin',
    module: 'DASHBOARD'
  });
  assert(pageViewGetDecision === false, 'Page view GET /dashboard is rejected (adds 0 rows)');

  // 2.2 Page view action PAGE_VIEW
  const pageViewActionDecision = shouldLogAuditEvent({
    action: 'PAGE_VIEW',
    module: 'STUDENTS'
  });
  assert(pageViewActionDecision === false, 'Action PAGE_VIEW is rejected (adds 0 rows)');

  // 2.3 List call GET /api/v1/students
  const listCallDecision = shouldLogAuditEvent({
    action: 'LIST',
    method: 'GET',
    route: '/api/v1/students',
    module: 'STUDENTS'
  });
  assert(listCallDecision === false, 'List call GET /api/v1/students is rejected (adds 0 rows)');

  // 2.4 Search query GET /api/v1/courses?search=biology
  const searchCallDecision = shouldLogAuditEvent({
    action: 'SEARCH',
    method: 'GET',
    route: '/api/v1/courses?search=biology',
    module: 'COURSES'
  });
  assert(searchCallDecision === false, 'Search call is rejected (adds 0 rows)');

  // 2.5 Polling call /health
  const healthPollingDecision = shouldLogAuditEvent({
    action: 'POLL',
    method: 'GET',
    route: '/health'
  });
  assert(healthPollingDecision === false, 'Polling /health is rejected (adds 0 rows)');

  // 2.6 Notifications polling /notifications
  const notifPollingDecision = shouldLogAuditEvent({
    action: 'POLL',
    method: 'GET',
    route: '/api/v1/notifications'
  });
  assert(notifPollingDecision === false, 'Polling /notifications is rejected (adds 0 rows)');

  // 2.7 createAuditLog call for PAGE_VIEW returns null and creates 0 rows
  const pageViewLogResult = await createAuditLog({
    action: 'PAGE_VIEW',
    module: 'STUDENTS',
    description: 'Admin viewed students list'
  });
  assert(pageViewLogResult === null, 'createAuditLog({ action: "PAGE_VIEW" }) returns null (adds 0 rows)');

  // 2.8 isAuditableRequest rejects standard GET requests (page views)
  const isReqPageView = isAuditableRequest({
    method: 'GET',
    url: '/api/v1/students'
  });
  assert(isReqPageView === false, 'isAuditableRequest rejects GET /api/v1/students (page view)');


  // ─────────────────────────────────────────────────────────────────
  // TEST GROUP 3: SAVES WITH NO CHANGE ADD 0 ROWS
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- 3. Testing Saves With No Change (Must add 0 rows) ---');

  // 3.1 Identical oldValue and newValue
  const identicalValuesDecision = shouldLogAuditEvent({
    action: 'UPDATE',
    module: 'STUDENTS',
    oldValue: { phone: '+91 98765 43210', name: 'Arun S' },
    newValue: { phone: '+91 98765 43210', name: 'Arun S' }
  });
  assert(identicalValuesDecision === false, 'Save with identical oldValue and newValue is rejected (adds 0 rows)');

  // 3.2 Only ignored metadata (updatedAt) differs
  const onlyMetadataDiffDecision = shouldLogAuditEvent({
    action: 'UPDATE',
    module: 'STUDENTS',
    oldValue: { phone: '+91 98765 43210', updatedAt: '2026-01-01T00:00:00Z' },
    newValue: { phone: '+91 98765 43210', updatedAt: '2026-01-02T00:00:00Z' }
  });
  assert(onlyMetadataDiffDecision === false, 'Save where only updatedAt differs is rejected (adds 0 rows)');

  // 3.3 Explicit empty changes array
  const emptyChangesArrayDecision = shouldLogAuditEvent({
    action: 'UPDATE',
    module: 'STUDENTS',
    changes: []
  });
  assert(emptyChangesArrayDecision === false, 'Save with empty changes array is rejected (adds 0 rows)');

  // 3.4 Empty newValue object {}
  const emptyNewValueDecision = shouldLogAuditEvent({
    action: 'UPDATE',
    module: 'STUDENTS',
    newValue: {}
  });
  assert(emptyNewValueDecision === false, 'Save with empty newValue is rejected (adds 0 rows)');

  // 3.5 hasActualChanges helper verification
  assert(
    hasActualChanges({ role: 'admin' }, { role: 'admin' }) === false,
    'hasActualChanges returns false for unchanged properties'
  );

  // 3.6 createAuditLog for no-change update returns null and creates 0 rows
  const noChangeLogResult = await createAuditLog({
    action: 'UPDATE',
    module: 'STUDENTS',
    oldValue: { status: 'ACTIVE' },
    newValue: { status: 'ACTIVE' },
    changes: [],
    description: 'Updated student profile'
  });
  assert(noChangeLogResult === null, 'createAuditLog for no-change update returns null (adds 0 rows)');


  // ─────────────────────────────────────────────────────────────────
  // TEST GROUP 4: REAL CHANGES ADD EXACTLY 1 ROW EACH
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- 4. Testing Allowed Real Member Changes (Must add 1 row) ---');

  // 4.1 Add: CREATE action
  const createDecision = shouldLogAuditEvent({
    action: 'CREATE',
    module: 'STUDENTS',
    newValue: { studentName: 'Arun S', department: 'CSE' }
  });
  assert(createDecision === true, 'Add (CREATE) is allowed by filter');

  const createLogResult = await createAuditLog({
    action: 'CREATE',
    module: 'STUDENTS',
    newValue: { studentName: 'Arun S', department: 'CSE' },
    userName: 'Ravi',
    userRole: 'admin',
    description: 'Ravi (Admin) added student Arun S'
  });
  assert(createLogResult !== null && createLogResult.id, 'createAuditLog for CREATE adds 1 row');

  // 4.2 Edit: UPDATE action with real changes
  const updateDecision = shouldLogAuditEvent({
    action: 'UPDATE',
    module: 'STUDENTS',
    oldValue: { phone: '+91 98765 43210' },
    newValue: { phone: '+91 98765 99999' }
  });
  assert(updateDecision === true, 'Edit (UPDATE) with real changes is allowed by filter');

  const updateLogResult = await createAuditLog({
    action: 'UPDATE',
    module: 'STUDENTS',
    oldValue: { phone: '+91 98765 43210' },
    newValue: { phone: '+91 98765 99999' },
    userName: 'Ravi',
    userRole: 'admin',
    description: 'Ravi (Admin) updated student Arun S: phone changed'
  });
  assert(updateLogResult !== null && updateLogResult.id, 'createAuditLog for UPDATE with changes adds 1 row');

  // 4.3 Delete: DELETE action
  const deleteDecision = shouldLogAuditEvent({
    action: 'DELETE',
    module: 'STUDENTS',
    entityId: 'student-089'
  });
  assert(deleteDecision === true, 'Delete (DELETE) is allowed by filter');

  const deleteLogResult = await createAuditLog({
    action: 'DELETE',
    module: 'STUDENTS',
    entityId: 'student-089',
    userName: 'Ravi',
    userRole: 'admin',
    description: 'Ravi (Admin) deleted student Arun S'
  });
  assert(deleteLogResult !== null && deleteLogResult.id, 'createAuditLog for DELETE adds 1 row');

  // 4.4 Login: Successful login
  const loginSuccessDecision = shouldLogAuditEvent({
    action: 'LOGIN',
    module: 'AUTH',
    status: 'SUCCESS'
  });
  assert(loginSuccessDecision === true, 'Successful Login is allowed by filter');

  const loginLogResult = await createAuditLog({
    action: 'LOGIN',
    module: 'AUTH',
    status: 'SUCCESS',
    userName: 'Ravi',
    userRole: 'admin',
    description: 'Ravi (Admin) logged in successfully'
  });
  assert(loginLogResult !== null && loginLogResult.id, 'createAuditLog for successful LOGIN adds 1 row');

  // 4.5 Failed Login
  const loginFailureDecision = shouldLogAuditEvent({
    action: 'LOGIN',
    module: 'AUTH',
    status: 'FAILURE'
  });
  assert(loginFailureDecision === true, 'Failed Login is allowed by filter');

  const failedLoginLogResult = await createAuditLog({
    action: 'LOGIN',
    module: 'AUTH',
    status: 'FAILURE',
    userName: 'Unknown',
    userRole: 'user',
    description: 'Failed login attempt for test@college.edu'
  });
  assert(failedLoginLogResult !== null && failedLoginLogResult.id, 'createAuditLog for failed LOGIN adds 1 row');

  // 4.6 Logout
  const logoutDecision = shouldLogAuditEvent({
    action: 'LOGOUT',
    module: 'AUTH'
  });
  assert(logoutDecision === true, 'Logout is allowed by filter');

  const logoutLogResult = await createAuditLog({
    action: 'LOGOUT',
    module: 'AUTH',
    userName: 'Ravi',
    userRole: 'admin',
    description: 'Ravi (Admin) logged out'
  });
  assert(logoutLogResult !== null && logoutLogResult.id, 'createAuditLog for LOGOUT adds 1 row');

  // 4.7 Role Change
  const roleChangeDecision = shouldLogAuditEvent({
    action: 'ASSIGN_ROLE',
    module: 'PERMISSION',
    oldValue: { role: 'Teacher' },
    newValue: { role: 'Admin' }
  });
  assert(roleChangeDecision === true, 'Role change (ASSIGN_ROLE) is allowed by filter');

  const roleLogResult = await createAuditLog({
    action: 'ASSIGN_ROLE',
    module: 'PERMISSION',
    userName: 'Ravi',
    userRole: 'admin',
    description: "Ravi (Admin) changed Priya's role from Teacher to Admin"
  });
  assert(roleLogResult !== null && roleLogResult.id, 'createAuditLog for ASSIGN_ROLE adds 1 row');

  // 4.8 Password Change
  const passwordChangeDecision = shouldLogAuditEvent({
    action: 'PASSWORD_CHANGE',
    module: 'AUTH'
  });
  assert(passwordChangeDecision === true, 'Password change (PASSWORD_CHANGE) is allowed by filter');

  const passwordLogResult = await createAuditLog({
    action: 'PASSWORD_CHANGE',
    module: 'AUTH',
    userName: 'Arun S',
    userRole: 'student',
    description: 'Arun S (Student) changed own password'
  });
  assert(passwordLogResult !== null && passwordLogResult.id, 'createAuditLog for PASSWORD_CHANGE adds 1 row');

  // 4.9 Fee Payment
  const feePaymentDecision = shouldLogAuditEvent({
    action: 'COLLECT_FEE',
    module: 'FEES',
    newValue: { amountPaid: 5000, studentName: 'Arun S' }
  });
  assert(feePaymentDecision === true, 'Fee payment (COLLECT_FEE) is allowed by filter');

  const feeLogResult = await createAuditLog({
    action: 'COLLECT_FEE',
    module: 'FEES',
    userName: 'Ravi',
    userRole: 'admin',
    description: 'Ravi (Admin) recorded a fee payment of Rs. 5,000 for Arun S'
  });
  assert(feeLogResult !== null && feeLogResult.id, 'createAuditLog for COLLECT_FEE adds 1 row');

  // 4.10 Export
  const exportDecision = shouldLogAuditEvent({
    action: 'EXPORT',
    method: 'GET',
    route: '/api/v1/students/export',
    module: 'STUDENTS'
  });
  assert(exportDecision === true, 'Export (EXPORT) is allowed by filter even on GET route');

  const exportLogResult = await createAuditLog({
    action: 'EXPORT',
    module: 'STUDENTS',
    userName: 'Ravi',
    userRole: 'admin',
    description: 'Ravi (Admin) exported students list to Excel'
  });
  assert(exportLogResult !== null && exportLogResult.id, 'createAuditLog for EXPORT adds 1 row');


  // ─────────────────────────────────────────────────────────────────
  // TEST GROUP 5: ONE SUBMISSION = ONE LOG ROW (ATTENDANCE)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- 5. Testing One Submission = One Log Row (Attendance) ---');

  // Single attendance submission with multiple students in payload
  const attendancePayload = {
    className: 'Class 10-A',
    date: '2026-10-07',
    students: [
      { studentId: 'stu-1', status: 'PRESENT' },
      { studentId: 'stu-2', status: 'PRESENT' },
      { studentId: 'stu-3', status: 'ABSENT' },
      { studentId: 'stu-4', status: 'PRESENT' }
    ]
  };

  const attendanceDecision = shouldLogAuditEvent({
    action: 'MARK_ATTENDANCE',
    module: 'ATTENDANCE',
    newValue: attendancePayload
  });
  assert(attendanceDecision === true, 'Attendance submission (MARK_ATTENDANCE) is allowed by filter');

  const attendanceLogResult = await createAuditLog({
    action: 'MARK_ATTENDANCE',
    module: 'ATTENDANCE',
    entity: 'Attendance',
    userName: 'Jd Guru',
    userRole: 'teacher',
    newValue: attendancePayload,
    description: 'Jd Guru (Teacher) marked attendance for Class 10-A'
  });
  assert(
    attendanceLogResult !== null &&
    attendanceLogResult.newValue?.className === 'Class 10-A' &&
    attendanceLogResult.newValue?.students?.length === 4,
    'One attendance submission saves exactly 1 row containing full class details and student list'
  );


  // ─────────────────────────────────────────────────────────────────
  // TEST GROUP 6: MULTI-COLLEGE DATA ISOLATION (ZERO LEAKAGE)
  // ─────────────────────────────────────────────────────────────────
  console.log('\n--- 6. Testing Multi-College Tenant Isolation ---');

  const collegeAId = 'a1111111-1111-4111-a111-111111111111';
  const collegeBId = 'b2222222-2222-4222-b222-222222222222';
  const collegeCId = 'c3333333-3333-4333-c333-333333333333';

  const logA = await createAuditLog({
    collegeId: collegeAId,
    action: 'CREATE',
    module: 'STUDENTS',
    entity: 'Student',
    userName: 'College A Admin',
    userRole: 'admin',
    description: 'Added student Alice in College A'
  });

  const logB = await createAuditLog({
    collegeId: collegeBId,
    action: 'CREATE',
    module: 'STUDENTS',
    entity: 'Student',
    userName: 'College B Admin',
    userRole: 'admin',
    description: 'Added student Bob in College B'
  });

  const logC = await createAuditLog({
    collegeId: collegeCId,
    action: 'CREATE',
    module: 'COURSES',
    entity: 'Course',
    userName: 'College C Admin',
    userRole: 'admin',
    description: 'Created Course CS101 in College C'
  });

  // Verify College A queries only see College A records
  const { getAuditLogs, getAuditLogById } = await import('./modules/audit/audit.service.js');
  const resA = await getAuditLogs({ collegeId: collegeAId });
  const hasLogAInA = resA.logs.some(l => l.id === logA.id);
  const hasLogBInA = resA.logs.some(l => l.id === logB.id);
  const hasLogCInA = resA.logs.some(l => l.id === logC.id);

  assert(hasLogAInA === true, 'College A audit query contains College A log');
  assert(hasLogBInA === false, 'College A audit query DOES NOT leak College B log');
  assert(hasLogCInA === false, 'College A audit query DOES NOT leak College C log');

  // Verify College B queries only see College B records
  const resB = await getAuditLogs({ collegeId: collegeBId });
  const hasLogBInB = resB.logs.some(l => l.id === logB.id);
  const hasLogAInB = resB.logs.some(l => l.id === logA.id);
  const hasLogCInB = resB.logs.some(l => l.id === logC.id);

  assert(hasLogBInB === true, 'College B audit query contains College B log');
  assert(hasLogAInB === false, 'College B audit query DOES NOT leak College A log');
  assert(hasLogCInB === false, 'College B audit query DOES NOT leak College C log');

  // Verify College C queries only see College C records
  const resC = await getAuditLogs({ collegeId: collegeCId });
  const hasLogCInC = resC.logs.some(l => l.id === logC.id);
  const hasLogAInC = resC.logs.some(l => l.id === logA.id);
  const hasLogBInC = resC.logs.some(l => l.id === logB.id);

  assert(hasLogCInC === true, 'College C audit query contains College C log');
  assert(hasLogAInC === false, 'College C audit query DOES NOT leak College A log');
  assert(hasLogBInC === false, 'College C audit query DOES NOT leak College B log');

  // Direct ID lookup isolation test
  const crossLookupBtoA = await getAuditLogById(logA.id, collegeBId);
  assert(crossLookupBtoA === null, 'Direct lookup of College A log using College B context returns null');

  const crossLookupCtoB = await getAuditLogById(logB.id, collegeCId);
  assert(crossLookupCtoB === null, 'Direct lookup of College B log using College C context returns null');

  // Unauthenticated / untrusted non-superadmin without collegeId returns 0 records
  const noCollegeRes = await getAuditLogs({ collegeId: null, isSuperAdmin: false });
  assert(noCollegeRes.logs.length === 0, 'Non-superadmin query without college context returns 0 records (no cross-tenant leakage)');
  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('====================================================');

  if (failed > 0) {
    throw new Error(`${failed} tests failed!`);
  }
}

// Auto-run if executed directly
runAuditFilterTests().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});

export { runAuditFilterTests };
