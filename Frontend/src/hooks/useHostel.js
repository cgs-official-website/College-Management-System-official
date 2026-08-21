import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';

export const useHostel = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['hostel'],
    queryFn: async () => {
      const { data } = await api.get('/hostel');
      return data.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newItem) => {
      const { data } = await api.post('/hostel', newItem);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['hostel']);
      toast.success('Hostel item created successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create hostel item');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/hostel/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['hostel']);
      toast.success('Hostel item deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to delete hostel item');
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
