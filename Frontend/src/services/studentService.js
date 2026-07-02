import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  serverTimestamp,
  runTransaction
} from 'firebase/firestore';
import { db } from '../firebase/config';

const COLLECTION_NAME = 'students';

export const getStudents = async (collegeId) => {
  if (!collegeId) return [];
  const studentsRef = collection(db, COLLECTION_NAME);
  const q = query(studentsRef, where("collegeId", "==", collegeId));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getStudentById = async (id) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() };
  }
  throw new Error("Student not found");
};

export const addStudent = async (studentData) => {
  const counterRef = doc(db, 'counters', `students_${studentData.collegeId || 'default'}`);
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
    
    const newStudentRef = doc(collection(db, COLLECTION_NAME));
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
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp()
  });
  return true;
};

export const deleteStudent = async (id) => {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
  return true;
};
