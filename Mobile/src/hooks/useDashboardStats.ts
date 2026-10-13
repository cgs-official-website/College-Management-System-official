import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

export interface DashboardStats {
  totalColleges: number;
  totalStudents: number;
  totalTeachers: number;
  activeCourses: number;
  attendanceRate: number;
  recentActivity: any[];
  isLoading: boolean;
  isRefetching: boolean;
  refetch: () => Promise<void>;
}

export function useDashboardStats(_collegeId?: string | null, isSuperAdmin = false): DashboardStats {
  const [data, setData] = useState({ totalColleges: 0, totalStudents: 0, totalTeachers: 0, activeCourses: 0, attendanceRate: 0, recentActivity: [] as any[] });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);

  const load = useCallback(async (silent = false) => {
    silent ? setIsRefetching(true) : setIsLoading(true);
    try {
      const res = await api.get<any>('/dashboards/stats', isSuperAdmin ? { params: { isSuperAdmin: 'true' } } : {});
      const d = res?.data || {};
      setData({
        totalColleges: Number(d.totalColleges || 0),
        totalStudents: Number(d.totalStudents || 0),
        totalTeachers: Number(d.totalTeachers || 0),
        activeCourses: Number(d.activeCourses || 0),
        attendanceRate: Number(d.attendanceRate || 0),
        recentActivity: Array.isArray(d.recentActivity) ? d.recentActivity : [],
      });
    } catch {
      setData((prev) => prev);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, [isSuperAdmin]);

  useEffect(() => { load(); }, [load]);

  return { ...data, isLoading, isRefetching, refetch: () => load(true) };
}
