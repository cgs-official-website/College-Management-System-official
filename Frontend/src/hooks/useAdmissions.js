import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export function useAdmissions(collegeId) {
  const [admissions, setAdmissions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!collegeId) return;

    const q = query(
      collection(db, 'admissions'), 
      where('collegeId', '==', collegeId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setAdmissions(data);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching admissions:", error);
      toast.error("Failed to load admissions data");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [collegeId]);

  const addAdmission = async (data) => {
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'admissions'), {
        ...data,
        collegeId,
        status: data.status || 'Pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success("Application added to pipeline!");
    } catch (error) {
      console.error("Error adding admission:", error);
      toast.error("Failed to add application.");
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const updateAdmission = async ({ id, data }) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'admissions', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      toast.success("Application status updated!");
    } catch (error) {
      console.error("Error updating admission:", error);
      toast.error("Failed to update application.");
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteAdmission = async (id) => {
    try {
      await deleteDoc(doc(db, 'admissions', id));
      toast.success("Application record removed.");
    } catch (error) {
      console.error("Error deleting admission:", error);
      toast.error("Failed to remove record.");
      throw error;
    }
  };

  return { admissions, isLoading, isAdding, isUpdating, addAdmission, updateAdmission, deleteAdmission };
}
