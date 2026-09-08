import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export const useDepartments = () => {
  const queryClient = useQueryClient();

  const getDepartments = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const response = await api.get('/departments');
      return response.data || [];
    }
  });

  const createDepartment = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/departments', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Department created successfully!');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create department');
    }
  });

  const updateDepartment = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.put(`/departments/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Department updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update department');
    }
  });

  const deleteDepartment = useMutation({
    mutationFn: async (id) => {
      const response = await api.delete(`/departments/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('Department deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete department');
    }
  });

  const bulkImport = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/departments/bulk', { data });
      return response.data;
    },
    onSuccess: (res) => {
      const stats = res?.data || {};
      toast.success(`Imported ${stats.successful || 0} departments successfully!`);
      if (stats.failed > 0) {
        toast.error(`${stats.failed} failed.`);
      }
      queryClient.invalidateQueries({ queryKey: ['departments'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to bulk import departments');
    }
  });

  return {
    departments: getDepartments.data || [],
    isLoading: getDepartments.isLoading,
    error: getDepartments.error,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    bulkImport
  };
};
