import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';

function useAction<A, R>(fn: (args: A) => Promise<R>) {
  const [isPending, setIsPending] = useState(false);
  const ref = useRef(fn);
  ref.current = fn;
  const mutateAsync = useCallback(async (args: A) => {
    setIsPending(true);
    try { return await ref.current(args); } finally { setIsPending(false); }
  }, []);
  return { isPending, mutateAsync };
}

const cache = new Map<string, any[]>();

/** Web: hooks/useStaff.js */
export function useStaff(collegeId?: string | null) {
  const key = collegeId || 'default_college_id';
  const [staff, setStaff] = useState<any[]>(cache.get(key) || []);
  const [isLoading, setIsLoading] = useState(!cache.has(key));
  const [error, setError] = useState<any>(null);

  const load = useCallback(async (silent = false) => {
    if (!collegeId) { setIsLoading(false); return; }
    if (!silent && !cache.has(key)) setIsLoading(true);
    try {
      const res = await api.get<any>('/staff');
      const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? (res as any) : [];
      cache.set(key, data);
      setStaff(data);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [collegeId, key]);

  useEffect(() => { void load(); }, [load]);

  const addStaff = useAction<any, any>(async (payload) => {
    try {
      const res = await api.post<any>('/staff', payload);
      await load(true);
      return res;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add staff member.');
      throw err;
    }
  });

  const updateStaff = useAction<{ id: string; data: any }, any>(async ({ id, data }) => {
    try {
      const res = await api.put<any>(`/staff/${id}`, data);
      toast.success('Staff member updated successfully!');
      await load(true);
      return res;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update staff member.');
      throw err;
    }
  });

  const deleteStaff = useAction<string, any>(async (id) => {
    try {
      const res = await api.delete<any>(`/staff/${id}`);
      toast.success('Staff member removed.');
      const next = (cache.get(key) || []).filter((s) => s.id !== id);
      cache.set(key, next);
      setStaff(next);
      void load(true);
      return res;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove staff member.');
      throw err;
    }
  });

  const bulkImport = useAction<any[], any>(async (rows) => {
    try {
      const res = await api.post<any>('/staff/bulk', { data: rows });
      const stats = res?.data || {};
      toast.success(`Imported ${stats.successful || 0} staff successfully!`);
      if (stats.failed > 0) toast.error(`${stats.failed} failed.`);
      await load(true);
      return res;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to bulk import staff');
      throw err;
    }
  });

  return {
    staff, isLoading, error,
    isAdding: addStaff.isPending, isUpdating: updateStaff.isPending,
    isDeleting: deleteStaff.isPending, isImporting: bulkImport.isPending,
    refetch: () => load(true),
    addStaff: addStaff.mutateAsync, updateStaff: updateStaff.mutateAsync,
    deleteStaff: deleteStaff.mutateAsync, bulkImport: bulkImport.mutateAsync,
  };
}