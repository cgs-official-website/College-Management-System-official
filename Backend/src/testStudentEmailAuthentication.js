import 'dotenv/config';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from './server.js';
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
import { authenticate } from './middleware/authenticate.js';
import { resolveStudent } from './modules/student_portal/studentResolver.js';

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

let passedCount = 0;
let failedCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passedCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failedCount++;
  }
}

async function runEmailAuthTestSuite() {
  console.log('\n===============================================================');
  console.log('🚀 RUNNING EMAIL-ONLY STUDENT AUTHENTICATION TEST SUITE');
  console.log('===============================================================\n');

  let collegeA = null;
  let collegeB = null;
  let adminA = null;
  let deptA = null;
  let deptB = null;
  let studentA = null;
  let studentB = null;

  try {
    // Phase 0: Provisioning Multi-Tenant Colleges & Students
    console.log('--- Phase 0: Provisioning Multi-Tenant Test Data ---');
    collegeA = await prisma.college.create({
      data: {
        name: 'Apex Institute of Tech',
        slug: `apex-tech-${Date.now()}`,
        status: 'active',
        registrationNo: `APX-${Date.now()}`
      }
    });

    collegeB = await prisma.college.create({
      data: {
        name: 'Beacon College of Engg',
        slug: `beacon-engg-${Date.now()}`,
        status: 'active',
        registrationNo: `BCN-${Date.now()}`
      }
    });

    const adminHash = await bcrypt.hash('Admin@123456', 10);
    adminA = await prisma.user.create({
      data: {
        collegeId: collegeA.id,
        email: `admin_${Date.now()}@apex.edu`,
        passwordHash: adminHash,
        role: 'admin',
        accountStatus: 'active',
        name: 'Admin Apex'
      }
    });

    deptA = await prisma.department.create({
      data: { name: 'Computer Science', code: 'CSE', collegeId: collegeA.id }
    });

    deptB = await prisma.department.create({
      data: { name: 'Computer Science', code: 'CSE', collegeId: collegeB.id }
    });

    const defaultPassHash = await bcrypt.hash('StudentPass123!', 10);

    // Student A in College A with Admission Number "ADM-SHARED-777"
    studentA = await prisma.student.create({
      data: {
        collegeId: collegeA.id,
        departmentId: deptA.id,
        admissionNumber: 'ADM-SHARED-777',
        rollNumber: 'R-777-A',
        batchYear: '2026',
        emailId: 'alice.shared@apex.edu',
        userId: (await prisma.user.create({
          data: {
            collegeId: collegeA.id,
            email: 'alice.shared@apex.edu',
            passwordHash: defaultPassHash,
            role: 'student',
            accountStatus: 'active',
            name: 'Alice Shared'
          }
        })).id
      }
    });

    // Student B in College B with IDENTICAL Admission Number "ADM-SHARED-777"
    studentB = await prisma.student.create({
      data: {
        collegeId: collegeB.id,
        departmentId: deptB.id,
        admissionNumber: 'ADM-SHARED-777', // Duplicate across colleges!
        rollNumber: 'R-777-B',
        batchYear: '2026',
        emailId: 'bob.shared@beacon.edu',
        userId: (await prisma.user.create({
          data: {
            collegeId: collegeB.id,
            email: 'bob.shared@beacon.edu',
            passwordHash: defaultPassHash,
            role: 'student',
            accountStatus: 'active',
            name: 'Bob Shared'
          }
        })).id
      }
    });

    console.log('Provisioned College A & B with shared admission number ADM-SHARED-777\n');

    // Phase 1: Valid Student Email Login
    console.log('--- Phase 1: Valid Student Email Login ---');
    const loginReqAlice = {
      body: {
        email: 'alice.shared@apex.edu',
        password: 'StudentPass123!'
      }
    };
    const loginResAlice = createMockRes();
    await login(loginReqAlice, loginResAlice);

    assert(loginResAlice.statusCode === 200, 'Student Alice logs in successfully via Email');
    assert(loginResAlice.body.data?.user?.role === 'student', 'User role is student');
    assert(loginResAlice.body.data?.user?.email === 'alice.shared@apex.edu', 'User email matches Alice');
    assert(loginResAlice.body.data?.user?.collegeId === collegeA.id, 'User collegeId matches College A');
    assert(typeof loginResAlice.body.data?.accessToken === 'string', 'Access token is returned');
    assert(typeof loginResAlice.body.data?.refreshToken === 'string', 'Refresh token is returned');

    const aliceAccessToken = loginResAlice.body.data.accessToken;

    // Phase 2: Duplicate Admission Number Disambiguation (Bob Login)
    console.log('\n--- Phase 2: Duplicate Admission Number Disambiguation ---');
    const loginReqBob = {
      body: {
        email: 'bob.shared@beacon.edu',
        password: 'StudentPass123!'
      }
    };
    const loginResBob = createMockRes();
    await login(loginReqBob, loginResBob);

    assert(loginResBob.statusCode === 200, 'Student Bob logs in successfully via Email');
    assert(loginResBob.body.data?.user?.email === 'bob.shared@beacon.edu', 'User email matches Bob');
    assert(loginResBob.body.data?.user?.collegeId === collegeB.id, 'User collegeId matches College B');
    assert(loginResBob.body.data?.user?.id !== loginResAlice.body.data?.user?.id, 'Alice and Bob have distinct User IDs despite sharing ADM-SHARED-777');

    // Phase 3: Admission Number REJECTED as Login Identifier
    console.log('\n--- Phase 3: Admission Number REJECTED as Login Credential ---');
    const admLoginReq = {
      body: {
        email: 'ADM-SHARED-777', // Attempting to use admission number in email field
        password: 'StudentPass123!'
      }
    };
    const admLoginRes = createMockRes();
    try {
      await login(admLoginReq, admLoginRes);
    } catch (e) {
      admLoginRes.status(400).json({ success: false, error: { message: e.message } });
    }

    assert(admLoginRes.statusCode === 400 || admLoginRes.statusCode === 401, 'Admission number strictly rejected as login credential');
    assert(!admLoginRes.body.data?.accessToken, 'No access token issued for admission number login attempt');

    // Phase 4: Wrong Password & Unknown Email Rejection
    console.log('\n--- Phase 4: Wrong Password & Unknown Email Rejection ---');
    const wrongPassRes = createMockRes();
    await login({ body: { email: 'alice.shared@apex.edu', password: 'WrongPassword999!' } }, wrongPassRes);
    assert(wrongPassRes.statusCode === 401, 'Wrong password returns 401 Unauthorized');
    assert(wrongPassRes.body.error?.code === 'INVALID_CREDENTIALS', 'Generic error code INVALID_CREDENTIALS (no enumeration)');

    const unknownEmailRes = createMockRes();
    await login({ body: { email: 'nonexistent.student@apex.edu', password: 'StudentPass123!' } }, unknownEmailRes);
    assert(unknownEmailRes.statusCode === 401, 'Unknown email returns 401 Unauthorized');
    assert(unknownEmailRes.body.error?.code === 'INVALID_CREDENTIALS', 'Generic error code INVALID_CREDENTIALS');

    // Phase 5: Student Registration Still Requires Admission Number + Email
    console.log('\n--- Phase 5: Student Registration with Admission Number + Email ---');
    const linkReq = {
      tenant: { collegeId: collegeA.id },
      user: { id: adminA.id, collegeId: collegeA.id, role: 'admin' }
    };
    const linkRes = createMockRes();
    await getRegistrationLink(linkReq, linkRes);
    const rawRegToken = linkRes.body.data.rawToken;

    // Pre-seed an unactivated student in College A
    const unregStudent = await prisma.student.create({
      data: {
        collegeId: collegeA.id,
        departmentId: deptA.id,
        admissionNumber: 'ADM-APEX-NEW-01',
        rollNumber: 'R-NEW-01',
        batchYear: '2026',
        emailId: 'charlie.new@apex.edu',
        userId: (await prisma.user.create({
          data: {
            collegeId: collegeA.id,
            email: 'charlie.new@apex.edu',
            passwordHash: defaultPassHash,
            role: 'student',
            accountStatus: 'pending',
            name: 'Charlie New'
          }
        })).id
      }
    });

    const regReq = {
      body: {
        token: rawRegToken,
        admissionNumber: 'ADM-APEX-NEW-01',
        email: 'charlie.new@apex.edu',
        firstName: 'Charlie',
        lastName: 'New',
        password: 'CharlieNewPass123!',
        confirmPassword: 'CharlieNewPass123!'
      }
    };
    const regRes = createMockRes();
    await studentRegister(regReq, regRes);

    assert(regRes.statusCode === 201, 'Student registers successfully with Admission No + Email');
    assert(regRes.body.data.email === 'charlie.new@apex.edu', 'Registered email confirmed');

    // Now Charlie logs in with his registered Email
    const charlieLoginRes = createMockRes();
    await login({
      body: {
        email: 'charlie.new@apex.edu',
        password: 'CharlieNewPass123!'
      }
    }, charlieLoginRes);
    assert(charlieLoginRes.statusCode === 200, 'Newly registered student logs in via Email + Password');

    // Phase 6: Student Portal Access with Email-Authenticated Session
    console.log('\n--- Phase 6: Student Portal Module Verification ---');
    const portalReq = {
      headers: { authorization: `Bearer ${aliceAccessToken}` }
    };
    await authenticate(portalReq, createMockRes(), () => {});
    await resolveStudent(portalReq, createMockRes(), () => {});

    const profRes = createMockRes();
    await getStudentProfile(portalReq, profRes);
    assert(profRes.statusCode === 200, 'Student profile fetched successfully');
    assert(profRes.body.data.email === 'alice.shared@apex.edu', 'Profile email matches authenticated user');
    assert(profRes.body.data.admissionNumber === 'ADM-SHARED-777', 'Admission number accurately displayed in profile');

    // Phase 7: Non-Student Login Compatibility (Admin Login)
    console.log('\n--- Phase 7: Non-Student Login Compatibility ---');
    const adminLoginRes = createMockRes();
    await login({
      body: {
        email: adminA.email,
        password: 'Admin@123456'
      }
    }, adminLoginRes);
    assert(adminLoginRes.statusCode === 200, 'Admin logs in successfully via Email');
    assert(adminLoginRes.body.data.user.role === 'admin', 'Admin role preserved');

    console.log('\n===============================================================');
    if (failedCount === 0) {
      console.log(`🎉 ALL ${passedCount} EMAIL-ONLY STUDENT AUTHENTICATION TESTS PASSED 100%!`);
    } else {
      console.error(`💥 TEST SUITE COMPLETED WITH ${failedCount} FAILURES (${passedCount} passed).`);
    }
    console.log('===============================================================\n');

  } catch (err) {
    console.error('Test suite error:', err);
  } finally {
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

runEmailAuthTestSuite();
