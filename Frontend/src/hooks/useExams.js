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

  const addMutation = useMutation({
    mutationFn: (newExam) => api.post('/exams', newExam),
    onSuccess: () => {
      toast.success('Exam scheduled successfully!');
      queryClient.invalidateQueries({ queryKey: ['exams', collegeId] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to schedule exam');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/exams/${id}`, data),
    onSuccess: () => {
      toast.success('Exam record updated!');
      queryClient.invalidateQueries({ queryKey: ['exams', collegeId] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update exam');
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
