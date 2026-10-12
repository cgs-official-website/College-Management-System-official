import { prisma } from './server.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret';

async function runTests() {
  console.log('====================================================');
  console.log('BUG-008: Parent/Guardian Details in Directory Test Suite');
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

  // Find or create test colleges
  let college = await prisma.college.findFirst();
  if (!college) {
    college = await prisma.college.create({
      data: {
        name: 'BUG-008 Test College',
        code: `TST8-${Date.now().toString().slice(-4)}`
      }
    });
  }

  let college2 = await prisma.college.findFirst({
    where: { id: { not: college.id } }
  });
  if (!college2) {
    college2 = await prisma.college.create({
      data: {
        name: 'BUG-008 Isolated College',
        code: `ISO8-${Date.now().toString().slice(-4)}`
      }
    });
  }

  let dept = await prisma.department.findFirst({ where: { collegeId: college.id } });
  if (!dept) {
    dept = await prisma.department.create({
      data: {
        name: 'Science Dept',
        code: `SCI-${Date.now().toString().slice(-4)}`,
        collegeId: college.id
      }
    });
  }

  let course = await prisma.course.findFirst({ where: { collegeId: college.id } });
  if (!course) {
    course = await prisma.course.create({
      data: {
        name: 'B.Sc Physics',
        code: `PHY-${Date.now().toString().slice(-4)}`,
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
        email: `admin8_${Date.now()}@testcollege.edu`,
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

  const testEmail = `student_bug008_${Date.now()}@test.edu`;
  const studentPayload = {
    firstName: 'Bug008',
    lastName: 'ParentTest',
    email: testEmail,
    phone: '9876543210',
    parentName: 'Mohammed Ahamed',
    parentPhone: '9876543210',
    courseId: course.id,
    sectionId: section.id,
    gender: 'male',
    dob: '2004-01-01',
    address: '10 Mosque Street, Chennai'
  };

  let createdStudentId = null;
  let emptyParentStudentId = null;
  let legacyMotherStudentId = null;
  let legacyCustomStudentId = null;

  try {
    // 1. Create student with parent name + phone
    console.log('--- Test 1: Create Student with Parent Name & Phone ---');
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

    // 2 & 3. PostgreSQL Direct Verification
    console.log('\n--- Test 2-3: Direct PostgreSQL Column Verification ---');
    const dbStudent = await prisma.student.findUnique({
      where: { id: createdStudentId }
    });
    assert(dbStudent.fatherName === 'Mohammed Ahamed', `Student.fatherName is stored as 'Mohammed Ahamed' (was: ${dbStudent?.fatherName})`);
    assert(dbStudent.parentMobile === '9876543210', `Student.parentMobile is stored as '9876543210' (was: ${dbStudent?.parentMobile})`);

    // 4 & 5. GET /api/v1/students API Response
    console.log('\n--- Test 4-5: GET /students Response Verification ---');
    const getRes = await fetch(`${BASE_URL}/students`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const getJson = await getRes.json();
    assert(getRes.status === 200 && getJson.success === true, 'GET /students returned HTTP 200');
    const studentInList = getJson.data?.find(s => s.id === createdStudentId);
    assert(studentInList !== undefined, 'Created student present in student list');
    assert(studentInList?.parentName === 'Mohammed Ahamed', `GET response exposes parentName: '${studentInList?.parentName}'`);
    assert(studentInList?.parentPhone === '9876543210', `GET response exposes parentPhone: '${studentInList?.parentPhone}'`);

    // 6. Frontend Data Transformation Simulation
    console.log('\n--- Test 6: Frontend Data Transformation Verification ---');
    // Simulate apiClient / useStudents data unpacking
    const frontendStudents = Array.isArray(getJson?.data) ? getJson.data : [];
    const targetStudent = frontendStudents.find(s => s.id === createdStudentId);
    assert(targetStudent?.parentName === 'Mohammed Ahamed', `Frontend student object has parentName: '${targetStudent?.parentName}'`);
    assert(targetStudent?.parentPhone === '9876543210', `Frontend student object has parentPhone: '${targetStudent?.parentPhone}'`);

    // 7 & 8. Actual StudentList Table Column Mapping & Rendering Simulation
    console.log('\n--- Test 7-8: StudentList Table Cell Rendering Verification ---');
    // Table column definition from StudentList.jsx:
    const parentColumn = {
      header: 'Parent/Guardian',
      accessorKey: 'parentName',
      renderCell: (row) => ({
        parentNameDisplay: row.parentName || '-',
        parentPhoneDisplay: row.parentPhone ? row.parentPhone : null
      })
    };
    const renderedOutput = parentColumn.renderCell(targetStudent);
    assert(renderedOutput.parentNameDisplay === 'Mohammed Ahamed', `Rendered Parent/Guardian cell name is 'Mohammed Ahamed' (was: ${renderedOutput.parentNameDisplay})`);
    assert(renderedOutput.parentPhoneDisplay === '9876543210', `Rendered Parent/Guardian cell phone is '9876543210' (was: ${renderedOutput.parentPhoneDisplay})`);

    // 9. Empty Parent Name Fallback
    console.log('\n--- Test 9: Empty Parent Name Displays "-" ---');
    const emptyEmail = `student_noparent_${Date.now()}@test.edu`;
    const emptyParentRes = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        ...studentPayload,
        email: emptyEmail,
        parentName: '',
        parentPhone: ''
      })
    });
    const emptyParentJson = await emptyParentRes.json();
    emptyParentStudentId = emptyParentJson.data?.id;
    const getEmptyRes = await fetch(`${BASE_URL}/students/${emptyParentStudentId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const getEmptyJson = await getEmptyRes.json();
    const emptyRender = parentColumn.renderCell(getEmptyJson.data);
    assert(emptyRender.parentNameDisplay === '-', `Empty parentName renders as '-' in table (was: ${emptyRender.parentNameDisplay})`);
    assert(emptyRender.parentPhoneDisplay === null, `Empty parentPhone does not render phone paragraph`);

    // 10. Legacy motherName Fallback
    console.log('\n--- Test 10: Legacy motherName Fallback ---');
    const legacyUser1 = await prisma.user.create({
      data: {
        email: `legacy_mother_${Date.now()}@test.edu`,
        collegeId: college.id,
        role: 'student',
        passwordHash: await bcrypt.hash('Student@123', 10),
        name: 'Legacy Student'
      }
    });
    const legacyStudent1 = await prisma.student.create({
      data: {
        collegeId: college.id,
        userId: legacyUser1.id,
        departmentId: dept.id,
        admissionNumber: `LEG-M-${Date.now().toString().slice(-4)}`,
        rollNumber: `R-LM-${Date.now().toString().slice(-4)}`,
        batchYear: '2025',
        fatherName: null,
        motherName: 'Fatima Ahamed',
        parentMobile: '9988776655'
      }
    });
    legacyMotherStudentId = legacyStudent1.id;
    const legacyMotherGet = await fetch(`${BASE_URL}/students/${legacyMotherStudentId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const legacyMotherJson = await legacyMotherGet.json();
    assert(legacyMotherJson.data?.parentName === 'Fatima Ahamed', `Legacy record with motherName exposes parentName: '${legacyMotherJson.data?.parentName}'`);
    const legacyMotherRender = parentColumn.renderCell(legacyMotherJson.data);
    assert(legacyMotherRender.parentNameDisplay === 'Fatima Ahamed', `Legacy record with motherName renders 'Fatima Ahamed' in table`);

    // 11. Legacy customFields.parentName Fallback
    console.log('\n--- Test 11: Legacy customFields.parentName Fallback ---');
    const legacyUser2 = await prisma.user.create({
      data: {
        email: `legacy_custom_${Date.now()}@test.edu`,
        collegeId: college.id,
        role: 'student',
        passwordHash: await bcrypt.hash('Student@123', 10),
        name: 'Custom Student'
      }
    });
    const legacyStudent2 = await prisma.student.create({
      data: {
        collegeId: college.id,
        userId: legacyUser2.id,
        departmentId: dept.id,
        admissionNumber: `LEG-C-${Date.now().toString().slice(-4)}`,
        rollNumber: `R-LC-${Date.now().toString().slice(-4)}`,
        batchYear: '2025',
        fatherName: null,
        motherName: null,
        customFields: { parentName: 'Legacy Custom Parent' }
      }
    });
    legacyCustomStudentId = legacyStudent2.id;
    const legacyCustomGet = await fetch(`${BASE_URL}/students/${legacyCustomStudentId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const legacyCustomJson = await legacyCustomGet.json();
    assert(legacyCustomJson.data?.parentName === 'Legacy Custom Parent', `Legacy record with customFields.parentName exposes parentName: '${legacyCustomJson.data?.parentName}'`);

    // 12 & 13. Parent Details Update
    console.log('\n--- Test 12-13: Parent Details Update Persistence ---');
    const updateParentRes = await fetch(`${BASE_URL}/students/${createdStudentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        parentName: 'Ahamed Senior',
        parentPhone: '9876543299'
      })
    });
    assert(updateParentRes.status === 200, 'PUT /students/:id with updated parent details returned HTTP 200');
    const dbAfterParentUpdate = await prisma.student.findUnique({
      where: { id: createdStudentId }
    });
    assert(dbAfterParentUpdate.fatherName === 'Ahamed Senior', `PostgreSQL fatherName updated to 'Ahamed Senior'`);
    assert(dbAfterParentUpdate.parentMobile === '9876543299', `PostgreSQL parentMobile updated to '9876543299'`);

    // 14. Partial Update Safety (Unrelated Field)
    console.log('\n--- Test 14: Partial Update Safety (Gender Only) ---');
    const updateGenderRes = await fetch(`${BASE_URL}/students/${createdStudentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ gender: 'female' })
    });
    assert(updateGenderRes.status === 200, 'Partial update for gender returned HTTP 200');
    const dbAfterGenderUpdate = await prisma.student.findUnique({
      where: { id: createdStudentId }
    });
    assert(dbAfterGenderUpdate.fatherName === 'Ahamed Senior', 'Student.fatherName preserved after gender update');
    assert(dbAfterGenderUpdate.parentMobile === '9876543299', 'Student.parentMobile preserved after gender update');
    assert(dbAfterGenderUpdate.studentMobile === '9876543210', 'Student.studentMobile preserved after gender update');

    // 15. Tenant Isolation
    console.log('\n--- Test 15: Tenant Isolation ---');
    const isolatedAdmin = await prisma.user.create({
      data: {
        email: `admin_iso8_${Date.now()}@othercollege.edu`,
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

    // 16. BUG-006 Regression: Invalid Parent Phone Rejection
    console.log('\n--- Test 16: BUG-006 Invalid Parent Phone Rejection ---');
    const invalidPhone1 = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        ...studentPayload,
        email: `fail_parentphone1_${Date.now()}@test.edu`,
        parentPhone: '98765abc'
      })
    });
    assert(invalidPhone1.status === 400, 'Alphabetic parent phone rejected with HTTP 400');

    const invalidPhone2 = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        ...studentPayload,
        email: `fail_parentphone2_${Date.now()}@test.edu`,
        parentPhone: '+919876543210'
      })
    });
    assert(invalidPhone2.status === 400, 'Parent phone with plus sign rejected with HTTP 400');

    const invalidPhone3 = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        ...studentPayload,
        email: `fail_parentphone3_${Date.now()}@test.edu`,
        parentPhone: '9876 543210'
      })
    });
    assert(invalidPhone3.status === 400, 'Parent phone with spaces rejected with HTTP 400');

    // 17. BUG-004 Regression: Required Email
    console.log('\n--- Test 17: BUG-004 Required Email Regression ---');
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
    assert(missingEmailRes.status === 400, 'Missing student email rejected with HTTP 400');

    // 18. Complete CREATE -> DB -> GET -> Directory Lifecycle
    console.log('\n--- Test 18: Complete CREATE -> DB -> GET -> Directory Lifecycle ---');
    const lifecycleEmail = `student_lifecycle_${Date.now()}@test.edu`;
    const lifecycleCreateRes = await fetch(`${BASE_URL}/students`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        ...studentPayload,
        email: lifecycleEmail,
        parentName: 'Mohammed Ahamed',
        parentPhone: '9876543210'
      })
    });
    const lifecycleJson = await lifecycleCreateRes.json();
    const lifecycleStudentId = lifecycleJson.data?.id;
    const dbLifecycle = await prisma.student.findUnique({ where: { id: lifecycleStudentId } });
    assert(dbLifecycle.fatherName === 'Mohammed Ahamed', 'PostgreSQL stores fatherName = "Mohammed Ahamed"');
    const apiLifecycleGet = await fetch(`${BASE_URL}/students`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const apiLifecycleJson = await apiLifecycleGet.json();
    const directoryItem = apiLifecycleJson.data?.find(s => s.id === lifecycleStudentId);
    assert(directoryItem?.parentName === 'Mohammed Ahamed', 'GET /students exposes parentName = "Mohammed Ahamed"');
    const finalRender = parentColumn.renderCell(directoryItem);
    assert(finalRender.parentNameDisplay === 'Mohammed Ahamed', 'Directory renders Parent/Guardian = "Mohammed Ahamed"');
    assert(finalRender.parentPhoneDisplay === '9876543210', 'Directory renders Parent Phone = "9876543210"');

    // Clean up lifecycle student
    await prisma.student.delete({ where: { id: lifecycleStudentId } }).catch(() => {});
    await prisma.user.deleteMany({ where: { email: lifecycleEmail } }).catch(() => {});

    // 19. UPDATE -> DB -> GET -> Directory Lifecycle
    console.log('\n--- Test 19: UPDATE -> DB -> GET -> Directory Lifecycle ---');
    await fetch(`${BASE_URL}/students/${createdStudentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ parentName: 'Mohammed Ahamed Final' })
    });
    const updateGetRes = await fetch(`${BASE_URL}/students`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const updateGetJson = await updateGetRes.json();
    const updatedDirectoryItem = updateGetJson.data?.find(s => s.id === createdStudentId);
    const updatedRender = parentColumn.renderCell(updatedDirectoryItem);
    assert(updatedRender.parentNameDisplay === 'Mohammed Ahamed Final', 'Directory renders updated Parent/Guardian = "Mohammed Ahamed Final"');

    // 20. Fresh Refetch Verification
    console.log('\n--- Test 20: Fresh Refetch Verification ---');
    const freshGet = await fetch(`${BASE_URL}/students/${createdStudentId}`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    const freshJson = await freshGet.json();
    assert(freshJson.data?.parentName === 'Mohammed Ahamed Final', 'Fresh GET by ID returns latest parent name');

  } catch (err) {
    console.error('Unexpected test failure:', err);
    failed++;
  } finally {
    // Cleanup
    if (createdStudentId) {
      await prisma.student.delete({ where: { id: createdStudentId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { email: testEmail } }).catch(() => {});
    }
    if (emptyParentStudentId) {
      await prisma.student.delete({ where: { id: emptyParentStudentId } }).catch(() => {});
    }
    if (legacyMotherStudentId) {
      await prisma.student.delete({ where: { id: legacyMotherStudentId } }).catch(() => {});
    }
    if (legacyCustomStudentId) {
      await prisma.student.delete({ where: { id: legacyCustomStudentId } }).catch(() => {});
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
