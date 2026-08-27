import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export const usePayrolls = (filters) => {
  return useQuery({
    queryKey: ['payrolls', filters],
    queryFn: async () => {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
      );
      const response = await api.get('/payroll', { params: cleanFilters });
      return response.data;
    }
  });
};

export const useMyPayslips = () => {
  return useQuery({
    queryKey: ['my-payslips'],
    queryFn: async () => {
      const response = await api.get('/payroll/my-payslips');
      return response.data;
    }
  });
};

export const useCreatePayslip = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/payroll', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    }
  });
};

export const useBulkImportPayrolls = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/payroll/bulk-import', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    }
  });
};

export const useUpdatePayrollStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await api.patch(`/payroll/${id}/status`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    }
  });
};
