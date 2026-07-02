import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

export function useTimetable(collegeId) {
  const { userData } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (!collegeId) return;

    const q = query(
      collection(db, 'timetable'), 
      where('collegeId', '==', collegeId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const scheduleData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      scheduleData.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
      setSchedules(scheduleData);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching timetable:", error);
      toast.error("Failed to load timetable");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [collegeId]);

  const addSchedule = async (data) => {
    setIsAdding(true);
    try {
      const isHod = userData?.role === 'hod';
      const status = isHod ? 'pending' : 'approved';
      
      const newDocRef = await addDoc(collection(db, 'timetable'), {
        ...data,
        collegeId,
        status,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      if (isHod) {
        // Send notification to admin
        await addDoc(collection(db, 'notifications'), {
          collegeId,
          type: 'alert',
          title: 'Timetable Approval Required',
          message: `HOD ${userData.firstName || 'User'} has submitted a new timetable for ${data.subject} for approval.`,
          readBy: [],
          targetRole: 'admin',
          relatedId: newDocRef.id,
          createdAt: serverTimestamp()
        });
        toast.success("Class scheduled and sent to admin for approval!");
      } else {
        toast.success("Class scheduled successfully!");
      }
    } catch (error) {
      console.error("Error adding schedule:", error);
      toast.error("Failed to schedule class.");
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const updateSchedule = async ({ id, data }) => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'timetable', id), {
        ...data,
        updatedAt: serverTimestamp()
      });
      toast.success("Class schedule updated successfully!");
    } catch (error) {
      console.error("Error updating schedule:", error);
      toast.error("Failed to update schedule.");
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteSchedule = async (id) => {
    try {
      await deleteDoc(doc(db, 'timetable', id));
      toast.success("Schedule deleted.");
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast.error("Failed to delete schedule.");
      throw error;
    }
  };

  return { schedules, isLoading, isAdding, isUpdating, addSchedule, updateSchedule, deleteSchedule };
}
