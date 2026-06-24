import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export function useFees(collegeId) {
  const [fees, setFees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!collegeId) return;

    const q = query(
      collection(db, 'fees'), 
      where('collegeId', '==', collegeId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const feesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      feesData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setFees(feesData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching fees:", error);
      toast.error("Failed to load fee records");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [collegeId]);

  const addFee = async (data) => {
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'fees'), {
        ...data,
        collegeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success("Fee record created successfully!");
    } catch (error) {
      console.error("Error adding fee:", error);
      toast.error("Failed to record fee.");
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const updateFee = async ({ id, data }) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'fees', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      toast.success("Fee record updated successfully!");
    } catch (error) {
      console.error("Error updating fee:", error);
      toast.error("Failed to update fee record.");
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteFee = async (id) => {
    try {
      await deleteDoc(doc(db, 'fees', id));
      toast.success("Fee record deleted.");
    } catch (error) {
      console.error("Error deleting fee:", error);
      toast.error("Failed to delete fee record.");
      throw error;
    }
  };

  return { fees, isLoading, isAdding, isUpdating, addFee, updateFee, deleteFee };
}
