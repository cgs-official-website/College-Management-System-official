import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';

type TimetableCache = { data: any[]; updatedAt: number };
const CACHE_TTL = 60_000;
const cache = new Map<string, TimetableCache>();
const inflight = new Map<string, Promise<any[]>>();

function useAction<A, R>(fn: (args: A) => Promise<R>) {
  const [isPending, setIsPending] = useState(false);
  const ref = useRef(fn);
  ref.current = fn;
  const mutateAsync = useCallback(async (args: A) => {
    setIsPending(true);
    try { return await ref.current(args); }
    finally { setIsPending(false); }
  }, []);
  return { isPending, mutateAsync };
}

export const useTimetable = (collegeId?: string | null) => {
  const cacheKey = collegeId || 'default_college_id';
  const cached = cache.get(cacheKey);
  const [schedules, setSchedules] = useState<any[]>(cached?.data || []);
  const [isLoading, setIsLoading] = useState(!cached);

  const load = useCallback(async (options: { silent?: boolean } = {}) => {
    const silent = options.silent === true;
    if (!collegeId) {
      setSchedules([]);
      setIsLoading(false);
      return [];
    }
    if (!silent && !cache.has(cacheKey)) setIsLoading(true);
    const existing = inflight.get(cacheKey);
    if (existing) {
      const next = await existing;
      setSchedules(next);
      setIsLoading(false);
      return next;
    }
    const request = api.get<any>('/timetable')
      .then((res) => {
        const next = Array.isArray(res?.data) ? res.data : [];
        cache.set(cacheKey, { data: next, updatedAt: Date.now() });
        return next;
      })
      .finally(() => {
        inflight.delete(cacheKey);
      });
    inflight.set(cacheKey, request);
    try {
      const next = await request;
      setSchedules(next);
      return next;
    } finally {
      setIsLoading(false);
    }
  }, [collegeId, cacheKey]);

  useEffect(() => {
    if (!collegeId) { setIsLoading(false); return; }
    const entry = cache.get(cacheKey);
    if (!entry || Date.now() - entry.updatedAt >= CACHE_TTL) void load();
  }, [collegeId, cacheKey, load]);

  const addSchedule = useAction<any, any>(async (data) => {
    const res = await api.post<any>('/timetable/schedule', data);
    const created = res?.data;
    if (created && typeof created === 'object') {
      const next = [...(cache.get(cacheKey)?.data || schedules), created];
      cache.set(cacheKey, { data: next, updatedAt: Date.now() });
      setSchedules(next);
    }
    toast.success('Timetable schedule created');
    return created;
  });

  const updateSchedule = useAction<{ id: string; data: any }, any>(async ({ id, data }) => {
    const res = await api.put<any>(`/timetable/${id}`, data);
    const updated = res?.data;
    if (updated && typeof updated === 'object') {
      const next = (cache.get(cacheKey)?.data || schedules).map((item) => item.id === id ? { ...item, ...updated } : item);
      cache.set(cacheKey, { data: next, updatedAt: Date.now() });
      setSchedules(next);
    }
    toast.success('Timetable updated');
    return updated;
  });

  const deleteSchedule = useAction<string, any>(async (id) => {
    const res = await api.delete<any>(`/timetable/${id}`);
    const next = (cache.get(cacheKey)?.data || schedules).filter((item) => item.id !== id);
    cache.set(cacheKey, { data: next, updatedAt: Date.now() });
    setSchedules(next);
    toast.success('Timetable entry deleted');
    return res?.data;
  });

  return {
    schedules, isLoading, refetch: () => load(),
    isAdding: addSchedule.isPending, isUpdating: updateSchedule.isPending,
    isDeleting: deleteSchedule.isPending,
    addSchedule: addSchedule.mutateAsync, updateSchedule: updateSchedule.mutateAsync,
    deleteSchedule: deleteSchedule.mutateAsync,
  };
};
