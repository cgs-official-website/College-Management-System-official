import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export const useStore = () => {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['store'] });

  const itemsQuery = useQuery({
    queryKey: ['store', 'items'],
    queryFn: async () => (await api.get('/store?status=all')).data,
  });

  const uploadImageMutation = useMutation({
    mutationFn: async (file) => {
      const form = new FormData();
      form.append('image', file);
      const res = await api.post('/store/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data; 
    },
    onError: (err) => toast.error(err.message || 'Image upload failed'),
  });

  const createItemMutation = useMutation({
    mutationFn: async (payload) => (await api.post('/store', payload)).data,
    onSuccess: () => { refresh(); toast.success('Item created'); },
    onError: (err) => toast.error(err.message || 'Failed to create item'),
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => (await api.patch(`/store/${id}`, payload)).data,
    onSuccess: () => { refresh(); toast.success('Item updated'); },
    onError: (err) => toast.error(err.message || 'Failed to update item'),
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id) => (await api.delete(`/store/${id}`)).data,
    onSuccess: (data) => { refresh(); toast.success(data?.message || 'Item removed'); },
    onError: (err) => toast.error(err.message || 'Failed to delete item'),
  });

    const categoriesQuery = useQuery({
    queryKey: ['store', 'categories'],
    queryFn: async () => (await api.get('/store/categories')).data,
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (payload) => (await api.post('/store/categories', payload)).data,
    onSuccess: () => { refresh(); toast.success('Category created'); },
    onError: (err) => toast.error(err.message || 'Failed to create category'),
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => (await api.patch(`/store/categories/${id}`, payload)).data,
    onSuccess: () => { refresh(); toast.success('Category updated'); },
    onError: (err) => toast.error(err.message || 'Failed to update category'),
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id) => (await api.delete(`/store/categories/${id}`)).data,
    onSuccess: () => { refresh(); toast.success('Category deleted'); },
    onError: (err) => toast.error(err.message || 'Failed to delete category'),
  });

    const restockMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => (await api.post(`/store/${id}/restock`, payload)).data,
    onSuccess: () => { refresh(); toast.success('Stock added'); },
    onError: (err) => toast.error(err.message || 'Failed to add stock'),
  });

  const adjustMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => (await api.post(`/store/${id}/adjust`, payload)).data,
    onSuccess: () => { refresh(); toast.success('Stock adjusted'); },
    onError: (err) => toast.error(err.message || 'Failed to adjust stock'),
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (data) => (await api.post('/store/bulk', { data })).data,
    onSuccess: (r) => {
      refresh();
      if (r.imported > 0) toast.success(`Imported ${r.imported} item(s)`);
      if (r.skipped > 0) toast(`${r.skipped} duplicate(s) skipped:\n${r.skippedRows.slice(0, 3).join('\n')}`, { duration: 8000 });
      if (r.failed > 0) toast.error(`${r.failed} row(s) failed:\n${r.errors.slice(0, 3).join('\n')}`, { duration: 10000 });
      if (r.imported === 0 && r.skipped === 0 && r.failed === 0) toast.error('Nothing was imported');
    },
    onError: (err) => toast.error(err.message || 'Bulk import failed'),
  });

    const departmentsQuery = useQuery({
    queryKey: ['store-departments'],
    queryFn: async () => (await api.get('/departments')).data,
    staleTime: 5 * 60 * 1000,
  });

  const createSaleMutation = useMutation({
    mutationFn: async (payload) => (await api.post('/store/sales', payload)).data,
    onSuccess: () => refresh(), 
    onError: (err) => {
      refresh(); 
      toast.error(err.message || 'Failed to create sale');
    },
  });

  return {
    items: itemsQuery.data || [],
    isLoading: itemsQuery.isLoading,
    isError: itemsQuery.isError,

    uploadImage: uploadImageMutation.mutateAsync,
    isUploading: uploadImageMutation.isPending,

    createItem: createItemMutation.mutateAsync,
    isCreating: createItemMutation.isPending,

    updateItem: updateItemMutation.mutateAsync,
    isUpdating: updateItemMutation.isPending,

    deleteItem: deleteItemMutation.mutateAsync,
    isDeleting: deleteItemMutation.isPending,

    categories: categoriesQuery.data || [],
    isCategoriesLoading: categoriesQuery.isLoading,
    createCategory: createCategoryMutation.mutateAsync,
    isCreatingCategory: createCategoryMutation.isPending,
    updateCategory: updateCategoryMutation.mutateAsync,
    isUpdatingCategory: updateCategoryMutation.isPending,
    deleteCategory: deleteCategoryMutation.mutateAsync,
    isDeletingCategory: deleteCategoryMutation.isPending,

    restockItem: restockMutation.mutateAsync,
    isRestocking: restockMutation.isPending,
    adjustStock: adjustMutation.mutateAsync,
    isAdjusting: adjustMutation.isPending,

    bulkImport: bulkImportMutation.mutateAsync,
    isImporting: bulkImportMutation.isPending,

    departments: departmentsQuery.data || [],
    createSale: createSaleMutation.mutateAsync,
    isCreatingSale: createSaleMutation.isPending,
  };
};

export const useStoreMovements = (itemId) =>
  useQuery({
    queryKey: ['store', 'movements', itemId],
    queryFn: async () => (await api.get(`/store/${itemId}/movements`)).data,
    enabled: !!itemId,
});

export const useStoreSales = (filters) =>
  useQuery({
    queryKey: ['store', 'sales', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) params.append(k, v);
      });
      return api.get(`/store/sales?${params.toString()}`); 
    },
    placeholderData: keepPreviousData,
  });

export const fetchSaleBillPdf = async (id) => {
  try {
    return await api.get(`/store/sales/${id}/pdf`, { responseType: 'blob' });
  } catch (e) {
    if (e?.data instanceof Blob) {
      try {
        const body = JSON.parse(await e.data.text());
        if (body?.error?.message) throw new Error(body.error.message);
      } catch (inner) {
        if (inner instanceof Error && inner.message !== e.message && !(inner instanceof SyntaxError)) throw inner;
      }
    }
    throw e;
  }
};