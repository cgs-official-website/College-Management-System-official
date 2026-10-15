import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export function useExams(collegeId, filters = {}) {
  const queryClient = useQueryClient();
  const courseId = typeof filters === 'string' ? filters : filters?.courseId;

  const { data: response = {}, isLoading, error, refetch } = useQuery({
    queryKey: ['exams', collegeId, courseId || 'ALL'],
    queryFn: () => {
      const params = new URLSearchParams();
      if (courseId && courseId !== 'ALL') {
        params.append('courseId', courseId);
      }
      const queryString = params.toString();
      return api.get(`/exams${queryString ? `?${queryString}` : ''}`);
    },
    enabled: !!collegeId,
  });

  const exams = Array.isArray(response?.data) 
    ? response.data 
    : (Array.isArray(response) ? response : []);

  const getFriendlyErrorMessage = (err, defaultMsg) => {
    console.error('[Exams API Error]:', err);
    const msg = err?.data?.error?.message || err?.message || '';
    const isValidation = err?.code === 'VALIDATION_ERROR' || /invalid option|expected one of|validation/i.test(msg);
    if (isValidation) {
      return 'Please check the exam details and ensure all required fields are valid.';
    }
    return msg || defaultMsg;
  };

  const addMutation = useMutation({
    mutationFn: (newExam) => api.post('/exams', newExam),
    onSuccess: () => {
      toast.success('Exam scheduled successfully!');
      queryClient.invalidateQueries({ queryKey: ['exams', collegeId] });
    },
    onError: (err) => {
      toast.error(getFriendlyErrorMessage(err, 'Failed to schedule exam'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/exams/${id}`, data),
    onSuccess: () => {
      toast.success('Exam record updated!');
      queryClient.invalidateQueries({ queryKey: ['exams', collegeId] });
    },
    onError: (err) => {
      toast.error(getFriendlyErrorMessage(err, 'Failed to update exam'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/exams/${id}`),
    onSuccess: () => {
      toast.success('Exam deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['exams', collegeId] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete exam');
    }
  });

  const enterMarksMutation = useMutation({
    mutationFn: (marksData) => api.post('/exams/marks', marksData),
    onSuccess: () => {
      toast.success('Marks recorded successfully!');
      queryClient.invalidateQueries({ queryKey: ['exams', collegeId] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to enter marks');
    }
  });

  return {
    exams,
    isLoading,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    error,
    refetch,
    addExam: addMutation.mutateAsync,
    updateExam: updateMutation.mutateAsync,
    deleteExam: deleteMutation.mutateAsync,
    enterMarks: enterMarksMutation.mutateAsync,
  };
}
