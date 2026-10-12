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

/*
 * Module-level cache:
 * Student Directory keeps its 52 records when the screen is unmounted.
 * Returning to the module therefore renders cached data immediately.
 */
type CacheEntry = { students: any[]; fetchedAt: number };
const studentsCache = new Map<string, CacheEntry>();
const pendingRequests = new Map<string, Promise<any[]>>();
const CACHE_TTL = 2 * 60 * 1000;

function getCache(collegeId?: string | null) {
  if (!collegeId) return null;
  const entry = studentsCache.get(collegeId);
  if (!entry) return null;
  return {
    students: entry.students,
    fresh: Date.now() - entry.fetchedAt < CACHE_TTL,
  };
}

function setCache(collegeId: string, students: any[]) {
  studentsCache.set(collegeId, { students, fetchedAt: Date.now() });
}

function invalidateCache(collegeId?: string | null) {
  if (collegeId) studentsCache.delete(collegeId);
}

async function fetchStudents(collegeId: string) {
  const existing = pendingRequests.get(collegeId);
  if (existing) return existing;

  const request = api
    .get<any>(`/students?collegeId=${collegeId}`)
    .then((res) => {
      const students = Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res)
          ? (res as any)
          : [];
      setCache(collegeId, students);
      return students;
    })
    .finally(() => pendingRequests.delete(collegeId));

  pendingRequests.set(collegeId, request);
  return request;
}

export function useStudents(collegeId?: string | null) {
  const cached = getCache(collegeId);
  const [students, setStudents] = useState<any[]>(cached?.students ?? []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async (force = false) => {
    if (!collegeId) {
      setIsLoading(false);
      return;
    }

    const current = getCache(collegeId);

    // Fast navigation path: show cached students immediately.
    if (current && !force) {
      setStudents(current.students);
      setIsLoading(false);
      if (current.fresh) return;
    }

    // Never clear visible data while refreshing.
    if (!current && students.length === 0) setIsLoading(true);

    try {
      const next = await fetchStudents(collegeId);
      setStudents(next);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [collegeId, students.length]);

  useEffect(() => {
    load(false);
  }, [load]);

  const addStudent = useAction<any, any>(async (newStudent) => {
    try {
      const res = await api.post<any>('/students', newStudent);
      const created = res?.data?.student ?? res?.data;

      if (collegeId && created && typeof created === 'object') {
        setStudents((current) => {
          const next = [created, ...current];
          setCache(collegeId, next);
          return next;
        });
      } else {
        invalidateCache(collegeId);
        await load(true);
      }

      toast.success('Student added successfully!');
      return res;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add student');
      throw err;
    }
  });

  const updateStudent = useAction<{ id: string; data: any }, any>(
    async ({ id, data }) => {
      try {
        const res = await api.put<any>(`/students/${id}`, data);
        setStudents((current) => {
          const next = current.map((s) =>
            String(s?.id) === String(id)
              ? { ...s, ...data, ...(res?.data ?? {}) }
              : s,
          );
          if (collegeId) setCache(collegeId, next);
          return next;
        });
        toast.success('Student record updated!');
        return res;
      } catch (err: any) {
        toast.error(err?.message || 'Failed to update student');
        throw err;
      }
    },
  );

  const deleteStudent = useAction<string, any>(async (id) => {
    try {
      const res = await api.delete<any>(`/students/${id}`);
      setStudents((current) => {
        const next = current.filter((s) => String(s?.id) !== String(id));
        if (collegeId) setCache(collegeId, next);
        return next;
      });
      toast.success('Student deleted successfully.');
      return res;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete student');
      throw err;
    }
  });

  const activateStudent = useAction<string, any>(async (id) => {
    try {
      const res = await api.patch<any>(`/students/${id}/activate`);
      setStudents((current) => {
        const next = current.map((s) =>
          String(s?.id) === String(id)
            ? { ...s, status: 'active', isActive: true, ...(res?.data ?? {}) }
            : s,
        );
        if (collegeId) setCache(collegeId, next);
        return next;
      });
      return res;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to activate student');
      throw err;
    }
  });

  const bulkImport = useAction<any[], any>(async (data) => {
    try {
      const res = await api.post<any>('/students/bulk', { data });
      const stats = res?.data || {};
      invalidateCache(collegeId);
      await load(true);
      toast.success(`Imported ${stats.successful || 0} students successfully!`);
      if (stats.failed > 0) toast.error(`${stats.failed} failed.`);
      return res;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to bulk import students');
      throw err;
    }
  });

  return {
    students,
    isLoading,
    isAdding: addStudent.isPending,
    isUpdating: updateStudent.isPending,
    isDeleting: deleteStudent.isPending,
    isImporting: bulkImport.isPending,
    error,
    refetch: () => load(true),
    addStudent: addStudent.mutateAsync,
    updateStudent: updateStudent.mutateAsync,
    deleteStudent: deleteStudent.mutateAsync,
    activateStudent: activateStudent.mutateAsync,
    bulkImport: bulkImport.mutateAsync,
  };
}

export function useStudent(id?: string | null) {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(!!id);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    let alive = true;
    setIsLoading(true);

    api
      .get<any>(`/students/${id}`)
      .then((res) => {
        if (alive) {
          setData(res?.data ?? null);
          setError(null);
        }
      })
      .catch((e) => alive && setError(e))
      .finally(() => alive && setIsLoading(false));

    return () => {
      alive = false;
    };
  }, [id]);

  return { data, isLoading, error };
}
