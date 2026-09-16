import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export const useParentProfile = () => {
  return useQuery({
    queryKey: ['parent', 'profile'],
    queryFn: async () => {
      const response = await api.get('/parent/profile');
      return response.data?.data || response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useParentDashboard = (studentId = null) => {
  return useQuery({
    queryKey: ['parent', 'dashboard', studentId],
    queryFn: async () => {
      const url = studentId ? `/parent/dashboard?studentId=${studentId}` : '/parent/dashboard';
      const response = await api.get(url);
      return response.data?.data || response.data;
    },
    staleTime: 60 * 1000,
  });
};

export const useParentAttendance = (studentId = null) => {
  return useQuery({
    queryKey: ['parent', 'attendance', studentId],
    queryFn: async () => {
      const url = studentId ? `/parent/attendance?studentId=${studentId}` : '/parent/attendance';
      const response = await api.get(url);
      return response.data?.data || response.data;
    },
    staleTime: 60 * 1000,
  });
};

export const useParentGrades = (studentId = null) => {
  return useQuery({
    queryKey: ['parent', 'grades', studentId],
    queryFn: async () => {
      const url = studentId ? `/parent/grades?studentId=${studentId}` : '/parent/grades';
      const response = await api.get(url);
      return response.data?.data || response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useParentHostel = (studentId = null) => {
  return useQuery({
    queryKey: ['parent', 'hostel', studentId],
    queryFn: async () => {
      const url = studentId ? `/parent/hostel?studentId=${studentId}` : '/parent/hostel';
      const response = await api.get(url);
      return response.data?.data || response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useParentTransport = (studentId = null) => {
  return useQuery({
    queryKey: ['parent', 'transport', studentId],
    queryFn: async () => {
      const url = studentId ? `/parent/transport?studentId=${studentId}` : '/parent/transport';
      const response = await api.get(url);
      return response.data?.data || response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useParentFees = (studentId = null) => {
  return useQuery({
    queryKey: ['parent', 'fees', studentId],
    queryFn: async () => {
      const url = studentId ? `/parent/fees?studentId=${studentId}` : '/parent/fees';
      const response = await api.get(url);
      return response.data?.data || response.data;
    },
    staleTime: 60 * 1000,
  });
};

export const usePayFee = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ feeId, amount, paymentMethod }) => {
      const response = await api.post('/parent/fees/pay', { feeId, amount, paymentMethod });
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent', 'fees'] });
      queryClient.invalidateQueries({ queryKey: ['parent', 'dashboard'] });
    }
  });
};

export const useParentPTM = (studentId = null) => {
  return useQuery({
    queryKey: ['parent', 'ptm', studentId],
    queryFn: async () => {
      const url = studentId ? `/parent/ptm?studentId=${studentId}` : '/parent/ptm';
      const response = await api.get(url);
      return response.data?.data || response.data;
    },
    staleTime: 60 * 1000,
  });
};

export const useBookPTM = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bookingData) => {
      const response = await api.post('/parent/ptm/book', bookingData);
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['parent', 'ptm'] });
    }
  });
};
