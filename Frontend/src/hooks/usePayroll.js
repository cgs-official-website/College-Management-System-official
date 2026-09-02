import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export const usePayrolls = (filters) => {
  return useQuery({
    queryKey: ['payrolls', filters],
    queryFn: async () => {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters || {}).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
      );
      const response = await api.get('/payroll', { params: cleanFilters });
      return response?.data || response || [];
    }
  });
};

export const useMyPayslips = () => {
  return useQuery({
    queryKey: ['my-payslips'],
    queryFn: async () => {
      const response = await api.get('/payroll/my-payslips');
      return response?.data || response || [];
    }
  });
};

export const usePayroll = () => {
  const query = useMyPayslips();
  const rawRecords = Array.isArray(query.data?.data)
    ? query.data.data
    : (Array.isArray(query.data) ? query.data : []);
  const records = rawRecords.map(r => ({
    ...r,
    basicSalary: r.basicPay ?? r.basicSalary ?? 0,
    allowances: r.allowances ?? ((r.hra || 0) + (r.da || 0) + (r.specialAllowance || 0)),
    deductions: r.deductions ?? ((r.pf || 0) + (r.esi || 0) + (r.pt || 0) + (r.tds || 0) + (r.otherDeductions || 0)),
    netSalary: r.netPay ?? r.netSalary ?? 0,
    month: r.month ? `${new Date(0, r.month - 1).toLocaleString('default', { month: 'long' })} ${r.year}` : r.month
  }));
  return { ...query, records, isLoading: query.isLoading };
};

export const useCreatePayslip = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/payroll', data);
      return response?.data || response;
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
