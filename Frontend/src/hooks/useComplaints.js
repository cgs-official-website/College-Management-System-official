import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export const useComplaints = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['complaints'],
    queryFn: async () => {
      const response = await api.get('/complaints');
      return response.data || [];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newItem) => {
      const response = await api.post('/complaints', newItem);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['complaints']);
      toast.success('Complaints item created successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create complaints item');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/complaints/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['complaints']);
      toast.success('Complaints item deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete complaints item');
    }
  });

  return {
    items: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    createItem: createMutation.mutateAsync,
    deleteItem: deleteMutation.mutateAsync
  };
};
