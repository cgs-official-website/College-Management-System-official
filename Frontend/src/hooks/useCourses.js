import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export const useCourses = (departmentId = null) => {
  const queryClient = useQueryClient();

  const getCourses = useQuery({
    queryKey: ['courses', departmentId],
    queryFn: async () => {
      const url = departmentId ? `/courses?departmentId=${departmentId}` : '/courses';
      const response = await api.get(url);
      return response.data || [];
    }
  });

  const createCourse = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/courses', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    }
  });

  const updateCourse = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/courses/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    }
  });

  const deleteCourse = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/courses/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    }
  });

  const bulkImport = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/courses/bulk', { data });
      return response.data;
    },
    onSuccess: (res) => {
      const stats = res?.data || {};
      toast.success(`Imported ${stats.successful || 0} courses successfully!`);
      if (stats.failed > 0) {
        toast.error(`${stats.failed} failed.`);
      }
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to bulk import courses');
    }
  });

  return {
    courses: getCourses.data || [],
    isLoading: getCourses.isLoading,
    error: getCourses.error,
    createCourse,
    updateCourse,
    deleteCourse,
    bulkImport
  };
};
