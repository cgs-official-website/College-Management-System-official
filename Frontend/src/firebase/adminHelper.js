import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { firebaseConfig, db } from './config';

export const createAdminUser = async (adminData, collegeData) => {
  // We initialize a secondary app so that creating the new user
  // doesn't log out the currently authenticated SuperAdmin.
  const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
  const secondaryAuth = getAuth(secondaryApp);

  try {
    // 1. Create the user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      secondaryAuth, 
      adminData.email, 
      adminData.password
    );
    const user = userCredential.user;

    // 2. Generate the College Code (ZUNAC0001 increment)
    const counterRef = doc(db, 'counters', 'collegeCode');
    const collegeCode = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterRef);
      let newCount = 1;
      if (counterDoc.exists()) {
        newCount = counterDoc.data().lastCode + 1;
      }
      transaction.set(counterRef, { lastCode: newCount }, { merge: true });
      
      return `ZUNAC${String(newCount).padStart(4, '0')}`;
    });

    // 3. Create the College Document
    await setDoc(doc(db, 'colleges', collegeCode), {
      id: collegeCode,
      name: collegeData.name,
      email: collegeData.email,
      createdAt: serverTimestamp(),
      status: 'active'
    });

    // 4. Create the User Document for this Admin
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      name: adminData.name,
      role: 'admin',
      collegeId: collegeCode,
      createdAt: serverTimestamp()
    });

    return { success: true, collegeCode, uid: user.uid };
  } catch (error) {
    console.error("Error creating admin user:", error);
    throw error;
  } finally {
    // Clean up the secondary app to prevent memory leaks
    await deleteApp(secondaryApp);
  }
};
