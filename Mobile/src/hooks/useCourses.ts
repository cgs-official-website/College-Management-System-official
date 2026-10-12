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

/** Web: hooks/useCourses.js */
export const useCourses = (departmentId: string | null = null) => {
  const [courses, setCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const url = departmentId ? `/courses?departmentId=${departmentId}` : '/courses';
      const res = await api.get<any>(url);
      setCourses(Array.isArray(res?.data) ? res.data : []);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [departmentId]);

  useEffect(() => {
    setIsLoading(true);
    load();
  }, [load]);

  const createCourse = useAction<any, any>(async (data) => {
    const res = await api.post<any>('/courses', data);
    await load();
    return res?.data;
  });

  const updateCourse = useAction<{ id: string; data: any }, any>(async ({ id, data }) => {
    const res = await api.put<any>(`/courses/${id}`, data);
    await load();
    return res?.data;
  });

  const deleteCourse = useAction<string, any>(async (id) => {
    const res = await api.delete<any>(`/courses/${id}`);
    await load();
    return res?.data;
  });

  const bulkImport = useAction<any[], any>(async (data) => {
    try {
      const res = await api.post<any>('/courses/bulk', { data });
      const stats = res?.data || {};
      toast.success(`Imported ${stats.successful || 0} courses successfully!`);
      if (stats.failed > 0) toast.error(`${stats.failed} failed.`);
      await load();
      return res;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to bulk import courses');
      throw err;
    }
  });

  return { courses, isLoading, error, refetch: load, createCourse, updateCourse, deleteCourse, bulkImport };
};