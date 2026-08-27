import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export const useStudentProfile = () => {
  return useQuery({
    queryKey: ['student', 'profile'],
    queryFn: async () => {
      const response = await api.get('/student/profile');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useStudentDashboard = () => {
  return useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: async () => {
      const response = await api.get('/student/dashboard');
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useStudentCourses = () => {
  return useQuery({
    queryKey: ['student', 'courses'],
    queryFn: async () => {
      const response = await api.get('/student/courses');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useStudentAssignments = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['student', 'assignments'],
    queryFn: async () => {
      const response = await api.get('/student/assignments');
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const submitMutation = useMutation({
    mutationFn: async ({ assignmentId, fileUrl }) => {
      const response = await api.post(`/student/assignments/${assignmentId}/submit`, { fileUrl });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'assignments'] });
      queryClient.invalidateQueries({ queryKey: ['student', 'dashboard'] });
    }
  });

  return {
    ...query,
    submitAssignment: submitMutation.mutateAsync,
    isSubmitting: submitMutation.isPending
  };
};

export const useStudentAttendance = () => {
  return useQuery({
    queryKey: ['student', 'attendance'],
    queryFn: async () => {
      const response = await api.get('/student/attendance');
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useStudentLeaveRequests = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['student', 'leave-requests'],
    queryFn: async () => {
      const response = await api.get('/student/leave-requests');
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });

  const createLeaveMutation = useMutation({
    mutationFn: async (leaveData) => {
      const response = await api.post('/student/leave-requests', leaveData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'leave-requests'] });
    }
  });

  return {
    ...query,
    createLeaveRequest: createLeaveMutation.mutateAsync,
    isCreating: createLeaveMutation.isPending
  };
};

export const useStudentTimetable = () => {
  return useQuery({
    queryKey: ['student', 'timetable'],
    queryFn: async () => {
      const response = await api.get('/student/timetable');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useStudentExams = () => {
  return useQuery({
    queryKey: ['student', 'exams'],
    queryFn: async () => {
      const response = await api.get('/student/exams');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useStudentResults = () => {
  return useQuery({
    queryKey: ['student', 'results'],
    queryFn: async () => {
      const response = await api.get('/student/results');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useStudentFees = () => {
  return useQuery({
    queryKey: ['student', 'fees'],
    queryFn: async () => {
      const response = await api.get('/student/fees');
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useStudentNotices = () => {
  return useQuery({
    queryKey: ['student', 'notices'],
    queryFn: async () => {
      const response = await api.get('/student/notices');
      return response.data;
    },
    staleTime: 2 * 60 * 1000,
  });
};

export const useStudentLibrary = (search = '', category = '') => {
  return useQuery({
    queryKey: ['student', 'library', search, category],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      const response = await api.get(`/student/library?${params.toString()}`);
      return response.data;
    },
    staleTime: 3 * 60 * 1000,
  });
};

export const useStudentPlacements = () => {
  return useQuery({
    queryKey: ['student', 'placements'],
    queryFn: async () => {
      const response = await api.get('/student/placements');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useStudentComplaints = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['student', 'complaints'],
    queryFn: async () => {
      const response = await api.get('/student/complaints');
      return response.data;
    },
    staleTime: 1 * 60 * 1000,
  });

  const createComplaintMutation = useMutation({
    mutationFn: async (newComplaint) => {
      const response = await api.post('/student/complaints', newComplaint);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'complaints'] });
    }
  });

  return {
    ...query,
    createComplaint: createComplaintMutation.mutateAsync,
    isCreating: createComplaintMutation.isPending
  };
};

export const useStudentHostel = () => {
  return useQuery({
    queryKey: ['student', 'hostel'],
    queryFn: async () => {
      const response = await api.get('/student/hostel');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useStudentTransport = () => {
  return useQuery({
    queryKey: ['student', 'transport'],
    queryFn: async () => {
      const response = await api.get('/student/transport');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useStudentDocuments = () => {
  return useQuery({
    queryKey: ['student', 'documents'],
    queryFn: async () => {
      const response = await api.get('/student/documents');
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useUploadStudentProfileImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (fileOrFormData) => {
      let payload = fileOrFormData;
      let headers = {};

      if (fileOrFormData instanceof File) {
        payload = new FormData();
        payload.append('profileImage', fileOrFormData);
        headers['Content-Type'] = 'multipart/form-data';
      }

      const response = await api.post('/student/profile/image', payload, { headers });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'profile'] });
    }
  });
};

export const useDeleteStudentProfileImage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await api.delete('/student/profile/image');
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['student', 'profile'] });
    }
  });
};
