import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';

export const useGetEntities = () => {
  return useQuery({
    queryKey: ['customEntities'],
    queryFn: async () => {
      const { data } = await apiClient.get('/builder/entities');
      return data;
    },
  });
};

export const useCreateEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entity) => {
      const { data } = await apiClient.post('/builder/entities', entity);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries(['customEntities']),
  });
};

export const useDeleteEntity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.delete(`/builder/entities/${id}`);
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries(['customEntities']),
  });
};

export const useGetFields = (model) => {
  return useQuery({
    queryKey: ['customFields', model],
    queryFn: async () => {
      const { data } = await apiClient.get(`/builder/fields/${model}`);
      return data;
    },
    enabled: !!model,
  });
};

export const useCreateField = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (field) => {
      const { data } = await apiClient.post('/builder/fields', field);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['customFields', variables.hardcodedModel || variables.entityId]);
      queryClient.invalidateQueries(['customEntities']);
    },
  });
};

export const useCreateSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (section) => {
      const { data } = await apiClient.post('/builder/sections', section);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['customFields', variables.hardcodedModel || variables.entityId]);
    },
  });
};

export const useDeleteSection = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, model }) => {
      const { data } = await apiClient.delete(`/builder/sections/${id}`);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['customFields', variables.model]);
    },
  });
};
