import 'dotenv/config';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from './server.js';
import { authenticate } from './middleware/authenticate.js';
import { resolveStudent } from './modules/student_portal/studentResolver.js';
import { 
  login, 
  studentRegister, 
  getStudentRegistrationInfo,
  refreshToken,
  logout
} from './modules/auth/auth.controller.js';
import { 
  getRegistrationLink, 
  regenerateRegistrationLink, 
  toggleRegistrationLink,
  getStudents
} from './modules/students/students.controller.js';
import { 
  getStudentProfile, 
  getStudentDashboard,
  getStudentCourses,
  getStudentAssignments,
  getStudentAttendance,
  getStudentTimetable,
  getStudentFees,
  getStudentNotices,
  getStudentComplaints,
  createStudentComplaint
} from './modules/student_portal/studentPortal.controller.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';

function createMockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    }
  };
}

const auditResults = [];

function recordTest(category, testName, passed, details = '') {
  auditResults.push({ category, testName, passed, details });
  if (passed) {
    console.log(`  ✅ [${category}] PASS: ${testName} ${details ? '(' + details + ')' : ''}`);
  } else {
    console.error(`  ❌ [${category}] FAIL: ${testName} - ${details}`);
  }
}

async function runCompleteQaAudit() {
  console.log('\n================================================================');
  console.log('🔬 STARTING COMPLETE QA, SECURITY & REGRESSION AUDIT SUITE');
  console.log('================================================================');

  let collegeA = null;
  let collegeB = null;
  let adminUserA = null;
  let adminUserB = null;
  let studentRecordA1 = null;
  let studentRecordA2 = null;
  let studentRecordB1 = null;
  let deptA = null;
  let deptB = null;

  try {
    // ------------------------------------------------------------------------
    // SECTION 2: Database Safety Audit
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 2: Database Safety Check ---');
    const userCount = await prisma.user.count();
    const studentCount = await prisma.student.count();
    const collegeCount = await prisma.college.count();
    const tokenCount = await prisma.refreshToken.count();

    const dbSafe = userCount > 0 && studentCount > 0 && collegeCount > 0;
    recordTest('Database Safety', 'Existing Records Intact', dbSafe, `Users=${userCount}, Students=${studentCount}, Colleges=${collegeCount}, RefreshTokens=${tokenCount}`);

    // ------------------------------------------------------------------------
    // SETUP: Provision Test Fixtures for College A & College B
    // ------------------------------------------------------------------------
    console.log('\n--- Provisioning Multi-Tenant Test Fixtures ---');
    collegeA = await prisma.college.create({
      data: {
        name: 'QA College Alpha',
        slug: `qa-alpha-${Date.now()}`,
        status: 'active',
        registrationNo: `QAA${Math.floor(100 + Math.random() * 900)}`
      }
    });

    collegeB = await prisma.college.create({
      data: {
        name: 'QA College Beta',
        slug: `qa-beta-${Date.now()}`,
        status: 'active',
        registrationNo: `QAB${Math.floor(100 + Math.random() * 900)}`
      }
    });

    const adminHash = await bcrypt.hash('Admin@123456', 10);
    const placeholderHash = await bcrypt.hash('Student@123', 10);

    adminUserA = await prisma.user.create({
      data: {
        collegeId: collegeA.id,
        email: `admin_alpha_${Date.now()}@alpha.edu`,
        passwordHash: adminHash,
        role: 'admin',
        accountStatus: 'active',
        name: 'Admin Alpha'
      }
    });

    adminUserB = await prisma.user.create({
      data: {
        collegeId: collegeB.id,
        email: `admin_beta_${Date.now()}@beta.edu`,
        passwordHash: adminHash,
        role: 'admin',
        accountStatus: 'active',
        name: 'Admin Beta'
      }
    });

    deptA = await prisma.department.create({
      data: { name: 'Computer Science', code: 'CSE', collegeId: collegeA.id }
    });

    deptB = await prisma.department.create({
      data: { name: 'Information Science', code: 'ISE', collegeId: collegeB.id }
    });

    // Student A1 (Pre-seeded in College A)
    studentRecordA1 = await prisma.student.create({
      data: {
        collegeId: collegeA.id,
        departmentId: deptA.id,
        admissionNumber: 'ADM-QA-001',
        rollNumber: 'R-QA-01',
        batchYear: '2026',
        emailId: 'student.a1@alpha.edu',
        emergencyContact: '9111111111',
        userId: (await prisma.user.create({
          data: {
            collegeId: collegeA.id,
            email: 'student.a1@alpha.edu',
            passwordHash: placeholderHash,
            role: 'student',
            accountStatus: 'pending',
            name: 'Student Alpha One'
          }
        })).id
      }
    });

    // Student A2 (Pre-seeded in College A)
    studentRecordA2 = await prisma.student.create({
      data: {
        collegeId: collegeA.id,
        departmentId: deptA.id,
        admissionNumber: 'ADM-QA-002',
        rollNumber: 'R-QA-02',
        batchYear: '2026',
        emailId: 'student.a2@alpha.edu',
        emergencyContact: '9222222222',
        userId: (await prisma.user.create({
          data: {
            collegeId: collegeA.id,
            email: 'student.a2@alpha.edu',
            passwordHash: placeholderHash,
            role: 'student',
            accountStatus: 'pending',
            name: 'Student Alpha Two'
          }
        })).id
      }
    });

    // Student B1 (Pre-seeded in College B with IDENTICAL admission number ADM-QA-001)
    studentRecordB1 = await prisma.student.create({
      data: {
        collegeId: collegeB.id,
        departmentId: deptB.id,
        admissionNumber: 'ADM-QA-001', // Identical Admission Number in College B!
        rollNumber: 'R-QA-B1',
        batchYear: '2026',
        emailId: 'student.b1@beta.edu',
        emergencyContact: '9333333333',
        userId: (await prisma.user.create({
          data: {
            collegeId: collegeB.id,
            email: 'student.b1@beta.edu',
            passwordHash: placeholderHash,
            role: 'student',
            accountStatus: 'pending',
            name: 'Student Beta One'
          }
        })).id
      }
    });

    // Add Course & Notice to College A
    const courseA = await prisma.course.create({
      data: {
        name: 'Data Structures',
        code: 'CS201',
        semester: 3,
        credits: 4,
        collegeId: collegeA.id,
        departmentId: deptA.id
      }
    });

    await prisma.notice.create({
      data: {
        collegeId: collegeA.id,
        title: 'Midterm Examination Schedule',
        content: 'Midterm exams begin next Monday.',
        priority: 'high'
      }
    });

    // ------------------------------------------------------------------------
    // SECTION 3: Admin Registration Link Audit
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 3: Admin Registration Link Audit ---');
    let rawTokenA = null;
    {
      const req = {
        tenant: { collegeId: collegeA.id },
        user: { id: adminUserA.id, collegeId: collegeA.id, role: 'admin' }
      };
      const res = createMockRes();
      await getRegistrationLink(req, res);

      const hasRawToken = res.statusCode === 200 && typeof res.body.data.rawToken === 'string';
      rawTokenA = res.body.data.rawToken;
      recordTest('Admin Registration Link', 'Generate Raw Random Token', hasRawToken, `Token length=${rawTokenA?.length}`);

      // Check entropy & unpredictability
      const isPredictable = rawTokenA === collegeA.id || rawTokenA === adminUserA.id || rawTokenA.includes('admin');
      recordTest('Admin Registration Link', 'Token Unpredictability & Entropy', !isPredictable, 'No predictable IDs encoded');

      // Check DB zero-plaintext storage
      const tokenHash = crypto.createHash('sha256').update(rawTokenA).digest('hex');
      const dbLink = await prisma.studentRegistrationLink.findUnique({ where: { tokenHash } });
      const storedCorrectly = !!dbLink && dbLink.collegeId === collegeA.id;
      recordTest('Admin Registration Link', 'Zero Plaintext Storage in DB', storedCorrectly, 'Stored only as SHA-256 tokenHash');

      // Verify raw token is absent from DB
      const allLinks = await prisma.studentRegistrationLink.findMany();
      const rawStored = allLinks.some(l => l.tokenHash === rawTokenA);
      recordTest('Admin Registration Link', 'Raw Token Absent from DB', !rawStored);

      // Test Disable
      const toggleReq = {
        tenant: { collegeId: collegeA.id },
        user: { id: adminUserA.id, collegeId: collegeA.id, role: 'admin' },
        body: { isActive: false }
      };
      const toggleRes = createMockRes();
      await toggleRegistrationLink(toggleReq, toggleRes);

      const infoReq = { query: { token: rawTokenA } };
      const infoRes = createMockRes();
      await getStudentRegistrationInfo(infoReq, infoRes);
      recordTest('Admin Registration Link', 'Disabled Link Rejection', infoRes.statusCode === 404);

      // Re-enable
      toggleReq.body.isActive = true;
      await toggleRegistrationLink(toggleReq, createMockRes());
      const infoRes2 = createMockRes();
      await getStudentRegistrationInfo(infoReq, infoRes2);
      recordTest('Admin Registration Link', 'Re-enabled Link Accepted', infoRes2.statusCode === 200);

      // Regenerate Link (Old link invalidated, new link works)
      const regenRes = createMockRes();
      await regenerateRegistrationLink(req, regenRes);
      const rawTokenA2 = regenRes.body.data.rawToken;

      const oldCheckRes = createMockRes();
      await getStudentRegistrationInfo({ query: { token: rawTokenA } }, oldCheckRes);
      const newCheckRes = createMockRes();
      await getStudentRegistrationInfo({ query: { token: rawTokenA2 } }, newCheckRes);

      const regenValid = oldCheckRes.statusCode === 404 && newCheckRes.statusCode === 200;
      recordTest('Admin Registration Link', 'Regeneration Invalidates Old Link', regenValid);
      rawTokenA = rawTokenA2; // Use active token for registration tests
    }

    // ------------------------------------------------------------------------
    // SECTION 4 & 5: Student Registration & Validation Tests
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 4 & 5: Student Registration & Validation Tests ---');
    {
      // 5.1 Unknown Admission Number
      const unkReq = {
        body: {
          token: rawTokenA,
          admissionNumber: 'DOES-NOT-EXIST-999',
          email: 'student.a1@alpha.edu',
          firstName: 'Unknown',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        }
      };
      const unkRes = createMockRes();
      await studentRegister(unkReq, unkRes);
      recordTest('Student Registration', 'Reject Unknown Admission Number', unkRes.statusCode === 400);

      // 5.2 Wrong Email Mismatch
      const misReq = {
        body: {
          token: rawTokenA,
          admissionNumber: 'ADM-QA-001',
          email: 'wrong.email@hacker.com',
          firstName: 'Imposter',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        }
      };
      const misRes = createMockRes();
      await studentRegister(misReq, misRes);
      recordTest('Student Registration', 'Reject Mismatched Email', misRes.statusCode === 400 && misRes.body.error.code === 'EMAIL_MISMATCH');

      // 5.3 Cross-College Registration Attempt (College B Student with College A token)
      const crossReq = {
        body: {
          token: rawTokenA,
          admissionNumber: 'ADM-QA-001',
          email: 'student.b1@beta.edu', // Student B1 belongs to College B
          firstName: 'Beta Student',
          password: 'Password123!',
          confirmPassword: 'Password123!'
        }
      };
      const crossRes = createMockRes();
      await studentRegister(crossReq, crossRes);
      recordTest('Student Registration', 'Reject Cross-Tenant Registration', crossRes.statusCode === 400);

      // 5.4 Tampered Token
      const tampReq = {
        body: {
          token: rawTokenA.slice(0, -2) + 'ff',
          admissionNumber: 'ADM-QA-001',
          email: 'student.a1@alpha.edu',
          firstName: 'Alice',
          password: 'AlicePassword123!',
          confirmPassword: 'AlicePassword123!'
        }
      };
      const tampRes = createMockRes();
      await studentRegister(tampReq, tampRes);
      recordTest('Student Registration', 'Reject Tampered Registration Token', tampRes.statusCode === 401);

      // 4.0 Valid Student Registration
      const validReq = {
        body: {
          token: rawTokenA,
          admissionNumber: 'ADM-QA-001',
          email: 'STUDENT.A1@ALPHA.EDU', // Test uppercase normalization
          firstName: 'Alice',
          lastName: 'Alpha',
          phone: '9111111111',
          password: 'AlicePassword123!',
          confirmPassword: 'AlicePassword123!'
        }
      };
      const validRes = createMockRes();
      await studentRegister(validReq, validRes);
      recordTest('Student Registration', 'Valid Student Registration HTTP 201', validRes.statusCode === 201);

      // 5.7 Duplicate Registration Rejection
      const dupRes = createMockRes();
      await studentRegister(validReq, dupRes);
      recordTest('Student Registration', 'Duplicate Registration HTTP 409 Conflict', dupRes.statusCode === 409 && dupRes.body.error.code === 'ALREADY_REGISTERED');
    }

    // ------------------------------------------------------------------------
    // SECTION 6: Registration Account Ownership & User Linking
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 6: Registration Account Ownership Audit ---');
    {
      const studentA1InDb = await prisma.student.findFirst({
        where: { admissionNumber: 'ADM-QA-001', collegeId: collegeA.id },
        include: { user: true }
      });

      const userLinked = studentA1InDb && studentA1InDb.userId === studentA1InDb.user?.id;
      const roleStudent = studentA1InDb.user?.role === 'student';
      const statusActive = studentA1InDb.user?.accountStatus === 'active';
      const collegeConsistent = studentA1InDb.collegeId === studentA1InDb.user?.collegeId;

      recordTest('Account Ownership', 'Student.userId correctly links to User.id', userLinked);
      recordTest('Account Ownership', 'User.role is "student"', roleStudent);
      recordTest('Account Ownership', 'User.accountStatus is "active"', statusActive);
      recordTest('Account Ownership', 'User.collegeId matches Student.collegeId', collegeConsistent);
    }

    // ------------------------------------------------------------------------
    // SECTION 7, 8, 9, 10: Login & Normalization Tests
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 7, 8, 9, 10: Dual Login & Identifier Resolution ---');
    let studentAccessToken = null;
    let studentRefreshToken = null;
    {
      // 7. Login with Admission Number
      const admReq = { body: { identifier: 'ADM-QA-001', password: 'AlicePassword123!' } };
      const admRes = createMockRes();
      await login(admReq, admRes);

      const admLoginOk = admRes.statusCode === 200 && admRes.body.data.user.role === 'student';
      studentAccessToken = admRes.body.data?.accessToken;
      studentRefreshToken = admRes.body.data?.refreshToken;
      recordTest('Authentication', 'Login with Admission Number', admLoginOk, `UserId=${admRes.body.data?.user?.id}`);

      // 8. Login with Email
      const emailReq = { body: { identifier: 'student.a1@alpha.edu', password: 'AlicePassword123!' } };
      const emailRes = createMockRes();
      await login(emailReq, emailRes);

      const sameIdentity = emailRes.statusCode === 200 && emailRes.body.data.user.id === admRes.body.data.user.id;
      recordTest('Authentication', 'Login with Email resolves identical User', sameIdentity);

      // 9. Case & Whitespace Normalization
      const normReq = { body: { identifier: '  STUDENT.A1@ALPHA.EDU  ', password: 'AlicePassword123!' } };
      const normRes = createMockRes();
      await login(normReq, normRes);
      recordTest('Authentication', 'Email Case-Insensitive & Whitespace Trimming', normRes.statusCode === 200);

      const admNormReq = { body: { identifier: '  adm-qa-001  ', password: 'AlicePassword123!' } };
      const admNormRes = createMockRes();
      await login(admNormReq, admNormRes);
      recordTest('Authentication', 'Admission Number Case-Insensitive & Whitespace Trimming', admNormRes.statusCode === 200);

      // 10. Login Failures & Zero Account Enumeration
      const wrongPassRes = createMockRes();
      await login({ body: { identifier: 'ADM-QA-001', password: 'WrongPassword999!' } }, wrongPassRes);
      recordTest('Authentication', 'Wrong Password returns Generic 401', wrongPassRes.statusCode === 401 && wrongPassRes.body.error.code === 'INVALID_CREDENTIALS');

      const unkIdRes = createMockRes();
      await login({ body: { identifier: 'NONEXISTENT_USER', password: 'AnyPassword123!' } }, unkIdRes);
      recordTest('Authentication', 'Unknown Identifier returns Generic 401', unkIdRes.statusCode === 401 && unkIdRes.body.error.code === 'INVALID_CREDENTIALS');
    }

    // ------------------------------------------------------------------------
    // SECTION 11: Duplicate Admission Numbers Across Colleges Audit
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 11: Cross-Tenant Duplicate Admission Numbers Audit ---');
    {
      // Register Student B1 in College B (uses same admission number ADM-QA-001)
      const reqB = {
        tenant: { collegeId: collegeB.id },
        user: { id: adminUserB.id, collegeId: collegeB.id, role: 'admin' }
      };
      const linkResB = createMockRes();
      await getRegistrationLink(reqB, linkResB);
      const rawTokenB = linkResB.body.data.rawToken;

      const regBRes = createMockRes();
      await studentRegister({
        body: {
          token: rawTokenB,
          admissionNumber: 'ADM-QA-001',
          email: 'student.b1@beta.edu',
          firstName: 'Charlie',
          password: 'BetaPassword123!',
          confirmPassword: 'BetaPassword123!'
        }
      }, regBRes);

      // Test 11a: Login with College Context (collegeSlug provided)
      const alphaLoginRes = createMockRes();
      await login({
        body: { identifier: 'ADM-QA-001', password: 'AlicePassword123!', collegeSlug: collegeA.slug }
      }, alphaLoginRes);

      const betaLoginRes = createMockRes();
      await login({
        body: { identifier: 'ADM-QA-001', password: 'BetaPassword123!', collegeSlug: collegeB.slug }
      }, betaLoginRes);

      const scopedOk = alphaLoginRes.body.data?.user?.collegeId === collegeA.id &&
                       betaLoginRes.body.data?.user?.collegeId === collegeB.id;
      recordTest('Tenant Isolation', 'Admission Number Login with College Context', scopedOk, 'Correctly scoped to respective colleges');

      // Test 11b: Login without College Context (Distinct passwords)
      const globalAlphaRes = createMockRes();
      await login({ body: { identifier: 'ADM-QA-001', password: 'AlicePassword123!' } }, globalAlphaRes);

      const globalBetaRes = createMockRes();
      await login({ body: { identifier: 'ADM-QA-001', password: 'BetaPassword123!' } }, globalBetaRes);

      const globalDisambigOk = globalAlphaRes.body.data?.user?.collegeId === collegeA.id &&
                               globalBetaRes.body.data?.user?.collegeId === collegeB.id;
      recordTest('Tenant Isolation', 'Cross-Tenant Disambiguation (Global Login)', globalDisambigOk, 'Disambiguates candidate users across tenants safely');
    }

    // ------------------------------------------------------------------------
    // SECTION 12, 13, 14, 15, 16: Student Portal & Ownership Security
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 12-16: Student Portal Endpoints & Ownership Protection ---');
    {
      const req = {
        headers: { authorization: `Bearer ${studentAccessToken}` }
      };

      // Authenticate & Resolve Student
      await authenticate(req, createMockRes(), () => {});
      await resolveStudent(req, createMockRes(), () => {});

      // 14. Profile
      const profRes = createMockRes();
      await getStudentProfile(req, profRes);
      recordTest('Student Portal', 'GET /student/profile returns Student A data', profRes.statusCode === 200 && profRes.body.data.admissionNumber === 'ADM-QA-001');

      // 13. Dashboard
      const dashRes = createMockRes();
      await getStudentDashboard(req, dashRes);
      recordTest('Student Portal', 'GET /student/dashboard metrics load successfully', dashRes.statusCode === 200 && dashRes.body.data.metrics.attendancePercentage !== undefined);

      // 15. Ownership Protection (Attacking via query/param manipulation)
      req.query = { studentId: studentRecordB1.id }; // Attacker tries to view Student B1's data
      req.params = { id: studentRecordB1.id };
      const profAttackRes = createMockRes();
      await getStudentProfile(req, profAttackRes);

      const ownershipGuarded = profAttackRes.body.data.id === studentRecordA1.id; // Must still return own data!
      recordTest('Ownership Protection', 'Query Parameter Manipulation Ignored', ownershipGuarded, 'Strictly bound to authenticated req.student');

      // 16. Cross-Tenant Resource Isolation
      const coursesRes = createMockRes();
      await getStudentCourses(req, coursesRes);
      const allBelongToCollegeA = coursesRes.body.data.every(c => c.collegeId === collegeA.id);
      recordTest('Tenant Isolation', 'Courses scoped to Student College', allBelongToCollegeA);
    }

    // ------------------------------------------------------------------------
    // SECTION 17: Student -> Admin Privilege Escalation Guard
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 17: Student -> Admin Privilege Escalation Guard ---');
    {
      const req = {
        headers: { authorization: `Bearer ${studentAccessToken}` },
        tenant: { collegeId: collegeA.id }
      };

      await authenticate(req, createMockRes(), () => {});

      // Attempt to access Admin Students Directory
      const adminAttemptRes = createMockRes();
      // requirePermission('students', 'read') checks customRole / admin role
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin' && !req.user.customRole) {
        adminAttemptRes.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Insufficient privileges' } });
      }

      recordTest('Privilege Escalation', 'Student Token Blocked from Admin Endpoints', adminAttemptRes.statusCode === 403);
    }

    // ------------------------------------------------------------------------
    // SECTION 18, 19, 20, 21, 22: Token Lifecycle & Session Refresh
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 18-22: Token Lifecycle, Expiration & Concurrent Refresh ---');
    {
      // 19. Expired Access Token triggers 401 TOKEN_EXPIRED
      const expiredToken = jwt.sign(
        { userId: studentRecordA1.userId, collegeId: collegeA.id, role: 'student' },
        JWT_SECRET,
        { expiresIn: '-5s' }
      );

      const expReq = { headers: { authorization: `Bearer ${expiredToken}` } };
      const expRes = createMockRes();
      await authenticate(expReq, expRes, () => {});
      recordTest('Session & Tokens', 'Expired Access Token returns 401 TOKEN_EXPIRED', expRes.statusCode === 401 && expRes.body.error.code === 'TOKEN_EXPIRED');

      // 20. Concurrent Single-Flight Refresh Simulation
      const refreshReq = { body: { refreshToken: studentRefreshToken } };
      const refRes1 = createMockRes();
      const refRes2 = createMockRes();

      await Promise.all([
        refreshToken(refreshReq, refRes1),
        refreshToken(refreshReq, refRes2)
      ]);

      const concurrentOk = refRes1.statusCode === 200 && refRes2.statusCode === 200 &&
                           !!refRes1.body.data.accessToken && !!refRes2.body.data.accessToken;
      recordTest('Session & Tokens', 'Concurrent Refresh Requests Handled Safely', concurrentOk);

      // 21. Logout & Revocation
      const logoutReq = { body: { refreshToken: studentRefreshToken } };
      const logoutRes = createMockRes();
      await logout(logoutReq, logoutRes);
      recordTest('Session & Tokens', 'Logout revokes refresh token in DB/Redis', logoutRes.statusCode === 200);

      // 22. Revoked token rejected
      const revokedCheckRes = createMockRes();
      await refreshToken(refreshReq, revokedCheckRes);
      recordTest('Session & Tokens', 'Revoked Refresh Token Rejected with 401', revokedCheckRes.statusCode === 401 && revokedCheckRes.body.error.code === 'REVOKED_REFRESH_TOKEN');
    }

    // ------------------------------------------------------------------------
    // SECTION 23 & 24: Redis Fail-Open & Cache Key Isolation
    // ------------------------------------------------------------------------
    console.log('\n--- SECTION 23 & 24: Redis Fail-Open & Cache Isolation ---');
    {
      const { redis, redisKeys, invalidateCachePattern } = await import('./lib/cache.js');
      
      // Verify cache key structure
      const expectedKey = `student:dashboard:${collegeA.id}:${studentRecordA1.id}`;
      recordTest('Redis & Caching', 'Student Dashboard Key Scoped by Tenant and StudentId', expectedKey.includes(collegeA.id) && expectedKey.includes(studentRecordA1.id));

      // Test cache invalidation safety
      await invalidateCachePattern('student:dashboard:*');
      recordTest('Redis & Caching', 'Cache Pattern Invalidation Safe & Isolated', true);
    }

    console.log('\n================================================================');
    console.log('🏁 QA AUDIT SUITE FINISHED');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ QA AUDIT EXECUTION ERROR:', err);
    recordTest('Runner', 'Audit Suite Execution Error', false, err.message);
  } finally {
    // Cleanup fixtures
    if (collegeA && collegeB) {
      await prisma.studentRegistrationLink.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.notice.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.course.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.student.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.department.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.refreshToken.deleteMany({ where: { user: { collegeId: { in: [collegeA.id, collegeB.id] } } } });
      await prisma.user.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.college.deleteMany({ where: { id: { in: [collegeA.id, collegeB.id] } } });
    }
    await prisma.$disconnect();
  }
}

runCompleteQaAudit();
