import 'dotenv/config';

const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}/api/v1`;

const TEST_EMAIL = process.env.TEST_EMAIL;
const TEST_PASSWORD = process.env.TEST_PASSWORD;

if (!TEST_EMAIL || !TEST_PASSWORD) {
  console.error('\n❌ ERROR: TEST_EMAIL and TEST_PASSWORD environment variables are required.');
  console.error('Usage:');
  console.error('  TEST_EMAIL="admin@college.edu" TEST_PASSWORD="password" node scripts/test-domains.mjs\n');
  process.exit(1);
}

const TEST_DOMAIN = 'zuna-test-abccollege.edu';

let passedCount = 0;
let failedCount = 0;
let createdDomainId = null;
let authToken = null;

function logResult(testNum, testName, isPass, detail = '') {
  if (isPass) {
    passedCount++;
    console.log(`  ✅ Test ${testNum} [PASS]: ${testName}`);
  } else {
    failedCount++;
    console.error(`  ❌ Test ${testNum} [FAIL]: ${testName} ${detail ? `(${detail})` : ''}`);
  }
}

async function request(endpoint, options = {}, withAuth = true) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (withAuth && authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

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

  return { status: res.status, ok: res.ok, data };
}

async function run() {
  console.log('\n=============================================');
  console.log('🚀 Running Domain Integration API Tests');
  console.log(`Target: ${BASE_URL}/domains`);
  console.log('=============================================\n');

  // Step 0: Login to obtain admin token
  try {
    process.stdout.write('Authenticating admin...');
    const loginRes = await request(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
      },
      false
    );

    if (loginRes.status !== 200 || !loginRes.data) {
      console.log(' ❌ FAILED');
      console.error(`Login failed with status ${loginRes.status}:`, loginRes.data?.message || loginRes.data?.error || 'Unknown error');
      process.exit(1);
    }

    authToken = loginRes.data.data?.accessToken || loginRes.data.data?.token || loginRes.data.accessToken || loginRes.data.token;
    if (!authToken) {
      console.log(' ❌ FAILED');
      console.error('Login succeeded but no access token was found in response payload.');
      process.exit(1);
    }
    console.log(' ✅ Logged in successfully\n');
  } catch (err) {
    console.error('\n❌ Could not connect to backend server:', err.message);
    process.exit(1);
  }

  // Pre-cleanup in case previous run left the test domain behind
  try {
    const listRes = await request('/domains');
    if (listRes.status === 200 && Array.isArray(listRes.data?.data)) {
      const existing = listRes.data.data.find((d) => d.domain === TEST_DOMAIN);
      if (existing) {
        await request(`/domains/${existing.id}`, { method: 'DELETE' });
      }
    }
  } catch (_) {}

  try {
    // 1. POST / { domain: "gmail.com" } -> 400
    {
      const res = await request('/domains', {
        method: 'POST',
        body: JSON.stringify({ domain: 'gmail.com' }),
      });
      const passed = res.status === 400;
      logResult(1, 'POST / with public domain (gmail.com) rejected', passed, `Status: ${res.status}`);
    }

    // 2. POST / { domain: "https://test.edu" } -> 400
    {
      const res = await request('/domains', {
        method: 'POST',
        body: JSON.stringify({ domain: 'https://test.edu' }),
      });
      const passed = res.status === 400;
      logResult(2, 'POST / with invalid URL format rejected', passed, `Status: ${res.status}`);
    }

    // 3. POST / { domain: "zuna-test-abccollege.edu" } -> 201
    {
      const res = await request('/domains', {
        method: 'POST',
        body: JSON.stringify({ domain: TEST_DOMAIN }),
      });
      const data = res.data?.data;
      const passed =
        res.status === 201 &&
        data?.status === 'PENDING' &&
        typeof data?.verificationToken === 'string' &&
        data?.verificationToken.length > 0 &&
        data?.instructions?.host === `_zuna-verify.${TEST_DOMAIN}`;

      if (data?.id) {
        createdDomainId = data.id;
      }
      logResult(
        3,
        'POST / with valid domain creates PENDING domain with token & instructions',
        passed,
        `Status: ${res.status}, ID: ${createdDomainId || 'none'}`
      );
    }

    // 4. POST / same domain marubadi -> 409
    {
      const res = await request('/domains', {
        method: 'POST',
        body: JSON.stringify({ domain: TEST_DOMAIN }),
      });
      const passed = res.status === 409;
      logResult(4, 'POST / duplicate domain for same college returns 409', passed, `Status: ${res.status}`);
    }

    // 5. GET / -> list-la andha domain irukkanum
    {
      const res = await request('/domains');
      const list = res.data?.data;
      const found = Array.isArray(list) && list.some((d) => d.domain === TEST_DOMAIN && d.id === createdDomainId);
      const passed = res.status === 200 && found;
      logResult(5, 'GET / returns domain list containing the newly added domain', passed, `Status: ${res.status}, Found: ${found}`);
    }

    // 6. POST /:id/verify -> 400 friendly message (DNS record illa)
    {
      if (!createdDomainId) {
        logResult(6, 'POST /:id/verify returns 400 when DNS record not found', false, 'Skipped: createdDomainId is missing');
      } else {
        const res = await request(`/domains/${createdDomainId}/verify`, {
          method: 'POST',
        });
        const passed = res.status === 400 && typeof res.data?.message === 'string' && res.data.message.length > 0;
        logResult(6, 'POST /:id/verify returns friendly 400 when DNS TXT not found', passed, `Status: ${res.status}, Message: "${res.data?.message}"`);
      }
    }

    // 7. Verify endpoint-ah 6 vaatti speed-a hit pannu -> 6-vathu 429
    {
      if (!createdDomainId) {
        logResult(7, 'Redis Rate limiter returns 429 on 6th rapid verify attempt', false, 'Skipped: createdDomainId is missing');
      } else {
        let lastStatus = 0;
        let lastMessage = '';
        for (let i = 0; i < 6; i++) {
          const res = await request(`/domains/${createdDomainId}/verify`, {
            method: 'POST',
          });
          lastStatus = res.status;
          lastMessage = res.data?.message || '';
        }
        const passed = lastStatus === 429;
        logResult(7, 'Redis Rate limiter triggers 429 after 5 verify attempts', passed, `6th attempt Status: ${lastStatus}, Message: "${lastMessage}"`);
      }
    }

    // 8. Token illaama GET / -> 401
    {
      const res = await request('/domains', {}, false);
      const passed = res.status === 401;
      logResult(8, 'GET / without authentication token returns 401 Unauthorized', passed, `Status: ${res.status}`);
    }

    // 9. DELETE /:id -> 200, appuram GET /-la andha domain illa nu confirm pannu
    {
      if (!createdDomainId) {
        logResult(9, 'DELETE /:id deletes domain and GET / confirms absence', false, 'Skipped: createdDomainId is missing');
      } else {
        const delRes = await request(`/domains/${createdDomainId}`, {
          method: 'DELETE',
        });
        const listRes = await request('/domains');
        const list = listRes.data?.data;
        const exists = Array.isArray(list) && list.some((d) => d.id === createdDomainId);
        const passed = delRes.status === 200 && !exists;
        logResult(9, 'DELETE /:id returns 200 and domain is removed from list', passed, `Delete Status: ${delRes.status}, Exists in GET: ${exists}`);
        if (delRes.status === 200) {
          createdDomainId = null; // Mark as deleted
        }
      }
    }
  } finally {
    // Cleanup: Ensure test domain is deleted even if any assertion threw or failed
    if (createdDomainId && authToken) {
      try {
        await request(`/domains/${createdDomainId}`, { method: 'DELETE' });
      } catch (_) {}
    }

    // Try to clear redis rate limit key if redis client can be imported
    try {
      const { redis } = await import('../src/lib/cache.js');
      if (redis && redis.status === 'ready' && createdDomainId) {
        await redis.del(`domain:verify:rate:${createdDomainId}`);
      }
      redis.disconnect();
    } catch (_) {}

    console.log('\n=============================================');
    console.log(`📊 Test Summary: ${passedCount} PASSED, ${failedCount} FAILED out of 9 tests.`);
    console.log('=============================================\n');

    process.exit(failedCount > 0 ? 1 : 0);
  }
}

run();
