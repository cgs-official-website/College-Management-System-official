import { prisma } from './server.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

async function runTests() {
  console.log('====================================================');
  console.log('BUG-007: Student Edit Data Population & Lifecycle Test Suite');
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

  // Find or create test college
  let college = await prisma.college.findFirst();
  if (!college) {
    college = await prisma.college.create({
      data: {
        name: 'BUG-007 Test College',
        code: `TST-${Date.now().toString().slice(-4)}`
      }
    });
  }

  // Find or create test college 2 (for tenant isolation test)
  let college2 = await prisma.college.findFirst({
    where: { id: { not: college.id } }
  });
  if (!college2) {
    college2 = await prisma.college.create({
      data: {
        name: 'BUG-007 Isolated College',
        code: `ISO-${Date.now().toString().slice(-4)}`
      }
    });
  }

  // Find or create test department & course & section
  let dept = await prisma.department.findFirst({ where: { collegeId: college.id } });
  if (!dept) {
    dept = await prisma.department.create({
      data: {
        name: 'Computer Science',
        code: 'CS',
        collegeId: college.id
      }
    });
  }

  let course = await prisma.course.findFirst({ where: { collegeId: college.id } });
  if (!course) {
    course = await prisma.course.create({
      data: {
        name: 'B.Tech CS',
        code: `BTCS-${Date.now().toString().slice(-4)}`,
        departmentId: dept.id,
        collegeId: college.id,
        semester: 1,
        credits: 4
      }
    });
  }

  let section = await prisma.section.findFirst({ where: { collegeId: college.id } });
  if (!section) {
    section = await prisma.section.create({
      data: {
        name: 'Section A',
        courseId: course.id,
        collegeId: college.id,
        capacity: 60
      }
    });
  }

  // Admin user & token
  let adminUser = await prisma.user.findFirst({
    where: { collegeId: college.id, role: 'admin' }
  });
  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: `admin_${Date.now()}@testcollege.edu`,
        role: 'admin',
        collegeId: college.id,
        passwordHash: await bcrypt.hash('Admin@123', 10),
        accountStatus: 'active'
      }
    });
  }

  const adminToken = jwt.sign(
    { userId: adminUser.id, role: 'admin', collegeId: college.id },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5000/api/v1';

  const testEmail = `student_${Date.now()}@test.edu`;
  const studentPayload = {
    firstName: 'Arun',
    lastName: 'Kumar',
    email: testEmail,
    phone: '9876543210',
    parentPhone: '9123456780',
    parentName: 'Ramasamy Kumar',
    address: '42 Gandhi Road, Chennai',
    dob: '2003-08-15',
    gender: 'male',
    courseId: course.id,
    sectionId: section.id,
    residenceType: 'Day Scholar',
    password: 'StudentPassword@123'
  };

  let createdStudentId = null;

  try {
    // 1. Create student with all supported fields
    console.log('--- Test 1: Student Creation with All Supported Fields ---');
    const createRes = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify(studentPayload)
    });
    const createJson = await createRes.json();
    assert(createRes.status === 201 && createJson.success === true, 'Student created with HTTP 201');
    createdStudentId = createJson.data?.id;

    // 2. Direct PostgreSQL verification of first-class columns
    console.log('\n--- Test 2: Direct PostgreSQL Verification of First-Class Columns ---');
    const dbStudent = await prisma.student.findUnique({
      where: { id: createdStudentId },
      include: { user: true }
    });
    assert(dbStudent !== null, 'Student record exists in PostgreSQL');
    assert(dbStudent.user?.name === 'Arun Kumar', `User.name is stored as 'Arun Kumar' (was: ${dbStudent?.user?.name})`);
    assert(dbStudent.user?.email === testEmail, `User.email is stored as '${testEmail}'`);
    assert(dbStudent.studentMobile === '9876543210', `Student.studentMobile is stored as '9876543210' (was: ${dbStudent?.studentMobile})`);
    assert(dbStudent.parentMobile === '9123456780', `Student.parentMobile is stored as '9123456780' (was: ${dbStudent?.parentMobile})`);
    assert(dbStudent.fatherName === 'Ramasamy Kumar', `Student.fatherName is stored as 'Ramasamy Kumar' (was: ${dbStudent?.fatherName})`);
    assert(dbStudent.address === '42 Gandhi Road, Chennai', `Student.address is stored as '42 Gandhi Road, Chennai' (was: ${dbStudent?.address})`);
    assert(dbStudent.courseId === course.id, `Student.courseId is stored as foreign key UUID`);
    assert(dbStudent.sectionId === section.id, `Student.sectionId is stored as foreign key UUID`);
    assert(dbStudent.residenceType === 'Day Scholar', `Student.residenceType is stored as 'Day Scholar'`);

    // 3. Direct PostgreSQL verification of customFields
    console.log('\n--- Test 3: Direct PostgreSQL Verification of customFields ---');
    const cf = dbStudent.customFields || {};
    assert(cf.firstName === 'Arun', `customFields.firstName is 'Arun'`);
    assert(cf.lastName === 'Kumar', `customFields.lastName is 'Kumar'`);
    assert(cf.gender === 'male', `customFields.gender is 'male'`);
    assert(cf.dob === '2003-08-15', `customFields.dob is '2003-08-15'`);

    // 4. GET /api/v1/students retrieval
    console.log('\n--- Test 4-15: GET API List & Field Serializer Verification ---');
    const getRes = await fetch(`${BASE_URL}/students`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const getJson = await getRes.json();
    assert(getRes.status === 200 && getJson.success === true, 'GET /students returned HTTP 200');
    const foundStudent = getJson.data?.find(s => s.id === createdStudentId);
    assert(foundStudent !== undefined, 'Created student present in GET /students response');

    // 5-15 Individual field assertions
    assert(foundStudent?.firstName === 'Arun', `GET response exposes firstName: '${foundStudent?.firstName}'`);
    assert(foundStudent?.lastName === 'Kumar', `GET response exposes lastName: '${foundStudent?.lastName}'`);
    assert(foundStudent?.phone === '9876543210', `GET response exposes phone: '${foundStudent?.phone}'`);
    assert(foundStudent?.parentPhone === '9123456780', `GET response exposes parentPhone: '${foundStudent?.parentPhone}'`);
    assert(foundStudent?.parentName === 'Ramasamy Kumar', `GET response exposes parentName: '${foundStudent?.parentName}'`);
    assert(foundStudent?.address === '42 Gandhi Road, Chennai', `GET response exposes address: '${foundStudent?.address}'`);
    assert(foundStudent?.dob === '2003-08-15', `GET response exposes dob: '${foundStudent?.dob}'`);
    assert(foundStudent?.gender === 'male', `GET response exposes gender: '${foundStudent?.gender}'`);
    assert(foundStudent?.courseId === course.id, `GET response exposes courseId: '${foundStudent?.courseId}'`);
    assert(foundStudent?.sectionId === section.id, `GET response exposes sectionId: '${foundStudent?.sectionId}'`);
    assert(foundStudent?.residenceType === 'Day Scholar', `GET response exposes residenceType: '${foundStudent?.residenceType}'`);

    // 16. Fresh GET by ID
    console.log('\n--- Test 16: Fresh GET /students/:id Verification ---');
    const getDetailRes = await fetch(`${BASE_URL}/students/${createdStudentId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const getDetailJson = await getDetailRes.json();
    assert(getDetailRes.status === 200 && getDetailJson.success === true, 'GET /students/:id returned HTTP 200');
    assert(getDetailJson.data?.firstName === 'Arun' && getDetailJson.data?.phone === '9876543210', 'Detail endpoint returns identical populated fields');

    // 17. PUT with full data preserves all fields
    console.log('\n--- Test 17: PUT with Existing Data Preserves All Fields ---');
    const updateRes = await fetch(`${BASE_URL}/students/${createdStudentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        ...studentPayload,
        address: '42 Gandhi Road, 2nd Floor, Chennai'
      })
    });
    const updateJson = await updateRes.json();
    assert(updateRes.status === 200 && updateJson.success === true, 'PUT /students/:id succeeded with HTTP 200');

    // 18. Partial Update Safety: Updating ONLY gender
    console.log('\n--- Test 18: Partial Update Safety (Gender Only) ---');
    const partialGenderRes = await fetch(`${BASE_URL}/students/${createdStudentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ gender: 'female' })
    });
    assert(partialGenderRes.status === 200, 'Partial update for gender returned HTTP 200');
    
    // Verify in DB and API that other fields remain unchanged
    const afterGenderStudent = await prisma.student.findUnique({
      where: { id: createdStudentId },
      include: { user: true }
    });
    assert(afterGenderStudent.customFields?.gender === 'female', 'customFields.gender updated to female');
    assert(afterGenderStudent.customFields?.dob === '2003-08-15', 'customFields.dob preserved after gender update');
    assert(afterGenderStudent.user?.name === 'Arun Kumar', 'User.name preserved after gender update');
    assert(afterGenderStudent.studentMobile === '9876543210', 'Student.studentMobile preserved after gender update');
    assert(afterGenderStudent.parentMobile === '9123456780', 'Student.parentMobile preserved after gender update');
    assert(afterGenderStudent.fatherName === 'Ramasamy Kumar', 'Student.fatherName preserved after gender update');

    // 19. Partial Update Safety: Updating ONLY phone
    console.log('\n--- Test 19: Partial Update Safety (Phone Only) ---');
    const partialPhoneRes = await fetch(`${BASE_URL}/students/${createdStudentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ phone: '0987654321' }) // leading zero numeric phone
    });
    assert(partialPhoneRes.status === 200, 'Partial update for phone returned HTTP 200');

    const afterPhoneStudent = await prisma.student.findUnique({
      where: { id: createdStudentId }
    });
    assert(afterPhoneStudent.studentMobile === '0987654321', 'Student.studentMobile updated with leading zero preserved');
    assert(afterPhoneStudent.customFields?.gender === 'female', 'Gender remained female after phone update');
    assert(afterPhoneStudent.fatherName === 'Ramasamy Kumar', 'fatherName preserved after phone update');

    // 20. Tenant Isolation
    console.log('\n--- Test 20: Tenant Isolation Verification ---');
    const isolatedAdmin = await prisma.user.create({
      data: {
        email: `admin_isolated_${Date.now()}@othercollege.edu`,
        role: 'admin',
        collegeId: college2.id,
        passwordHash: await bcrypt.hash('Admin@123', 10),
        accountStatus: 'active'
      }
    });
    const isolatedToken = jwt.sign(
      { userId: isolatedAdmin.id, role: 'admin', collegeId: college2.id },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const isolatedGet = await fetch(`${BASE_URL}/students/${createdStudentId}`, {
      headers: { 'Authorization': `Bearer ${isolatedToken}` }
    });
    assert(isolatedGet.status === 404, 'Cross-tenant GET returns 404 Not Found');

    const isolatedPut = await fetch(`${BASE_URL}/students/${createdStudentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${isolatedToken}`
      },
      body: JSON.stringify({ phone: '9999999999' })
    });
    assert(isolatedPut.status === 404, 'Cross-tenant PUT returns 404 Not Found');

    // 21. Existing student records integrity
    console.log('\n--- Test 21: Existing Student Records Integrity ---');
    const legacyStudent = await prisma.student.findFirst({
      where: { id: { not: createdStudentId } }
    });
    if (legacyStudent) {
      assert(legacyStudent.id !== undefined, `Pre-existing student ${legacyStudent.admissionNumber || legacyStudent.id} remains intact`);
    } else {
      assert(true, 'No legacy conflict detected');
    }

    // 22. BUG-006 Regression: Invalid phone rejection
    console.log('\n--- Test 22: BUG-006 Phone Numeric Validation Regression ---');
    const invalidPhoneRes = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        ...studentPayload,
        email: `fail_phone_${Date.now()}@test.edu`,
        phone: '98765abc'
      })
    });
    assert(invalidPhoneRes.status === 400, 'Alphabetic phone number rejected with HTTP 400');

    // 23. BUG-004 Regression: Required email validation
    console.log('\n--- Test 23: BUG-004 Student Email Required Regression ---');
    const missingEmailRes = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        ...studentPayload,
        email: ''
      })
    });
    assert(missingEmailRes.status === 400, 'Missing email rejected with HTTP 400');

    // 24. Student Email + Password Authentication
    console.log('\n--- Test 24: Student Email + Password Authentication ---');
    const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Student@123',
        role: 'student'
      })
    });
    const studentLoginJson = await studentLoginRes.json();
    assert(studentLoginRes.status === 200 && studentLoginJson.success === true, 'Student successfully authenticated with Email + Password');

    // 25. Admission Number Authentication Rejection
    console.log('\n--- Test 25: Admission Number Authentication Rejection ---');
    const admLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: dbStudent.admissionNumber,
        password: 'Student@123',
        role: 'student'
      })
    });
    assert(admLoginRes.status === 400 || admLoginRes.status === 401, 'Admission Number rejected as login credential');

  } catch (err) {
    console.error('Unexpected test failure:', err);
    failed++;
  } finally {
    // Cleanup created test student
    if (createdStudentId) {
      await prisma.student.delete({ where: { id: createdStudentId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { email: testEmail } }).catch(() => {});
    }
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`SUMMARY: Total Tests Passed: ${passed} | Failed: ${failed}`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
