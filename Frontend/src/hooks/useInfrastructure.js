import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export function useInfrastructure(collegeId) {
  const [facilities, setFacilities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!collegeId) return;

    const q = query(
      collection(db, 'infrastructure'), 
      where('collegeId', '==', collegeId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const facilityData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      facilityData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setFacilities(facilityData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching infrastructure:", error);
      toast.error("Failed to load facilities");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [collegeId]);

  const addFacility = async (data) => {
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'infrastructure'), {
        ...data,
        collegeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success("Facility added successfully!");
    } catch (error) {
      console.error("Error adding facility:", error);
      toast.error("Failed to add facility.");
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const updateFacility = async ({ id, data }) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'infrastructure', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      toast.success("Facility updated successfully!");
    } catch (error) {
      console.error("Error updating facility:", error);
      toast.error("Failed to update facility.");
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteFacility = async (id) => {
    try {
      await deleteDoc(doc(db, 'infrastructure', id));
      toast.success("Facility removed.");
    } catch (error) {
      console.error("Error deleting facility:", error);
      toast.error("Failed to remove facility.");
      throw error;
    }
  };

  return { facilities, isLoading, isAdding, isUpdating, addFacility, updateFacility, deleteFacility };
}
