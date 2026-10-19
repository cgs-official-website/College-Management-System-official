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
      const stats = res?.successful !== undefined ? res : (res?.data || {});
      const successful = stats.successful || 0;
      const failed = stats.failed || 0;
      const errors = Array.isArray(stats.errors) ? stats.errors : [];

      if (successful > 0) {
        toast.success(`Imported ${successful} program${successful === 1 ? '' : 's'} successfully!`);
      }
      if (failed > 0) {
        const preview = errors.slice(0, 5).join('\n');
        const more = errors.length > 5 ? `\n...and ${errors.length - 5} more (see console)` : '';
        toast.error(`${failed} row${failed === 1 ? '' : 's'} failed:\n${preview}${more}`, { duration: 10000 });
        console.error('Program import errors:', errors);
      }
      if (successful === 0 && failed === 0) {
        toast.error('No rows were imported. Check that the file has data.');
      }
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to bulk import programs');
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
