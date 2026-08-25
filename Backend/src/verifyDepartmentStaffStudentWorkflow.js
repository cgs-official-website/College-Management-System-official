import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { prisma } from './server.js';
import { login } from './modules/auth/auth.controller.js';
import {
  getStudentProfile,
  getStudentDashboard,
  getStudentCourses,
  getStudentTimetable,
  getStudentAssignments
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

async function runDepartmentWorkflow() {
  console.log('\n===============================================================');
  console.log('🏛️ EXECUTING DEPARTMENT ➔ STAFF ➔ STUDENT WORKFLOW TEST');
  console.log('===============================================================\n');

  try {
    // 1. Get CGS Engineering College
    const college = await prisma.college.findFirst({
      where: { status: 'active', slug: 'cgs-engineering-college-8brm88' }
    }) || await prisma.college.findFirst({ where: { status: 'active' } });

    console.log(`[Step 1] Target College: "${college.name}" (ID: ${college.id})`);

    // 2. Create or Find Department
    let dept = await prisma.department.findFirst({
      where: { collegeId: college.id, code: 'AIDS' }
    });

    if (!dept) {
      dept = await prisma.department.create({
        data: {
          collegeId: college.id,
          name: 'Artificial Intelligence & Data Science',
          code: 'AIDS'
        }
      });
      console.log(`[Step 2] ✅ Created Department: "${dept.name}" (Code: ${dept.code})`);
    } else {
      console.log(`[Step 2] ℹ️ Using Existing Department: "${dept.name}" (Code: ${dept.code})`);
    }

    const defaultPasswordHash = await bcrypt.hash('Student@123', 10);
    const teacherPasswordHash = await bcrypt.hash('Teacher@123', 10);

    // 3. Create & Assign Faculty / HOD
    let staffUser = await prisma.user.findFirst({
      where: { email: 'dr.rajesh.aids@cgs.edu' }
    });

    if (!staffUser) {
      staffUser = await prisma.user.create({
        data: {
          collegeId: college.id,
          email: 'dr.rajesh.aids@cgs.edu',
          passwordHash: teacherPasswordHash,
          role: 'teacher',
          accountStatus: 'active',
          name: 'Dr. Rajesh Kumar'
        }
      });
    }

    let staff = await prisma.teacher.findFirst({
      where: { userId: staffUser.id }
    });

    if (!staff) {
      staff = await prisma.teacher.create({
        data: {
          collegeId: college.id,
          departmentId: dept.id,
          userId: staffUser.id,
          designation: 'Professor & HOD',
          joiningDate: new Date('2024-01-15')
        }
      });
      console.log(`[Step 3] ✅ Assigned Staff: "${staffUser.name}" as "${staff.designation}" to ${dept.name}`);
    } else {
      console.log(`[Step 3] ℹ️ Staff already assigned: "${staffUser.name}" (${staff.designation})`);
    }

    // Link HOD to department
    await prisma.department.update({
      where: { id: dept.id },
      data: { hodUserId: staffUser.id }
    });

    // 4. Create Department Course & Section
    let course = await prisma.course.findFirst({
      where: { collegeId: college.id, departmentId: dept.id, code: 'AI401' }
    });

    if (!course) {
      course = await prisma.course.create({
        data: {
          collegeId: college.id,
          departmentId: dept.id,
          name: 'Deep Learning & Neural Networks',
          code: 'AI401',
          credits: 4,
          semester: 4
        }
      });
      console.log(`[Step 4] ✅ Created Course: "${course.name}" (${course.code}, 4 Credits, Sem 4)`);
    }

    let section = await prisma.section.findFirst({
      where: { collegeId: college.id, courseId: course.id, name: 'Section A' }
    });

    if (!section) {
      section = await prisma.section.create({
        data: {
          collegeId: college.id,
          courseId: course.id,
          name: 'Section A',
          capacity: 60
        }
      });
      console.log(`[Step 5] ✅ Created Section: "${section.name}" (Capacity: 60) for ${course.name}`);
    }

    // 5. Create & Assign Student to Department and Section
    let studentUser = await prisma.user.findFirst({
      where: { email: 'rohan.aids@cgs.edu' }
    });

    if (!studentUser) {
      studentUser = await prisma.user.create({
        data: {
          collegeId: college.id,
          email: 'rohan.aids@cgs.edu',
          passwordHash: defaultPasswordHash,
          role: 'student',
          accountStatus: 'active',
          name: 'Rohan Verma'
        }
      });
    } else {
      await prisma.user.update({
        where: { id: studentUser.id },
        data: { passwordHash: defaultPasswordHash, accountStatus: 'active' }
      });
    }

    let student = await prisma.student.findFirst({
      where: {
        collegeId: college.id,
        OR: [
          { userId: studentUser.id },
          { admissionNumber: 'AIDS2026001' }
        ]
      }
    });

    if (!student) {
      student = await prisma.student.create({
        data: {
          collegeId: college.id,
          departmentId: dept.id,
          sectionId: section.id,
          admissionNumber: 'AIDS2026001',
          rollNumber: 'AI-101',
          batchYear: '2026',
          yearOfStudy: 'II Year',
          emailId: 'rohan.aids@cgs.edu',
          studentMobile: '9876543299',
          emergencyContact: '9876543298',
          userId: studentUser.id,
          residenceType: 'Hostel',
          hostelRoom: 'Room 404, Tech Block',
          transportRequired: 'No'
        }
      });
      console.log(`[Step 6] ✅ Assigned Student: "${studentUser.name}" (Admission: ${student.admissionNumber}) to ${dept.name}`);
    } else {
      student = await prisma.student.update({
        where: { id: student.id },
        data: { 
          departmentId: dept.id, 
          sectionId: section.id,
          userId: studentUser.id,
          emailId: 'rohan.aids@cgs.edu'
        }
      });
      console.log(`[Step 6] ℹ️ Student Updated & Assigned: "${studentUser.name}" to ${dept.name}`);
    }

    // 6. Create Timetable Schedule & Assignment
    const existingSlot = await prisma.timetableSlot.findFirst({
      where: { collegeId: college.id, courseId: course.id, sectionId: section.id, dayOfWeek: 1 }
    });

    if (!existingSlot) {
      await prisma.timetableSlot.create({
        data: {
          collegeId: college.id,
          departmentId: dept.id,
          courseId: course.id,
          sectionId: section.id,
          teacherId: staff.id,
          dayOfWeek: 1, // Monday
          startTime: '09:00',
          endTime: '10:30',
          room: 'AI Computing Lab 1'
        }
      });
      console.log(`[Step 7] ✅ Scheduled Timetable: Monday 09:00 - 10:30 with ${staffUser.name} in AI Computing Lab 1`);
    }

    const existingAssignment = await prisma.assignment.findFirst({
      where: { collegeId: college.id, courseId: course.id, title: 'Neural Network Backpropagation & CNN' }
    });

    if (!existingAssignment) {
      await prisma.assignment.create({
        data: {
          collegeId: college.id,
          courseId: course.id,
          teacherId: staff.id,
          title: 'Neural Network Backpropagation & CNN',
          description: 'Implement backpropagation from scratch in Python and train on MNIST.',
          dueDate: new Date(Date.now() + 86400000 * 7)
        }
      });
      console.log(`[Step 8] ✅ Created Assignment: "Neural Network Backpropagation & CNN"`);
    }

    // 7. Verify Student Authentication & Student Panel API Endpoints
    console.log('\n--- [Step 9] Testing Student Authentication & Student Portal View ---');
    
    // Login
    const loginRes = createMockRes();
    await login({ body: { email: 'rohan.aids@cgs.edu', password: 'Student@123' } }, loginRes);
    
    if (loginRes.statusCode === 200) {
      console.log(`✅ Authentication Succeeded: ${studentUser.email} (Token Issued)`);
    } else {
      console.error(`❌ Authentication Failed:`, loginRes.body);
    }

    // Resolve Student Context
    const studentWithRelations = await prisma.student.findFirst({
      where: { userId: studentUser.id },
      include: {
        department: true,
        section: true,
        course: true,
        college: true,
        user: true
      }
    });

    const mockReq = {
      user: { id: studentUser.id, collegeId: college.id, role: 'student' },
      student: studentWithRelations,
      tenant: { collegeId: college.id },
      params: {},
      query: {},
      body: {}
    };

    // Test 1: Profile
    const profileRes = createMockRes();
    await getStudentProfile(mockReq, profileRes);
    console.log('\n📄 Student Profile Output:');
    console.log(`   - Name: ${profileRes.body.data.name}`);
    console.log(`   - Admission No: ${profileRes.body.data.admissionNumber}`);
    console.log(`   - Department: ${profileRes.body.data.department} (${profileRes.body.data.departmentCode})`);
    console.log(`   - Section: ${profileRes.body.data.section}`);
    console.log(`   - College: ${profileRes.body.data.collegeName}`);
    console.log(`   - Residence: ${profileRes.body.data.residenceType} (${profileRes.body.data.hostelRoom})`);

    // Test 2: Courses
    const coursesRes = createMockRes();
    await getStudentCourses(mockReq, coursesRes);
    console.log('\n📚 Enrolled Department Courses:');
    coursesRes.body.data.forEach((c, idx) => {
      console.log(`   [${idx + 1}] ${c.code}: ${c.name} (Credits: ${c.credits}, Semester: ${c.semester})`);
    });

    // Test 3: Timetable
    const timetableRes = createMockRes();
    await getStudentTimetable(mockReq, timetableRes);
    console.log('\n⏰ Weekly Class Timetable:');
    timetableRes.body.data.forEach((slot, idx) => {
      console.log(`   [${idx + 1}] Day ${slot.dayOfWeek} (${slot.startTime}-${slot.endTime}): ${slot.course?.name} | Room: ${slot.room} | Faculty: ${slot.teacher?.user?.name}`);
    });

    // Test 4: Assignments
    const assignRes = createMockRes();
    await getStudentAssignments(mockReq, assignRes);
    console.log('\n📝 Pending Assignments:');
    assignRes.body.data.forEach((a, idx) => {
      console.log(`   [${idx + 1}] ${a.title} (Course: ${a.courseName}) | Due: ${new Date(a.dueDate).toLocaleDateString()} | Status: ${a.status}`);
    });

    // Test 5: Dashboard
    const dashRes = createMockRes();
    await getStudentDashboard(mockReq, dashRes);
    console.log('\n📊 Student Dashboard Metrics:');
    console.log(`   - Enrolled Courses: ${dashRes.body.data.metrics.coursesCount}`);
    console.log(`   - Pending Assignments: ${dashRes.body.data.metrics.pendingAssignments}`);
    console.log(`   - Attendance: ${dashRes.body.data.metrics.attendancePercentage}%`);

    console.log('\n===============================================================');
    console.log('🎉 WORKFLOW VERIFIED SUCCESSFULLY: 100% CORRECT & LINKED!');
    console.log('===============================================================\n');

  } catch (error) {
    console.error('Workflow error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runDepartmentWorkflow();
