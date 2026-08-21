import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export const usePlacements = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['placements'],
    queryFn: async () => {
      const response = await api.get('/placements');
      return response;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newItem) => {
      const response = await api.post('/placements', newItem);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placements'] });
      toast.success('Placement drive added successfully!');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to add placement drive');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/placements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['placements'] });
      toast.success('Placement drive removed.');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete placement drive');
    }
  });

  const rawData = query.data?.data || [];
  const stats = query.data?.stats || {
    totalDrives: rawData.length,
    studentsPlaced: 0,
    topCtc: '0 LPA'
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
