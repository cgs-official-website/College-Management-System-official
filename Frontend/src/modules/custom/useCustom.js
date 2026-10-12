import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';

export const useCustomRecords = () => {
  return useQuery({
    queryKey: ['customRecords'],
    queryFn: async () => {
      const { data } = await apiClient.get('/custom');
      return data;
    },
  });
};

export const useCreateCustomRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newRecord) => {
      const { data } = await apiClient.post('/custom', newRecord);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['customRecords']);
    },
  });
};

export const useUpdateCustomRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }) => {
      const { data } = await apiClient.put(`/custom/${id}`, updates);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['customRecords']);
    },
  });
};

export const useDeleteCustomRecord = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await apiClient.delete(`/custom/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['customRecords']);
    },
  });
};
