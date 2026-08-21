import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useTransport = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['transport'],
    queryFn: async () => {
      const { data } = await api.get('/transport');
      return data.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newItem) => {
      const { data } = await api.post('/transport', newItem);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['transport']);
      toast.success('Transport item created successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create transport item');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/transport/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['transport']);
      toast.success('Transport item deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete transport item');
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
