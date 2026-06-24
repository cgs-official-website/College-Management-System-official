import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export function useNotices(collegeId) {
  const [notices, setNotices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!collegeId) return;

    const q = query(
      collection(db, 'notices'), 
      where('collegeId', '==', collegeId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const noticeData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      noticeData.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setNotices(noticeData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching notices:", error);
      toast.error("Failed to load notices");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [collegeId]);

  const addNotice = async (data) => {
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'notices'), {
        ...data,
        collegeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success("Notice published successfully!");
    } catch (error) {
      console.error("Error adding notice:", error);
      toast.error("Failed to publish notice.");
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const updateNotice = async ({ id, data }) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'notices', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      toast.success("Notice updated successfully!");
    } catch (error) {
      console.error("Error updating notice:", error);
      toast.error("Failed to update notice.");
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteNotice = async (id) => {
    try {
      await deleteDoc(doc(db, 'notices', id));
      toast.success("Notice removed.");
    } catch (error) {
      console.error("Error deleting notice:", error);
      toast.error("Failed to remove notice.");
      throw error;
    }
  };

  return { notices, isLoading, isAdding, isUpdating, addNotice, updateNotice, deleteNotice };
}
