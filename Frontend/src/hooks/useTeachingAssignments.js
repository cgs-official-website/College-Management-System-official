import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

const errMsg = (err, fallback) => err.response?.data?.error?.message || err.message || fallback;

export const useTeachingMatrix = (sectionId, semester) => {
  const queryClient = useQueryClient();
  const enabled = !!(sectionId && semester);

  const matrix = useQuery({
    queryKey: ['teaching-matrix', sectionId, semester],
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams({ sectionId, semester });
      const response = await api.get(`/teaching-assignments/matrix?${params.toString()}`);
      return response.data || null;
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['teaching-matrix'] });

  const assignTeacher = useMutation({
    mutationFn: async (data) => (await api.put('/teaching-assignments', data)).data,
    onSuccess: () => { toast.success('Teacher assigned'); invalidate(); },
    onError: (err) => toast.error(errMsg(err, 'Failed to assign teacher')),
  });

  const removeAssignment = useMutation({
    mutationFn: async (id) => (await api.delete(`/teaching-assignments/${id}`)).data,
    onSuccess: () => { toast.success('Teacher removed'); invalidate(); },
    onError: (err) => toast.error(errMsg(err, 'Failed to remove teacher')),
  });

  return {
    matrix: matrix.data || null,
    isLoading: matrix.isLoading && enabled,
    error: matrix.error,
    assignTeacher,
    removeAssignment,
  };
};