import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export function useAdmissions(collegeId) {
  const queryClient = useQueryClient();

  const { data: response = {}, isLoading, error, refetch } = useQuery({
    queryKey: ['admissions', collegeId],
    queryFn: () => api.get('/admin/admissions'),
    enabled: !!collegeId,
  });

  const admissions = Array.isArray(response?.data)
    ? response.data
    : (Array.isArray(response) ? response : []);

  const addAdmission = useMutation({
    mutationFn: (newApplication) => api.post('/admin/admissions/apply', newApplication),
    onSuccess: () => {
      toast.success('Application submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['admissions', collegeId] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to submit application');
    }
  });

  const updateAdmission = useMutation({
    mutationFn: ({ id, data }) => api.put(`/admin/admissions/${id}`, data),
    onSuccess: () => {
      toast.success('Application updated!');
      queryClient.invalidateQueries({ queryKey: ['admissions', collegeId] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update application');
    }
  });

  const deleteAdmission = useMutation({
    mutationFn: (id) => api.delete(`/admin/admissions/${id}`),
    onSuccess: () => {
      toast.success('Application record removed.');
      queryClient.invalidateQueries({ queryKey: ['admissions', collegeId] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to remove application');
    }
  });

  return {
    admissions,
    isLoading,
    isAdding: addAdmission.isPending,
    isUpdating: updateAdmission.isPending,
    isDeleting: deleteAdmission.isPending,
    error,
    refetch,
    addAdmission: addAdmission.mutateAsync,
    updateAdmission: updateAdmission.mutateAsync,
    deleteAdmission: deleteAdmission.mutateAsync,
  };
}
