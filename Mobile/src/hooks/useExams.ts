import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';

function useAction<A, R>(fn: (args: A) => Promise<R>) {
  const [isPending, setIsPending] = useState(false);
  const ref = useRef(fn); ref.current = fn;
  const mutateAsync = useCallback(async (args: A) => {
    setIsPending(true);
    try { return await ref.current(args); } finally { setIsPending(false); }
  }, []);
  return { isPending, mutateAsync };
}

export const useExams = (collegeId?: string | null, options: { courseId?: string } = {}) => {
  const [exams, setExams] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!collegeId) { setExams([]); setIsLoading(false); return; }
    try {
      const q = options.courseId && options.courseId !== 'ALL' ? `?courseId=${options.courseId}` : '';
      const res = await api.get<any>(`/exams${q}`);
      setExams(Array.isArray(res?.data) ? res.data : []);
    } finally { setIsLoading(false); }
  }, [collegeId, options.courseId]);

  useEffect(() => { setIsLoading(true); load(); }, [load]);

  const addExam = useAction<any, any>(async (data) => {
    const res = await api.post<any>('/exams', data);
    await load(); toast.success('Exam scheduled successfully');
    return res?.data;
  });
  const updateExam = useAction<{ id: string; data: any }, any>(async ({ id, data }) => {
    const res = await api.put<any>(`/exams/${id}`, data);
    await load(); toast.success('Exam updated');
    return res?.data;
  });
  const deleteExam = useAction<string, any>(async (id) => {
    const res = await api.delete<any>(`/exams/${id}`);
    await load(); toast.success('Exam deleted');
    return res?.data;
  });

  return {
    exams, isLoading, refetch: load,
    isAdding: addExam.isPending, isUpdating: updateExam.isPending, isDeleting: deleteExam.isPending,
    addExam: addExam.mutateAsync, updateExam: updateExam.mutateAsync, deleteExam: deleteExam.mutateAsync,
  };
};
