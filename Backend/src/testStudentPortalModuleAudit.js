import 'dotenv/config';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from './server.js';
import { 
  getStudentProfile,
  getStudentDashboard,
  getStudentCourses,
  getStudentAssignments,
  submitStudentAssignment,
  getStudentAttendance,
  getStudentLeaveRequests,
  createStudentLeaveRequest,
  getStudentTimetable,
  getStudentExams,
  getStudentResults,
  getStudentFees,
  getStudentNotices,
  getStudentLibrary,
  getStudentPlacements,
  getStudentComplaints,
  createStudentComplaint,
  getStudentHostel,
  getStudentTransport,
  getStudentDocuments
} from './modules/student_portal/studentPortal.controller.js';
import { authenticate } from './middleware/authenticate.js';
import { resolveStudent } from './modules/student_portal/studentResolver.js';

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

async function runStudentPortalAudit() {
  console.log('\n===============================================================');
  console.log('🚀 RUNNING COMPREHENSIVE STUDENT PORTAL MODULE AUDIT TEST SUITE');
  console.log('===============================================================\n');

  let collegeA = null;
  let collegeB = null;
  let deptA = null;
  let secA = null;
  let studentA = null;
  let studentB = null;
  let courseA1 = null;
  let assignmentA = null;
  let examA = null;
  let feeA = null;
  let noticeA = null;
  let bookA = null;
  let driveA = null;

  try {
    // Phase 0: Provisioning Multi-Tenant Fixtures
    console.log('--- Phase 0: Provisioning Test Fixtures ---');
    collegeA = await prisma.college.create({
      data: {
        name: 'Zenith Engineering College',
        slug: `zenith-engg-${Date.now()}`,
        status: 'active',
        registrationNo: `ZEN-${Date.now()}`
      }
    });

    collegeB = await prisma.college.create({
      data: {
        name: 'Vanguard Institute of Tech',
        slug: `vanguard-tech-${Date.now()}`,
        status: 'active',
        registrationNo: `VAN-${Date.now()}`
      }
    });

    deptA = await prisma.department.create({
      data: { name: 'Computer Science', code: 'CSE', collegeId: collegeA.id }
    });

    courseA1 = await prisma.course.create({
      data: {
        collegeId: collegeA.id,
        departmentId: deptA.id,
        name: 'Database Management Systems',
        code: 'CS301',
        credits: 4,
        semester: 3
      }
    });

    secA = await prisma.section.create({
      data: { 
        name: 'Section A', 
        courseId: courseA1.id, 
        collegeId: collegeA.id, 
        capacity: 60 
      }
    });

    const passHash = await bcrypt.hash('Student@123', 10);

    const userA = await prisma.user.create({
      data: {
        collegeId: collegeA.id,
        email: `aarav_${Date.now()}@zenith.edu`,
        passwordHash: passHash,
        role: 'student',
        accountStatus: 'active',
        name: 'Aarav Sharma'
      }
    });

    studentA = await prisma.student.create({
      data: {
        collegeId: collegeA.id,
        departmentId: deptA.id,
        sectionId: secA.id,
        admissionNumber: `ADM-ZEN-${Date.now()}`,
        rollNumber: 'R-101',
        batchYear: '2026',
        emailId: userA.email,
        userId: userA.id,
        residenceType: 'Day Scholar'
      }
    });

    studentA.department = deptA;
    studentA.section = secA;
    studentA.user = userA;
    studentA.college = collegeA;

    const deptB = await prisma.department.create({
      data: { name: 'Information Technology', code: 'IT', collegeId: collegeB.id }
    });

    const userB = await prisma.user.create({
      data: {
        collegeId: collegeB.id,
        email: `riya_${Date.now()}@vanguard.edu`,
        passwordHash: passHash,
        role: 'student',
        accountStatus: 'active',
        name: 'Riya Patel'
      }
    });

    studentB = await prisma.student.create({
      data: {
        collegeId: collegeB.id,
        departmentId: deptB.id,
        admissionNumber: `ADM-VAN-${Date.now()}`,
        rollNumber: 'R-202',
        batchYear: '2026',
        emailId: userB.email,
        userId: userB.id,
        residenceType: 'Hostel'
      }
    });

    const teacherA = await prisma.teacher.create({
      data: {
        collegeId: collegeA.id,
        departmentId: deptA.id,
        designation: 'Associate Professor',
        joiningDate: new Date(),
        userId: (await prisma.user.create({
          data: {
            collegeId: collegeA.id,
            email: `prof_${Date.now()}@zenith.edu`,
            passwordHash: passHash,
            role: 'teacher',
            name: 'Prof. Vikram'
          }
        })).id
      }
    });

    assignmentA = await prisma.assignment.create({
      data: {
        collegeId: collegeA.id,
        courseId: courseA1.id,
        teacherId: teacherA.id,
        title: 'SQL Normalization & Indexing',
        description: 'Complete relational schema optimization.',
        dueDate: new Date(Date.now() + 86400000 * 7)
      }
    });

    await prisma.attendance.create({
      data: {
        collegeId: collegeA.id,
        studentId: studentA.id,
        courseId: courseA1.id,
        teacherId: teacherA.id,
        date: new Date(),
        status: 'present'
      }
    });

    examA = await prisma.exam.create({
      data: {
        collegeId: collegeA.id,
        courseId: courseA1.id,
        name: 'DBMS Midterm Exam',
        type: 'Theory',
        date: new Date(Date.now() + 86400000 * 14),
        maxMarks: 100
      }
    });

    await prisma.mark.create({
      data: {
        collegeId: collegeA.id,
        studentId: studentA.id,
        examId: examA.id,
        obtainedMarks: 92,
        enteredByTeacherId: teacherA.id
      }
    });

    const feeStructA = await prisma.feeStructure.create({
      data: {
        collegeId: collegeA.id,
        semester: 3,
        totalAmount: 45000,
        dueDate: new Date(Date.now() + 86400000 * 30)
      }
    });

    feeA = await prisma.fee.create({
      data: {
        collegeId: collegeA.id,
        studentId: studentA.id,
        feeStructureId: feeStructA.id,
        amountDue: 45000,
        amountPaid: 45000,
        status: 'paid'
      }
    });

    noticeA = await prisma.notice.create({
      data: {
        collegeId: collegeA.id,
        title: 'Annual Tech Fest 2026',
        content: 'Registration is now open for all engineering students.',
        priority: 'high'
      }
    });

    bookA = await prisma.libraryItem.create({
      data: {
        collegeId: collegeA.id,
        title: 'Database System Concepts 7th Edition',
        author: 'Silberschatz, Korth, Sudarshan',
        isbn: '978-0078022159',
        totalCopies: 5,
        availableCopies: 3,
        rackNo: 'CS-R4-B2'
      }
    });

    driveA = await prisma.placement.create({
      data: {
        collegeId: collegeA.id,
        companyName: 'Apex Cloud Solutions',
        eligibility: {
          role: 'Cloud Operations Engineer',
          ctc: '14.5 LPA',
          eligibilityCriteria: 'B.Tech CSE with >= 7.0 CGPA'
        }
      }
    });

    console.log('Provisioned College A & B test fixtures with live relational records.\n');

    // Helper for student mock request
    const createStudentReq = (stud, extra = {}) => ({
      user: { id: stud.userId, collegeId: stud.collegeId, role: 'student' },
      student: stud,
      tenant: { collegeId: stud.collegeId },
      params: {},
      query: {},
      body: {},
      ...extra
    });

    // Phase 1: Student Profile
    console.log('--- Phase 1: Student Profile Verification ---');
    const profRes = createMockRes();
    await getStudentProfile(createStudentReq(studentA), profRes);
    assert(profRes.statusCode === 200, 'Student profile fetched successfully');
    assert(profRes.body.data.admissionNumber === studentA.admissionNumber, 'Accurate admission number returned');
    assert(profRes.body.data.department === 'Computer Science', 'Accurate department returned');

    // Phase 2: Student Dashboard
    console.log('\n--- Phase 2: Student Dashboard Live Aggregations ---');
    const dashRes = createMockRes();
    await getStudentDashboard(createStudentReq(studentA), dashRes);
    assert(dashRes.statusCode === 200, 'Student dashboard metrics loaded');
    assert(dashRes.body.data.metrics.attendancePercentage === 100, 'Live attendance percentage 100%');
    assert(dashRes.body.data.metrics.coursesCount === 1, 'Courses count equals 1');
    assert(dashRes.body.data.metrics.pendingAssignments === 1, 'Pending assignments equals 1');
    assert(dashRes.body.data.recentNotices.length >= 1, 'Recent notices aggregated');

    // Phase 3: My Courses
    console.log('\n--- Phase 3: My Courses ---');
    const coursesRes = createMockRes();
    await getStudentCourses(createStudentReq(studentA), coursesRes);
    assert(coursesRes.statusCode === 200, 'Courses fetched successfully');
    assert(coursesRes.body.data.length === 1, 'Student A sees their enrolled course');
    assert(coursesRes.body.data[0].code === 'CS301', 'Course code matches CS301');

    // Phase 4: My Assignments & Online Submission
    console.log('\n--- Phase 4: Assignments & Submissions ---');
    const assignRes = createMockRes();
    await getStudentAssignments(createStudentReq(studentA), assignRes);
    assert(assignRes.statusCode === 200, 'Assignments fetched successfully');
    assert(assignRes.body.data[0].title === 'SQL Normalization & Indexing', 'Assignment title matches');
    assert(assignRes.body.data[0].status === 'Pending', 'Initial status is Pending');

    // Student A submits assignment
    const submitRes = createMockRes();
    await submitStudentAssignment(
      createStudentReq(studentA, {
        params: { id: assignmentA.id },
        body: { fileUrl: 'https://github.com/student/dbms-project.git' }
      }),
      submitRes
    );
    assert(submitRes.statusCode === 200, 'Student successfully submits assignment link');
    assert(submitRes.body.data.status === 'submitted', 'Submission record status is submitted');

    // Verify assignment is now marked submitted
    const assignRes2 = createMockRes();
    await getStudentAssignments(createStudentReq(studentA), assignRes2);
    assert(assignRes2.body.data[0].status === 'Submitted', 'Assignment status is now Submitted');

    // Phase 5: Attendance & Leave Requests
    console.log('\n--- Phase 5: Attendance & Leave Applications ---');
    const attRes = createMockRes();
    await getStudentAttendance(createStudentReq(studentA), attRes);
    assert(attRes.statusCode === 200, 'Attendance records loaded');
    assert(attRes.body.data.presentDays === 1, '1 present session recorded');

    // Student A submits a leave request
    const leaveSubmitRes = createMockRes();
    await createStudentLeaveRequest(
      createStudentReq(studentA, {
        body: {
          leaveType: 'Sick Leave',
          fromDate: '2026-09-01',
          toDate: '2026-09-03',
          reason: 'Viral fever rest'
        }
      }),
      leaveSubmitRes
    );
    assert(leaveSubmitRes.statusCode === 201, 'Leave request created with status 201');

    const leavesRes = createMockRes();
    await getStudentLeaveRequests(createStudentReq(studentA), leavesRes);
    assert(leavesRes.body.data.length === 1, 'Leave request retrieved in student history');
    assert(leavesRes.body.data[0].status === 'pending', 'Leave status is pending');

    // Phase 6: Exams & Results
    console.log('\n--- Phase 6: Exams & Report Cards ---');
    const examsRes = createMockRes();
    await getStudentExams(createStudentReq(studentA), examsRes);
    assert(examsRes.statusCode === 200, 'Exams list fetched');
    assert(examsRes.body.data[0].title === 'DBMS Midterm Exam', 'Exam title matches');

    const resultsRes = createMockRes();
    await getStudentResults(createStudentReq(studentA), resultsRes);
    assert(resultsRes.statusCode === 200, 'Results loaded');
    assert(resultsRes.body.data[0].score === 92, 'Accurate student exam score 92 retrieved');

    // Phase 7: Fees & Statements
    console.log('\n--- Phase 7: Fees & Finance ---');
    const feesRes = createMockRes();
    await getStudentFees(createStudentReq(studentA), feesRes);
    assert(feesRes.statusCode === 200, 'Fee statements loaded');
    assert(feesRes.body.data.totalAmount === 45000, 'Total fees 45000 matches');
    assert(feesRes.body.data.paidAmount === 45000, 'Paid amount 45000 matches');
    assert(feesRes.body.data.pendingAmount === 0, 'Pending balance 0 matches');

    // Phase 8: Notice Board
    console.log('\n--- Phase 8: Notice Board ---');
    const noticesRes = createMockRes();
    await getStudentNotices(createStudentReq(studentA), noticesRes);
    assert(noticesRes.statusCode === 200, 'Notices fetched');
    assert(noticesRes.body.data[0].title === 'Annual Tech Fest 2026', 'Notice title matches');

    // Phase 9: Library Catalog
    console.log('\n--- Phase 9: Library Catalog & Search ---');
    const libraryRes = createMockRes();
    await getStudentLibrary(createStudentReq(studentA, { query: { search: 'Database' } }), libraryRes);
    assert(libraryRes.statusCode === 200, 'Library search returns 200 OK');
    assert(libraryRes.body.data.length === 1, 'Database book found in catalog');
    assert(libraryRes.body.data[0].availableCopies === 3, '3 copies available in library');
    assert(libraryRes.body.data[0].rackNo === 'CS-R4-B2', 'Physical rack location CS-R4-B2 returned');

    // Phase 10: Placements
    console.log('\n--- Phase 10: Campus Placements ---');
    const placeRes = createMockRes();
    await getStudentPlacements(createStudentReq(studentA), placeRes);
    assert(placeRes.statusCode === 200, 'Placement drives fetched');
    assert(placeRes.body.data[0].companyName === 'Apex Cloud Solutions', 'Placement company matches');
    assert(placeRes.body.data[0].ctc === '14.5 LPA', 'Package CTC 14.5 LPA matches');

    // Phase 11: Complaints / Grievances
    console.log('\n--- Phase 11: Complaints & Grievances ---');
    const compSubmitRes = createMockRes();
    await createStudentComplaint(
      createStudentReq(studentA, {
        body: {
          subject: 'Lab WiFi speed low',
          category: 'IT & WiFi',
          priority: 'medium',
          description: 'Connection drops frequently in CS Lab 2'
        }
      }),
      compSubmitRes
    );
    assert(compSubmitRes.statusCode === 201, 'Complaint created successfully');

    const compRes = createMockRes();
    await getStudentComplaints(createStudentReq(studentA), compRes);
    assert(compRes.body.data.length === 1, 'Student retrieves their own grievance ticket');
    assert(compRes.body.data[0].subject === 'Lab WiFi speed low', 'Complaint subject matches');

    // Phase 12: Tenant & Student Isolation
    console.log('\n--- Phase 12: Tenant & Student Isolation Verification ---');
    // Student B in College B tries to view Student A's notices / fees / library
    const studBLibraryRes = createMockRes();
    await getStudentLibrary(createStudentReq(studentB), studBLibraryRes);
    assert(studBLibraryRes.body.data.length === 0, 'Student in College B cannot see College A library books');

    const studBFeesRes = createMockRes();
    await getStudentFees(createStudentReq(studentB), studBFeesRes);
    assert(studBFeesRes.body.data.totalAmount === 0, 'Student B cannot see Student A fee records');

    const studBComplaintsRes = createMockRes();
    await getStudentComplaints(createStudentReq(studentB), studBComplaintsRes);
    assert(studBComplaintsRes.body.data.length === 0, 'Student B cannot see Student A complaints');

    console.log('\n===============================================================');
    if (failedCount === 0) {
      console.log(`🎉 ALL ${passedCount} STUDENT PORTAL MODULE AUDIT TESTS PASSED 100%!`);
    } else {
      console.error(`💥 TEST SUITE COMPLETED WITH ${failedCount} FAILURES (${passedCount} passed).`);
    }
    console.log('===============================================================\n');

  } catch (err) {
    console.error('Test suite error:', err);
  } finally {
    if (collegeA && collegeB) {
      await prisma.mark.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.exam.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.assignmentSubmission.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.assignment.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.attendance.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.leaveRequest.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.complaint.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.fee.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.feeStructure.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.notice.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.libraryItem.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.placement.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.student.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.teacher.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.section.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.course.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.department.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.user.deleteMany({ where: { collegeId: { in: [collegeA.id, collegeB.id] } } });
      await prisma.college.deleteMany({ where: { id: { in: [collegeA.id, collegeB.id] } } });
    }
    await prisma.$disconnect();
  }
}

runStudentPortalAudit();
