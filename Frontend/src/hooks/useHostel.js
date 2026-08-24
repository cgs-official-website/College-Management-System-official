import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

export const useHostel = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['hostel'],
    queryFn: async () => {
      const response = await api.get('/hostel');
      return response;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newItem) => {
      const response = await api.post('/hostel', newItem);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel'] });
      toast.success('Hostel block created successfully!');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to create hostel block');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/hostel/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel'] });
      toast.success('Hostel block removed.');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to delete hostel block');
    }
  });

  const studentsQuery = useQuery({
    queryKey: ['hostel-students'],
    queryFn: async () => {
      const response = await api.get('/hostel/students');
      return response.data;
    }
  });

  const assignRoomMutation = useMutation({
    mutationFn: async ({ id, hostelBlockId, hostelRoom }) => {
      const response = await api.put(`/hostel/students/${id}/room`, { hostelBlockId, hostelRoom });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hostel-students'] });
      toast.success('Room assigned successfully!');
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to assign room');
    }
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/hostel/bulk', { data });
      return response.data;
    },
    onSuccess: (res) => {
      const stats = res?.data || {};
      toast.success(`Imported ${stats.successful || 0} rooms successfully!`);
      if (stats.failed > 0) {
        toast.error(`${stats.failed} failed.`);
      }
      queryClient.invalidateQueries({ queryKey: ['hostel'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to bulk import hostel rooms');
    }
  });

  const rawData = query.data?.data || [];
  const stats = query.data?.stats || {
    totalBlocks: rawData.length,
    totalCapacity: 0,
    occupiedBeds: 0,
    occupancyRate: '0%'
  };

  return {
    items: Array.isArray(rawData) ? rawData : [],
    stats,
    isLoading: query.isLoading,
    isError: query.isError,
    isAdding: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isImporting: bulkImportMutation.isPending,
    createItem: createMutation.mutateAsync,
    deleteItem: deleteMutation.mutateAsync,
    bulkImport: bulkImportMutation.mutateAsync,
    refetch: query.refetch,
    students: studentsQuery.data || [],
    isLoadingStudents: studentsQuery.isLoading,
    assignRoom: assignRoomMutation.mutateAsync,
    isAssigningRoom: assignRoomMutation.isPending,
  };
};
