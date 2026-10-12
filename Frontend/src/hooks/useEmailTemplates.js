import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export const useEmailTemplates = () => {
  const queryClient = useQueryClient();

  const getTemplates = useQuery({
    queryKey: ['emailTemplates'],
    queryFn: async () => {
      const { data } = await api.get('/email-templates');
      return data;
    },
  });

  const createTemplate = useMutation({
    mutationFn: async (templateData) => {
      const { data } = await api.post('/email-templates', templateData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, ...templateData }) => {
      const { data } = await api.put(`/email-templates/${id}`, templateData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/email-templates/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emailTemplates'] });
    },
  });

  return {
    templates: getTemplates.data || [],
    isLoading: getTemplates.isLoading,
    error: getTemplates.error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
  };
};
