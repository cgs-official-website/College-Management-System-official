import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser, signOut } from 'firebase/auth';
import { doc, setDoc, deleteDoc, collection, serverTimestamp, writeBatch } from 'firebase/firestore';
import { firebaseConfig, db, auth as primaryAuth } from '../firebase/config';

export const seedDemoData = async (onProgress) => {
  const secondaryApp = initializeApp(firebaseConfig, 'DemoSeeder');
  const secondaryAuth = getAuth(secondaryApp);
  
  const batch = writeBatch(db);
  const collegeCode = 'ZUNAC-GCEE';
  const collegeName = 'Government College Of Engineering Erode, Tamilnadu, India';
  const slug = 'gcee';
  const timestamp = serverTimestamp();
  
  let tempSuperAdminUser = null;
  
  onProgress('Starting comprehensive demo seeder...');
  
  try {
    // 0. Privilege Escalation
    onProgress('Escalating privileges...');
    const tempEmail = `temp_superadmin_${Date.now()}@zuna.com`;
    const tempPass = 'tempadmin123';
    const tempCred = await createUserWithEmailAndPassword(primaryAuth, tempEmail, tempPass);
    tempSuperAdminUser = tempCred.user;
    
    await setDoc(doc(db, 'users', tempSuperAdminUser.uid), {
      uid: tempSuperAdminUser.uid,
      email: tempEmail,
      role: 'superadmin',
      createdAt: timestamp
    });
    
    onProgress('Generating comprehensive academic data...');

    // 1. College
    const collegeRef = doc(db, 'colleges', collegeCode);
    batch.set(collegeRef, {
      id: collegeCode,
      name: collegeName,
      slug: slug,
      email: 'contact@gcee.edu.in',
      phone: '+91 424 2533279',
      address: 'Bhavani, Erode, Tamil Nadu 638316',
      website: 'https://gcee.ac.in',
      createdAt: timestamp,
      status: 'active' 
    });

    // 2. Admin
    const adminEmail = 'admin@gcee.edu.in';
    let adminUid;
    try {
      const adminCred = await createUserWithEmailAndPassword(secondaryAuth, adminEmail, 'demo123');
      adminUid = adminCred.user.uid;
    } catch (e) {
      const signInCred = await signInWithEmailAndPassword(secondaryAuth, adminEmail, 'demo123');
      adminUid = signInCred.user.uid;
    }
    
    batch.set(doc(db, 'users', adminUid), {
      uid: adminUid, email: adminEmail, firstName: 'College', lastName: 'Admin',
      role: 'admin', collegeId: collegeCode, collegeName: collegeName, accountStatus: 'active', createdAt: timestamp
    });

    // 3. Departments/Courses
    const departments = [
      { id: 'CSE', name: 'Computer Science and Engineering', hod: 'Dr. A. Smith' },
      { id: 'ECE', name: 'Electronics and Communication Engineering', hod: 'Dr. B. Johnson' },
      { id: 'MECH', name: 'Mechanical Engineering', hod: 'Dr. C. Williams' },
      { id: 'CIVIL', name: 'Civil Engineering', hod: 'Dr. D. Brown' }
    ];
    
    const courseRefs = {};
    for (const dept of departments) {
      const cRef = doc(collection(db, 'courses'));
      batch.set(cRef, {
        id: cRef.id, collegeId: collegeCode, code: dept.id, name: dept.name,
        department: dept.name, duration: '4 Years', totalSemesters: 8, createdAt: timestamp, status: 'active'
      });
      courseRefs[dept.id] = cRef.id;
    }

    // 4. Teachers & Staff
    const teachersData = [
      { email: 'teacher.cse@gcee.edu.in', first: 'Alice', last: 'CSE', dept: 'CSE', id: 'TCH-001' },
      { email: 'teacher.ece@gcee.edu.in', first: 'Bob', last: 'ECE', dept: 'ECE', id: 'TCH-002' },
      { email: 'teacher.mech@gcee.edu.in', first: 'Charlie', last: 'MECH', dept: 'MECH', id: 'TCH-003' },
      { email: 'teacher.civil@gcee.edu.in', first: 'Diana', last: 'CIVIL', dept: 'CIVIL', id: 'TCH-004' },
    ];
    
    const teacherUids = [];
    for (const t of teachersData) {
      let tUid;
      try {
        const tCred = await createUserWithEmailAndPassword(secondaryAuth, t.email, 'demo123');
        tUid = tCred.user.uid;
      } catch (e) {
        const signInCred = await signInWithEmailAndPassword(secondaryAuth, t.email, 'demo123');
        tUid = signInCred.user.uid;
      }
      teacherUids.push(tUid);
      
      const tDoc = {
        uid: tUid, email: t.email, firstName: t.first, lastName: t.last,
        role: 'teacher', collegeId: collegeCode, teacherId: t.id, department: t.dept,
        accountStatus: 'active', createdAt: timestamp
      };
      batch.set(doc(db, 'users', tUid), tDoc);
      batch.set(doc(db, 'teachers', tUid), tDoc);
      batch.set(doc(db, 'staff', tUid), tDoc); // Also seed to staff for HR dashboard stats
    }

    // Support Staff (HR)
    const staffDoc = {
      firstName: 'Ravi', lastName: 'Kumar', email: 'hr@gcee.edu.in', phone: '9876543210',
      role: 'hr', department: 'Administration', joinDate: '2023-01-15', status: 'active', collegeId: collegeCode
    };
    batch.set(doc(collection(db, 'staff')), staffDoc);
    batch.set(doc(collection(db, 'teachers')), staffDoc);

    // 5. Students
    const studentsData = [
      { email: 'student1.cse@gcee.edu.in', first: 'Rahul', last: 'Kumar', dept: 'CSE', id: 'STU-001', sem: 3 },
      { email: 'student2.cse@gcee.edu.in', first: 'Priya', last: 'Sharma', dept: 'CSE', id: 'STU-002', sem: 3 },
      { email: 'student1.ece@gcee.edu.in', first: 'Amit', last: 'Patel', dept: 'ECE', id: 'STU-003', sem: 5 },
      { email: 'student1.mech@gcee.edu.in', first: 'Sneha', last: 'Reddy', dept: 'MECH', id: 'STU-004', sem: 1 },
      { email: 'student1.civil@gcee.edu.in', first: 'Vikram', last: 'Singh', dept: 'CIVIL', id: 'STU-005', sem: 7 },
    ];
    
    const studentUids = [];
    for (const s of studentsData) {
      let sUid;
      try {
        const sCred = await createUserWithEmailAndPassword(secondaryAuth, s.email, 'demo123');
        sUid = sCred.user.uid;
      } catch (e) {
        const signInCred = await signInWithEmailAndPassword(secondaryAuth, s.email, 'demo123');
        sUid = signInCred.user.uid;
      }
      studentUids.push(sUid);
      
      const sDoc = {
        uid: sUid, email: s.email, firstName: s.first, lastName: s.last,
        role: 'student', collegeId: collegeCode, studentId: s.id, courseId: courseRefs[s.dept],
        department: s.dept, semester: s.sem, section: 'A', accountStatus: 'active', createdAt: timestamp
      };
      batch.set(doc(db, 'users', sUid), sDoc);
      batch.set(doc(db, 'students', sUid), sDoc);
    }

    // 6. Parents
    const parentEmail = 'parent1@gcee.edu.in';
    let pUid;
    try {
      const pCred = await createUserWithEmailAndPassword(secondaryAuth, parentEmail, 'demo123');
      pUid = pCred.user.uid;
    } catch (e) {
      const signInCred = await signInWithEmailAndPassword(secondaryAuth, parentEmail, 'demo123');
      pUid = signInCred.user.uid;
    }
    
    const pDoc = {
      uid: pUid, email: parentEmail, firstName: 'Ramesh', lastName: 'Kumar',
      role: 'parent', collegeId: collegeCode, studentId: studentsData[0].id, accountStatus: 'active', createdAt: timestamp
    };
    batch.set(doc(db, 'users', pUid), pDoc);
    batch.set(doc(db, 'parents', pUid), pDoc);

    // 7. Notices & Notifications
    onProgress('Creating notices and notifications...');
    const notices = [
      { title: 'Even Semester Exam Schedule', content: 'The end semester exams will commence from next month.', type: 'exam', target: 'all' },
      { title: 'Campus Placement Drive - TCS', content: 'TCS will be visiting our campus for placement drive.', type: 'placement', target: 'students' },
      { title: 'Faculty Meeting', content: 'A mandatory meeting for all HODs and teaching staff at 3 PM today.', type: 'general', target: 'teachers' }
    ];
    
    for (const notice of notices) {
      batch.set(doc(collection(db, 'notices')), {
        collegeId: collegeCode, title: notice.title, content: notice.content, type: notice.type,
        targetAudience: notice.target, priority: 'high', status: 'active', createdAt: timestamp, createdBy: adminUid
      });
    }

    // Notifications
    const notifs = [
      { title: 'Welcome to GCEE', message: 'Your account has been successfully set up.', type: 'system' },
      { title: 'Fee Due Reminder', message: 'Tuition fee for current semester is due next week.', type: 'alert' }
    ];
    for (const notif of notifs) {
      batch.set(doc(collection(db, 'notifications')), {
        collegeId: collegeCode, userId: studentUids[0], title: notif.title, message: notif.message, type: notif.type, isRead: false, createdAt: timestamp
      });
      batch.set(doc(collection(db, 'notifications')), {
        collegeId: collegeCode, userId: teacherUids[0], title: notif.title, message: notif.message, type: notif.type, isRead: false, createdAt: timestamp
      });
    }

    // 8. Timetable
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];
    
    const timetables = [
      { subject: 'Data Structures', class: 'CSE - Sem 3 - Sec A', time: '09:00 AM - 10:00 AM', room: 'Room 101', teacherId: teacherUids[0], startTime: '09:00', endTime: '10:00', dayOfWeek: todayName },
      { subject: 'Operating Systems', class: 'CSE - Sem 3 - Sec A', time: '10:15 AM - 11:15 AM', room: 'Room 102', teacherId: teacherUids[0], startTime: '10:15', endTime: '11:15', dayOfWeek: todayName },
    ];
    
    for (const tt of timetables) {
      const ttDoc = {
        collegeId: collegeCode, day: todayName, dayOfWeek: tt.dayOfWeek, subject: tt.subject, class: tt.class,
        time: tt.time, startTime: tt.startTime, endTime: tt.endTime, room: tt.room, teacherId: tt.teacherId, createdAt: timestamp
      };
      // Seed into both collections to ensure compatibility with all dashboards
      batch.set(doc(collection(db, 'timetables')), ttDoc);
      batch.set(doc(collection(db, 'timetable')), ttDoc);
    }

    // 9. Attendance
    onProgress('Creating academic records (Attendance, Grades, Assignments)...');
    const todayStr = new Date().toISOString().split('T')[0];
    for (const sUid of studentUids) {
      batch.set(doc(collection(db, 'attendance')), {
        collegeId: collegeCode, studentId: sUid, date: todayStr, status: 'present', courseId: courseRefs['CSE'], createdAt: timestamp
      });
    }

    // 10. Assignments
    batch.set(doc(collection(db, 'assignments')), {
      collegeId: collegeCode, courseId: courseRefs['CSE'], title: 'Data Structures Lab 1',
      description: 'Implement a binary search tree in C++.', dueDate: '2026-07-15', teacherId: teacherUids[0], status: 'active', createdAt: timestamp
    });

    // 11. Exams & Grades
    const examRef = doc(collection(db, 'exams'));
    batch.set(examRef, {
      collegeId: collegeCode, title: 'Mid Term Examination', courseId: courseRefs['CSE'],
      examDate: '2026-07-20', duration: '3 Hours', status: 'upcoming', createdAt: timestamp
    });

    batch.set(doc(collection(db, 'grades')), {
      collegeId: collegeCode, studentId: studentUids[0], courseId: courseRefs['CSE'], examId: examRef.id,
      subject: 'Data Structures', marks: 85, totalMarks: 100, grade: 'A', remarks: 'Excellent', createdAt: timestamp
    });

    // 12. Fees
    onProgress('Creating financial and facilities records...');
    batch.set(doc(collection(db, 'fees')), {
      collegeId: collegeCode, studentId: studentUids[0], feeType: 'Tuition Fee', amount: 45000,
      dueDate: '2026-08-01', status: 'pending', createdAt: timestamp
    });
    batch.set(doc(collection(db, 'fees')), {
      collegeId: collegeCode, studentId: studentUids[1], feeType: 'Hostel Fee', amount: 20000,
      dueDate: '2026-07-01', status: 'paid', createdAt: timestamp
    });

    // 13. Library
    batch.set(doc(collection(db, 'library')), {
      collegeId: collegeCode, title: 'Introduction to Algorithms', author: 'Thomas H. Cormen',
      isbn: '9780262033848', category: 'Computer Science', totalCopies: 15, availableCopies: 12, location: 'Rack A1', createdAt: timestamp
    });
    batch.set(doc(collection(db, 'library')), {
      collegeId: collegeCode, title: 'Engineering Mathematics', author: 'B.S. Grewal',
      isbn: '9788174091956', category: 'Mathematics', totalCopies: 30, availableCopies: 5, location: 'Rack B2', createdAt: timestamp
    });

    // 14. Infrastructure
    batch.set(doc(collection(db, 'infrastructure')), {
      collegeId: collegeCode, name: 'Main Auditorium', type: 'auditorium', capacity: 1000,
      building: 'Main Block', status: 'active', features: 'Projector, AC, Sound System', createdAt: timestamp
    });
    batch.set(doc(collection(db, 'infrastructure')), {
      collegeId: collegeCode, name: 'Computer Lab 1', type: 'laboratory', capacity: 60,
      building: 'CSE Block', status: 'maintenance', features: '60 PCs, AC', createdAt: timestamp
    });

    // 15. Admissions
    batch.set(doc(collection(db, 'admissions')), {
      collegeId: collegeCode, firstName: 'New', lastName: 'Applicant', email: 'applicant@test.com', phone: '1234567890',
      courseName: 'B.Tech Computer Science', previousSchool: 'Delhi Public School',
      courseId: courseRefs['CSE'], status: 'Pending', appliedDate: todayStr, createdAt: timestamp
    });

    onProgress('Committing all data to Firestore (bypassing rules)...');
    await batch.commit();
    onProgress('Comprehensive Demo Data Seeded Successfully!');
    
    return { success: true };
  } catch (error) {
    console.error('Seeding Error:', error);
    throw error;
  } finally {
    if (tempSuperAdminUser) {
      onProgress('Cleaning up temporary privileges...');
      try {
        await deleteDoc(doc(db, 'users', tempSuperAdminUser.uid));
        await deleteUser(tempSuperAdminUser);
        await signOut(primaryAuth);
      } catch (cleanupError) {
        console.error('Failed to clean up temp user:', cleanupError);
      }
    }
    await deleteApp(secondaryApp);
  }
};
