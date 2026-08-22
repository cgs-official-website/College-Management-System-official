import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export function useColleges() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['colleges'],
    queryFn: async () => {
      const response = await api.get('/colleges');
      // response is { data: [...] } due to apiClient interceptor
      return response;
    },
    staleTime: 5 * 60 * 1000,
  });

  const onboardCollege = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/colleges/onboard', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colleges'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });

  const updateCollegeStatus = useMutation({
    mutationFn: async ({ id, status }) => {
      const response = await api.put(`/colleges/${id}/status`, { status });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colleges'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });

  const deleteCollege = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/colleges/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colleges'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });

  return {
    ...query,
    colleges: query.data?.data || [],
    onboardCollege,
    updateCollegeStatus,
    deleteCollege,
  };
}
