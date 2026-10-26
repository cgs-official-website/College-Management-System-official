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
      queryClient.invalidateQueries({ queryKey: ['staff', collegeId] });
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to add staff member.';
      toast.error(msg);
    }
  });

  const updateStaff = useMutation({
    mutationFn: ({ id, data }) => api.put(`/staff/${id}`, data),
    onSuccess: () => {
      toast.success('Staff member updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['staff', collegeId] });
    },
    onError: (err) => {
      const msg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to update staff member.';
      toast.error(msg);
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
      const stats = res?.data?.data || res?.data || res || {};
      const successCount = stats.successful ?? stats.count ?? 0;
      toast.success(`Imported ${successCount} staff successfully!`);
      if (stats.failed > 0) {
        if (Array.isArray(stats.errors) && stats.errors.length > 0) {
          stats.errors.slice(0, 5).forEach((errMsg) => {
            toast.error(errMsg, { duration: 6000 });
          });
          if (stats.errors.length > 5) {
            toast.error(`...and ${stats.errors.length - 5} more error(s). Check console for full details.`, { duration: 6000 });
          }
        } else {
          toast.error(`${stats.failed} row(s) failed to import.`);
        }
        console.error('Import errors:', stats.errors);
      }
      queryClient.invalidateQueries({ queryKey: ['staff', collegeId] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || err.message || 'Failed to bulk import staff');
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
