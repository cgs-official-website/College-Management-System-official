import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../services/apiClient';

const errMsg = (e) => e?.response?.data?.error?.message || e?.message || 'Something went wrong';

const getBody = (res) => (res && res.success !== undefined ? res : res?.data);

const useResource = (key, path) => {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['transport-vehicles'] });
    qc.invalidateQueries({ queryKey: ['transport-drivers'] });
    qc.invalidateQueries({ queryKey: ['transport-routes'] });
    qc.invalidateQueries({ queryKey: ['transport-waiting'] });
    qc.invalidateQueries({ queryKey: ['transport-allocated'] });
  };

  const query = useQuery({
    queryKey: [key],
    queryFn: async () => getBody(await api.get(path)),
  });

  const create = useMutation({
    mutationFn: async (body) => getBody(await api.post(path, body)),
    onSuccess: () => { toast.success('Saved successfully'); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...body }) => getBody(await api.put(`${path}/${id}`, body)),
    onSuccess: () => { toast.success('Updated successfully'); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const remove = useMutation({
    mutationFn: async (id) => getBody(await api.delete(`${path}/${id}`)),
    onSuccess: () => { toast.success('Deleted successfully'); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return {
    items: Array.isArray(query.data?.data) ? query.data.data : [],
    stats: query.data?.stats || {},
    isLoading: query.isLoading,
    isError: query.isError,
    createItem: create.mutateAsync,
    updateItem: update.mutateAsync,
    deleteItem: remove.mutateAsync,
    isSaving: create.isPending || update.isPending,
  };
};

export const useVehicles = () => useResource('transport-vehicles', '/transport/vehicles');
export const useDrivers = () => useResource('transport-drivers', '/transport/drivers');
export const useRoutes = () => useResource('transport-routes', '/transport');

export const useVehicleImport = () => {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (rows) => getBody(await api.post('/transport/vehicles/bulk', { data: rows })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transport-vehicles'] });
      qc.invalidateQueries({ queryKey: ['transport-drivers'] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  return { bulkImport: mutation.mutateAsync, isImporting: mutation.isPending };
};

export const useAllocations = (routeId) => {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['transport-waiting'] });
    qc.invalidateQueries({ queryKey: ['transport-allocated'] });
    qc.invalidateQueries({ queryKey: ['transport-routes'] });
  };

  const waiting = useQuery({
    queryKey: ['transport-waiting'],
    queryFn: async () => getBody(await api.get('/transport/allocations/waiting')),
  });

  const allocated = useQuery({
    queryKey: ['transport-allocated', routeId || 'none'],
    queryFn: async () => getBody(await api.get(`/transport/allocations?routeId=${routeId}`)),
    enabled: !!routeId,
  });

  const assign = useMutation({
    mutationFn: async (body) => getBody(await api.post('/transport/allocations/assign', body)),
    onSuccess: (res) => {
      const d = res?.data;
      toast.success(d ? `${d.assigned} student(s) assigned to ${d.routeName}` : 'Assigned');
      refresh();
    },
    onError: (e) => { toast.error(errMsg(e)); refresh(); },
  });

  const unassign = useMutation({
    mutationFn: async (studentIds) => getBody(await api.post('/transport/allocations/unassign', { studentIds })),
    onSuccess: () => { toast.success('Student removed from route'); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return {
    waiting: Array.isArray(waiting.data?.data) ? waiting.data.data : [],
    waitingTotal: waiting.data?.total ?? 0,
    allocated: Array.isArray(allocated.data?.data) ? allocated.data.data : [],
    isLoading: waiting.isLoading,
    isLoadingAllocated: allocated.isLoading,
    assign: assign.mutateAsync,
    unassign: unassign.mutateAsync,
    isAssigning: assign.isPending,
    isUnassigning: unassign.isPending,
  };
};