import 'dotenv/config';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from './server.js';
import {
  login,
  refreshToken,
  logout
} from './modules/auth/auth.controller.js';
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

async function runFinalSecurityAudit() {
  console.log('\n===============================================================');
  console.log('🔒 RUNNING FINAL STUDENT PORTAL SECURITY & OWNERSHIP AUDIT');
  console.log('===============================================================\n');

  let collegeA = null;
  let collegeB = null;
  let deptA = null;
  let deptB = null;
  let secA = null;
  let secB = null;
  let studentA = null;
  let studentB = null;
  let studentC = null; // Same college as Student A, different student
  let adminA = null;
  let teacherA = null;
  let courseA = null;
  let courseB = null;
  let assignmentA = null;
  let assignmentB = null;
  let examA = null;
  let examB = null;

  try {
    // Phase 0: Provisioning Test Entities
    console.log('--- Phase 0: Provisioning Multi-Tenant & Multi-Student Entities ---');
    collegeA = await prisma.college.create({
      data: {
        name: 'Apex National University',
        slug: `apex-nat-${Date.now()}`,
        status: 'active',
        registrationNo: `APX-N-${Date.now()}`
      }
    });

    collegeB = await prisma.college.create({
      data: {
        name: 'Beacon Global University',
        slug: `beacon-glob-${Date.now()}`,
        status: 'active',
        registrationNo: `BCN-G-${Date.now()}`
      }
    });

    const passHash = await bcrypt.hash('Student@1234', 10);
    const adminHash = await bcrypt.hash('Admin@1234', 10);

    adminA = await prisma.user.create({
      data: {
        collegeId: collegeA.id,
        email: `admin_${Date.now()}@apex.edu`,
        passwordHash: adminHash,
        role: 'admin',
        accountStatus: 'active',
        name: 'Admin User'
      }
    });

    deptA = await prisma.department.create({
      data: { name: 'Computer Science', code: 'CSE', collegeId: collegeA.id }
    });

    deptB = await prisma.department.create({
      data: { name: 'Mechanical Engineering', code: 'MECH', collegeId: collegeB.id }
    });

    courseA = await prisma.course.create({
      data: {
        collegeId: collegeA.id,
        departmentId: deptA.id,
        name: 'Operating Systems',
        code: 'CS401',
        credits: 4,
        semester: 4
      }
    });

    courseB = await prisma.course.create({
      data: {
        collegeId: collegeB.id,
        departmentId: deptB.id,
        name: 'Thermodynamics',
        code: 'ME401',
        credits: 4,
        semester: 4
      }
    });

    secA = await prisma.section.create({
      data: { name: 'Section A', courseId: courseA.id, collegeId: collegeA.id, capacity: 60 }
    });

    secB = await prisma.section.create({
      data: { name: 'Section B', courseId: courseB.id, collegeId: collegeB.id, capacity: 60 }
    });

    teacherA = await prisma.teacher.create({
      data: {
        collegeId: collegeA.id,
        departmentId: deptA.id,
        designation: 'Professor',
        joiningDate: new Date(),
        userId: (await prisma.user.create({
          data: {
            collegeId: collegeA.id,
            email: `prof_${Date.now()}@apex.edu`,
            passwordHash: passHash,
            role: 'teacher',
            name: 'Prof. Richard'
          }
        })).id
      }
    });

    // Student A (College A)
    const userA = await prisma.user.create({
      data: {
        collegeId: collegeA.id,
        email: `alice_${Date.now()}@apex.edu`,
        passwordHash: passHash,
        role: 'student',
        accountStatus: 'active',
        name: 'Alice Johnson'
      }
    });

    studentA = await prisma.student.create({
      data: {
        collegeId: collegeA.id,
        departmentId: deptA.id,
        sectionId: secA.id,
        admissionNumber: `ADM-APX-A-${Date.now()}`,
        rollNumber: 'R-001',
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

    // Student C (College A, Same College as Alice, Different Student)
    const userC = await prisma.user.create({
      data: {
        collegeId: collegeA.id,
        email: `charlie_${Date.now()}@apex.edu`,
        passwordHash: passHash,
        role: 'student',
        accountStatus: 'active',
        name: 'Charlie Brown'
      }
    });

    studentC = await prisma.student.create({
      data: {
        collegeId: collegeA.id,
        departmentId: deptA.id,
        sectionId: secA.id,
        admissionNumber: `ADM-APX-C-${Date.now()}`,
        rollNumber: 'R-002',
        batchYear: '2026',
        emailId: userC.email,
        userId: userC.id,
        residenceType: 'Hostel'
      }
    });
    studentC.department = deptA;
    studentC.section = secA;
    studentC.user = userC;
    studentC.college = collegeA;

    // Student B (College B, Different College)
    const userB = await prisma.user.create({
      data: {
        collegeId: collegeB.id,
        email: `bob_${Date.now()}@beacon.edu`,
        passwordHash: passHash,
        role: 'student',
        accountStatus: 'active',
        name: 'Bob Miller'
      }
    });

    studentB = await prisma.student.create({
      data: {
        collegeId: collegeB.id,
        departmentId: deptB.id,
        sectionId: secB.id,
        admissionNumber: `ADM-BCN-B-${Date.now()}`,
        rollNumber: 'R-003',
        batchYear: '2026',
        emailId: userB.email,
        userId: userB.id,
        residenceType: 'Hostel'
      }
    });
    studentB.department = deptB;
    studentB.section = secB;
    studentB.user = userB;
    studentB.college = collegeB;

    // Create assignments in College A & College B
    assignmentA = await prisma.assignment.create({
      data: {
        collegeId: collegeA.id,
        courseId: courseA.id,
        teacherId: teacherA.id,
        title: 'OS Virtual Memory Lab',
        description: 'Implement page replacement algorithms',
        dueDate: new Date(Date.now() + 86400000 * 7)
      }
    });

    const teacherBUser = await prisma.user.create({
      data: {
        collegeId: collegeB.id,
        email: `profb_${Date.now()}@beacon.edu`,
        passwordHash: passHash,
        role: 'teacher',
        name: 'Prof. Kevin'
      }
    });

    const teacherB = await prisma.teacher.create({
      data: {
        collegeId: collegeB.id,
        departmentId: deptB.id,
        designation: 'Professor',
        joiningDate: new Date(),
        userId: teacherBUser.id
      }
    });

    assignmentB = await prisma.assignment.create({
      data: {
        collegeId: collegeB.id,
        courseId: courseB.id,
        teacherId: teacherB.id,
        title: 'Thermo Heat Transfer Project',
        description: 'Transient conduction analysis',
        dueDate: new Date(Date.now() + 86400000 * 7)
      }
    });

    // Create Attendance for Student C only (3 sessions)
    await prisma.attendance.createMany({
      data: [
        { collegeId: collegeA.id, studentId: studentC.id, courseId: courseA.id, teacherId: teacherA.id, date: new Date(), status: 'present' },
        { collegeId: collegeA.id, studentId: studentC.id, courseId: courseA.id, teacherId: teacherA.id, date: new Date(Date.now() - 86400000), status: 'present' }
      ]
    });

    // Create Fee for Student C only (₹60,000)
    const feeStructA = await prisma.feeStructure.create({
      data: { collegeId: collegeA.id, semester: 4, totalAmount: 60000, dueDate: new Date(Date.now() + 86400000 * 30) }
    });

    await prisma.fee.create({
      data: {
        collegeId: collegeA.id,
        studentId: studentC.id,
        feeStructureId: feeStructA.id,
        amountDue: 60000,
        amountPaid: 60000,
        status: 'paid'
      }
    });

    // Create Complaint for Student C only
    await prisma.complaint.create({
      data: {
        collegeId: collegeA.id,
        userId: studentC.userId,
        subject: 'Hostel Hot Water Issue',
        description: 'No hot water on 3rd floor',
        category: 'Hostel',
        status: 'open'
      }
    });

    // Create Leave for Student C only
    await prisma.leaveRequest.create({
      data: {
        collegeId: collegeA.id,
        requesterUserId: studentC.userId,
        requesterRole: 'student',
        fromDate: new Date('2026-10-01'),
        toDate: new Date('2026-10-05'),
        reason: 'Family wedding',
        status: 'approved'
      }
    });

    // Create Exam & Mark for Student C only
    examA = await prisma.exam.create({
      data: {
        collegeId: collegeA.id,
        courseId: courseA.id,
        name: 'OS End-Sem Exam',
        type: 'Theory',
        date: new Date(Date.now() + 86400000 * 10),
        maxMarks: 100
      }
    });

    await prisma.mark.create({
      data: {
        collegeId: collegeA.id,
        studentId: studentC.id,
        examId: examA.id,
        obtainedMarks: 98,
        enteredByTeacherId: teacherA.id
      }
    });

    // Create Library Book in College A and in College B
    await prisma.libraryItem.create({
      data: { collegeId: collegeA.id, title: 'Modern Operating Systems by Tanenbaum', totalCopies: 4, availableCopies: 4, rackNo: 'APX-CS-10' }
    });

    await prisma.libraryItem.create({
      data: { collegeId: collegeB.id, title: 'Internal Combustion Engines by Heywood', totalCopies: 2, availableCopies: 2, rackNo: 'BCN-ME-05' }
    });

    // Create Placement Drive in College A and in College B
    await prisma.placement.create({
      data: {
        collegeId: collegeA.id,
        companyName: 'Apex Robotics Corp',
        eligibility: { role: 'Embedded Systems Engineer', ctc: '18.0 LPA' }
      }
    });

    await prisma.placement.create({
      data: {
        collegeId: collegeB.id,
        companyName: 'Beacon Turbo Dynamics',
        eligibility: { role: 'Aerodynamics Analyst', ctc: '12.0 LPA' }
      }
    });

    console.log('Provisioned complete adversarial multi-tenant fixtures.\n');

    const createStudentReq = (stud, extra = {}) => ({
      user: { id: stud.userId, collegeId: stud.collegeId, role: 'student' },
      student: stud,
      tenant: { collegeId: stud.collegeId },
      params: {},
      query: {},
      body: {},
      ...extra
    });

    // ============================================================
    // 1. RBAC & ROUTE GUARD SECURITY
    // ============================================================
    console.log('--- 1. RBAC & Route Guard Security ---');
    
    // Missing Token / User -> 401
    const unauthReq = { user: null };
    const unauthRes = createMockRes();
    let unauthNextCalled = false;
    await resolveStudent(unauthReq, unauthRes, () => { unauthNextCalled = true; });
    assert(unauthRes.statusCode === 401 && !unauthNextCalled, 'Missing user rejected with 401 Unauthorized');

    // Admin Token trying to call Student Resolver -> 403 Forbidden
    const adminReq = { user: { id: adminA.id, collegeId: collegeA.id, role: 'admin' } };
    const adminRes = createMockRes();
    let adminNextCalled = false;
    await resolveStudent(adminReq, adminRes, () => { adminNextCalled = true; });
    assert(adminRes.statusCode === 403 && !adminNextCalled, 'Admin token accessing student resolver rejected with 403 Forbidden');

    // ============================================================
    // 2. STUDENT OWNERSHIP ENFORCEMENT (STUDENT A vs STUDENT C)
    // ============================================================
    console.log('\n--- 2. Student Ownership Enforcement (Same College A) ---');

    // Attack 2.1: Student A attempts to view Student C's Profile by passing ?studentId=studentC.id
    const attackProfileRes = createMockRes();
    await getStudentProfile(createStudentReq(studentA, { query: { studentId: studentC.id } }), attackProfileRes);
    assert(attackProfileRes.body.data.admissionNumber === studentA.admissionNumber, 'Profile ignores client ?studentId and returns Student A');

    // Attack 2.2: Student A attempts to view Student C's Attendance by passing ?studentId=studentC.id
    const attackAttRes = createMockRes();
    await getStudentAttendance(createStudentReq(studentA, { query: { studentId: studentC.id } }), attackAttRes);
    assert(attackAttRes.body.data.totalDays === 0, 'Attendance ignores ?studentId and returns 0 records for Student A (Student C has 2)');

    // Attack 2.3: Student A attempts to view Student C's Marks / Results
    const attackResultsRes = createMockRes();
    await getStudentResults(createStudentReq(studentA, { query: { studentId: studentC.id } }), attackResultsRes);
    assert(attackResultsRes.body.data.length === 0, 'Results ignores ?studentId and returns 0 marks for Student A (Student C has 98)');

    // Attack 2.4: Student A attempts to view Student C's Fees & Invoices
    const attackFeesRes = createMockRes();
    await getStudentFees(createStudentReq(studentA, { query: { studentId: studentC.id } }), attackFeesRes);
    assert(attackFeesRes.body.data.totalAmount === 0, 'Fees ignores ?studentId and returns ₹0 for Student A (Student C has ₹60,000)');

    // Attack 2.5: Student A attempts to view Student C's Complaints
    const attackCompRes = createMockRes();
    await getStudentComplaints(createStudentReq(studentA, { query: { userId: studentC.userId, studentId: studentC.id } }), attackCompRes);
    assert(attackCompRes.body.data.length === 0, 'Complaints ignores client userId and returns 0 for Student A (Student C has 1)');

    // Attack 2.6: Student A attempts to view Student C's Leave Requests
    const attackLeaveRes = createMockRes();
    await getStudentLeaveRequests(createStudentReq(studentA, { query: { userId: studentC.userId } }), attackLeaveRes);
    assert(attackLeaveRes.body.data.length === 0, 'Leave requests ignores client userId and returns 0 for Student A (Student C has 1)');

    // Attack 2.7: Student A attempts to submit assignment for Student C by providing body { studentId: studentC.id }
    const attackSubmitRes = createMockRes();
    await submitStudentAssignment(
      createStudentReq(studentA, {
        params: { id: assignmentA.id },
        body: { studentId: studentC.id, fileUrl: 'https://github.com/spoofed/submission.git' }
      }),
      attackSubmitRes
    );
    assert(attackSubmitRes.statusCode === 200, 'Assignment submission executes successfully');
    assert(attackSubmitRes.body.data.studentId === studentA.id, 'Submission is forced to Student A id, ignoring body.studentId');

    // Attack 2.8: Student A attempts to create Complaint on behalf of Student C
    const attackCreateCompRes = createMockRes();
    await createStudentComplaint(
      createStudentReq(studentA, {
        body: {
          userId: studentC.userId,
          subject: 'Spoofed complaint',
          description: 'Attacker attempting impersonation'
        }
      }),
      attackCreateCompRes
    );
    assert(attackCreateCompRes.statusCode === 201, 'Complaint created successfully');
    assert(attackCreateCompRes.body.data.userId === studentA.userId, 'Complaint forced to Student A userId, ignoring body.userId');

    // Attack 2.9: Student A attempts to create Leave on behalf of Student C
    const attackCreateLeaveRes = createMockRes();
    await createStudentLeaveRequest(
      createStudentReq(studentA, {
        body: {
          requesterUserId: studentC.userId,
          fromDate: '2026-11-01',
          toDate: '2026-11-02',
          reason: 'Spoofed leave'
        }
      }),
      attackCreateLeaveRes
    );
    assert(attackCreateLeaveRes.statusCode === 201, 'Leave created successfully');
    assert(attackCreateLeaveRes.body.data.requesterUserId === studentA.userId, 'Leave forced to Student A userId, ignoring body.requesterUserId');

    // ============================================================
    // 3. CROSS-TENANT ISOLATION (COLLEGE A vs COLLEGE B)
    // ============================================================
    console.log('\n--- 3. Cross-Tenant Isolation (College A vs College B) ---');

    // Attack 3.1: Student A attempts to submit assignment belonging to College B
    const attackCrossAssignRes = createMockRes();
    await submitStudentAssignment(
      createStudentReq(studentA, {
        params: { id: assignmentB.id },
        body: { fileUrl: 'https://cross-tenant-attack.com' }
      }),
      attackCrossAssignRes
    );
    assert(attackCrossAssignRes.statusCode === 404, 'Submitting College B assignment by Student A returns 404 Not Found');

    // Attack 3.2: Student A queries Courses in College B by passing ?collegeId=collegeB.id
    const attackCrossCoursesRes = createMockRes();
    await getStudentCourses(createStudentReq(studentA, { query: { collegeId: collegeB.id } }), attackCrossCoursesRes);
    assert(attackCrossCoursesRes.body.data.every(c => c.collegeId === collegeA.id), 'Courses strictly filtered to Student A collegeId');

    // Attack 3.3: Student A queries Library in College B by passing ?collegeId=collegeB.id
    const attackCrossLibRes = createMockRes();
    await getStudentLibrary(createStudentReq(studentA, { query: { collegeId: collegeB.id } }), attackCrossLibRes);
    assert(attackCrossLibRes.body.data.every(b => b.collegeId === collegeA.id), 'Library strictly filtered to Student A collegeId');
    assert(!attackCrossLibRes.body.data.some(b => b.title.includes('Internal Combustion')), 'College B library books completely invisible to College A');

    // Attack 3.4: Student A queries Placements in College B
    const attackCrossPlaceRes = createMockRes();
    await getStudentPlacements(createStudentReq(studentA, { query: { collegeId: collegeB.id } }), attackCrossPlaceRes);
    assert(!attackCrossPlaceRes.body.data.some(p => p.companyName.includes('Beacon Turbo')), 'College B placement drives completely invisible to College A');

    // Attack 3.5: Student A queries Notices in College B
    const attackCrossNoticeRes = createMockRes();
    await getStudentNotices(createStudentReq(studentA, { query: { collegeId: collegeB.id } }), attackCrossNoticeRes);
    assert(attackCrossNoticeRes.body.data.every(n => n.collegeId === collegeA.id), 'Notices strictly filtered to Student A collegeId');

    // ============================================================
    // 4. CACHE COLLISION & PRIVACY
    // ============================================================
    console.log('\n--- 4. Cache Key Collision & Privacy ---');
    const dashAliceRes = createMockRes();
    await getStudentDashboard(createStudentReq(studentA), dashAliceRes);
    assert(dashAliceRes.body.data.student.admissionNumber === studentA.admissionNumber, 'Dashboard returns Alice admission number');

    const dashCharlieRes = createMockRes();
    await getStudentDashboard(createStudentReq(studentC), dashCharlieRes);
    assert(dashCharlieRes.body.data.student.admissionNumber === studentC.admissionNumber, 'Dashboard returns Charlie admission number (No cache collision)');
    assert(dashCharlieRes.body.data.metrics.totalFees === 60000, 'Charlie sees his ₹60,000 fee in dashboard, Alice sees ₹0');

    // ============================================================
    // 5. EMAIL-ONLY LOGIN REGRESSION
    // ============================================================
    console.log('\n--- 5. Authentication Email-Only Security ---');
    const admLoginRes = createMockRes();
    await login({ body: { email: studentA.admissionNumber, password: 'Student@1234' } }, admLoginRes);
    assert(admLoginRes.statusCode === 400 || admLoginRes.statusCode === 401, 'Admission number strictly rejected for login');

    const emailLoginRes = createMockRes();
    await login({ body: { email: studentA.user.email, password: 'Student@1234' } }, emailLoginRes);
    assert(emailLoginRes.statusCode === 200, 'Registered email login succeeds with 200 OK');

    console.log('\n===============================================================');
    if (failedCount === 0) {
      console.log(`🎉 ALL ${passedCount} FINAL SECURITY & OWNERSHIP AUDIT TESTS PASSED 100%!`);
    } else {
      console.error(`💥 AUDIT COMPLETED WITH ${failedCount} FAILURES (${passedCount} passed).`);
    }
    console.log('===============================================================\n');

  } catch (err) {
    console.error('Audit suite error:', err);
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

runFinalSecurityAudit();
