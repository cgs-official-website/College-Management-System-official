import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 TESTING REAL POSTGRES CRUD: TIMETABLE, EXAMS, ATTENDANCE');
  console.log('======================================================\n');

  let college = await prisma.college.findFirst({
    where: { slug: 'test-stabilization-college' }
  });

  if (!college) {
    college = await prisma.college.create({
      data: {
        name: 'Test Stabilization College',
        slug: 'test-stabilization-college',
        status: 'active'
      }
    });
  }

  const adminToken = jwt.sign(
    { userId: 'test-admin-id', role: 'admin', collegeId: college.id, email: 'admin@test.edu' },
    process.env.JWT_SECRET || 'fallback_secret',
    { expiresIn: '1h' }
  );

  // 1. Timetable Scheduling
  console.log('--- 1. Testing Timetable Scheduling API ---');
  const createSlotRes = await fetch('http://localhost:5000/api/v1/timetable/schedule', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      subject: 'Data Structures & Algorithms',
      dayOfWeek: 'Monday',
      startTime: '09:00',
      endTime: '10:30',
      room: 'Lab 402'
    })
  });
  const createdSlot = await createSlotRes.json();
  console.log(`POST /api/v1/timetable/schedule: Status ${createSlotRes.status}, ID: ${createdSlot.data?.id}`);
  if (createSlotRes.status !== 201) throw new Error('Failed to schedule timetable slot');

  const getTimetableRes = await fetch('http://localhost:5000/api/v1/timetable', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const timetableList = await getTimetableRes.json();
  console.log(`GET /api/v1/timetable: Status ${getTimetableRes.status}, Total Classes: ${timetableList.data?.length}`);
  if (!timetableList.data?.length) throw new Error('Failed to list timetable');

  // 2. Examination Center
  console.log('\n--- 2. Testing Exams API ---');
  const createExamRes = await fetch('http://localhost:5000/api/v1/exams', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Mid-Term Algorithms Assessment',
      subject: 'Data Structures & Algorithms',
      date: '2026-10-25',
      maxMarks: 100,
      type: 'Midterm'
    })
  });
  const createdExam = await createExamRes.json();
  console.log(`POST /api/v1/exams: Status ${createExamRes.status}, ID: ${createdExam.data?.id}`);
  if (createExamRes.status !== 201) throw new Error('Failed to schedule exam');

  const getExamsRes = await fetch('http://localhost:5000/api/v1/exams', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const examsList = await getExamsRes.json();
  console.log(`GET /api/v1/exams: Status ${getExamsRes.status}, Total Exams: ${examsList.data?.length}`);
  if (!examsList.data?.length) throw new Error('Failed to list exams');

  // 3. Attendance Recording
  console.log('\n--- 3. Testing Attendance API ---');
  let student = await prisma.student.findFirst({
    where: { collegeId: college.id }
  });

  if (!student) {
    let dept = await prisma.department.findFirst({ where: { collegeId: college.id } });
    if (!dept) {
      dept = await prisma.department.create({
        data: { collegeId: college.id, name: 'CS', code: 'CS' }
      });
    }
    const studentUser = await prisma.user.create({
      data: {
        collegeId: college.id,
        email: `student_${Date.now()}@college.edu`,
        role: 'student',
        passwordHash: 'hash123'
      }
    });
    student = await prisma.student.create({
      data: {
        collegeId: college.id,
        userId: studentUser.id,
        departmentId: dept.id,
        rollNumber: 'CS-001',
        admissionNumber: 'ADM-001',
        batchYear: '2026'
      }
    });
  }

  const markAttendanceRes = await fetch('http://localhost:5000/api/v1/attendance/mark', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      studentId: student.id,
      date: '2026-08-22',
      status: 'present'
    })
  });
  const markedAttendance = await markAttendanceRes.json();
  console.log(`POST /api/v1/attendance/mark: Status ${markAttendanceRes.status}, Result: ${markedAttendance.success}`);
  if (markAttendanceRes.status !== 201) throw new Error('Failed to mark attendance');

  const getAttendanceRes = await fetch('http://localhost:5000/api/v1/attendance/daily?date=2026-08-22', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const attendanceData = await getAttendanceRes.json();
  console.log(`GET /api/v1/attendance/daily: Status ${getAttendanceRes.status}, Rate: ${attendanceData.stats?.attendanceRate}`);
  if (getAttendanceRes.status !== 200) throw new Error('Failed to get daily attendance');

  // Clean-up
  console.log('\n--- 4. Testing Deletions & Clean-Up ---');
  await fetch(`http://localhost:5000/api/v1/timetable/${createdSlot.data.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  await fetch(`http://localhost:5000/api/v1/exams/${createdExam.data.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✓ Cleaned up test timetable slot and exam');

  console.log('\n======================================================');
  console.log('✅ ALL TIMETABLE, EXAMS & ATTENDANCE TESTS PASSED!');
  console.log('======================================================\n');
}

runTests()
  .catch((err) => {
    console.error('❌ TEST FAILED:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
