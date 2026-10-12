import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

const KEYS = ['hostel', 'hostel-students', 'hostel-rooms', 'hostel-available-rooms'];
const useRefreshAll = () => {
  const qc = useQueryClient();
  return () => KEYS.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
};

export const useHostel = () => {
  const refreshAll = useRefreshAll();

  const query = useQuery({
    queryKey: ['hostel'],
    queryFn: async () => api.get('/hostel'),
  });

  const createMutation = useMutation({
    mutationFn: async (payload) => (await api.post('/hostel', payload)).data,
    onSuccess: () => { refreshAll(); toast.success('Hostel block created successfully!'); },
    onError: (err) => toast.error(err.message || 'Failed to create hostel block'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => { await api.delete(`/hostel/${id}`); },
    onSuccess: () => { refreshAll(); toast.success('Hostel block removed.'); },
    onError: (err) => toast.error(err.message || 'Failed to delete hostel block'),
  });

  const studentsQuery = useQuery({
    queryKey: ['hostel-students'],
    queryFn: async () => (await api.get('/hostel/students')).data,
  });

  const assignRoomMutation = useMutation({
    mutationFn: async ({ id, hostelRoomId }) =>
      (await api.put(`/hostel/students/${id}/room`, { hostelRoomId })).data,
    onSuccess: () => { refreshAll(); toast.success('Room updated successfully!'); },
    onError: (err) => toast.error(err.message || 'Failed to update room'),
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (data) => (await api.post('/hostel/bulk', { data })).data,
    onSuccess: (stats = {}) => {
      refreshAll();
      toast.success(`Rooms: ${stats.roomsCreated || 0} created, ${stats.roomsUpdated || 0} updated`);
      if (stats.failed > 0) {
        toast.error(`${stats.failed} row(s) failed. ${(stats.errors || []).slice(0, 2).join(' | ')}`);
      }
      (stats.warnings || []).slice(0, 2).forEach((w) => toast(w));
    },
    onError: (err) => toast.error(err.message || 'Failed to import hostel rooms'),
  });

  const rawData = query.data?.data || [];
  const stats = query.data?.stats || { totalBlocks: 0, totalRooms: 0, totalCapacity: 0, occupiedBeds: 0, occupancyRate: '0%' };

  return {
    items: Array.isArray(rawData) ? rawData : [],
    stats,
    isLoading: query.isLoading,
    isAdding: createMutation.isPending,
    isImporting: bulkImportMutation.isPending,
    createItem: createMutation.mutateAsync,
    deleteItem: deleteMutation.mutateAsync,
    bulkImport: bulkImportMutation.mutateAsync,
    students: studentsQuery.data || [],
    isLoadingStudents: studentsQuery.isLoading,
    assignRoom: assignRoomMutation.mutateAsync,
    isAssigningRoom: assignRoomMutation.isPending,
  };
};

export const useHostelRooms = (blockId) =>
  useQuery({
    queryKey: ['hostel-rooms', blockId],
    enabled: !!blockId,
    queryFn: async () => (await api.get(`/hostel/${blockId}/rooms`)).data,
  });

export const useAvailableRooms = (blockId, includeRoomId) =>
  useQuery({
    queryKey: ['hostel-available-rooms', blockId, includeRoomId || null],
    enabled: !!blockId,
    queryFn: async () => {
      const qs = `blockId=${blockId}${includeRoomId ? `&includeRoomId=${includeRoomId}` : ''}`;
      return (await api.get(`/hostel/available-rooms?${qs}`)).data;
    },
  });

export const useRoomActions = () => {
  const refreshAll = useRefreshAll();
  const opts = (msg) => ({
    onSuccess: () => { refreshAll(); toast.success(msg); },
    onError: (err) => toast.error(err.message || 'Action failed'),
  });

  const add = useMutation({
    mutationFn: async ({ blockId, ...room }) => (await api.post(`/hostel/${blockId}/rooms`, room)).data,
    ...opts('Room added'),
  });
  const update = useMutation({
    mutationFn: async ({ roomId, ...patch }) => (await api.put(`/hostel/rooms/${roomId}`, patch)).data,
    ...opts('Room updated'),
  });
  const remove = useMutation({
    mutationFn: async (roomId) => { await api.delete(`/hostel/rooms/${roomId}`); },
    ...opts('Room deleted'),
  });

  return { addRoom: add.mutateAsync, updateRoom: update.mutateAsync, deleteRoom: remove.mutateAsync };
};