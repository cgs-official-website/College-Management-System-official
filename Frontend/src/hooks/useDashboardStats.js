import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useDashboardStats(collegeId, isSuperAdmin = false) {
  const { data = {
    totalStudents: 0,
    totalTeachers: 0,
    activeCourses: 0,
    attendanceRate: 0,
    totalColleges: 0,
    moduleStats: {},
    roleInfo: { accessibleModules: [] },
    recentActivity: [],
  }, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboardStats', collegeId, isSuperAdmin],
    queryFn: async () => {
      const response = await api.get('/dashboards/stats', {
        params: { isSuperAdmin }
      });
      return response.data?.data || response.data;
    },
    enabled: !!(collegeId || isSuperAdmin),
    staleTime: 3 * 60 * 1000,
  });

  return {
    ...data,
    isLoading,
    error,
    refetch,
  };
}

export function useDashboardInsights(collegeId, enabled = true) {
  return useQuery({
    queryKey: ['dashboardInsights', collegeId],
    queryFn: async () => {
      const response = await api.get('/dashboards/insights');
      return response.data?.data || response.data;
    },
    enabled: !!collegeId && enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
