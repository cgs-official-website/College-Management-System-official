import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export const usePayrolls = (filters) => {
  return useQuery({
    queryKey: ['payrolls', filters],
    queryFn: async () => {
      const response = await api.get('/payroll', { params: filters });
      return response.data.data;
    }
  });
};

export const useMyPayslips = () => {
  return useQuery({
    queryKey: ['my-payslips'],
    queryFn: async () => {
      const response = await api.get('/payroll/my-payslips');
      return response.data.data;
    }
  });
};

export const useGeneratePayroll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/payroll/generate', data);
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
