import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient from '../../services/apiClient';

export const useDynamicRecords = (entitySlug) => {
  return useQuery({
    queryKey: ['dynamicRecords', entitySlug],
    queryFn: async () => {
      const { data } = await apiClient.get(`/dynamic/${entitySlug}`);
      return data;
    },
    enabled: !!entitySlug,
  });
};

export const useCreateDynamicRecord = (entitySlug) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const res = await apiClient.post(`/dynamic/${entitySlug}`, data);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries(['dynamicRecords', entitySlug]),
  });
};

export const useUpdateDynamicRecord = (entitySlug) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await apiClient.put(`/dynamic/${entitySlug}/${id}`, data);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries(['dynamicRecords', entitySlug]),
  });
};

export const useDeleteDynamicRecord = (entitySlug) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await apiClient.delete(`/dynamic/${entitySlug}/${id}`);
      return res.data;
    },
    onSuccess: () => queryClient.invalidateQueries(['dynamicRecords', entitySlug]),
  });
};
