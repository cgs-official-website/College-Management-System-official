import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export const useApiIntegrations = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['api_integrations'],
    queryFn: async () => {
      const response = await api.get('/integrations');
      return response.data;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.post('/integrations', payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api_integrations'] });
      toast.success('Integration settings saved successfully!');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to save integration settings');
    }
  });

  return {
    integrations: query.data || [],
    isLoading: query.isLoading,
    isSaving: saveMutation.isPending,
    saveIntegration: saveMutation.mutateAsync,
  };
};
