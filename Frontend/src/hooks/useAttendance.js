import { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function useAttendance(collegeId, courseId, date) {
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!collegeId || !courseId || !date) {
      setAttendanceRecords({});
      return;
    }

    const fetchAttendance = async () => {
      setIsLoading(true);
      try {
        const response = await api.get(`/attendance/class/${courseId}/date/${date}`);
        setAttendanceRecords(response.data || {});
      } catch (error) {
        console.error("Error fetching attendance:", error);
        toast.error("Failed to load attendance records.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendance();
  }, [collegeId, courseId, date]);

  const markAttendance = async (studentId, status) => {
    if (!collegeId || !courseId || !date) {
      toast.error("Please select a course and date first.");
      return;
    }

    setIsSaving(true);
    
    // Optimistic UI update
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: status
    }));

    try {
      await api.post('/attendance/mark', {
        studentId,
        courseId,
        date,
        status
      });
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error("Failed to save attendance.");
      // Rollback logic could be added here
    } finally {
      setIsSaving(false);
    }
  };

  return { attendanceRecords, isLoading, isSaving, markAttendance };
}
