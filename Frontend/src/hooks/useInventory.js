import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export const useInventory = (filters = {}) => {
  const queryClient = useQueryClient();

  // -------------------------------------------------------------
  // 1. PRODUCTS QUERY & MUTATIONS
  // -------------------------------------------------------------
  const itemsQuery = useQuery({
    queryKey: ['inventory', 'items', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.includeArchived) params.append('includeArchived', 'true');
      const url = `/inventory${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get(url);
      return response.data;
    }
  });

  const createItemMutation = useMutation({
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

  const updateItemMutation = useMutation({
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

  const deleteItemMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/inventory/${id}`);
      return response.data;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      const msg = res?.data?.message || 'Inventory item removed successfully';
      toast.success(msg);
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

  // -------------------------------------------------------------
  // 2. CATEGORIES QUERY & MUTATIONS
  // -------------------------------------------------------------
  const categoriesQuery = useQuery({
    queryKey: ['inventory', 'categories'],
    queryFn: async () => {
      const response = await api.get('/inventory/categories');
      return response.data;
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post('/inventory/categories', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Category created successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create category');
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const response = await api.patch(`/inventory/categories/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Category updated successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update category');
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/inventory/categories/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success('Category deleted successfully');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete category');
    }
  });

  // -------------------------------------------------------------
  // 3. AUDIT LOGS & MOVEMENTS QUERY & MUTATIONS
  // -------------------------------------------------------------
  const auditLogsQuery = useQuery({
    queryKey: ['inventory', 'audit-logs', filters.auditLogs],
    queryFn: async () => {
      const params = new URLSearchParams();
      const auditFilters = filters.auditLogs || {};
      if (auditFilters.movementType) params.append('movementType', auditFilters.movementType);
      if (auditFilters.inventoryItemId) params.append('inventoryItemId', auditFilters.inventoryItemId);
      if (auditFilters.categoryId) params.append('categoryId', auditFilters.categoryId);
      if (auditFilters.search) params.append('search', auditFilters.search);
      if (auditFilters.startDate) params.append('startDate', auditFilters.startDate);
      if (auditFilters.endDate) params.append('endDate', auditFilters.endDate);

      const url = `/inventory/audit-logs${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get(url);
      return response.data;
    }
  });

  const recordMovementMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post('/inventory/movements', payload);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      toast.success(
        `${variables.movementType === 'INBOUND' ? 'Inbound stock added' : 'Outbound stock issued'} successfully!`
      );
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to record stock movement');
    }
  });

  return {
    // Products
    items: itemsQuery.data || [],
    isLoading: itemsQuery.isLoading,
    isCreating: createItemMutation.isPending,
    isUpdating: updateItemMutation.isPending,
    isDeleting: deleteItemMutation.isPending,
    isImporting: bulkImportMutation.isPending,
    createItem: createItemMutation.mutateAsync,
    updateItem: updateItemMutation.mutateAsync,
    deleteItem: deleteItemMutation.mutateAsync,
    bulkImport: bulkImportMutation.mutateAsync,

    // Categories
    categories: categoriesQuery.data || [],
    isCategoriesLoading: categoriesQuery.isLoading,
    isCreatingCategory: createCategoryMutation.isPending,
    isUpdatingCategory: updateCategoryMutation.isPending,
    isDeletingCategory: deleteCategoryMutation.isPending,
    createCategory: createCategoryMutation.mutateAsync,
    updateCategory: updateCategoryMutation.mutateAsync,
    deleteCategory: deleteCategoryMutation.mutateAsync,

    // Audit Logs & Movements
    auditLogs: auditLogsQuery.data || [],
    isAuditLogsLoading: auditLogsQuery.isLoading,
    isRecordingMovement: recordMovementMutation.isPending,
    recordMovement: recordMovementMutation.mutateAsync,
  };
};
