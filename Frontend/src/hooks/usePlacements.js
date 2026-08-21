import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

export const usePlacements = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['placements'],
    queryFn: async () => {
      const { data } = await api.get('/placements');
      return data.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newItem) => {
      const { data } = await api.post('/placements', newItem);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['placements']);
      toast.success('Placements item created successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create placements item');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/placements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['placements']);
      toast.success('Placements item deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete placements item');
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
