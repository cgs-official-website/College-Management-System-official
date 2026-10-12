import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';

type DepartmentCache = { data: any[]; updatedAt: number };
const CACHE_TTL = 60_000;
const cache: DepartmentCache = { data: [], updatedAt: 0 };
let inflight: Promise<any[]> | null = null;

function useAction<A, R>(fn: (args: A) => Promise<R>) {
  const [isPending, setIsPending] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const mutateAsync = useCallback(async (args: A) => {
    setIsPending(true);
    try { return await fnRef.current(args); }
    finally { setIsPending(false); }
  }, []);
  return { isPending, mutateAsync };
}

export const useDepartments = () => {
  const hasCache = cache.updatedAt > 0;
  const [departments, setDepartments] = useState<any[]>(cache.data);
  const [isLoading, setIsLoading] = useState(!hasCache);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async (options: { silent?: boolean } = {}) => {
    const silent = options.silent === true;
    if (!silent && cache.updatedAt === 0) setIsLoading(true);
    try {
      if (inflight) {
        const next = await inflight;
        setDepartments(next);
        setError(null);
        return next;
      }
      inflight = api.get<any>('/departments').then((res) => {
        const next = Array.isArray(res?.data) ? res.data : [];
        cache.data = next;
        cache.updatedAt = Date.now();
        return next;
      }).finally(() => {
        inflight = null;
      });
      const next = await inflight;
      setDepartments(next);
      setError(null);
      return next;
    } catch (e) {
      setError(e);
      if (!cache.data.length) throw e;
      return cache.data;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cache.updatedAt || Date.now() - cache.updatedAt >= CACHE_TTL) void load();
  }, [load]);

  const createDepartment = useAction<any, any>(async (data) => {
    const res = await api.post<any>('/departments', data);
    const created = res?.data;
    if (created && typeof created === 'object') {
      cache.data = [created, ...cache.data];
      cache.updatedAt = Date.now();
      setDepartments(cache.data);
    }
    toast.success('Department created successfully');
    return created;
  });
  const updateDepartment = useAction<{ id: string; data: any }, any>(async ({ id, data }) => {
    const res = await api.put<any>(`/departments/${id}`, data);
    const updated = res?.data;
    if (updated && typeof updated === 'object') {
      cache.data = cache.data.map((item) => item.id === id ? { ...item, ...updated } : item);
      cache.updatedAt = Date.now();
      setDepartments(cache.data);
    }
    toast.success('Department updated successfully');
    return updated;
  });
  const deleteDepartment = useAction<string, any>(async (id) => {
    const res = await api.delete<any>(`/departments/${id}`);
    cache.data = cache.data.filter((item) => item.id !== id);
    cache.updatedAt = Date.now();
    setDepartments(cache.data);
    toast.success('Department deleted successfully');
    return res?.data;
  });
  const bulkImport = useAction<any[], any>(async (data) => {
    const res = await api.post<any>('/departments/bulk', { data });
    const stats = res?.data || {};
    toast.success(`Imported ${stats.successful || 0} departments`);
    void load({ silent: true });
    return res;
  });

  return {
    departments, isLoading, error, refetch: () => load(),
    createDepartment: { mutateAsync: createDepartment.mutateAsync, isPending: createDepartment.isPending },
    updateDepartment: { mutateAsync: updateDepartment.mutateAsync, isPending: updateDepartment.isPending },
    deleteDepartment: { mutateAsync: deleteDepartment.mutateAsync, isPending: deleteDepartment.isPending },
    bulkImport: { mutateAsync: bulkImport.mutateAsync, isPending: bulkImport.isPending },
  };
};
