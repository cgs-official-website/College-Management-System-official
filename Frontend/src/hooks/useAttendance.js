import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

export function useAttendance(collegeId, courseId, date) {
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!collegeId || !courseId || !date) return;

    setIsLoading(true);
    // document ID format: collegeId_courseId_date
    const recordId = `${collegeId}_${courseId}_${date}`;
    const docRef = doc(db, 'attendance', recordId);

    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        setAttendanceRecords(snapshot.data().records || {});
      } else {
        setAttendanceRecords({});
      }
      setIsLoading(false);
    }, (error) => {
      // If the document doesn't exist yet, Firestore rules will block the read due to missing collegeId
      // We can safely ignore this and assume empty attendance records
      if (error.code === 'permission-denied') {
        setAttendanceRecords({});
        setIsLoading(false);
        return;
      }
      
      console.error("Error fetching attendance:", error);
      toast.error("Failed to load attendance records.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [collegeId, courseId, date]);

  const markAttendance = async (studentId, status) => {
    if (!collegeId || !courseId || !date) {
      toast.error("Please select a course and date first.");
      return;
    }

    setIsSaving(true);
    const recordId = `${collegeId}_${courseId}_${date}`;
    const docRef = doc(db, 'attendance', recordId);

    try {
      // We use setDoc with merge: true to update specific student records 
      // without overwriting the entire document
      await setDoc(docRef, {
        collegeId,
        courseId,
        date,
        updatedAt: serverTimestamp(),
        records: {
          [studentId]: status // 'present', 'absent', or 'late'
        }
      }, { merge: true });
      
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error("Failed to save attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  return { attendanceRecords, isLoading, isSaving, markAttendance };
}
