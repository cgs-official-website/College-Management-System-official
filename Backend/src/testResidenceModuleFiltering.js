import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './server.js';
import {
  getStudentProfile,
  getStudentHostel,
  getStudentTransport
} from './modules/student_portal/studentPortal.controller.js';

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

async function runResidenceFilteringTests() {
  console.log('\n===============================================================');
  console.log('🏠 RUNNING RESIDENCE MODULE FILTERING (HOSTEL vs TRANSPORT) TESTS');
  console.log('===============================================================\n');

  let college = null;
  let dept = null;
  let hostelBlock = null;
  let dayScholar = null;
  let hosteller = null;

  try {
    college = await prisma.college.create({
      data: {
        name: 'Test Residence College',
        slug: `residence-col-${Date.now()}`,
        status: 'active',
        registrationNo: `RES-${Date.now()}`
      }
    });

    dept = await prisma.department.create({
      data: { name: 'Civil Engineering', code: 'CIVIL', collegeId: college.id }
    });

    hostelBlock = await prisma.hostelBlock.create({
      data: { name: 'Kaveri Hostel Block', collegeId: college.id }
    });

    const passHash = await bcrypt.hash('Student@123', 10);

    // 1. Day Scholar Student
    const dayUser = await prisma.user.create({
      data: {
        collegeId: college.id,
        email: `day_scholar_${Date.now()}@test.edu`,
        passwordHash: passHash,
        role: 'student',
        accountStatus: 'active',
        name: 'Arun Day'
      }
    });

    dayScholar = await prisma.student.create({
      data: {
        collegeId: college.id,
        departmentId: dept.id,
        admissionNumber: `ADM-DAY-${Date.now()}`,
        rollNumber: 'D-101',
        batchYear: '2026',
        emailId: dayUser.email,
        userId: dayUser.id,
        residenceType: 'Day Scholar',
        transportRequired: 'Yes',
        address: '15 Gandhi Road, City Center'
      }
    });
    dayScholar.user = dayUser;
    dayScholar.department = dept;
    dayScholar.college = college;

    // 2. Hosteller Student
    const hostUser = await prisma.user.create({
      data: {
        collegeId: college.id,
        email: `hosteller_${Date.now()}@test.edu`,
        passwordHash: passHash,
        role: 'student',
        accountStatus: 'active',
        name: 'Kiran Hosteller'
      }
    });

    hosteller = await prisma.student.create({
      data: {
        collegeId: college.id,
        departmentId: dept.id,
        admissionNumber: `ADM-HST-${Date.now()}`,
        rollNumber: 'H-202',
        batchYear: '2026',
        emailId: hostUser.email,
        userId: hostUser.id,
        residenceType: 'Hostel',
        hostelBlockId: hostelBlock.id,
        hostelRoom: 'Room 204'
      }
    });
    hosteller.user = hostUser;
    hosteller.department = dept;
    hosteller.college = college;
    hosteller.hostelBlock = hostelBlock;

    const createReq = (stud) => ({
      user: { id: stud.userId, collegeId: stud.collegeId, role: 'student' },
      student: stud,
      tenant: { collegeId: stud.collegeId },
      params: {},
      query: {},
      body: {}
    });

    // Phase 1: Day Scholar Tests
    console.log('--- Phase 1: Day Scholar Verification ---');
    const dayProfRes = createMockRes();
    await getStudentProfile(createReq(dayScholar), dayProfRes);
    assert(dayProfRes.body.data.isDayScholar === true, 'Day Scholar profile flag isDayScholar = true');
    assert(dayProfRes.body.data.isHosteller === false, 'Day Scholar profile flag isHosteller = false');
    assert(dayProfRes.body.data.residenceType === 'Day Scholar', 'Day Scholar residenceType matches Day Scholar');

    const dayHostelRes = createMockRes();
    await getStudentHostel(createReq(dayScholar), dayHostelRes);
    assert(dayHostelRes.body.data.isHosteller === false, 'Hostel endpoint returns isHosteller = false for Day Scholar');

    const dayTransportRes = createMockRes();
    await getStudentTransport(createReq(dayScholar), dayTransportRes);
    assert(dayTransportRes.body.data.isTransportEligible === true, 'Transport endpoint returns isTransportEligible = true for Day Scholar');
    assert(dayTransportRes.body.data.pickupPoint.includes('Gandhi Road'), 'Transport endpoint returns accurate pickup point');

    // Phase 2: Hosteller Tests
    console.log('\n--- Phase 2: Hosteller Verification ---');
    const hostProfRes = createMockRes();
    await getStudentProfile(createReq(hosteller), hostProfRes);
    assert(hostProfRes.body.data.isHosteller === true, 'Hosteller profile flag isHosteller = true');
    assert(hostProfRes.body.data.isDayScholar === false, 'Hosteller profile flag isDayScholar = false');
    assert(hostProfRes.body.data.residenceType === 'Hostel', 'Hosteller residenceType matches Hostel');

    const hostHostelRes = createMockRes();
    await getStudentHostel(createReq(hosteller), hostHostelRes);
    assert(hostHostelRes.body.data.isHosteller === true, 'Hostel endpoint returns isHosteller = true for Hosteller');
    assert(hostHostelRes.body.data.blockName === 'Kaveri Hostel Block', 'Hostel endpoint returns allocated block name');
    assert(hostHostelRes.body.data.roomNo === 'Room 204', 'Hostel endpoint returns allocated room number');

    const hostTransportRes = createMockRes();
    await getStudentTransport(createReq(hosteller), hostTransportRes);
    assert(hostTransportRes.body.data.isTransportEligible === false, 'Transport endpoint returns isTransportEligible = false for Hosteller');
    assert(hostTransportRes.body.data.isHosteller === true, 'Transport endpoint confirms student is a hosteller');

    console.log('\n===============================================================');
    if (failedCount === 0) {
      console.log(`🎉 ALL ${passedCount} RESIDENCE MODULE FILTERING TESTS PASSED 100%!`);
    } else {
      console.error(`💥 TEST SUITE COMPLETED WITH ${failedCount} FAILURES (${passedCount} passed).`);
    }
    console.log('===============================================================\n');

  } catch (error) {
    console.error('Test error:', error);
  } finally {
    if (college) {
      await prisma.student.deleteMany({ where: { collegeId: college.id } });
      await prisma.hostelBlock.deleteMany({ where: { collegeId: college.id } });
      await prisma.department.deleteMany({ where: { collegeId: college.id } });
      await prisma.user.deleteMany({ where: { collegeId: college.id } });
      await prisma.college.deleteMany({ where: { id: college.id } });
    }
    await prisma.$disconnect();
  }
}

runResidenceFilteringTests();
