/**
 * testData.js
 * Centralized test data containing credentials and configurations for automated E2E tests.
 * Edit placeholders here before executing tests in local or CI environments.
 */
export const testData = {
  // 1. Roles & Credentials (MUST BE POPULATED WITH VALID ACCOUNTS IN TARGET DATABASE)
  credentials: {
    superadmin: {
      email: 'superadmin@zuna.hq',         // REPLACE with valid Superadmin Email
      password: 'SuperPassword123!',       // REPLACE with valid Superadmin Password
    },
    admin: {
      email: 'admin@testcollege.edu',      // REPLACE with valid Admin Email
      password: 'AdminPassword123!',       // REPLACE with valid Admin Password
    },
    teacher: {
      email: 'teacher@testcollege.edu',    // REPLACE with valid Teacher Email
      password: 'TeacherPassword123!',     // REPLACE with valid Teacher Password
    },
    student: {
      email: 'student@testcollege.edu',    // REPLACE with valid Student Email
      password: 'StudentPassword123!',     // REPLACE with valid Student Password
    },
    parent: {
      email: 'parent@testcollege.edu',      // REPLACE with valid Parent Email
      password: 'ParentPassword123!',       // REPLACE with valid Parent Password
    },
  },

  // 2. Phase 1: Superadmin Panel Data
  superadminData: {
    moduleToggleName: 'Hostel Management', // Module to toggle globally
    pendingCollegeName: 'Tech Institute of Science', // Pending college name to approve
  },

  // 3. Phase 2: College Admin Panel Data
  adminData: {
    admission: {
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice.smith@example.com',
      phone: '1234567890',
      branch: 'Computer Science', // Match a course dropdown option
      previousSchool: 'Lincoln High School',
    },
    marketing: {
      campaignName: 'Winter Open House 2026',
      channel: 'Email',
      targetAudience: 'Prospective STEM Students',
    },
    staff: {
      name: 'Dr. Robert Carter',
      role: 'Teacher',
      salary: '85000',
    },
    course: {
      code: 'CS101',
      title: 'Introduction to Web Technologies',
      syllabus: 'HTML, CSS, JavaScript, React, and DOM manipulation basics.',
    },
    timetable: {
      classAndSem: 'CS - Semester 1',
      subject: 'Introduction to Web Technologies',
      room: 'Lab-A',
    },
    attendance: {
      classAndSem: 'CS - Semester 1',
      section: 'A',
      studentName: 'Alice Smith',
    },
    exam: {
      subject: 'Introduction to Web Technologies',
      date: '2026-12-15',
      time: '09:00',
      location: 'Main Auditorium',
    },
    lms: {
      topic: 'React Hooks Deep Dive',
      batch: 'CS - Semester 1',
      time: '2026-10-10T10:00',
      link: 'https://zoom.us/j/987654321',
    },
    fees: {
      studentName: 'Alice Smith',
      amount: '1250',
      category: 'Tuition Fee',
    },
    library: {
      title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
      author: 'Robert C. Martin',
      isbn: '978-0132350884',
      studentName: 'Alice Smith',
    },
    hostel: {
      studentName: 'Alice Smith',
      block: 'A Block',
      roomNumber: '102',
    },
    transport: {
      vehicleNumber: 'BUS-CA-2026',
      routeCoordinates: 'Route 15 - Downtown Route',
      driverName: 'John Miller',
    },
    notice: {
      title: 'End Term Exams Schedule Published',
      body: 'The end term examinations schedule has been uploaded to the dashboard under /exams. Please check the timetable layout and prepare accordingly.',
      targetAudience: 'All', // 'All', 'Students', 'Teachers'
    },
    placement: {
      companyName: 'Google LLC',
      role: 'Frontend Engineering Intern',
      packageLPA: '18',
      eligibilityCGPA: '7.5',
      date: '2026-11-20',
    },
    notification: {
      title: 'Severe Weather Warning',
      body: 'The campus will remain closed tomorrow due to heavy weather conditions. Classes will run asynchronously via the LMS portal.',
      platform: 'iOS', // 'iOS', 'Android', 'Both'
    },
    settings: {
      newName: 'Codex QA College',
    },
  },

  // 4. Phase 3: Student Panel Data
  studentData: {
    assignments: {
      title: 'Responsive Design Sandbox',
      filePath: 'tests/assets/assignment_sandbox.pdf', // Local mock file path to upload
      fileName: 'assignment_sandbox.pdf',
    },
    leave: {
      reason: 'Family Emergency Leave',
    },
    hostel: {
      issue: 'Broken Lightbulb in study room',
      severity: 'Medium', // 'Low', 'Medium', 'High'
    },
    complaints: {
      description: 'The library Wi-Fi connection is extremely slow and disconnects frequently in Room 204.',
    },
  },

  // 5. Phase 4: Teacher Panel Data
  teacherData: {
    lms: {
      batch: 'CS - Semester 1',
      materialName: 'React Lifecycle Cheatsheet',
      filePath: 'tests/assets/react_lifecycle.pdf',
      fileName: 'react_lifecycle.pdf',
    },
    grades: {
      score: 'A+',
    },
    projects: {
      hours: '15',
    },
    complaints: {
      category: 'Infrastructure',
      details: 'Air conditioning is not cooling properly in Class Hall 301.',
    },
  },

  // 6. Phase 5: Parent Panel Data
  parentData: {
    concerns: {
      description: 'Requesting an academic performance update for Alice in CS101, especially on assignment grades.',
    },
  },

  // 7. Phase 6: Security & Tenant Isolation Data
  securityData: {
    foreignCollegeStudentId: 'foreign_student_id_123', // ID belonging to another college tenant
    foreignCollegeCourseId: 'foreign_course_id_456',   // ID belonging to another college tenant
  },
};
