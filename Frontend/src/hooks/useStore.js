import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useStore = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['store'],
    queryFn: async () => {
      const { data } = await api.get('/store');
      return data.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newItem) => {
      const { data } = await api.post('/store', newItem);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['store']);
      toast.success('Store item created successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create store item');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/store/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['store']);
      toast.success('Store item deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete store item');
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
