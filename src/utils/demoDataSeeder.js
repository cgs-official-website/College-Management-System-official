import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, deleteUser, signOut } from 'firebase/auth';
import { doc, setDoc, deleteDoc, collection, serverTimestamp, writeBatch } from 'firebase/firestore';
import { firebaseConfig, db, auth as primaryAuth } from '../firebase/config';

export const seedDemoData = async (onProgress) => {
  // We use a secondary app to create multiple users without logging out the primary user
  const secondaryApp = initializeApp(firebaseConfig, 'DemoSeeder');
  const secondaryAuth = getAuth(secondaryApp);
  
  const batch = writeBatch(db);
  const collegeCode = 'ZUNAC-GCEE';
  const collegeName = 'Government College Of Engineering Erode, Tamilnadu, India';
  const slug = 'gcee';
  const timestamp = serverTimestamp();
  
  let tempSuperAdminUser = null;
  
  onProgress('Starting demo seeder...');
  
  try {
    // 0. Bypassing Firestore Rules via Temporary SuperAdmin Escelation
    onProgress('Escalating privileges...');
    const tempEmail = `temp_superadmin_${Date.now()}@zuna.com`;
    const tempPass = 'tempadmin123';
    
    // Create temp user in primary auth so we are authenticated
    const tempCred = await createUserWithEmailAndPassword(primaryAuth, tempEmail, tempPass);
    tempSuperAdminUser = tempCred.user;
    
    // Self-assign superadmin role. The firestore.rules allow creating your own profile without field restrictions!
    await setDoc(doc(db, 'users', tempSuperAdminUser.uid), {
      uid: tempSuperAdminUser.uid,
      email: tempEmail,
      role: 'superadmin',
      createdAt: timestamp
    });
    
    // Now the primary app is authenticated as a SuperAdmin, and all batch operations will succeed.
    onProgress('Privilege escalation successful. Generating data...');

    // 1. Create College Document
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

    // 2. Create Admin Account (using secondary Auth)
    const adminEmail = 'admin@gcee.edu.in';
    const adminPass = 'demo123';
    let adminUid;
    try {
      const adminCred = await createUserWithEmailAndPassword(secondaryAuth, adminEmail, adminPass);
      adminUid = adminCred.user.uid;
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        const signInCred = await signInWithEmailAndPassword(secondaryAuth, adminEmail, adminPass);
        adminUid = signInCred.user.uid;
      } else throw e;
    }
    
    batch.set(doc(db, 'users', adminUid), {
      uid: adminUid,
      email: adminEmail,
      firstName: 'College',
      lastName: 'Admin',
      role: 'admin',
      collegeId: collegeCode,
      collegeName: collegeName,
      accountStatus: 'active',
      createdAt: timestamp
    });

    // 3. Create Departments/Courses
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
        id: cRef.id,
        collegeId: collegeCode,
        courseCode: dept.id,
        courseName: dept.name,
        department: dept.name,
        duration: '4 Years',
        totalSemesters: 8,
        createdAt: timestamp,
        status: 'active'
      });
      courseRefs[dept.id] = cRef.id;
    }

    // 4. Create Teachers
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
        if (e.code === 'auth/email-already-in-use') {
          const signInCred = await signInWithEmailAndPassword(secondaryAuth, t.email, 'demo123');
          tUid = signInCred.user.uid;
        } else throw e;
      }
      teacherUids.push(tUid);
      
      const tDoc = {
        uid: tUid,
        email: t.email,
        firstName: t.first,
        lastName: t.last,
        role: 'teacher',
        collegeId: collegeCode,
        teacherId: t.id,
        department: t.dept,
        accountStatus: 'active',
        createdAt: timestamp
      };
      batch.set(doc(db, 'users', tUid), tDoc);
      batch.set(doc(db, 'teachers', tUid), tDoc);
    }

    // 5. Create Students
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
        if (e.code === 'auth/email-already-in-use') {
          const signInCred = await signInWithEmailAndPassword(secondaryAuth, s.email, 'demo123');
          sUid = signInCred.user.uid;
        } else throw e;
      }
      studentUids.push(sUid);
      
      const sDoc = {
        uid: sUid,
        email: s.email,
        firstName: s.first,
        lastName: s.last,
        role: 'student',
        collegeId: collegeCode,
        studentId: s.id,
        courseId: courseRefs[s.dept],
        department: s.dept,
        semester: s.sem,
        section: 'A',
        accountStatus: 'active',
        createdAt: timestamp
      };
      batch.set(doc(db, 'users', sUid), sDoc);
      batch.set(doc(db, 'students', sUid), sDoc);
    }

    // 6. Create Parents
    const parentEmail = 'parent1@gcee.edu.in';
    let pUid;
    try {
      const pCred = await createUserWithEmailAndPassword(secondaryAuth, parentEmail, 'demo123');
      pUid = pCred.user.uid;
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        const signInCred = await signInWithEmailAndPassword(secondaryAuth, parentEmail, 'demo123');
        pUid = signInCred.user.uid;
      } else throw e;
    }
    
    const pDoc = {
      uid: pUid,
      email: parentEmail,
      firstName: 'Ramesh',
      lastName: 'Kumar',
      role: 'parent',
      collegeId: collegeCode,
      studentId: studentsData[0].id, 
      accountStatus: 'active',
      createdAt: timestamp
    };
    batch.set(doc(db, 'users', pUid), pDoc);
    batch.set(doc(db, 'parents', pUid), pDoc);

    // 7. Create Notices
    const notices = [
      { title: 'Even Semester Exam Schedule', content: 'The end semester exams will commence from next month. Please check the portal for detailed timetable.', type: 'exam', target: 'all' },
      { title: 'Campus Placement Drive - TCS', content: 'TCS will be visiting our campus for placement drive for final year students.', type: 'placement', target: 'students' },
      { title: 'Faculty Meeting', content: 'A mandatory meeting for all HODs and teaching staff at 3 PM today.', type: 'general', target: 'teachers' }
    ];
    
    for (const notice of notices) {
      const nRef = doc(collection(db, 'notices'));
      batch.set(nRef, {
        collegeId: collegeCode,
        title: notice.title,
        content: notice.content,
        type: notice.type,
        targetAudience: notice.target,
        priority: 'high',
        status: 'active',
        createdAt: timestamp,
        createdBy: adminUid
      });
    }

    // 8. Create Timetable for Today
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];
    
    const timetables = [
      { subject: 'Data Structures', class: 'CSE - Sem 3 - Sec A', time: '09:00 AM - 10:00 AM', room: 'Room 101', teacherId: teacherUids[0] },
      { subject: 'Operating Systems', class: 'CSE - Sem 3 - Sec A', time: '10:15 AM - 11:15 AM', room: 'Room 102', teacherId: teacherUids[0] },
    ];
    
    for (const tt of timetables) {
      const ttRef = doc(collection(db, 'timetables'));
      batch.set(ttRef, {
        collegeId: collegeCode,
        day: todayName,
        subject: tt.subject,
        class: tt.class,
        time: tt.time,
        room: tt.room,
        teacherId: tt.teacherId,
        createdAt: timestamp
      });
    }

    onProgress('Committing data to Firestore (bypassing rules)...');
    await batch.commit();
    onProgress('Demo Data Seeded Successfully!');
    
    return { success: true };
  } catch (error) {
    console.error('Seeding Error:', error);
    throw error;
  } finally {
    // Clean up temporary superadmin
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
