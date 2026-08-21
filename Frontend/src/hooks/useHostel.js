import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export const useHostel = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['hostel'],
    queryFn: async () => {
      const response = await api.get('/hostel');
      return response;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newItem) => {
      const response = await api.post('/hostel', newItem);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel'] });
      toast.success('Hostel block created successfully!');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create hostel block');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/hostel/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel'] });
      toast.success('Hostel block removed.');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete hostel block');
    }
  });

  const rawData = query.data?.data || [];
  const stats = query.data?.stats || {
    totalBlocks: rawData.length,
    totalCapacity: 0,
    occupiedBeds: 0,
    occupancyRate: '0%'
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
