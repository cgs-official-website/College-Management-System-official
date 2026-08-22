import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';

export const useSections = (courseId = null) => {
  const queryClient = useQueryClient();

  const getSections = useQuery({
    queryKey: ['sections', courseId],
    queryFn: async () => {
      const url = courseId ? `/sections?courseId=${courseId}` : '/sections';
      const response = await api.get(url);
      return response.data || [];
    }
  });

  const createSection = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/sections', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    }
  });

  const updateSection = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/sections/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    }
  });

  const deleteSection = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/sections/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sections'] });
    }
  });

  return {
    sections: getSections.data || [],
    isLoading: getSections.isLoading,
    error: getSections.error,
    createSection,
    updateSection,
    deleteSection
  };
};
