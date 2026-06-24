import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export function useStaff(collegeId) {
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!collegeId) return;

    const q = query(
      collection(db, 'teachers'), 
      where('collegeId', '==', collegeId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      staffData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setStaff(staffData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching staff:", error);
      toast.error("Failed to load staff directory");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [collegeId]);

  const addStaff = async (data) => {
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'teachers'), {
        ...data,
        collegeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success("Staff member added successfully!");
    } catch (error) {
      console.error("Error adding staff:", error);
      toast.error("Failed to add staff member.");
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const updateStaff = async ({ id, data }) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'teachers', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      toast.success("Staff member updated successfully!");
    } catch (error) {
      console.error("Error updating staff:", error);
      toast.error("Failed to update staff member.");
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteStaff = async (id) => {
    try {
      await deleteDoc(doc(db, 'teachers', id));
      toast.success("Staff member removed.");
    } catch (error) {
      console.error("Error deleting staff:", error);
      toast.error("Failed to remove staff member.");
      throw error;
    }
  };

  return { staff, isLoading, isAdding, isUpdating, addStaff, updateStaff, deleteStaff };
}
