import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export function useStaff(collegeId) {
  const queryClient = useQueryClient();

  const { data: response = {}, isLoading, error, refetch } = useQuery({
    queryKey: ['staff', collegeId],
    queryFn: () => api.get('/staff'),
    enabled: !!collegeId,
  });

  const staff = Array.isArray(response?.data)
    ? response.data
    : (Array.isArray(response) ? response : []);

  const addStaff = useMutation({
    mutationFn: (newStaff) => api.post('/staff', newStaff),
    onSuccess: () => {
      toast.success('Staff member added successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff', collegeId] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to add staff member.');
    }
  });

  const updateStaff = useMutation({
    mutationFn: ({ id, data }) => api.put(`/staff/${id}`, data),
    onSuccess: () => {
      toast.success('Staff member updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff', collegeId] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update staff member.');
    }
  });

  const deleteStaff = useMutation({
    mutationFn: (id) => api.delete(`/staff/${id}`),
    onSuccess: () => {
      toast.success('Staff member removed.');
      queryClient.invalidateQueries({ queryKey: ['staff', collegeId] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to remove staff member.');
    }
  });

  const bulkImport = useMutation({
    mutationFn: (data) => api.post('/staff/bulk', { data }),
    onSuccess: (res) => {
      const stats = res.data?.data || {};
      toast.success(`Imported ${stats.successful || 0} staff successfully!`);
      if (stats.failed > 0) {
        toast.error(`${stats.failed} failed.`);
        console.error('Import errors:', stats.errors);
      }
      queryClient.invalidateQueries({ queryKey: ['staff', collegeId] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to bulk import staff');
    }
  });

  return {
    staff,
    isLoading,
    isAdding: addStaff.isPending,
    isUpdating: updateStaff.isPending,
    isDeleting: deleteStaff.isPending,
    isImporting: bulkImport.isPending,
    error,
    refetch,
    addStaff: addStaff.mutateAsync,
    updateStaff: updateStaff.mutateAsync,
    deleteStaff: deleteStaff.mutateAsync,
    bulkImport: bulkImport.mutateAsync,
  };
}
