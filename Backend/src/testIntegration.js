import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { prisma } from './server.js';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const testPrisma = new PrismaClient({ adapter });

import { PrismaClient } from '@prisma/client';

async function runTests() {
  console.log('\n=============================================');
  console.log('🧪 RUNNING COMPREHENSIVE INTEGRATION TESTS');
  console.log('=============================================\n');

  // 1. Ensure test college exists
  let college = await testPrisma.college.findFirst({
    where: { slug: 'test-stabilization-college' }
  });

  if (!college) {
    college = await testPrisma.college.create({
      data: {
        name: 'Test Stabilization College',
        slug: 'test-stabilization-college',
        status: 'active'
      }
    });
    console.log('✓ Created test college:', college.id);
  } else {
    console.log('✓ Found test college:', college.id);
  }

  // 2. Ensure test admin user exists
  let adminUser = await testPrisma.user.findFirst({
    where: { email: 'admin@teststabilization.edu' }
  });

  if (!adminUser) {
    adminUser = await testPrisma.user.create({
      data: {
        email: 'admin@teststabilization.edu',
        role: 'admin',
        collegeId: college.id,
        passwordHash: 'hash123',
        accountStatus: 'active'
      }
    });
    console.log('✓ Created test admin user:', adminUser.id);
  } else {
    console.log('✓ Found test admin user:', adminUser.id);
  }

  const adminToken = jwt.sign(
    { userId: adminUser.id, role: 'admin', collegeId: college.id, email: adminUser.email },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '1h' }
  );

  // 3. Test Modules list
  console.log('\n--- 1. Testing GET /api/v1/modules ---');
  const modulesRes = await fetch('http://localhost:5000/api/v1/modules', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const modulesData = await modulesRes.json();
  console.log(`Status: ${modulesRes.status} (Expected 200), Modules count: ${modulesData.data?.length}`);
  if (modulesRes.status !== 200 || !modulesData.data?.length) throw new Error('Modules fetch failed');

  // 4. Test Roles CRUD
  console.log('\n--- 2. Testing POST /api/v1/roles (Create "Accountant" Role) ---');
  const createRoleRes = await fetch('http://localhost:5000/api/v1/roles', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: `Accountant_${Date.now().toString().slice(-4)}` })
  });
  const createdRoleData = await createRoleRes.json();
  console.log(`Status: ${createRoleRes.status} (Expected 201), Role ID: ${createdRoleData.data?.id}`);
  if (createRoleRes.status !== 201) throw new Error('Role creation failed');
  const testRole = createdRoleData.data;

  // 5. Test Permission Matrix Update (Grant Fees CRUD only)
  console.log('\n--- 3. Testing PUT /api/v1/roles/:id/permissions (Fees CRUD only) ---');
  const feesModule = modulesData.data.find(m => m.key === 'fees');
  const studentsModule = modulesData.data.find(m => m.key === 'students');

  const permPayload = {
    permissions: modulesData.data.map(m => ({
      moduleId: m.id,
      canCreate: m.key === 'fees',
      canRead: m.key === 'fees',
      canUpdate: m.key === 'fees',
      canDelete: m.key === 'fees',
    }))
  };

  const updatePermsRes = await fetch(`http://localhost:5000/api/v1/roles/${testRole.id}/permissions`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(permPayload)
  });
  const updatePermsData = await updatePermsRes.json();
  console.log(`Status: ${updatePermsRes.status} (Expected 200), Result: ${updatePermsData.message}`);
  if (updatePermsRes.status !== 200) throw new Error('Permissions update failed');

  // 6. Test Custom Role User Assignment
  console.log('\n--- 4. Testing User Role Assignment & Dynamic Permissions ---');
  let testUser = await testPrisma.user.findFirst({
    where: { email: 'staff.accountant@teststabilization.edu' }
  });

  if (!testUser) {
    testUser = await testPrisma.user.create({
      data: {
        email: 'staff.accountant@teststabilization.edu',
        role: 'teacher',
        customRoleId: testRole.id,
        collegeId: college.id,
        passwordHash: 'hash123',
        accountStatus: 'active'
      }
    });
  } else {
    testUser = await testPrisma.user.update({
      where: { id: testUser.id },
      data: { customRoleId: testRole.id }
    });
  }

  const accountantToken = jwt.sign(
    { userId: testUser.id, role: 'teacher', customRoleId: testRole.id, collegeId: college.id, email: testUser.email },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '1h' }
  );

  // 7. Verify Allowed Access: GET /api/v1/fees
  console.log('Testing Allowed Route: GET /api/v1/fees with Accountant token...');
  const feesRes = await fetch('http://localhost:5000/api/v1/fees', {
    headers: { Authorization: `Bearer ${accountantToken}` }
  });
  console.log(`Status: ${feesRes.status} (Expected 200 OK)`);
  if (feesRes.status !== 200) throw new Error('Accountant was unexpectedly blocked from fees');

  // 8. Verify Blocked Access: GET /api/v1/students -> Expect 403
  console.log('Testing Blocked Route: GET /api/v1/students with Accountant token...');
  const studentsRes = await fetch('http://localhost:5000/api/v1/students', {
    headers: { Authorization: `Bearer ${accountantToken}` }
  });
  const studentsBlocked = await studentsRes.json();
  console.log(`Status: ${studentsRes.status} (Expected 403 Forbidden), Error:`, studentsBlocked.error?.message);
  if (studentsRes.status !== 403) throw new Error('Accountant was not blocked from students!');

  // 9. Test Delete Conflict (409) when user is assigned to role
  console.log('\n--- 5. Testing DELETE /api/v1/roles/:id (Conflict 409 when users assigned) ---');
  const deleteConflictRes = await fetch(`http://localhost:5000/api/v1/roles/${testRole.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const deleteConflictData = await deleteConflictRes.json();
  console.log(`Status: ${deleteConflictRes.status} (Expected 409 Conflict), Count: ${deleteConflictData.count}`);
  if (deleteConflictRes.status !== 409) throw new Error('Delete did not return 409 conflict when users were assigned!');

  // 10. Reassign user off the role and delete cleanly
  console.log('\n--- 6. Testing User Role Reassignment & Clean Deletion ---');
  await testPrisma.user.update({
    where: { id: testUser.id },
    data: { customRoleId: null }
  });

  const deleteSuccessRes = await fetch(`http://localhost:5000/api/v1/roles/${testRole.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const deleteSuccessData = await deleteSuccessRes.json();
  console.log(`Status: ${deleteSuccessRes.status} (Expected 200 OK), Message: ${deleteSuccessData.message}`);
  if (deleteSuccessRes.status !== 200) throw new Error('Delete role failed after reassigning user');

  // 11. Test Real Student CRUD
  console.log('\n--- 7. Testing Real Student CRUD in Postgres ---');
  const studentEmail = `student_${Date.now()}@teststabilization.edu`;
  const createStudentRes = await fetch('http://localhost:5000/api/v1/students', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      firstName: 'Alice',
      lastName: 'Wonderland',
      email: studentEmail,
      class: 'Computer Science',
      status: 'active'
    })
  });
  const createdStudent = await createStudentRes.json();
  console.log(`Status: ${createStudentRes.status} (Expected 201), Student ID: ${createdStudent.data?.id}`);
  if (createStudentRes.status !== 201) throw new Error('Student creation failed');

  // 12. Test Real Staff CRUD
  console.log('\n--- 8. Testing Real Staff CRUD in Postgres ---');
  const staffEmail = `prof_${Date.now()}@teststabilization.edu`;
  const createStaffRes = await fetch('http://localhost:5000/api/v1/staff', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Professor Turing',
      email: staffEmail,
      department: 'Computer Science',
      designation: 'Senior Lecturer',
      salaryGrade: 'Grade A'
    })
  });
  const createdStaff = await createStaffRes.json();
  console.log(`Status: ${createStaffRes.status} (Expected 201), Staff ID: ${createdStaff.data?.id}`);
  if (createStaffRes.status !== 201) throw new Error('Staff creation failed');

  // 13. Test Real Admissions CRUD
  console.log('\n--- 9. Testing Real Admissions CRUD in Postgres ---');
  const createAdmissionRes = await fetch('http://localhost:5000/api/v1/admin/admissions/apply', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      firstName: 'Bob',
      lastName: 'Applicant',
      email: `bob_${Date.now()}@gmail.com`,
      phone: '9876543210',
      courseName: 'Computer Science',
      previousSchool: 'Lincoln High'
    })
  });
  const createdAdmission = await createAdmissionRes.json();
  console.log(`Status: ${createAdmissionRes.status} (Expected 201), Admission ID: ${createdAdmission.data?.id}`);
  if (createAdmissionRes.status !== 201) throw new Error('Admission creation failed');

  console.log('\n=============================================');
  console.log('✅ ALL INTEGRATION TESTS PASSED PERFECTLY!');
  console.log('=============================================\n');
}

runTests()
  .catch((err) => {
    console.error('\n❌ INTEGRATION TEST FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await testPrisma.$disconnect();
    await pool.end();
  });
