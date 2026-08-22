import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export const useProjects = () => {
  const queryClient = useQueryClient();

  const projectsQuery = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await api.get('/projects');
      return response.data || [];
    }
  });

  const timesheetsQuery = useQuery({
    queryKey: ['timesheets'],
    queryFn: async () => {
      const response = await api.get('/projects/timesheets');
      return response.data || [];
    }
  });

  const logHoursMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/projects/timesheets', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['timesheets']);
      toast.success('Hours logged successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to log hours');
    }
  });

  return {
    projects: projectsQuery.data || [],
    timesheets: timesheetsQuery.data || [],
    isLoading: projectsQuery.isLoading || timesheetsQuery.isLoading,
    logHours: logHoursMutation.mutateAsync,
  };
};
