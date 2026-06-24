import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export function useExams(collegeId) {
  const [exams, setExams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!collegeId) return;

    const q = query(
      collection(db, 'exams'), 
      where('collegeId', '==', collegeId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const examData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      examData.sort((a, b) => new Date(a.examDate).getTime() - new Date(b.examDate).getTime());
      setExams(examData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching exams:", error);
      toast.error("Failed to load exams");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [collegeId]);

  const addExam = async (data) => {
    setIsAdding(true);
    try {
      await addDoc(collection(db, 'exams'), {
        ...data,
        collegeId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      toast.success("Exam scheduled successfully!");
    } catch (error) {
      console.error("Error adding exam:", error);
      toast.error("Failed to schedule exam.");
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const updateExam = async ({ id, data }) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'exams', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      toast.success("Exam updated successfully!");
    } catch (error) {
      console.error("Error updating exam:", error);
      toast.error("Failed to update exam.");
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteExam = async (id) => {
    try {
      await deleteDoc(doc(db, 'exams', id));
      toast.success("Exam deleted.");
    } catch (error) {
      console.error("Error deleting exam:", error);
      toast.error("Failed to delete exam.");
      throw error;
    }
  };

  return { exams, isLoading, isAdding, isUpdating, addExam, updateExam, deleteExam };
}
