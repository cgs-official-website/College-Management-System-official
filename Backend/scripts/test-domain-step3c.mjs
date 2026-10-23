import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from '../src/lib/prisma.js';
import { invalidateVerifiedDomainsCache } from '../src/modules/domains/domains.service.js';
import { login } from '../src/modules/auth/auth.controller.js';

const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}/api/v1`;

const SUFFIX = Date.now();
const FIXTURE_PASSWORD = 'FixturePassword@123';

let passedCount = 0;
let failedCount = 0;

function logResult(testId, testName, isPass, detail = '') {
  if (isPass) {
    passedCount++;
    console.log(`  ✅ Test (${testId}) [PASS]: ${testName}`);
  } else {
    failedCount++;
    console.error(`  ❌ Test (${testId}) [FAIL]: ${testName} ${detail ? `(${detail})` : ''}`);
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

async function runStep3cTests() {
  console.log('\n============================================================');
  console.log('🧪 Running Domain Integration Step 3c Tests');
  console.log('   - Login-time soft enforcement (data.warnings)');
  console.log('   - GET /api/v1/domains/non-compliant-users (DB query filtering)');
  console.log('   - Dedicated fixture colleges & users (ZERO real accounts touched)');
  console.log(`API Target: ${BASE_URL}`);
  console.log('============================================================\n');

  let collegeA = null;
  let collegeB = null;
  let domainA = null;

  const createdUserIds = [];
  const createdCollegeIds = [];

  try {
    const passwordHash = await bcrypt.hash(FIXTURE_PASSWORD, 10);

    // -------------------------------------------------------------
    // 1. Create Fixture College A (With verified domain)
    // -------------------------------------------------------------
    console.log('📦 Setting up dedicated test fixture colleges and users...');
    collegeA = await prisma.college.create({
      data: {
        name: `Zuna Test College A ${SUFFIX}`,
        slug: `zuna-test-college-a-${SUFFIX}`,
        status: 'active',
      },
    });
    createdCollegeIds.push(collegeA.id);

    const verifiedDomainName = `fixture-college-a-${SUFFIX}.edu`;
    domainA = await prisma.collegeDomain.create({
      data: {
        collegeId: collegeA.id,
        domain: verifiedDomainName,
        verificationToken: `test-token-${SUFFIX}`,
        status: 'VERIFIED',
        verifiedAt: new Date(),
      },
    });

    // -------------------------------------------------------------
    // 2. Create Users for College A
    // -------------------------------------------------------------
    // Admin A (matching domain)
    const adminA = await prisma.user.create({
      data: {
        name: `Fixture Admin A`,
        email: `admin-a-${SUFFIX}@${verifiedDomainName}`,
        role: 'admin',
        collegeId: collegeA.id,
        accountStatus: 'active',
        passwordHash,
      },
    });
    createdUserIds.push(adminA.id);

    // Mismatched User (teacher with external domain)
    const mismatchedTeacher = await prisma.user.create({
      data: {
        name: `Fixture Mismatched Teacher`,
        email: `mismatched-teacher-${SUFFIX}@external-provider.com`,
        role: 'teacher',
        collegeId: collegeA.id,
        accountStatus: 'active',
        passwordHash,
      },
    });
    createdUserIds.push(mismatchedTeacher.id);

    // Matching User (teacher with verified domain)
    const matchingTeacher = await prisma.user.create({
      data: {
        name: `Fixture Matching Teacher`,
        email: `matching-teacher-${SUFFIX}@${verifiedDomainName}`,
        role: 'teacher',
        collegeId: collegeA.id,
        accountStatus: 'active',
        passwordHash,
      },
    });
    createdUserIds.push(matchingTeacher.id);

    // Parent User (exempt role with gmail)
    const parentUser = await prisma.user.create({
      data: {
        name: `Fixture Parent`,
        email: `parent-${SUFFIX}@gmail.com`,
        role: 'parent',
        collegeId: collegeA.id,
        accountStatus: 'active',
        passwordHash,
      },
    });
    createdUserIds.push(parentUser.id);

    // Inactive User with mismatched domain (should be excluded by non-compliant-users query)
    const inactiveTeacher = await prisma.user.create({
      data: {
        name: `Fixture Inactive Teacher`,
        email: `inactive-teacher-${SUFFIX}@external-provider.com`,
        role: 'teacher',
        collegeId: collegeA.id,
        accountStatus: 'inactive',
        passwordHash,
      },
    });
    createdUserIds.push(inactiveTeacher.id);

    // Superadmin User (exempt role with platform domain)
    const superadminUser = await prisma.user.create({
      data: {
        name: `Fixture Superadmin`,
        email: `superadmin-${SUFFIX}@platform-mgmt.org`,
        role: 'superadmin',
        collegeId: collegeA.id,
        accountStatus: 'active',
        passwordHash,
      },
    });
    createdUserIds.push(superadminUser.id);

    // -------------------------------------------------------------
    // 3. Create Fixture College B (Zero verified domains)
    // -------------------------------------------------------------
    collegeB = await prisma.college.create({
      data: {
        name: `Zuna Test College B ${SUFFIX}`,
        slug: `zuna-test-college-b-${SUFFIX}`,
        status: 'active',
      },
    });
    createdCollegeIds.push(collegeB.id);

    // Admin B
    const adminB = await prisma.user.create({
      data: {
        name: `Fixture Admin B`,
        email: `admin-b-${SUFFIX}@unverified-collegeb.org`,
        role: 'admin',
        collegeId: collegeB.id,
        accountStatus: 'active',
        passwordHash,
      },
    });
    createdUserIds.push(adminB.id);

    // Student B in College B (mismatched domain, but 0 verified domains in college)
    const studentB = await prisma.user.create({
      data: {
        name: `Fixture Student B`,
        email: `student-b-${SUFFIX}@gmail.com`,
        role: 'student',
        collegeId: collegeB.id,
        accountStatus: 'active',
        passwordHash,
      },
    });
    createdUserIds.push(studentB.id);

    console.log('✅ All fixtures successfully initialized.\n');

    // =============================================================
    // TEST (a): Existing mismatched user logs in OK with warning
    // =============================================================
    const resA = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: mismatchedTeacher.email, password: FIXTURE_PASSWORD }),
    });

    const hasMismatchWarning =
      resA.status === 200 &&
      Boolean(resA.data?.data?.accessToken) &&
      Array.isArray(resA.data?.data?.warnings) &&
      resA.data.data.warnings.some((w) => w.code === 'EMAIL_DOMAIN_MISMATCH') &&
      resA.data?.warnings === undefined; // Check warning is in data.warnings, not duplicated at root

    logResult(
      'a',
      'Existing mismatched user logs in successfully (200) with non-blocking data.warnings',
      hasMismatchWarning,
      `Status: ${resA.status}, Warnings: ${JSON.stringify(resA.data?.data?.warnings)}`
    );

    // =============================================================
    // TEST (b): Matching user logs in OK with NO warning
    // =============================================================
    const resB = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: matchingTeacher.email, password: FIXTURE_PASSWORD }),
    });

    const isMatchingClean =
      resB.status === 200 &&
      Boolean(resB.data?.data?.accessToken) &&
      resB.data?.data?.warnings === undefined;

    logResult(
      'b',
      'Matching domain user logs in successfully (200) with no warnings',
      isMatchingClean,
      `Status: ${resB.status}, Warnings: ${JSON.stringify(resB.data?.data?.warnings)}`
    );

    // =============================================================
    // TEST (c): User in college with 0 verified domains -> NO warning
    // =============================================================
    const resC = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: studentB.email, password: FIXTURE_PASSWORD }),
    });

    const isZeroVerifiedClean =
      resC.status === 200 &&
      Boolean(resC.data?.data?.accessToken) &&
      resC.data?.data?.warnings === undefined;

    logResult(
      'c',
      'User in college with ZERO verified domains logs in with no warnings',
      isZeroVerifiedClean,
      `Status: ${resC.status}, Warnings: ${JSON.stringify(resC.data?.data?.warnings)}`
    );

    // =============================================================
    // TEST (d): Exempt roles (parent, superadmin) -> NO warning
    // =============================================================
    const resParent = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: parentUser.email, password: FIXTURE_PASSWORD }),
    });

    const resSuperadmin = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: superadminUser.email, password: FIXTURE_PASSWORD }),
    });

    const isExemptClean =
      resParent.status === 200 &&
      resParent.data?.data?.warnings === undefined &&
      resSuperadmin.status === 200 &&
      resSuperadmin.data?.data?.warnings === undefined;

    logResult(
      'd',
      'Exempt roles (parent & superadmin) log in with no warnings despite non-matching email domains',
      isExemptClean,
      `Parent warnings: ${resParent.data?.data?.warnings}, Superadmin warnings: ${resSuperadmin.data?.data?.warnings}`
    );

    // =============================================================
    // TEST (e): Helper exception resilience (Stub/mock without production hooks)
    // =============================================================
    // Invalidate any Redis cache for collegeA to guarantee execution path
    await invalidateVerifiedDomainsCache(collegeA.id);

    const originalFindMany = prisma.collegeDomain.findMany;
    let stubTestedCleanly = false;
    let stubStatusCode = 200;
    let stubJsonResponse = null;

    try {
      // Temporarily stub Prisma findMany to simulate internal database/service failure
      prisma.collegeDomain.findMany = () => {
        throw new Error('Simulated internal DB/service crash');
      };

      const mockReq = {
        body: {
          email: mismatchedTeacher.email,
          password: FIXTURE_PASSWORD,
        },
        headers: { 'user-agent': 'test-agent' },
        socket: { remoteAddress: '127.0.0.1' },
        ip: '127.0.0.1',
      };

      const mockRes = {
        status(code) {
          stubStatusCode = code;
          return this;
        },
        json(data) {
          stubJsonResponse = data;
          return this;
        },
      };

      await login(mockReq, mockRes);

      stubTestedCleanly =
        stubStatusCode === 200 &&
        stubJsonResponse?.success === true &&
        Boolean(stubJsonResponse?.data?.accessToken) &&
        stubJsonResponse?.data?.warnings === undefined;
    } finally {
      // Restore original function
      prisma.collegeDomain.findMany = originalFindMany;
    }

    logResult(
      'e',
      'Helper exception resilience: login never fails (200 OK) when domain check throws, warning safely omitted',
      stubTestedCleanly,
      `StatusCode: ${stubStatusCode}, Success: ${stubJsonResponse?.success}`
    );

    // =============================================================
    // TEST (f): GET /api/v1/domains/non-compliant-users endpoint
    // =============================================================
    // f1: Admin A logs in and fetches non-compliant users
    const loginAdminA = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminA.email, password: FIXTURE_PASSWORD }),
    });
    const tokenAdminA = loginAdminA.data?.data?.accessToken;

    const resNonCompliantA = await apiRequest('/domains/non-compliant-users', {}, tokenAdminA);

    const usersListA = resNonCompliantA.data?.data?.users || [];
    const totalA = resNonCompliantA.data?.data?.pagination?.total;

    const includesMismatched = usersListA.some((u) => u.email === mismatchedTeacher.email);
    const excludesMatching = !usersListA.some((u) => u.email === matchingTeacher.email);
    const excludesParent = !usersListA.some((u) => u.email === parentUser.email);
    const excludesInactive = !usersListA.some((u) => u.email === inactiveTeacher.email);
    const totalAccurate = totalA === 1 && usersListA.length === 1;

    const isF1Pass =
      resNonCompliantA.status === 200 &&
      includesMismatched &&
      excludesMatching &&
      excludesParent &&
      excludesInactive &&
      totalAccurate;

    logResult(
      'f1',
      'GET /api/v1/domains/non-compliant-users filters at DB query level (excludes matching, exempt, and inactive)',
      isF1Pass,
      `Status: ${resNonCompliantA.status}, Total: ${totalA}, Users: ${usersListA.map((u) => u.email).join(', ')}`
    );

    // f2: College B (zero verified domains) returns empty list and total 0
    const loginAdminB = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: adminB.email, password: FIXTURE_PASSWORD }),
    });
    const tokenAdminB = loginAdminB.data?.data?.accessToken;

    const resNonCompliantB = await apiRequest('/domains/non-compliant-users', {}, tokenAdminB);
    const isF2Pass =
      resNonCompliantB.status === 200 &&
      resNonCompliantB.data?.data?.pagination?.total === 0 &&
      resNonCompliantB.data?.data?.users?.length === 0;

    logResult(
      'f2',
      'College with 0 verified domains returns 200 with empty list and total: 0',
      isF2Pass,
      `Status: ${resNonCompliantB.status}, Total: ${resNonCompliantB.data?.data?.pagination?.total}`
    );

    // f3: RBAC check - non-admin (teacher) receives 403 Forbidden
    const loginTeacher = await apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: matchingTeacher.email, password: FIXTURE_PASSWORD }),
    });
    const tokenTeacher = loginTeacher.data?.data?.accessToken;

    const resRbac = await apiRequest('/domains/non-compliant-users', {}, tokenTeacher);
    const isF3Pass = resRbac.status === 403;

    logResult(
      'f3',
      'Non-admin role (teacher) receives 403 Forbidden for /domains/non-compliant-users',
      isF3Pass,
      `Status: ${resRbac.status}`
    );
  } catch (err) {
    console.error('\n❌ Unexpected error while running tests:', err);
    failedCount++;
  } finally {
    console.log('\n🧹 Cleaning up dedicated test fixtures from database...');
    try {
      // 1. Delete refresh tokens
      if (createdUserIds.length > 0) {
        await prisma.refreshToken.deleteMany({
          where: { userId: { in: createdUserIds } },
        }).catch(() => {});
      }

      // 2. Delete test users
      if (createdUserIds.length > 0) {
        await prisma.user.deleteMany({
          where: { id: { in: createdUserIds } },
        }).catch(() => {});
      }

      // 3. Delete college domains
      if (createdCollegeIds.length > 0) {
        await prisma.collegeDomain.deleteMany({
          where: { collegeId: { in: createdCollegeIds } },
        }).catch(() => {});
      }

      // 4. Invalidate caches
      for (const cId of createdCollegeIds) {
        await invalidateVerifiedDomainsCache(cId).catch(() => {});
      }

      // 5. Delete fixture colleges
      if (createdCollegeIds.length > 0) {
        await prisma.college.deleteMany({
          where: { id: { in: createdCollegeIds } },
        }).catch(() => {});
      }

      console.log('✅ Cleanup completed.');
    } catch (cleanErr) {
      console.warn('⚠️ Cleanup warning:', cleanErr.message);
    }

    console.log('\n============================================================');
    console.log(`📊 Test Summary: ${passedCount} PASSED, ${failedCount} FAILED out of 8 checks.`);
    console.log('============================================================\n');

    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runStep3cTests();
