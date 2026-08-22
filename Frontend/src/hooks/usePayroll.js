import { useQuery } from '@tanstack/react-query';
import { api } from '../services/apiClient';

export const usePayroll = () => {
  const query = useQuery({
    queryKey: ['payroll'],
    queryFn: async () => {
      const response = await api.get('/payroll');
      return response.data || [];
    }
  });

  return {
    records: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
  };
};
