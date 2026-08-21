import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export const useTransport = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['transport'],
    queryFn: async () => {
      const response = await api.get('/transport');
      return response;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newItem) => {
      const response = await api.post('/transport', newItem);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport'] });
      toast.success('Transport route created successfully!');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create transport route');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/transport/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transport'] });
      toast.success('Transport route removed.');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete transport route');
    }
  });

  const rawData = query.data?.data || [];
  const stats = query.data?.stats || {
    totalBuses: rawData.length,
    activeRoutes: rawData.length,
    registeredStudents: 0,
    qrScansToday: 0
  };

  return {
    items: Array.isArray(rawData) ? rawData : [],
    stats,
    isLoading: query.isLoading,
    isError: query.isError,
    isAdding: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    createItem: createMutation.mutateAsync,
    deleteItem: deleteMutation.mutateAsync,
    refetch: query.refetch
  };
};
