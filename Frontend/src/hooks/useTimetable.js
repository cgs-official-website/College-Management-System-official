import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export function useTimetable(collegeId) {
  const queryClient = useQueryClient();

  const { data: response = {}, isLoading, error, refetch } = useQuery({
    queryKey: ['timetable', collegeId],
    queryFn: () => api.get('/timetable'),
    enabled: !!collegeId,
  });

  const schedules = Array.isArray(response?.data) 
    ? response.data 
    : (Array.isArray(response) ? response : []);

  const addMutation = useMutation({
    mutationFn: (newSlot) => api.post('/timetable/schedule', newSlot),
    onSuccess: () => {
      toast.success('Class session scheduled successfully!');
      queryClient.invalidateQueries({ queryKey: ['timetable', collegeId] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to schedule class');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.put(`/timetable/${id}`, data),
    onSuccess: () => {
      toast.success('Class schedule updated!');
      queryClient.invalidateQueries({ queryKey: ['timetable', collegeId] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to update schedule');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/timetable/${id}`),
    onSuccess: () => {
      toast.success('Class schedule removed.');
      queryClient.invalidateQueries({ queryKey: ['timetable', collegeId] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete schedule');
    }
  });

  return {
    schedules,
    timetable: schedules,
    isLoading,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    error,
    refetch,
    addSchedule: addMutation.mutateAsync,
    addSlot: addMutation.mutateAsync,
    updateSchedule: updateMutation.mutateAsync,
    updateSlot: updateMutation.mutateAsync,
    deleteSchedule: deleteMutation.mutateAsync,
    deleteSlot: deleteMutation.mutateAsync,
  };
}
