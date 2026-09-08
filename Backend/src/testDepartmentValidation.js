import jwt from 'jsonwebtoken';
import { prisma } from './server.js';

const JWT_SECRET = process.env.JWT_SECRET || 'zuna_erp_master_jwt_secret_key_2026_secure';

async function runTests() {
  console.log('====================================================');
  console.log('DEPARTMENT VALIDATION & API TEST SUITE');
  console.log('====================================================\n');

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

  // Find admin user and college
  const adminUser = await prisma.user.findFirst({
    where: { role: 'admin', collegeId: { not: null } }
  });

  if (!adminUser) {
    console.error('No admin user found with collegeId');
    process.exit(1);
  }

  console.log(`Using admin: ${adminUser.email} (College: ${adminUser.collegeId})`);

  const token = jwt.sign(
    { userId: adminUser.id, role: adminUser.role, collegeId: adminUser.collegeId },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  const testSuffix = Date.now().toString().slice(-4);
  const testName = `Robotics Engineering ${testSuffix}`;
  const testCodeLower = `rbt${testSuffix}`;
  const testCodeUpper = testCodeLower.toUpperCase();

  let createdDeptId = null;

  try {
    // 1. Create department with lowercase code
    console.log('\nTest 1: Create department with lowercase code (auto-uppercased)...');
    const createRes = await fetch('http://localhost:5000/api/v1/departments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: testName,
        code: testCodeLower,
        hodUserId: ''
      })
    });
    const createData = await createRes.json();
    assert(createRes.status === 201, `Status is 201 (got ${createRes.status})`);
    assert(createData.data?.code === testCodeUpper, `Code is normalized to uppercase: ${createData.data?.code}`);
    assert(createData.data?.name === testName, `Name matches: ${createData.data?.name}`);
    createdDeptId = createData.data?.id;

    // 2. Reject duplicate code (case-insensitive)
    console.log('\nTest 2: Reject duplicate department code (case-insensitive)...');
    const dupCodeRes = await fetch('http://localhost:5000/api/v1/departments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: `Different Name ${testSuffix}`,
        code: testCodeUpper
      })
    });
    const dupCodeData = await dupCodeRes.json();
    assert(dupCodeRes.status === 400, `Status is 400 on duplicate code (got ${dupCodeRes.status})`);
    assert(
      dupCodeData.error?.message?.includes('already exists'),
      `Error message describes duplicate code: "${dupCodeData.error?.message}"`
    );

    // 3. Reject duplicate name (case-insensitive)
    console.log('\nTest 3: Reject duplicate department name (case-insensitive)...');
    const dupNameRes = await fetch('http://localhost:5000/api/v1/departments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: testName.toLowerCase(),
        code: `XYZ${testSuffix}`
      })
    });
    const dupNameData = await dupNameRes.json();
    assert(dupNameRes.status === 400, `Status is 400 on duplicate name (got ${dupNameRes.status})`);
    assert(
      dupNameData.error?.message?.includes('already exists'),
      `Error message describes duplicate name: "${dupNameData.error?.message}"`
    );

    // 4. Clean human-readable error on short code (< 2 chars)
    console.log('\nTest 4: Validation error message format on short code...');
    const shortCodeRes = await fetch('http://localhost:5000/api/v1/departments', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: `Valid Name ${testSuffix}`,
        code: 'A'
      })
    });
    const shortCodeData = await shortCodeRes.json();
    assert(shortCodeRes.status === 400, `Status is 400 on short code (got ${shortCodeRes.status})`);
    assert(
      shortCodeData.error?.message === 'Department code must be at least 2 characters',
      `Error message is human-readable: "${shortCodeData.error?.message}"`
    );

    // 5. Update department
    console.log('\nTest 5: Update department...');
    const updatedName = `${testName} Updated`;
    const updateRes = await fetch(`http://localhost:5000/api/v1/departments/${createdDeptId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        name: updatedName,
        code: testCodeUpper
      })
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200, `Status is 200 on update (got ${updateRes.status})`);
    assert(updateData.data?.name === updatedName, `Updated name matches: ${updateData.data?.name}`);

    // 6. Fetch departments list includes newly created department
    console.log('\nTest 6: GET /api/v1/departments contains created department...');
    const getRes = await fetch('http://localhost:5000/api/v1/departments', { headers });
    const getData = await getRes.json();
    assert(getRes.status === 200, `Status is 200 on GET (got ${getRes.status})`);
    const found = getData.data?.find(d => d.id === createdDeptId);
    assert(!!found, `Found created department in list (total: ${getData.data?.length})`);

    // 7. Delete department
    console.log('\nTest 7: Delete department...');
    const deleteRes = await fetch(`http://localhost:5000/api/v1/departments/${createdDeptId}`, {
      method: 'DELETE',
      headers
    });
    const deleteData = await deleteRes.json();
    assert(deleteRes.status === 200, `Status is 200 on delete (got ${deleteRes.status})`);
    assert(deleteData.data?.success === true, `Delete returns success: true`);
    createdDeptId = null;

  } catch (err) {
    console.error('Unexpected test error:', err);
    failed++;
  } finally {
    if (createdDeptId) {
      await prisma.department.delete({ where: { id: createdDeptId } }).catch(() => {});
    }
    await prisma.$disconnect();

    console.log('\n====================================================');
    console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
    console.log('====================================================');
    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
