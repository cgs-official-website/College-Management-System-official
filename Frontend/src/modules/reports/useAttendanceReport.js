import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';

export const useAttendanceReport = (params) => {
  return useQuery({
    queryKey: ['attendanceReport', params],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/reports/attendance', { params });
      return data;
    },
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });
};
