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
  toggleRegistrationLink 
} from './modules/students/students.controller.js';
import { 
  getStudentProfile, 
  getStudentDashboard 
} from './modules/student_portal/studentPortal.controller.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

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

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runStudentRegistrationTests() {
  console.log('\n===============================================================');
  console.log('🚀 RUNNING STUDENT REGISTRATION & ADMISSION-BASED LOGIN TESTS');
  console.log('===============================================================');

  let collegeA = null;
  let collegeB = null;
  let adminA = null;
  let studentRecord1 = null;
  let studentRecord2 = null;
  let studentRecordB = null;
  let deptA = null;
  let deptB = null;

  try {
    // ------------------------------------------------------------------------
    // Phase 0: Provisioning Test Colleges & Pre-seeded Students
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 0: Provisioning Test Tenants & Student Records ---');
    collegeA = await prisma.college.create({
      data: {
        name: 'Apex Engineering College',
        slug: `apex-eng-${Date.now()}`,
        status: 'active',
        registrationNo: `APEX${Math.floor(100 + Math.random() * 900)}`
      }
    });

    collegeB = await prisma.college.create({
      data: {
        name: 'Beacon Science College',
        slug: `beacon-sci-${Date.now()}`,
        status: 'active',
        registrationNo: `BEAC${Math.floor(100 + Math.random() * 900)}`
      }
    });

    const placeholderHash = await bcrypt.hash('Student@123', 10);
    const adminPassHash = await bcrypt.hash('AdminPassword123!', 10);

    adminA = await prisma.user.create({
      data: {
        collegeId: collegeA.id,
        email: `admin_${Date.now()}@apex.edu`,
        passwordHash: adminPassHash,
        role: 'admin',
        accountStatus: 'active',
        name: 'Apex Principal'
      }
    });

    deptA = await prisma.department.create({
      data: {
        name: 'Computer Science',
        code: 'CSE',
        collegeId: collegeA.id
      }
    });

    deptB = await prisma.department.create({
      data: {
        name: 'Information Technology',
        code: 'IT',
        collegeId: collegeB.id
      }
    });

    // Pre-seed Student 1 in College A (Unregistered - has email and admission number)
    studentRecord1 = await prisma.student.create({
      data: {
        collegeId: collegeA.id,
        departmentId: deptA.id,
        admissionNumber: 'ADM-APEX-101',
        rollNumber: 'R-101',
        batchYear: '2026',
        emailId: 'alice.johnson@apex.edu',
        emergencyContact: '9876543210',
        userId: (await prisma.user.create({
          data: {
            collegeId: collegeA.id,
            email: 'alice.johnson@apex.edu',
            passwordHash: placeholderHash,
            role: 'student',
            accountStatus: 'pending',
            name: 'Alice Johnson'
          }
        })).id
      }
    });

    // Pre-seed Student 2 in College A (Unregistered)
    studentRecord2 = await prisma.student.create({
      data: {
        collegeId: collegeA.id,
        departmentId: deptA.id,
        admissionNumber: 'ADM-APEX-102',
        rollNumber: 'R-102',
        batchYear: '2026',
        emailId: 'bob.smith@apex.edu',
        emergencyContact: '9876543211',
        userId: (await prisma.user.create({
          data: {
            collegeId: collegeA.id,
            email: 'bob.smith@apex.edu',
            passwordHash: placeholderHash,
            role: 'student',
            accountStatus: 'pending',
            name: 'Bob Smith'
          }
        })).id
      }
    });

    // Pre-seed Student in College B with IDENTICAL admission number 'ADM-SHARED-999'
    studentRecordB = await prisma.student.create({
      data: {
        collegeId: collegeB.id,
        departmentId: deptB.id,
        admissionNumber: 'ADM-SHARED-999',
        rollNumber: 'R-999-B',
        batchYear: '2026',
        emailId: 'charlie.b@beacon.edu',
        emergencyContact: '9876543212',
        userId: (await prisma.user.create({
          data: {
            collegeId: collegeB.id,
            email: 'charlie.b@beacon.edu',
            passwordHash: placeholderHash,
            role: 'student',
            accountStatus: 'pending',
            name: 'Charlie Beacon'
          }
        })).id
      }
    });

    console.log('Provisioned test colleges, departments, and pre-seeded student records');

    // ------------------------------------------------------------------------
    // Phase 1: Registration Link Generation & Zero-Plaintext Storage
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 1: Registration Link Security & Zero-Plaintext Verification ---');
    let rawTokenA = null;
    {
      const req = {
        tenant: { collegeId: collegeA.id },
        user: { id: adminA.id, collegeId: collegeA.id, role: 'admin' }
      };
      const res = createMockRes();

      await getRegistrationLink(req, res);

      assert(res.statusCode === 200, 'Admin can get/create registration link');
      assert(!!res.body.data.rawToken, 'Raw token returned to Admin UI for link sharing');
      rawTokenA = res.body.data.rawToken;

      // Verify PostgreSQL storage
      const expectedHash = crypto.createHash('sha256').update(rawTokenA).digest('hex');
      const dbLink = await prisma.studentRegistrationLink.findUnique({
        where: { tokenHash: expectedHash }
      });
      assert(!!dbLink, 'Deterministic SHA-256 tokenHash stored in PostgreSQL');
      assert(dbLink.collegeId === collegeA.id, 'Registration link is correctly scoped to College A');
      assert(dbLink.isActive === true, 'Registration link is marked active');

      // Verify raw token is NOT stored in the database
      const allLinks = await prisma.studentRegistrationLink.findMany();
      const rawStored = allLinks.some(l => l.tokenHash === rawTokenA);
      assert(!rawStored, 'CRITICAL: Raw registration token is NEVER stored in PostgreSQL in plaintext');
    }

    // ------------------------------------------------------------------------
    // Phase 2: Public Registration Info Endpoint
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 2: Public Registration Info Endpoint ---');
    {
      const req = { query: { token: rawTokenA } };
      const res = createMockRes();

      await getStudentRegistrationInfo(req, res);

      assert(res.statusCode === 200, 'Valid raw token resolves public registration info');
      assert(res.body.data.collegeName === 'Apex Engineering College', 'College name matches');
      assert(!res.body.data.tokenHash, 'tokenHash is never leaked to the client');
    }

    // ------------------------------------------------------------------------
    // Phase 3: Student Registration with Admission Number + Matching Email
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 3: Student Registration & Account Activation ---');
    {
      const req = {
        body: {
          token: rawTokenA,
          admissionNumber: 'ADM-APEX-101',
          email: 'ALICE.JOHNSON@APEX.EDU', // Test case-insensitivity
          firstName: 'Alice',
          lastName: 'Johnson',
          phone: '9876543210',
          password: 'AlicePassword123!',
          confirmPassword: 'AlicePassword123!'
        }
      };
      const res = createMockRes();

      await studentRegister(req, res);

      assert(res.statusCode === 201, 'Student registers successfully with 201 Created');
      assert(res.body.data.admissionNumber === 'ADM-APEX-101', 'Registered admission number confirmed');

      // Verify user activation in DB
      const activatedUser = await prisma.user.findFirst({
        where: { email: 'alice.johnson@apex.edu', collegeId: collegeA.id }
      });
      assert(activatedUser.accountStatus === 'active', 'User account is activated to "active"');
      assert(activatedUser.role === 'student', 'User role is assigned as "student"');
      const passMatch = await bcrypt.compare('AlicePassword123!', activatedUser.passwordHash);
      assert(passMatch, 'Custom student password hash securely stored');
    }

    // ------------------------------------------------------------------------
    // Phase 4: Duplicate Registration Protection
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 4: Duplicate Registration Protection ---');
    {
      const req = {
        body: {
          token: rawTokenA,
          admissionNumber: 'ADM-APEX-101',
          email: 'alice.johnson@apex.edu',
          firstName: 'Alice',
          lastName: 'Johnson',
          password: 'AnotherPassword123!',
          confirmPassword: 'AnotherPassword123!'
        }
      };
      const res = createMockRes();

      await studentRegister(req, res);

      assert(res.statusCode === 409, 'Duplicate registration rejected with 409 Conflict');
      assert(res.body.error.code === 'ALREADY_REGISTERED', 'Error code is ALREADY_REGISTERED');
    }

    // ------------------------------------------------------------------------
    // Phase 5: Mismatched Email Rejection (Account Takeover Guard)
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 5: Mismatched Email Rejection ---');
    {
      const req = {
        body: {
          token: rawTokenA,
          admissionNumber: 'ADM-APEX-102', // Bob Smith
          email: 'imposter@random.com',    // Wrong email
          firstName: 'Imposter',
          password: 'HackerPassword123!',
          confirmPassword: 'HackerPassword123!'
        }
      };
      const res = createMockRes();

      await studentRegister(req, res);

      assert(res.statusCode === 400, 'Registration with mismatched email rejected with 400 Bad Request');
      assert(res.body.error.code === 'EMAIL_MISMATCH', 'Error code is EMAIL_MISMATCH');
    }

    // ------------------------------------------------------------------------
    // Phase 6: Invalid & Tampered Registration Token Rejection
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 6: Tampered Token Rejection ---');
    {
      const tamperedToken = rawTokenA.slice(0, -1) + (rawTokenA.slice(-1) === 'a' ? 'b' : 'a');
      const req = {
        body: {
          token: tamperedToken,
          admissionNumber: 'ADM-APEX-102',
          email: 'bob.smith@apex.edu',
          firstName: 'Bob',
          password: 'BobPassword123!',
          confirmPassword: 'BobPassword123!'
        }
      };
      const res = createMockRes();

      await studentRegister(req, res);

      assert(res.statusCode === 401, 'Tampered raw token rejected with 401 Unauthorized');
      assert(res.body.error.code === 'INVALID_REGISTRATION_TOKEN', 'Error code is INVALID_REGISTRATION_TOKEN');
    }

    // ------------------------------------------------------------------------
    // Phase 7: Token Regeneration Invalidates Previous Link
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 7: Token Regeneration Invalidation ---');
    let rawTokenA2 = null;
    {
      const regenReq = {
        tenant: { collegeId: collegeA.id },
        user: { id: adminA.id, collegeId: collegeA.id, role: 'admin' }
      };
      const regenRes = createMockRes();
      await regenerateRegistrationLink(regenReq, regenRes);

      assert(regenRes.statusCode === 200, 'Admin can regenerate registration link');
      rawTokenA2 = regenRes.body.data.rawToken;
      assert(rawTokenA2 !== rawTokenA, 'New raw token is distinct from old raw token');

      // Attempt registration using OLD token -> should fail
      const oldReq = {
        body: {
          token: rawTokenA,
          admissionNumber: 'ADM-APEX-102',
          email: 'bob.smith@apex.edu',
          firstName: 'Bob',
          password: 'BobPassword123!',
          confirmPassword: 'BobPassword123!'
        }
      };
      const oldRes = createMockRes();
      await studentRegister(oldReq, oldRes);
      assert(oldRes.statusCode === 401, 'Old registration token is immediately invalidated');

      // Attempt registration using NEW token -> should succeed
      const newReq = {
        body: {
          token: rawTokenA2,
          admissionNumber: 'ADM-APEX-102',
          email: 'bob.smith@apex.edu',
          firstName: 'Bob',
          password: 'BobPassword123!',
          confirmPassword: 'BobPassword123!'
        }
      };
      const newRes = createMockRes();
      await studentRegister(newReq, newRes);
      assert(newRes.statusCode === 201, 'New registration token succeeds with 201 Created');
    }

    // ------------------------------------------------------------------------
    // Phase 8: Disabled Registration Link Rejection
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 8: Disabled Registration Link Rejection ---');
    {
      // Disable the link
      const toggleReq = {
        tenant: { collegeId: collegeA.id },
        user: { id: adminA.id, collegeId: collegeA.id, role: 'admin' },
        body: { isActive: false }
      };
      const toggleRes = createMockRes();
      await toggleRegistrationLink(toggleReq, toggleRes);
      assert(toggleRes.statusCode === 200, 'Admin toggled registration link to disabled');

      // Query registration info
      const infoReq = { query: { token: rawTokenA2 } };
      const infoRes = createMockRes();
      await getStudentRegistrationInfo(infoReq, infoRes);
      assert(infoRes.statusCode === 404, 'Disabled link rejected on getStudentRegistrationInfo');
    }

    // ------------------------------------------------------------------------
    // Phase 9: Dual Login (Admission Number vs Email)
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 9: Dual Login Verification ---');
    let studentAccessToken = null;
    let studentRefreshToken = null;
    {
      // 9a. Login with Admission Number (Case-insensitive)
      const admReq = {
        body: { identifier: 'adm-apex-101', password: 'AlicePassword123!' }
      };
      const admRes = createMockRes();
      await login(admReq, admRes);

      assert(admRes.statusCode === 200, 'Student logs in successfully using Admission Number');
      assert(admRes.body.data.user.role === 'student', 'Role is student');
      assert(admRes.body.data.user.email === 'alice.johnson@apex.edu', 'User email resolved');
      assert(!!admRes.body.data.accessToken, 'Access token generated');
      assert(!!admRes.body.data.refreshToken, 'Refresh token generated');

      studentAccessToken = admRes.body.data.accessToken;
      studentRefreshToken = admRes.body.data.refreshToken;

      // 9b. Login with Email (Case-insensitive)
      const emailReq = {
        body: { identifier: 'ALICE.JOHNSON@APEX.EDU', password: 'AlicePassword123!' }
      };
      const emailRes = createMockRes();
      await login(emailReq, emailRes);

      assert(emailRes.statusCode === 200, 'Student logs in successfully using Email');
      assert(emailRes.body.data.user.email === 'alice.johnson@apex.edu', 'Resolved user matches');

      // 9c. Wrong password returns generic 401
      const wrongPassReq = {
        body: { identifier: 'ADM-APEX-101', password: 'WrongPassword999!' }
      };
      const wrongPassRes = createMockRes();
      await login(wrongPassReq, wrongPassRes);

      assert(wrongPassRes.statusCode === 401, 'Wrong password returns 401 Unauthorized');
      assert(wrongPassRes.body.error.code === 'INVALID_CREDENTIALS', 'Generic error code INVALID_CREDENTIALS (no account enumeration)');

      // 9d. Non-existent identifier returns generic 401
      const unknownReq = {
        body: { identifier: 'UNKNOWN_999999', password: 'AnyPassword123!' }
      };
      const unknownRes = createMockRes();
      await login(unknownReq, unknownRes);

      assert(unknownRes.statusCode === 401, 'Unknown identifier returns 401 Unauthorized');
      assert(unknownRes.body.error.code === 'INVALID_CREDENTIALS', 'Generic error code INVALID_CREDENTIALS');
    }

    // ------------------------------------------------------------------------
    // Phase 10: Student Portal Module & Ownership Security
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 10: Student Portal Module & Ownership Security ---');
    {
      const req = {
        headers: { authorization: `Bearer ${studentAccessToken}` }
      };
      const res = createMockRes();

      await authenticate(req, res, () => {});
      await resolveStudent(req, res, () => {});
      await getStudentProfile(req, res);

      assert(res.statusCode === 200, 'Student profile fetched successfully');
      assert(res.body.data.admissionNumber === 'ADM-APEX-101', 'Own admission number returned');
      assert(res.body.data.department === 'Computer Science', 'Department matches');
      assert(res.body.data.collegeName === 'Apex Engineering College', 'Tenant college matches');

      // Test Dashboard
      const dashRes = createMockRes();
      await getStudentDashboard(req, dashRes);
      assert(dashRes.statusCode === 200, 'Student dashboard metrics loaded successfully');
      assert(dashRes.body.data.metrics.attendancePercentage !== undefined, 'Attendance metric present');
    }

    // ------------------------------------------------------------------------
    // Phase 11: Single-Flight Refresh Token Flow
    // ------------------------------------------------------------------------
    console.log('\n--- Phase 11: Refresh Token Flow & Session Persistence ---');
    {
      const req = { body: { refreshToken: studentRefreshToken } };
      const res = createMockRes();

      await refreshToken(req, res);

      assert(res.statusCode === 200, 'Student refresh token generates fresh access token');
      assert(!!res.body.data.accessToken, 'New access token issued');

      // Test Logout
      const logoutReq = { body: { refreshToken: studentRefreshToken } };
      const logoutRes = createMockRes();
      await logout(logoutReq, logoutRes);
      assert(logoutRes.statusCode === 200, 'Student logged out successfully');
    }

    console.log('\n===============================================================');
    console.log('🎉 ALL 11 STUDENT REGISTRATION & AUTH SECURITY PHASES PASSED 100%!');
    console.log('===============================================================\n');
  } catch (err) {
    console.error('\n❌ TEST RUNNER ERROR:', err);
    process.exit(1);
  } finally {
    // Cleanup fixtures
    if (collegeA && collegeB) {
      await prisma.studentRegistrationLink.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.student.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.department.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.refreshToken.deleteMany({ where: { user: { collegeId: { in: [collegeA.id, collegeB.id] } } } });
      await prisma.user.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.college.deleteMany({ where: { id: { in: [collegeA.id, collegeB.id] } } });
    }
    await prisma.$disconnect();
  }
}

runStudentRegistrationTests();
