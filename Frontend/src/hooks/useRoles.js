import { useQuery } from '@tanstack/react-query';
import { api } from '../services/apiClient';

export function useRoles() {
  const { data: response = {}, isLoading, error, refetch } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/roles'),
    staleTime: 0,
  });

  const roles = Array.isArray(response?.data)
    ? response.data
    : (Array.isArray(response) ? response : []);

  return {
    roles,
    isLoading,
    error,
    refetch,
  };
}
