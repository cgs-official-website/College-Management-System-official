import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export function useDashboardStats(collegeId, isSuperAdmin = false) {
  const { data = {
    totalStudents: 0,
    totalTeachers: 0,
    activeCourses: 0,
    attendanceRate: 0,
    totalColleges: 0,
  }, isLoading, error } = useQuery({
    queryKey: ['dashboardStats', collegeId, isSuperAdmin],
    queryFn: async () => {
      const response = await api.get('/dashboards/stats', {
        params: { isSuperAdmin }
      });
      return response.data?.data || response.data;
    },
    enabled: !!(collegeId || isSuperAdmin),
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...data,
    isLoading,
    error
  };
}
