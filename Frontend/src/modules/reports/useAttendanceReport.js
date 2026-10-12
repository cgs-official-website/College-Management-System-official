import { useQuery } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';

export const useAttendanceReport = (params) => {
  return useQuery({
    queryKey: ['attendanceReport', params],
    queryFn: async () => {
      const response = await apiClient.get('/reports/attendance', { params });
      return response;
    },
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });
};
