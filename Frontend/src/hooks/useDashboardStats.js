import { useState, useEffect } from 'react';
import { api } from '../services/api';

export function useDashboardStats(collegeId, isSuperAdmin = false) {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    activeCourses: 0,
    attendanceRate: 0,
    totalColleges: 0,
    isLoading: true
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!collegeId && !isSuperAdmin) return;

        const response = await api.get('/dashboards/stats', {
          params: { isSuperAdmin }
        });

        setStats({
          ...response.data,
          isLoading: false
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        setStats(s => ({ ...s, isLoading: false }));
      }
    };

    fetchStats();
  }, [collegeId, isSuperAdmin]);

  return stats;
}
