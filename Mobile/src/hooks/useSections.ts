import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';

function useAction<A, R>(fn: (args: A) => Promise<R>) {
  const [isPending, setIsPending] = useState(false);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const mutateAsync = useCallback(async (args: A) => {
    setIsPending(true);
    try {
      return await fnRef.current(args);
    } finally {
      setIsPending(false);
    }
  }, []);
  return { isPending, mutateAsync };
}

/** Web: hooks/useSections.js. `enabled:false` skips the request (e.g. no course chosen yet). */
export const useSections = (courseId: string | null = null, options: { enabled?: boolean } = {}) => {
  const enabled = options.enabled ?? true;
  const [sections, setSections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setSections([]);
      setIsLoading(false);
      return;
    }
    try {
      const url = courseId ? `/sections?courseId=${courseId}` : '/sections';
      const res = await api.get<any>(url);
      setSections(Array.isArray(res?.data) ? res.data : []);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [courseId, enabled]);

  useEffect(() => {
    setIsLoading(enabled);
    load();
  }, [load, enabled]);

  const createSection = useAction<any, any>(async (data) => {
    const res = await api.post<any>('/sections', data);
    await load();
    return res?.data;
  });

  const updateSection = useAction<{ id: string; data: any }, any>(async ({ id, data }) => {
    const res = await api.put<any>(`/sections/${id}`, data);
    await load();
    return res?.data;
  });

  const deleteSection = useAction<string, any>(async (id) => {
    const res = await api.delete<any>(`/sections/${id}`);
    await load();
    return res?.data;
  });

  const bulkImport = useAction<any[], any>(async (data) => {
    try {
      const res = await api.post<any>('/sections/bulk', { data });
      const stats = res?.data || {};
      toast.success(`Imported ${stats.successful || 0} sections successfully!`);
      if (stats.failed > 0) toast.error(`${stats.failed} failed.`);
      await load();
      return res;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to bulk import sections');
      throw err;
    }
  });

  return { sections, isLoading, error, refetch: load, createSection, updateSection, deleteSection, bulkImport };
};