import { 
  collection, 
  doc, 
// TODO: Migrate to REST API ->   getDocs, 
// TODO: Migrate to REST API ->   getDoc, 
// TODO: Migrate to REST API ->   updateDoc, 
  deleteDoc,
  query,
  where,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';


const COLLECTION_NAME = 'students';

export const getStudents = async (collegeId) => {
  if (!collegeId) return [];
// TODO: Migrate to REST API ->   const studentsRef = collection(db, COLLECTION_NAME);
// TODO: Migrate to REST API ->   const q = query(studentsRef, where("collegeId", "==", collegeId));
  
// TODO: Migrate to REST API ->   const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getStudentById = async (id) => {
// TODO: Migrate to REST API ->   const docRef = doc(db, COLLECTION_NAME, id);
// TODO: Migrate to REST API ->   const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  throw new Error("Student not found");
};

export const addStudent = async (studentData) => {
// TODO: Migrate to REST API ->   const counterRef = doc(db, 'counters', `students_${studentData.collegeId || 'default'}`);
  let newStudentId;
  
  await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let count = 1;
    if (counterDoc.exists()) {
      count = counterDoc.data().count + 1;
    }
    
    const year = new Date().getFullYear();
    const admissionNo = `ADM-${year}-${String(count).padStart(4, '0')}`;
    
    transaction.set(counterRef, { count }, { merge: true });
    
// TODO: Migrate to REST API ->     const newStudentRef = doc(collection(db, COLLECTION_NAME));
    newStudentId = newStudentRef.id;
    
    transaction.set(newStudentRef, {
      ...studentData,
      id: newStudentId,
      admissionNo,
      status: 'active',
      password: 'Student@123', // Default password for new students
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  });

  return newStudentId;
};

export const updateStudent = async (id, data) => {
// TODO: Migrate to REST API ->   const docRef = doc(db, COLLECTION_NAME, id);
// TODO: Migrate to REST API ->   await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
  return true;
};

export const deleteStudent = async (id) => {
// TODO: Migrate to REST API ->   const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
  return true;
};
