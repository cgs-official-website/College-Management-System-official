import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export function useAttendance(collegeId, _courseId, date) {
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [stats, setStats] = useState({
    totalMarked: 0,
    presentCount: 0,
    absentCount: 0,
    lateCount: 0,
    attendanceRate: '0%'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAttendance = useCallback(async () => {
    if (!collegeId || !date) return;

    setIsLoading(true);
    try {
      const response = await api.get(`/attendance/daily?date=${date}`);
      setAttendanceRecords(response.data || {});
      if (response.stats) {
        setStats(response.stats);
      }
    } catch (error) {
      console.error("Error fetching attendance:", error);
    } finally {
      setIsLoading(false);
    }
  }, [collegeId, date]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const markAttendance = async (studentId, status) => {
    if (!studentId || !date) return;

    setIsSaving(true);
    // Optimistic UI update
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: status
    }));

    try {
      await api.post('/attendance/mark', {
        studentId,
        date,
        status
      });
      toast.success(`Marked ${status}`, { duration: 1500 });
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error("Failed to save attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  const markAll = async (studentList, status = 'present') => {
    if (!studentList || studentList.length === 0 || !date) return;

    setIsSaving(true);
    const updated = { ...attendanceRecords };
    const recordsToPost = [];

    studentList.forEach(s => {
      updated[s.id] = status;
      recordsToPost.push({ studentId: s.id, status });
    });

    setAttendanceRecords(updated);

    try {
      await api.post('/attendance/batch-mark', {
        date,
        records: recordsToPost
      });
      toast.success(`Marked all ${studentList.length} students as ${status}!`);
    } catch (error) {
      console.error("Error batch saving attendance:", error);
      toast.error("Failed to batch save attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  return { 
    attendanceRecords, 
    stats,
    isLoading, 
    isSaving, 
    markAttendance,
    markAll,
    refetch: fetchAttendance 
  };
}
