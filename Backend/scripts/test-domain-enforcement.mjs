import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';
import { redis } from '../src/lib/cache.js';
import {
  assertEmailAllowedForCollege,
  isEmailAllowedForCollege,
  getVerifiedDomainsForCollege,
  invalidateVerifiedDomainsCache,
} from '../src/modules/domains/domains.service.js';

const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}/api/v1`;

const SUFFIX = Date.now();
const FIXTURE_PASSWORD = 'EnforcePass@123';

const VERIFIED_TEST_DOMAIN = `fixture-enforce-${SUFFIX}.edu`;
const PENDING_TEST_DOMAIN = `fixture-pending-${SUFFIX}.edu`;

let passedCount = 0;
let failedCount = 0;
let skippedCount = 0;

function logResult(testLetter, testName, status, detail = '') {
  if (status === 'SKIPPED') {
    skippedCount++;
    console.log(`  ⏭️ Test (${testLetter}) [SKIPPED]: ${testName} (${detail})`);
  } else if (status === true || status === 'PASS') {
    passedCount++;
    console.log(`  ✅ Test (${testLetter}) [PASS]: ${testName}`);
  } else {
    failedCount++;
    console.error(`  ❌ Test (${testLetter}) [FAIL]: ${testName} ${detail ? `(${detail})` : ''}`);
  }
}

async function apiRequest(endpoint, options = {}, token = null) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let attempts = 0;
  while (attempts < 3) {
    attempts++;
    try {
      const res = await fetch(url, {
        ...options,
        headers,
      });

      let data = null;
      try {
        data = await res.json();
      } catch (_) {
        data = null;
      }

      // Retry transient PostgreSQL proxy socket resets
      const isTransientDbError =
        (res.status === 400 &&
          (data?.error?.code === 'PRISMA_P1017' ||
            data?.errorCode === 'PRISMA_P1017' ||
            String(data?.error?.message || data?.message || '').includes('Connection terminated') ||
            String(data?.error?.message || data?.message || '').includes('ECONNRESET'))) ||
        (res.status === 401 && data?.error?.code === 'INVALID_TOKEN' && attempts < 3);

      if (isTransientDbError && attempts < 3) {
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }

      return { status: res.status, ok: res.ok, data };
    } catch (netErr) {
      if (attempts >= 3) throw netErr;
      await new Promise((r) => setTimeout(r, 800));
    }
  }
}

async function runEnforcementTests() {
  console.log('\n============================================================');
  console.log('🧪 Running Domain Integration Enforcement Tests (Step 3b/3d)');
  console.log('   - Dedicated fixture college & admin (ZERO real accounts)');
  console.log('   - Real HTTP login & authenticated JWT flow');
  console.log('   - Cache invalidation verification on verify/delete');
  console.log('   - Public endpoint generic error message check');
  console.log(`API Target: ${BASE_URL}`);
  console.log('============================================================\n');

  let college = null;
  let department = null;
  let adminUser = null;
  let preExistingMismatchedUser = null;
  let adminToken = null;
  let verifiedDomainRecord = null;
  let pendingDomainRecord = null;

  const createdUserIds = [];
  const createdStudentIds = [];
  const createdTeacherIds = [];
  const createdDomainIds = [];
  const createdCollegeIds = [];

  try {
    const passwordHash = await bcrypt.hash(FIXTURE_PASSWORD, 10);

    // ─────────────────────────────────────────────────────────────
    // 1. Setup Dedicated Fixture College & Department
    // ─────────────────────────────────────────────────────────────
    console.log('📦 Initializing isolated fixture college & records...');
    college = await prisma.college.create({
      data: {
        name: `Fixture Enforce College ${SUFFIX}`,
        slug: `fixture-enforce-college-${SUFFIX}`,
        status: 'active',
      },
    });
    createdCollegeIds.push(college.id);

    department = await prisma.department.create({
      data: {
        name: 'Computer Science',
        code: `CS${SUFFIX.toString().slice(-4)}`,
        collegeId: college.id,
      },
    });

    // 2. Setup Dedicated Fixture Admin
    adminUser = await prisma.user.create({
      data: {
        name: 'Fixture Enforcement Admin',
        email: `admin@${VERIFIED_TEST_DOMAIN}`,
        role: 'admin',
        collegeId: college.id,
        accountStatus: 'active',
        passwordHash,
      },
    });
    createdUserIds.push(adminUser.id);

    // 3. Setup Pre-existing Mismatched User (created BEFORE verified domains exist)
    preExistingMismatchedUser = await prisma.user.create({
      data: {
        name: 'Legacy Mismatched Staff',
        email: `legacy-staff-${SUFFIX}@legacy-external.org`,
        role: 'teacher',
        collegeId: college.id,
        accountStatus: 'active',
        passwordHash,
      },
    });
    createdUserIds.push(preExistingMismatchedUser.id);

    // 4. Authenticate admin via real HTTP endpoint to obtain genuine JWT
    process.stdout.write('Authenticating admin...');
    const loginRes = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminUser.email, password: FIXTURE_PASSWORD }),
    });

    adminToken = loginRes.data?.data?.accessToken;
    if (!adminToken) {
      throw new Error(`Failed to log in fixture admin: ${JSON.stringify(loginRes.data)}`);
    }
    console.log(' authenticated successfully.\n');

    // 5. Seed Verified and Pending Domains for College
    verifiedDomainRecord = await prisma.collegeDomain.create({
      data: {
        collegeId: college.id,
        domain: VERIFIED_TEST_DOMAIN,
        verificationToken: `vtoken-${SUFFIX}`,
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });
    createdDomainIds.push(verifiedDomainRecord.id);

    pendingDomainRecord = await prisma.collegeDomain.create({
      data: {
        collegeId: college.id,
        domain: PENDING_TEST_DOMAIN,
        verificationToken: `ptoken-${SUFFIX}`,
        status: 'PENDING',
      },
    });
    createdDomainIds.push(pendingDomainRecord.id);

    // Invalidate Redis cache to ensure clean state
    await invalidateVerifiedDomainsCache(college.id);

    // ─────────────────────────────────────────────────────────────
    // TEST (a): Student with verified domain -> allowed (201)
    // ─────────────────────────────────────────────────────────────
    {
      const matchingEmail = `student.test.${SUFFIX}@${VERIFIED_TEST_DOMAIN}`;
      const res = await apiRequest(
        '/students',
        {
          method: 'POST',
          body: JSON.stringify({
            firstName: 'Verified',
            lastName: 'Student',
            email: matchingEmail,
            admissionNumber: `ADM-${Date.now().toString().slice(-6)}`,
            departmentId: department.id,
            rollNo: `R-${Date.now().toString().slice(-4)}`,
          }),
        },
        adminToken
      );

      const studentId = res.data?.data?.id || res.data?.id;
      if (studentId) createdStudentIds.push(studentId);
      const passed = res.status === 201 && (res.data?.success === true || Boolean(res.data?.data));
      logResult(
        'a',
        'New student with matching verified domain is ALLOWED (201 Created)',
        passed,
        `Status: ${res.status}`
      );
    }

    // ─────────────────────────────────────────────────────────────
    // TEST (b): Student with subdomain of verified domain -> allowed (201)
    // ─────────────────────────────────────────────────────────────
    {
      const subdomainEmail = `student.sub.${SUFFIX}@cse.${VERIFIED_TEST_DOMAIN}`;
      const res = await apiRequest(
        '/students',
        {
          method: 'POST',
          body: JSON.stringify({
            firstName: 'Subdomain',
            lastName: 'Student',
            email: subdomainEmail,
            admissionNumber: `ADM-${(Date.now() + 1).toString().slice(-6)}`,
            departmentId: department.id,
            rollNo: `R-${(Date.now() + 1).toString().slice(-4)}`,
          }),
        },
        adminToken
      );

      const studentId = res.data?.data?.id || res.data?.id;
      if (studentId) createdStudentIds.push(studentId);
      const passed = res.status === 201 && (res.data?.success === true || Boolean(res.data?.data));
      logResult(
        'b',
        'New student with subdomain of verified domain is ALLOWED (201 Created)',
        passed,
        `Status: ${res.status}`
      );
    }

    // ─────────────────────────────────────────────────────────────
    // TEST (c): Student with public domain (gmail.com) -> blocked (403)
    // ─────────────────────────────────────────────────────────────
    {
      const publicEmail = `student.public.${SUFFIX}@gmail.com`;
      const res = await apiRequest(
        '/students',
        {
          method: 'POST',
          body: JSON.stringify({
            firstName: 'Public',
            lastName: 'Student',
            email: publicEmail,
            admissionNumber: `ADM-${(Date.now() + 2).toString().slice(-6)}`,
            departmentId: department.id,
            rollNo: `R-${(Date.now() + 2).toString().slice(-4)}`,
          }),
        },
        adminToken
      );

      const passed =
        res.status === 403 &&
        (res.data?.error?.code === 'EMAIL_DOMAIN_NOT_ALLOWED' || res.data?.code === 'EMAIL_DOMAIN_NOT_ALLOWED');
      logResult(
        'c',
        'New student with gmail.com is BLOCKED with 403 EMAIL_DOMAIN_NOT_ALLOWED',
        passed,
        `Status: ${res.status}, Code: ${res.data?.error?.code || res.data?.code}`
      );
    }

    // ─────────────────────────────────────────────────────────────
    // TEST (d): Lookalike domain (evil+domain.edu) -> blocked (403)
    // ─────────────────────────────────────────────────────────────
    {
      const lookalikeEmail = `attacker@evil${VERIFIED_TEST_DOMAIN}`;
      const res = await apiRequest(
        '/students',
        {
          method: 'POST',
          body: JSON.stringify({
            firstName: 'Lookalike',
            lastName: 'Attacker',
            email: lookalikeEmail,
            admissionNumber: `ADM-${(Date.now() + 3).toString().slice(-6)}`,
            departmentId: department.id,
            rollNo: `R-${(Date.now() + 3).toString().slice(-4)}`,
          }),
        },
        adminToken
      );

      const passed =
        res.status === 403 &&
        (res.data?.error?.code === 'EMAIL_DOMAIN_NOT_ALLOWED' || res.data?.code === 'EMAIL_DOMAIN_NOT_ALLOWED');
      logResult(
        'd',
        'Lookalike domain (non-dot boundary evil+domain) is BLOCKED with 403',
        passed,
        `Status: ${res.status}, Code: ${res.data?.error?.code || res.data?.code}`
      );
    }

    // ─────────────────────────────────────────────────────────────
    // TEST (e): PARENT with gmail -> allowed (exempt) [Calls helper directly]
    // ─────────────────────────────────────────────────────────────
    {
      const parentCheck = await isEmailAllowedForCollege(college.id, 'parent.guardian@gmail.com', 'parent');
      const passed = parentCheck.allowed === true && parentCheck.reason === 'EXEMPT_ROLE';
      logResult(
        'e',
        'PARENT role with public email (@gmail.com) is ALLOWED (EXEMPT) [via helper directly]',
        passed,
        `Result: ${JSON.stringify(parentCheck)}`
      );
    }

    // ─────────────────────────────────────────────────────────────
    // TEST (f): SUPERADMIN -> allowed (exempt) [Calls helper directly]
    // ─────────────────────────────────────────────────────────────
    {
      const superadminCheck = await isEmailAllowedForCollege(college.id, 'superadmin@teamzuna.in', 'superadmin');
      const passed = superadminCheck.allowed === true && superadminCheck.reason === 'EXEMPT_ROLE';
      logResult(
        'f',
        'SUPERADMIN role with platform email is ALLOWED (EXEMPT) [via helper directly]',
        passed,
        `Result: ${JSON.stringify(superadminCheck)}`
      );
    }

    // ─────────────────────────────────────────────────────────────
    // TEST (g): College with zero verified domains -> allowed
    // ─────────────────────────────────────────────────────────────
    {
      const zeroDomainsCheck = await isEmailAllowedForCollege(
        '00000000-0000-0000-0000-000000000001',
        'student@anydomain.org',
        'student'
      );
      const passed = zeroDomainsCheck.allowed === true && zeroDomainsCheck.reason === 'NO_VERIFIED_DOMAINS';
      logResult(
        'g',
        'College with 0 verified domains skips enforcement (ALLOWS backward compatibility)',
        passed,
        `Result: ${JSON.stringify(zeroDomainsCheck)}`
      );
    }

    // ─────────────────────────────────────────────────────────────
    // TEST (h): Domain in pending (unverified) status -> not counted (403)
    // ─────────────────────────────────────────────────────────────
    {
      const pendingEmail = `student@${PENDING_TEST_DOMAIN}`;
      const res = await apiRequest(
        '/students',
        {
          method: 'POST',
          body: JSON.stringify({
            firstName: 'Pending',
            lastName: 'DomainTest',
            email: pendingEmail,
            admissionNumber: `ADM-${(Date.now() + 4).toString().slice(-6)}`,
            departmentId: department.id,
            rollNo: `R-${(Date.now() + 4).toString().slice(-4)}`,
          }),
        },
        adminToken
      );

      const passed =
        res.status === 403 &&
        (res.data?.error?.code === 'EMAIL_DOMAIN_NOT_ALLOWED' || res.data?.code === 'EMAIL_DOMAIN_NOT_ALLOWED');
      logResult(
        'h',
        'Domain in PENDING status is NOT counted (BLOCKED with 403)',
        passed,
        `Status: ${res.status}, Code: ${res.data?.error?.code || res.data?.code}`
      );
    }

    // ─────────────────────────────────────────────────────────────
    // TEST (i): Pre-existing user with non-matching domain logs in successfully (Option B)
    // ─────────────────────────────────────────────────────────────
    {
      const loginCheckRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: preExistingMismatchedUser.email, password: FIXTURE_PASSWORD }),
      });

      const passed =
        loginCheckRes.status === 200 &&
        Boolean(loginCheckRes.data?.data?.accessToken || loginCheckRes.data?.data?.token);

      logResult(
        'i',
        'Pre-existing user with non-matching domain logs in successfully (OPTION B SOFT ENFORCEMENT)',
        passed,
        `Status: ${loginCheckRes.status}, Email: ${preExistingMismatchedUser.email}`
      );
    }

    // ─────────────────────────────────────────────────────────────
    // TEST (j): Cache invalidation works on domain verify and delete
    // ─────────────────────────────────────────────────────────────
    {
      if (!redis || redis.status !== 'ready') {
        logResult(
          'j',
          'Cache invalidation functions accurately on domain verify and delete',
          'SKIPPED',
          'Redis is not running/ready in local environment'
        );
      } else {
        const testCacheDomain = `cache-test-${SUFFIX}.edu`;
        // 1. Add domain via DB
        const newDomain = await prisma.collegeDomain.create({
          data: {
            collegeId: college.id,
            domain: testCacheDomain,
            verificationToken: `cache-token-${SUFFIX}`,
            status: 'PENDING',
          },
        });
        createdDomainIds.push(newDomain.id);

        // Warm cache
        const beforeVerify = await getVerifiedDomainsForCollege(college.id);
        const cachedBefore = !beforeVerify.includes(testCacheDomain);

        // Verify domain and invalidate cache
        await prisma.collegeDomain.update({
          where: { id: newDomain.id },
          data: { status: 'VERIFIED', verifiedAt: new Date() },
        });
        await invalidateVerifiedDomainsCache(college.id);

        // Query again - cache must reflect new verified domain
        const afterVerify = await getVerifiedDomainsForCollege(college.id);
        const verifiedPresent = afterVerify.includes(testCacheDomain);

        // Delete domain and invalidate cache
        await prisma.collegeDomain.delete({ where: { id: newDomain.id } });
        await invalidateVerifiedDomainsCache(college.id);

        const afterDelete = await getVerifiedDomainsForCollege(college.id);
        const deletedAbsent = !afterDelete.includes(testCacheDomain);

        const isCachePassing = cachedBefore && verifiedPresent && deletedAbsent;
        logResult(
          'j',
          'Cache invalidation functions accurately on domain verify and delete',
          isCachePassing,
          `Before: ${beforeVerify.length}, Verified: ${afterVerify.length}, Deleted: ${afterDelete.length}`
        );
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST (k): Public studentRegister returns generic message without domain list
    // ─────────────────────────────────────────────────────────────
    {
      const publicRegisterRes = await apiRequest('/auth/student/register', {
        method: 'POST',
        body: JSON.stringify({
          collegeId: college.id,
          firstName: 'Public',
          lastName: 'Candidate',
          dob: '2005-01-01',
          email: `public-candidate-${SUFFIX}@gmail.com`,
          password: 'CandidatePass@123',
          confirmPassword: 'CandidatePass@123',
        }),
      });

      const isGeneric =
        publicRegisterRes.status === 403 &&
        publicRegisterRes.data?.error?.code === 'EMAIL_DOMAIN_NOT_ALLOWED' &&
        publicRegisterRes.data?.error?.message === "Please use your institution's email address." &&
        publicRegisterRes.data?.error?.allowedDomains === undefined;

      logResult(
        'k',
        'Public studentRegister returns generic error message without exposing allowed domains',
        isGeneric,
        `Status: ${publicRegisterRes.status}, Message: "${publicRegisterRes.data?.error?.message}"`
      );
    }

    // ─────────────────────────────────────────────────────────────
    // TEST (l): Redis resilience - hanging cache read times out in <1000ms & falls back to DB
    // ─────────────────────────────────────────────────────────────
    {
      const startMs = Date.now();
      const originalGet = redis.get;
      const originalStatus = redis.status;

      try {
        // Force redis to simulate ready status but hanging command
        redis.status = 'ready';
        redis.get = () =>
          new Promise((resolve) => setTimeout(() => resolve(JSON.stringify(['hanging.edu'])), 3000));

        const domains = await getVerifiedDomainsForCollege(college.id);
        const elapsedMs = Date.now() - startMs;
        const passed = elapsedMs < 1000 && domains.includes(VERIFIED_TEST_DOMAIN);

        logResult(
          'l',
          'Redis resilience: hanging cache read times out in <1000ms and safely falls back to DB',
          passed,
          `Elapsed: ${elapsedMs}ms, Domains returned: ${domains.length}`
        );
      } finally {
        redis.get = originalGet;
        redis.status = originalStatus;
      }
    }

    // ─────────────────────────────────────────────────────────────
    // TEST (m): Admin update student email enforcement
    // ─────────────────────────────────────────────────────────────
    {
      // 1. Create a student to test editing
      const editStudentEmail = `edit.student.${SUFFIX}@${VERIFIED_TEST_DOMAIN}`;
      const createRes = await apiRequest(
        '/students',
        {
          method: 'POST',
          body: JSON.stringify({
            firstName: 'Edit',
            lastName: 'Student',
            email: editStudentEmail,
            admissionNumber: `ADM-ED-${Date.now().toString().slice(-6)}`,
            departmentId: department.id,
            rollNo: `R-ED-${Date.now().toString().slice(-4)}`,
          }),
        },
        adminToken
      );

      const targetStudentId = createRes.data?.data?.id || createRes.data?.id;
      if (targetStudentId) createdStudentIds.push(targetStudentId);

      // 2. Attempt to update email to unauthorized domain -> 403 Forbidden
      const updateDisallowedRes = await apiRequest(
        `/students/${targetStudentId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            email: `new.email.${SUFFIX}@unauthorized-external.com`,
          }),
        },
        adminToken
      );

      const disallowedBlocked =
        updateDisallowedRes.status === 403 &&
        (updateDisallowedRes.data?.error?.code === 'EMAIL_DOMAIN_NOT_ALLOWED' ||
          updateDisallowedRes.data?.code === 'EMAIL_DOMAIN_NOT_ALLOWED');

      // 3. Update with the SAME email (unchanged) -> 200 OK without domain error
      const updateSameEmailRes = await apiRequest(
        `/students/${targetStudentId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            firstName: 'UpdatedName',
            email: editStudentEmail,
          }),
        },
        adminToken
      );

      const sameEmailAllowed = updateSameEmailRes.status === 200;

      // 4. Update with a VALID sub-domain -> 200 OK
      const updateValidDomainRes = await apiRequest(
        `/students/${targetStudentId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            email: `updated.email.${SUFFIX}@cse.${VERIFIED_TEST_DOMAIN}`,
          }),
        },
        adminToken
      );

      const validUpdateAllowed = updateValidDomainRes.status === 200;

      const isUpdateAuditPassing = disallowedBlocked && sameEmailAllowed && validUpdateAllowed;

      logResult(
        'm',
        'Admin student email update enforces domain check ONLY on change (blocks non-compliant, permits compliant & unchanged)',
        isUpdateAuditPassing,
        `BlockedDisallowed: ${disallowedBlocked}, SameEmailAllowed: ${sameEmailAllowed}, ValidAllowed: ${validUpdateAllowed}`
      );
    }

    // ─────────────────────────────────────────────────────────────
    // TEST (n): Bulk student enroll with mixed rows gives per-row errors while valid rows continue
    // ─────────────────────────────────────────────────────────────
    {
      const bulkValidEmail = `bulk.valid.${SUFFIX}@${VERIFIED_TEST_DOMAIN}`;
      const bulkInvalidEmail = `bulk.invalid.${SUFFIX}@external-disallowed.com`;
      const bulkAdmValid = `ADM-BV-${Date.now().toString().slice(-5)}`;
      const bulkAdmInvalid = `ADM-BI-${Date.now().toString().slice(-5)}`;

      const bulkRes = await apiRequest(
        '/students/bulk',
        {
          method: 'POST',
          body: JSON.stringify({
            data: [
              {
                Student_Name: 'Bulk Valid Student',
                Admission_No: bulkAdmValid,
                Email: bulkValidEmail,
                Department: department.name,
                Parent_Mobile: '9876543210',
                Parent_Name: 'Valid Parent',
              },
              {
                Student_Name: 'Bulk Invalid Student',
                Admission_No: bulkAdmInvalid,
                Email: bulkInvalidEmail,
                Department: department.name,
                Parent_Mobile: '9876543211',
                Parent_Name: 'Invalid Parent',
              },
            ],
          }),
        },
        adminToken
      );

      const bulkData = bulkRes.data?.data || bulkRes.data;
      const isSuccessful1 = bulkData?.successful === 1;
      const isFailed1 = bulkData?.failed === 1;
      const hasErrorMsg =
        Array.isArray(bulkData?.errors) &&
        bulkData.errors.some((err) => err.includes('external-disallowed.com') || err.includes('not allowed'));

      // Verify the valid student was indeed created in DB
      const validStudentCreated = await prisma.student.findFirst({
        where: { collegeId: college.id, admissionNumber: bulkAdmValid },
        include: { user: true },
      });
      if (validStudentCreated) {
        createdStudentIds.push(validStudentCreated.id);
        if (validStudentCreated.userId) createdUserIds.push(validStudentCreated.userId);
      }

      // Verify the invalid student was NOT created
      const invalidStudentCreated = await prisma.student.findFirst({
        where: { collegeId: college.id, admissionNumber: bulkAdmInvalid },
      });

      const passed =
        bulkRes.status === 200 &&
        isSuccessful1 &&
        isFailed1 &&
        hasErrorMsg &&
        Boolean(validStudentCreated) &&
        !invalidStudentCreated;

      logResult(
        'n',
        'Bulk student enroll with mixed rows gives per-row errors while valid rows continue',
        passed,
        `Success: ${bulkData?.successful}, Failed: ${bulkData?.failed}, Errors: ${bulkData?.errors?.length || 0}`
      );
    }

    // ─────────────────────────────────────────────────────────────
    // TEST (o): Admin staff update (PUT /staff/:id) email-change test (blocked / unchanged / allowed)
    // ─────────────────────────────────────────────────────────────
    {
      const staffInitEmail = `staff.edit.${SUFFIX}@${VERIFIED_TEST_DOMAIN}`;
      const teacherIdStr = `TID${Date.now().toString().slice(-5)}`;

      const staffCreateRes = await apiRequest(
        '/staff',
        {
          method: 'POST',
          body: JSON.stringify({
            firstName: 'Staff',
            lastName: 'EditTest',
            email: staffInitEmail,
            teacherId: teacherIdStr,
            departmentId: department.id,
            designation: 'Assistant Professor',
          }),
        },
        adminToken
      );

      const createdStaff = staffCreateRes.data?.data || staffCreateRes.data;
      const targetStaffId = createdStaff?.id;
      if (targetStaffId) createdTeacherIds.push(targetStaffId);
      if (createdStaff?.userId) createdUserIds.push(createdStaff.userId);

      // 1. Update with non-matching domain -> 403 Forbidden
      const staffDisallowedRes = await apiRequest(
        `/staff/${targetStaffId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            email: `staff.disallowed.${SUFFIX}@external-disallowed.com`,
          }),
        },
        adminToken
      );

      const staffDisallowedBlocked =
        staffDisallowedRes.status === 403 &&
        (staffDisallowedRes.data?.error?.code === 'EMAIL_DOMAIN_NOT_ALLOWED' ||
          staffDisallowedRes.data?.code === 'EMAIL_DOMAIN_NOT_ALLOWED');

      // 2. Update with SAME email (unchanged) -> 200 OK
      const staffSameEmailRes = await apiRequest(
        `/staff/${targetStaffId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: 'Staff Name Updated',
            email: staffInitEmail,
          }),
        },
        adminToken
      );

      const staffSameEmailAllowed = staffSameEmailRes.status === 200;

      // 3. Update with valid sub-domain -> 200 OK
      const staffValidUpdateRes = await apiRequest(
        `/staff/${targetStaffId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            email: `staff.updated.${SUFFIX}@cse.${VERIFIED_TEST_DOMAIN}`,
          }),
        },
        adminToken
      );

      const staffValidUpdateAllowed = staffValidUpdateRes.status === 200;

      const staffAuditPassed =
        staffDisallowedBlocked && staffSameEmailAllowed && staffValidUpdateAllowed;

      logResult(
        'o',
        'Admin staff update (PUT /staff/:id) enforces domain check ONLY on change (blocks non-compliant, permits compliant & unchanged)',
        staffAuditPassed,
        `BlockedDisallowed: ${staffDisallowedBlocked}, SameEmailAllowed: ${staffSameEmailAllowed}, ValidAllowed: ${staffValidUpdateAllowed}`
      );
    }

    // ─────────────────────────────────────────────────────────────
    // TEST (p): updateProfile validation ordering, password verification on email change, and transactional writes
    // ─────────────────────────────────────────────────────────────
    {
      const initialUser = await prisma.user.findUnique({ where: { id: adminUser.id } });
      const initialPasswordHash = initialUser.passwordHash;

      // 1. Blocked domain + newPassword => 403 and password unchanged, email unchanged
      const updateDisallowedProfileRes = await apiRequest(
        '/users/profile',
        {
          method: 'PUT',
          body: JSON.stringify({
            email: `disallowed.${SUFFIX}@external-disallowed.com`,
            currentPassword: FIXTURE_PASSWORD,
            newPassword: 'BrandNewPassword@123',
          }),
        },
        adminToken
      );

      const isDisallowedBlocked =
        updateDisallowedProfileRes.status === 403 &&
        (updateDisallowedProfileRes.data?.error?.code === 'EMAIL_DOMAIN_NOT_ALLOWED' ||
          updateDisallowedProfileRes.data?.code === 'EMAIL_DOMAIN_NOT_ALLOWED');

      const afterDisallowedUser = await prisma.user.findUnique({ where: { id: adminUser.id } });
      const passwordUnchangedOnDisallowed = afterDisallowedUser.passwordHash === initialPasswordHash;
      const emailUnchangedOnDisallowed = afterDisallowedUser.email === initialUser.email;

      // 2. Email change without currentPassword => 400 PASSWORD_REQUIRED and email unchanged in DB
      const noPwdRes = await apiRequest(
        '/users/profile',
        {
          method: 'PUT',
          body: JSON.stringify({
            email: `allowed.nopwd.${SUFFIX}@${VERIFIED_TEST_DOMAIN}`,
          }),
        },
        adminToken
      );

      const isNoPwdRejected =
        noPwdRes.status === 400 &&
        (noPwdRes.data?.error?.code === 'PASSWORD_REQUIRED' ||
          noPwdRes.data?.code === 'PASSWORD_REQUIRED');

      const afterNoPwdUser = await prisma.user.findUnique({ where: { id: adminUser.id } });
      const emailUnchangedOnNoPwd = afterNoPwdUser.email === initialUser.email;

      // 3. Wrong currentPassword + new allowed email => 401 INVALID_PASSWORD and email unchanged in DB
      const wrongPwdRes = await apiRequest(
        '/users/profile',
        {
          method: 'PUT',
          body: JSON.stringify({
            email: `allowed.wrongpwd.${SUFFIX}@${VERIFIED_TEST_DOMAIN}`,
            currentPassword: 'WrongPassword@999',
          }),
        },
        adminToken
      );

      const isWrongPwdRejected =
        wrongPwdRes.status === 401 &&
        (wrongPwdRes.data?.error?.code === 'INVALID_PASSWORD' ||
          wrongPwdRes.data?.code === 'INVALID_PASSWORD');

      const afterWrongPwdUser = await prisma.user.findUnique({ where: { id: adminUser.id } });
      const emailUnchangedOnWrongPwd = afterWrongPwdUser.email === initialUser.email;
      const passwordUnchangedOnWrongPwd = afterWrongPwdUser.passwordHash === initialPasswordHash;

      // 3b. Create a second user in the same college, then test email change collision:
      // (i) wrong password => 401 INVALID_PASSWORD
      // (ii) correct password => 400 EMAIL_IN_USE
      const secondUserEmail = `second.user.${SUFFIX}@${VERIFIED_TEST_DOMAIN}`;
      const secondUser = await prisma.user.create({
        data: {
          name: 'Second College User',
          email: secondUserEmail,
          role: 'student',
          collegeId: college.id,
          accountStatus: 'active',
          passwordHash,
        },
      });
      createdUserIds.push(secondUser.id);

      const duplicateEmailWrongPwdRes = await apiRequest(
        '/users/profile',
        {
          method: 'PUT',
          body: JSON.stringify({
            email: secondUserEmail,
            currentPassword: 'WrongPassword@999',
          }),
        },
        adminToken
      );

      const isDuplicateEmailWrongPwdRejected =
        duplicateEmailWrongPwdRes.status === 401 &&
        (duplicateEmailWrongPwdRes.data?.error?.code === 'INVALID_PASSWORD' ||
          duplicateEmailWrongPwdRes.data?.code === 'INVALID_PASSWORD');

      const duplicateEmailCorrectPwdRes = await apiRequest(
        '/users/profile',
        {
          method: 'PUT',
          body: JSON.stringify({
            email: secondUserEmail,
            currentPassword: FIXTURE_PASSWORD,
          }),
        },
        adminToken
      );

      const isDuplicateEmailCorrectPwdRejected =
        duplicateEmailCorrectPwdRes.status === 400 &&
        (duplicateEmailCorrectPwdRes.data?.error?.code === 'EMAIL_IN_USE' ||
          duplicateEmailCorrectPwdRes.data?.code === 'EMAIL_IN_USE');

      const afterDuplicateEmailUser = await prisma.user.findUnique({ where: { id: adminUser.id } });
      const emailUnchangedOnDuplicate = afterDuplicateEmailUser.email === initialUser.email;

      // 3c. Email change with wrong password to a blocked domain => 401 INVALID_PASSWORD (not 403 EMAIL_DOMAIN_NOT_ALLOWED)
      const blockedDomainWrongPwdRes = await apiRequest(
        '/users/profile',
        {
          method: 'PUT',
          body: JSON.stringify({
            email: `blocked.domain.${SUFFIX}@external-disallowed.com`,
            currentPassword: 'WrongPassword@999',
          }),
        },
        adminToken
      );

      const isBlockedDomainWrongPwdRejected =
        blockedDomainWrongPwdRes.status === 401 &&
        (blockedDomainWrongPwdRes.data?.error?.code === 'INVALID_PASSWORD' ||
          blockedDomainWrongPwdRes.data?.code === 'INVALID_PASSWORD');

      // 4. Invalid phone + new allowed email (with correct currentPassword) => 400 INVALID_PHONE and email unchanged
      const invalidPhoneRes = await apiRequest(
        '/users/profile',
        {
          method: 'PUT',
          body: JSON.stringify({
            email: `allowed.badphone.${SUFFIX}@${VERIFIED_TEST_DOMAIN}`,
            currentPassword: FIXTURE_PASSWORD,
            phone: '12345', // Invalid: not 10 digits
          }),
        },
        adminToken
      );

      const isInvalidPhoneRejected =
        invalidPhoneRes.status === 400 &&
        (invalidPhoneRes.data?.error?.code === 'INVALID_PHONE' ||
          invalidPhoneRes.data?.code === 'INVALID_PHONE');

      const afterInvalidPhoneUser = await prisma.user.findUnique({ where: { id: adminUser.id } });
      const emailUnchangedOnInvalidPhone = afterInvalidPhoneUser.email === initialUser.email;

      // 5. Unchanged email with no password => still 200
      const unchangedEmailRes = await apiRequest(
        '/users/profile',
        {
          method: 'PUT',
          body: JSON.stringify({
            email: initialUser.email,
            firstName: 'UpdatedFirstName',
          }),
        },
        adminToken
      );

      const isUnchangedEmailSuccess = unchangedEmailRes.status === 200;
      const afterUnchangedEmailUser = await prisma.user.findUnique({ where: { id: adminUser.id } });
      const emailStillUnchanged = afterUnchangedEmailUser.email === initialUser.email;
      const passwordStillUnchanged = afterUnchangedEmailUser.passwordHash === initialPasswordHash;

      // 6. Email change with correct currentPassword (untrimmed + mixed case) => 200 and email stored lowercased+trimmed
      const mixedCaseValidEmail = `  Trimmed.Lower.${SUFFIX}@${VERIFIED_TEST_DOMAIN.toUpperCase()}  `;
      const expectedNormalizedEmail = `trimmed.lower.${SUFFIX}@${VERIFIED_TEST_DOMAIN.toLowerCase()}`;

      const updateValidProfileRes = await apiRequest(
        '/users/profile',
        {
          method: 'PUT',
          body: JSON.stringify({
            email: mixedCaseValidEmail,
            currentPassword: FIXTURE_PASSWORD,
            newPassword: 'BrandNewPassword@123',
          }),
        },
        adminToken
      );

      const isValidUpdateSuccess = updateValidProfileRes.status === 200;

      // Verify DB: email was stored trimmed + lowercased, and password was updated
      const afterValidUser = await prisma.user.findUnique({ where: { id: adminUser.id } });
      const emailCorrectlyNormalized = afterValidUser.email === expectedNormalizedEmail;
      const passwordUpdated = afterValidUser.passwordHash !== initialPasswordHash;

      // 7. Student fixture changes email with correct password => user.email and student.emailId both match normalized
      const studentUserEmail = `student.profile.${SUFFIX}@${VERIFIED_TEST_DOMAIN}`;
      const studentUser = await prisma.user.create({
        data: {
          name: 'Student Profile Tester',
          email: studentUserEmail,
          role: 'student',
          collegeId: college.id,
          accountStatus: 'active',
          passwordHash,
        },
      });
      createdUserIds.push(studentUser.id);

      const studentRecord = await prisma.student.create({
        data: {
          userId: studentUser.id,
          collegeId: college.id,
          departmentId: department.id,
          rollNumber: `R-P-${Date.now().toString().slice(-4)}`,
          admissionNumber: `ADM-P-${Date.now().toString().slice(-4)}`,
          batchYear: '2026',
          emailId: studentUserEmail,
        },
      });
      createdStudentIds.push(studentRecord.id);

      const studentLoginRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: studentUserEmail, password: FIXTURE_PASSWORD }),
      });
      const studentToken = studentLoginRes.data?.data?.accessToken;

      const newStudentEmailRaw = `  Student.Updated.${SUFFIX}@${VERIFIED_TEST_DOMAIN.toUpperCase()}  `;
      const expectedStudentNormalized = `student.updated.${SUFFIX}@${VERIFIED_TEST_DOMAIN.toLowerCase()}`;

      const studentProfileRes = await apiRequest(
        '/users/profile',
        {
          method: 'PUT',
          body: JSON.stringify({
            email: newStudentEmailRaw,
            currentPassword: FIXTURE_PASSWORD,
          }),
        },
        studentToken
      );

      const studentProfileSuccess = studentProfileRes.status === 200;
      const afterStudentUser = await prisma.user.findUnique({ where: { id: studentUser.id } });
      const afterStudentProfile = await prisma.student.findUnique({ where: { id: studentRecord.id } });
      const studentUserEmailMatches = afterStudentUser?.email === expectedStudentNormalized;
      const studentProfileEmailMatches = afterStudentProfile?.emailId === expectedStudentNormalized;

      // 8. Teacher fixture changes email with correct password => user.email and teacher.emailId both match normalized
      const teacherUserEmail = `teacher.profile.${SUFFIX}@${VERIFIED_TEST_DOMAIN}`;
      const teacherUser = await prisma.user.create({
        data: {
          name: 'Teacher Profile Tester',
          email: teacherUserEmail,
          role: 'teacher',
          collegeId: college.id,
          accountStatus: 'active',
          passwordHash,
        },
      });
      createdUserIds.push(teacherUser.id);

      const teacherRecord = await prisma.teacher.create({
        data: {
          userId: teacherUser.id,
          collegeId: college.id,
          departmentId: department.id,
          joiningDate: new Date(),
          designation: 'Assistant Professor',
          emailId: teacherUserEmail,
        },
      });
      createdTeacherIds.push(teacherRecord.id);

      const teacherLoginRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: teacherUserEmail, password: FIXTURE_PASSWORD }),
      });
      const teacherToken = teacherLoginRes.data?.data?.accessToken;

      const newTeacherEmailRaw = `  Teacher.Updated.${SUFFIX}@${VERIFIED_TEST_DOMAIN.toUpperCase()}  `;
      const expectedTeacherNormalized = `teacher.updated.${SUFFIX}@${VERIFIED_TEST_DOMAIN.toLowerCase()}`;

      const teacherProfileRes = await apiRequest(
        '/users/profile',
        {
          method: 'PUT',
          body: JSON.stringify({
            email: newTeacherEmailRaw,
            currentPassword: FIXTURE_PASSWORD,
          }),
        },
        teacherToken
      );

      const teacherProfileSuccess = teacherProfileRes.status === 200;
      const afterTeacherUser = await prisma.user.findUnique({ where: { id: teacherUser.id } });
      const afterTeacherProfile = await prisma.teacher.findUnique({ where: { id: teacherRecord.id } });
      const teacherUserEmailMatches = afterTeacherUser?.email === expectedTeacherNormalized;
      const teacherProfileEmailMatches = afterTeacherProfile?.emailId === expectedTeacherNormalized;

      const passed =
        isDisallowedBlocked &&
        passwordUnchangedOnDisallowed &&
        emailUnchangedOnDisallowed &&
        isNoPwdRejected &&
        emailUnchangedOnNoPwd &&
        isWrongPwdRejected &&
        emailUnchangedOnWrongPwd &&
        passwordUnchangedOnWrongPwd &&
        isDuplicateEmailWrongPwdRejected &&
        isDuplicateEmailCorrectPwdRejected &&
        emailUnchangedOnDuplicate &&
        isBlockedDomainWrongPwdRejected &&
        isInvalidPhoneRejected &&
        emailUnchangedOnInvalidPhone &&
        isUnchangedEmailSuccess &&
        emailStillUnchanged &&
        passwordStillUnchanged &&
        isValidUpdateSuccess &&
        emailCorrectlyNormalized &&
        passwordUpdated &&
        studentProfileSuccess &&
        studentUserEmailMatches &&
        studentProfileEmailMatches &&
        teacherProfileSuccess &&
        teacherUserEmailMatches &&
        teacherProfileEmailMatches;

      logResult(
        'p',
        'updateProfile validates all inputs first, syncs student/teacher emailId, and applies writes atomically in transaction',
        passed,
        `BlockedDisallowed: ${isDisallowedBlocked}, NoPwdRejected: ${isNoPwdRejected}, WrongPwdRejected: ${isWrongPwdRejected}, DupEmailWrongPwdRejected: ${isDuplicateEmailWrongPwdRejected}, DupEmailCorrectPwdRejected: ${isDuplicateEmailCorrectPwdRejected}, BlockedDomainWrongPwdRejected: ${isBlockedDomainWrongPwdRejected}, InvalidPhoneRejected: ${isInvalidPhoneRejected}, UnchangedEmailAllowed: ${isUnchangedEmailSuccess}, NormalizedSaved: ${emailCorrectlyNormalized}, StudentEmailSynced: ${studentProfileEmailMatches}, TeacherEmailSynced: ${teacherProfileEmailMatches}`
      );
    }
  } catch (err) {
    console.error('\n❌ Unexpected error running tests:', err);
    failedCount++;
  } finally {
    console.log('\n🧹 Cleaning up dedicated test artifacts from database...');
    try {
      // 1. Delete created students and teachers
      for (const sId of createdStudentIds) {
        await prisma.student.delete({ where: { id: sId } }).catch(() => {});
      }
      for (const tId of createdTeacherIds) {
        await prisma.teacher.delete({ where: { id: tId } }).catch(() => {});
      }

      // 2. Delete created refresh tokens
      if (createdUserIds.length > 0) {
        await prisma.refreshToken.deleteMany({
          where: { userId: { in: createdUserIds } },
        }).catch(() => {});
      }

      // 3. Delete created users
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        }).catch(() => {});
      }

      // 4. Delete college domains
      if (createdDomainIds.length > 0) {
        await prisma.collegeDomain.deleteMany({
          where: { id: { in: createdDomainIds } },
        }).catch(() => {});
      }

      // 5. Delete department
      if (department?.id) {
        await prisma.department.delete({ where: { id: department.id } }).catch(() => {});
      }

      // 6. Invalidate caches
      for (const cId of createdCollegeIds) {
        await invalidateVerifiedDomainsCache(cId).catch(() => {});
      }

      // 7. Delete fixture college
      if (createdCollegeIds.length > 0) {
        await prisma.college.deleteMany({
          where: { id: { in: createdCollegeIds } },
        }).catch(() => {});
      }

      console.log('✅ Cleanup completed.');
    } catch (cleanupErr) {
      console.warn('⚠️ Cleanup warning:', cleanupErr.message);
    }

    console.log('\n============================================================');
    console.log(
      `📊 Test Summary: ${passedCount} PASSED, ${failedCount} FAILED, ${skippedCount} SKIPPED out of ${
        passedCount + failedCount + skippedCount
      } tests.`
    );
    console.log('============================================================\n');

    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runEnforcementTests();
