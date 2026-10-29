import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export const useSubjects = (courseId = null, semester = null) => {
  const queryClient = useQueryClient();

  const getSubjects = useQuery({
    queryKey: ['subjects', courseId, semester],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (courseId) params.set('courseId', courseId);
      if (semester) params.set('semester', semester);
      const qs = params.toString();
      const response = await api.get(qs ? `/subjects?${qs}` : '/subjects');
      return response.data || [];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['subjects'] });
  const errMsg = (err, fallback) => err.response?.data?.error?.message || err.message || fallback;

  const createSubject = useMutation({
    mutationFn: async (data) => (await api.post('/subjects', data)).data,
    onSuccess: () => { toast.success('Subject created'); invalidate(); },
    onError: (err) => toast.error(errMsg(err, 'Failed to create subject')),
  });

  const updateSubject = useMutation({
    mutationFn: async ({ id, data }) => (await api.put(`/subjects/${id}`, data)).data,
    onSuccess: () => { toast.success('Subject updated'); invalidate(); },
    onError: (err) => toast.error(errMsg(err, 'Failed to update subject')),
  });

  const deleteSubject = useMutation({
    mutationFn: async (id) => (await api.delete(`/subjects/${id}`)).data,
    onSuccess: () => { toast.success('Subject deleted'); invalidate(); },
    onError: (err) => toast.error(errMsg(err, 'Failed to delete subject')),
  });

  const bulkImport = useMutation({
    mutationFn: async (data) => (await api.post('/subjects/bulk', { data })).data,
    onSuccess: (res) => {
      const stats = res?.successful !== undefined ? res : (res?.data || {});
      const successful = stats.successful || 0;
      const failed = stats.failed || 0;
      const errors = Array.isArray(stats.errors) ? stats.errors : [];
      if (successful > 0) toast.success(`Imported ${successful} subject${successful === 1 ? '' : 's'}`);
      if (failed > 0) {
        const preview = errors.slice(0, 5).join('\n');
        const more = errors.length > 5 ? `\n...and ${errors.length - 5} more` : '';
        toast.error(`${failed} row(s) failed:\n${preview}${more}`, { duration: 10000 });
      }
      if (successful === 0 && failed === 0) toast.error('No rows were imported. Check that the file has data.');
      invalidate();
    },
    onError: (err) => toast.error(errMsg(err, 'Failed to bulk import subjects')),
  });

  return {
    subjects: getSubjects.data || [],
    isLoading: getSubjects.isLoading,
    error: getSubjects.error,
    createSubject,
    updateSubject,
    deleteSubject,
    bulkImport,
  };
};