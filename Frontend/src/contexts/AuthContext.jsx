import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, runTransaction } from 'firebase/firestore';
import { auth, db } from '../firebase/config';

import { FullPageSkeleton } from '../components/ui/FullPageSkeleton';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function login(email, password) {
    return await signInWithEmailAndPassword(auth, email, password);
  }

  async function register(email, password, additionalData) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    let collegeIdToUse = additionalData.collegeId;
    let collegeSlugToUse = null;

    if (additionalData.role === 'admin') {
      const counterRef = doc(db, 'counters', 'collegeCode');
      
      collegeIdToUse = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let newCount = 1;
        if (counterDoc.exists()) {
          newCount = counterDoc.data().lastCode + 1;
        }
        transaction.set(counterRef, { lastCode: newCount }, { merge: true });
        
        return `ZUNAC${String(newCount).padStart(4, '0')}`;
      });

      const newCollegeRef = doc(db, 'colleges', collegeIdToUse);
      
      collegeSlugToUse = additionalData.collegeName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

      await setDoc(newCollegeRef, {
        id: collegeIdToUse,
        name: additionalData.collegeName,
        slug: collegeSlugToUse,
        aicteNumber: additionalData.aicteNumber || '',
        ugcRecognition: additionalData.ugcRecognition || '',
        affiliationCode: additionalData.affiliationCode || '',
        logoBase64: additionalData.logoBase64 || '',
        status: 'pending',
        adminUid: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Remove these so they don't pollute the user document
      delete additionalData.collegeName;
      delete additionalData.aicteNumber;
      delete additionalData.ugcRecognition;
      delete additionalData.affiliationCode;
      delete additionalData.logoBase64;
    }
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      ...additionalData,
      collegeId: collegeIdToUse,
      ...(collegeSlugToUse && { collegeSlug: collegeSlugToUse }),
      accountStatus: additionalData.role === 'admin' ? 'pending' : 'active',
      createdAt: serverTimestamp()
    });

    // We might also want to create a specific record in students or teachers collection
    if (additionalData.role === 'student') {
      await setDoc(doc(db, 'students', user.uid), {
        userId: user.uid,
        collegeId: collegeIdToUse,
        name: additionalData.name,
        email: user.email,
        createdAt: serverTimestamp()
      });
    } else if (additionalData.role === 'teacher') {
      await setDoc(doc(db, 'teachers', user.uid), {
        userId: user.uid,
        collegeId: collegeIdToUse,
        teacherId: additionalData.teacherId,
        name: additionalData.name,
        email: user.email,
        createdAt: serverTimestamp()
      });
    } else if (additionalData.role === 'parent') {
      await setDoc(doc(db, 'parents', user.uid), {
        userId: user.uid,
        collegeId: collegeIdToUse,
        studentId: additionalData.studentId,
        name: additionalData.name,
        email: user.email,
        createdAt: serverTimestamp()
      });
    }

    return userCredential;
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  const updateUserData = (newData) => {
    setUserData(prev => ({ ...prev, ...newData }));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch user role from Firestore
        try {
          console.log("Fetching role for UID:", user.uid);
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            console.log("User doc found! Role is:", userDoc.data().role);
            let fetchedUserData = userDoc.data();
            const role = fetchedUserData.role;
            
            // Fetch role-specific details to ensure synced data (like name, course, etc.)
            if (['student', 'teacher', 'parent'].includes(role)) {
              const collectionName = role + 's';
              try {
                const roleDoc = await getDoc(doc(db, collectionName, user.uid));
                if (roleDoc.exists()) {
                  console.log(`Role-specific details found in ${collectionName}`);
                  fetchedUserData = { ...fetchedUserData, ...roleDoc.data() };
                }
              } catch (e) {
                console.error("Error fetching role specific data:", e);
              }
            }
            
            // If user belongs to a college, fetch the college data
            if (fetchedUserData.collegeId) {
              console.log("Fetching college details for collegeId:", fetchedUserData.collegeId);
              try {
                // Add safety timeout to prevent hanging
                const collegeDoc = await Promise.race([
                  getDoc(doc(db, 'colleges', fetchedUserData.collegeId)),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout fetching college')), 5000))
                ]);
                
                if (collegeDoc.exists()) {
                  console.log("College details found!");
                  fetchedUserData = {
                    ...fetchedUserData,
                    collegeName: collegeDoc.data().name || collegeDoc.data().collegeName,
                    collegeLogo: collegeDoc.data().logoBase64
                  };
                } else {
                  console.log("College details not found in database.");
                }
              } catch (e) {
                console.error("Error fetching college details:", e);
              }
            } else {
              console.log("No collegeId present in user data.");
            }

            console.log("Setting user data and role");
            setUserRole(fetchedUserData.role);
            setUserData(fetchedUserData);
          } else {
            console.warn("User doc NOT found in Firestore for UID:", user.uid);
            setUserRole(null);
            setUserData(null);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole(null);
          setUserData(null);
        }
      } else {
        console.log("No authenticated user.");
        setUserRole(null);
        setUserData(null);
      }
      
      console.log("Setting loading to false");
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (userRole === 'superadmin') {
      document.title = "Zuna | College Management System";
    } else if (userData?.collegeName) {
      document.title = userData.collegeName;
    } else {
      document.title = "Zuna | College Management System";
    }
  }, [userData, userRole]);

  const value = {
    currentUser,
    userData,
    userRole,
    loading,
    login,
    register,
    logout,
    resetPassword,
    updateUserData
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <FullPageSkeleton /> : children}
    </AuthContext.Provider>
  );
}
