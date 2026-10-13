import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';

function useAction<A, R>(fn: (args: A) => Promise<R>) {
  const [isPending, setIsPending] = useState(false);
  const ref = useRef(fn); ref.current = fn;
  const mutateAsync = useCallback(async (args: A) => {
    setIsPending(true);
    try { return await ref.current(args); } finally { setIsPending(false); }
  }, []);
  return { isPending, mutateAsync };
}

export const useAttendance = (collegeId?: string | null, courseId?: string | null, date?: string) => {
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string,string>>({});
  const [stats, setStats] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!collegeId || !date) { setAttendanceRecords({}); setIsLoading(false); return; }
    try {
      const url = courseId ? `/attendance/class/${courseId}/date/${date}` : `/attendance/daily/${date}`;
      const res = await api.get<any>(url);
      setAttendanceRecords(res?.data || {});
      setStats(res?.stats || {});
    } finally { setIsLoading(false); }
  }, [collegeId, courseId, date]);

  useEffect(() => { setIsLoading(true); load(); }, [load]);

  const markAttendance = useAction<any, any>(async (data) => {
    const res = await api.post<any>('/attendance/mark', data);
    await load(); return res?.data;
  });
  const markAll = useAction<any, any>(async (data) => {
    const res = await api.post<any>('/attendance/batch-mark', data);
    await load();
    toast.success(`Attendance saved for ${data.records?.length || 0} students`);
    return res?.data;
  });

  return {
    attendanceRecords, stats, isLoading, isSaving: markAttendance.isPending || markAll.isPending,
    refetch: load, markAttendance: markAttendance.mutateAsync, markAll: markAll.mutateAsync,
  };
};
