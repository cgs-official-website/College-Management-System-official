import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export const useInventory = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const response = await api.get('/inventory');
      return response.data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post('/inventory', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Inventory item created successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create inventory item');
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const response = await api.put(`/inventory/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Inventory item updated successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update inventory item');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/inventory/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Inventory item deleted successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete inventory item');
    }
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/inventory/bulk', { data });
      return response.data;
    },
    onSuccess: (res) => {
      const stats = res?.data || {};
      toast.success(`Imported ${stats.successful || 0} items successfully!`);
      if (stats.failed > 0) {
        toast.error(`${stats.failed} failed.`);
      }
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to bulk import inventory');
    }
  });

  return {
    items: query.data || [],
    isLoading: query.isLoading,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isImporting: bulkImportMutation.isPending,
    createItem: createMutation.mutateAsync,
    updateItem: updateMutation.mutateAsync,
    deleteItem: deleteMutation.mutateAsync,
    bulkImport: bulkImportMutation.mutateAsync,
  };
};
