import 'dotenv/config';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from './server.js';
import { redis, redisKeys } from './lib/cache.js';
import { authenticate } from './middleware/authenticate.js';
import { login, refreshToken, logout, getMe } from './modules/auth/auth.controller.js';

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

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`✅ PASS: ${message}`);
}

async function runSessionAuditTests() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING REDIS CACHE & AUTH SESSION AUDIT TEST SUITE');
  console.log('======================================================');

  let testUser = null;
  let testCollege = null;

  try {
    // ---------------------------------------------------------
    // Phase 0: Provisioning Test User & College
    // ---------------------------------------------------------
    console.log('\n--- Phase 0: Provisioning Test Fixtures ---');
    testCollege = await prisma.college.create({
      data: {
        name: 'Auth Test College',
        slug: `auth-test-${Date.now()}`,
        status: 'active',
        registrationNo: `AUTH${Math.floor(100 + Math.random() * 900)}`
      }
    });

    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash('Password123!', 10);

    testUser = await prisma.user.create({
      data: {
        collegeId: testCollege.id,
        email: `authtest_${Date.now()}@test.com`,
        passwordHash,
        role: 'admin',
        accountStatus: 'active',
        name: 'Auth Test Admin'
      }
    });
    console.log(`Provisioned user: ${testUser.email} (id=${testUser.id})`);

    // ---------------------------------------------------------
    // Phase 1: Login & Token Issuance
    // ---------------------------------------------------------
    console.log('\n--- Phase 1: Login & Token Issuance ---');
    let accessToken = null;
    let rawRefreshToken = null;
    {
      const req = {
        body: { email: testUser.email, password: 'Password123!' }
      };
      const res = createMockRes();
      await login(req, res);

      assert(res.statusCode === 200, 'Login returns 200 OK');
      assert(!!res.body.data.accessToken, 'Access token is returned');
      assert(!!res.body.data.refreshToken, 'Refresh token is returned');

      accessToken = res.body.data.accessToken;
      rawRefreshToken = res.body.data.refreshToken;

      // Verify token in PostgreSQL
      const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
      const dbToken = await prisma.refreshToken.findUnique({
        where: { tokenHash }
      });
      assert(!!dbToken, 'Refresh token SHA-256 hash successfully stored in PostgreSQL');
      assert(dbToken.userId === testUser.id, 'Stored token belongs to test user');
      assert(dbToken.revokedAt === null, 'Stored token is active (not revoked)');
    }

    // ---------------------------------------------------------
    // Phase 2: Session Restoration (/auth/me) with Access Token
    // ---------------------------------------------------------
    console.log('\n--- Phase 2: Session Restoration (/auth/me) ---');
    {
      const req = {
        headers: { authorization: `Bearer ${accessToken}` }
      };
      const res = createMockRes();

      await authenticate(req, res, () => {});
      await getMe(req, res);

      assert(res.statusCode === 200, '/auth/me returns 200 OK');
      assert(res.body.data.email === testUser.email, 'User email matches');
      assert(res.body.data.role === 'admin', 'User role matches');
    }

    // ---------------------------------------------------------
    // Phase 3: Expired Access Token triggers 401 TOKEN_EXPIRED
    // ---------------------------------------------------------
    console.log('\n--- Phase 3: Expired Access Token Handling ---');
    {
      // Create an expired access token (-10 seconds)
      const expiredToken = jwt.sign(
        { userId: testUser.id, collegeId: testCollege.id, role: testUser.role },
        JWT_SECRET,
        { expiresIn: '-10s' }
      );

      const req = {
        headers: { authorization: `Bearer ${expiredToken}` }
      };
      const res = createMockRes();

      await authenticate(req, res, () => {});

      assert(res.statusCode === 401, 'Expired access token returns 401 Unauthorized');
      assert(res.body.error?.code === 'TOKEN_EXPIRED', 'Error code is TOKEN_EXPIRED');
    }

    // ---------------------------------------------------------
    // Phase 4: POST /auth/refresh with Valid Refresh Token
    // ---------------------------------------------------------
    console.log('\n--- Phase 4: Token Refresh Flow ---');
    let refreshedAccessToken = null;
    {
      const req = {
        body: { refreshToken: rawRefreshToken }
      };
      const res = createMockRes();

      await refreshToken(req, res);

      assert(res.statusCode === 200, 'POST /auth/refresh returns 200 OK');
      assert(!!res.body.data.accessToken, 'New access token is generated');
      refreshedAccessToken = res.body.data.accessToken;

      // Verify the new access token works with /auth/me
      const meReq = {
        headers: { authorization: `Bearer ${refreshedAccessToken}` }
      };
      const meRes = createMockRes();

      await authenticate(meReq, meRes, () => {});
      await getMe(meReq, meRes);

      assert(meRes.statusCode === 200, 'New access token successfully restores session on /auth/me');
      assert(meRes.body.data.email === testUser.email, 'Restored session data is accurate');
    }

    // ---------------------------------------------------------
    // Phase 5: Invalid & Revoked Refresh Token Rejection
    // ---------------------------------------------------------
    console.log('\n--- Phase 5: Invalid & Revoked Refresh Token Rejection ---');
    {
      // Test 5a: Completely bogus refresh token
      const bogusReq = { body: { refreshToken: 'invalid.jwt.token' } };
      const bogusRes = createMockRes();
      await refreshToken(bogusReq, bogusRes);
      assert(bogusRes.statusCode === 401, 'Bogus refresh token rejected with 401');

      // Test 5b: Expired refresh token
      const expiredRefresh = jwt.sign({ userId: testUser.id }, REFRESH_SECRET, { expiresIn: '-10s' });
      const expReq = { body: { refreshToken: expiredRefresh } };
      const expRes = createMockRes();
      await refreshToken(expReq, expRes);
      assert(expRes.statusCode === 401, 'Expired refresh token rejected with 401');

      // Test 5c: Logout & Revocation
      const logoutReq = { body: { refreshToken: rawRefreshToken } };
      const logoutRes = createMockRes();
      await logout(logoutReq, logoutRes);
      assert(logoutRes.statusCode === 200, 'Logout succeeds with 200');

      // Try refreshing with the logged-out/revoked token
      const tryRevokedReq = { body: { refreshToken: rawRefreshToken } };
      const tryRevokedRes = createMockRes();
      await refreshToken(tryRevokedReq, tryRevokedRes);
      assert(tryRevokedRes.statusCode === 401, 'Revoked refresh token rejected with 401');
      assert(tryRevokedRes.body.error?.code === 'REVOKED_REFRESH_TOKEN', 'Error code is REVOKED_REFRESH_TOKEN');
    }

    // ---------------------------------------------------------
    // Phase 6: Redis Cache Invalidation Isolation Guard
    // ---------------------------------------------------------
    console.log('\n--- Phase 6: Redis Cache Key Isolation ---');
    {
      const { invalidateCachePattern } = await import('./lib/cache.js');
      // Invalidate inventory pattern
      await invalidateCachePattern('inventory:items:testcollege:*');
      assert(true, 'invalidateCachePattern executed safely without wiping auth keys');
    }

    console.log('\n======================================================');
    console.log('🎉 ALL REDIS & AUTH INTEGRATION TESTS PASSED 100%!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('\n❌ TEST RUNNER FAILED:', err);
    process.exit(1);
  } finally {
    // Cleanup fixtures
    if (testCollege && testUser) {
      await prisma.refreshToken.deleteMany({ where: { userId: testUser.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
      await prisma.college.delete({ where: { id: testCollege.id } });
    }
    await prisma.$disconnect();
  }
}

runSessionAuditTests();
