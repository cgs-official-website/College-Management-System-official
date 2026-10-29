import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/apiClient';
import toast from 'react-hot-toast';

const errMsg = (err, fallback) =>
  err?.data?.error?.message || err?.response?.data?.error?.message || err?.message || fallback;

export function useExamTypes() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['exam-center', 'types'],
    queryFn: async () => (await api.get('/exam-center/types')).data || [],
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['exam-center', 'types'] });

  const create = useMutation({
    mutationFn: (data) => api.post('/exam-center/types', data),
    onSuccess: () => { toast.success('Exam type created'); invalidate(); },
    onError: (e) => toast.error(errMsg(e, 'Failed to create exam type')),
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => api.put(`/exam-center/types/${id}`, data),
    onSuccess: () => { toast.success('Exam type updated'); invalidate(); },
    onError: (e) => toast.error(errMsg(e, 'Failed to update exam type')),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/exam-center/types/${id}`),
    onSuccess: () => { toast.success('Exam type deleted'); invalidate(); },
    onError: (e) => toast.error(errMsg(e, 'Failed to delete exam type')),
  });

  return {
    examTypes: q.data || [],
    isLoading: q.isLoading,
    createType: create.mutateAsync,
    updateType: update.mutateAsync,
    deleteType: remove.mutateAsync,
    isSaving: create.isPending || update.isPending,
  };
}

export function useSchedulePreview({ examTypeId, courseId, semester }) {
  const enabled = !!(examTypeId && courseId && semester);
  const q = useQuery({
    queryKey: ['exam-center', 'preview', examTypeId, courseId, semester],
    enabled,
    queryFn: async () => {
      const p = new URLSearchParams({ examTypeId, courseId, semester });
      return (await api.get(`/exam-center/schedule/preview?${p}`)).data || null;
    },
  });
  return { preview: q.data || null, isLoading: q.isLoading && enabled };
}

export function useSchedule(filters = {}) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['exam-center', 'schedule', filters],
    queryFn: async () => {
      const p = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v); });
      return (await api.get(`/exam-center/schedule?${p}`)).data || [];
    },
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['exam-center'] });

  const create = useMutation({
    mutationFn: (data) => api.post('/exam-center/schedule', data),
    onSuccess: (res) => { toast.success(`${res?.data?.count || 0} exams scheduled`); invalidate(); },
    onError: (e) => toast.error(errMsg(e, 'Failed to schedule exams')),
  });
  const update = useMutation({
    mutationFn: ({ id, data }) => api.put(`/exam-center/schedule/${id}`, data),
    onSuccess: () => { toast.success('Exam updated'); invalidate(); },
    onError: (e) => toast.error(errMsg(e, 'Failed to update exam')),
  });
  const remove = useMutation({
    mutationFn: (id) => api.delete(`/exam-center/schedule/${id}`),
    onSuccess: () => { toast.success('Exam removed'); invalidate(); },
    onError: (e) => toast.error(errMsg(e, 'Failed to remove exam')),
  });

  return {
    schedule: q.data || [],
    isLoading: q.isLoading,
    createSchedule: create.mutateAsync,
    updateItem: update.mutateAsync,
    deleteItem: remove.mutateAsync,
    isCreating: create.isPending,
  };
}

export function useReview({ examTypeId, courseId, semester }) {
  const qc = useQueryClient();
  const enabled = !!(examTypeId && courseId && semester);
  const q = useQuery({
    queryKey: ['exam-center', 'review', examTypeId, courseId, semester],
    enabled,
    queryFn: async () => {
      const p = new URLSearchParams({ examTypeId, courseId, semester });
      return (await api.get(`/exam-center/review?${p}`)).data || null;
    },
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['exam-center', 'review'] });

  const act = useMutation({
    mutationFn: (data) => api.post('/exam-center/review/action', data),
    onSuccess: (_r, vars) => {
      toast.success(vars.action === 'publish' ? 'Published to students' : vars.action === 'send_back' ? 'Sent back to teacher' : 'Withdrawn');
      invalidate();
    },
    onError: (e) => toast.error(errMsg(e, 'Action failed')),
  });
  const publishAll = useMutation({
    mutationFn: (data) => api.post('/exam-center/review/publish-all', data),
    onSuccess: (res) => { toast.success(`${res?.data?.published || 0} subject(s) published`); invalidate(); },
    onError: (e) => toast.error(errMsg(e, 'Publish failed')),
  });

  return {
    review: q.data || null,
    isLoading: q.isLoading && enabled,
    act: act.mutateAsync,
    publishAll: publishAll.mutateAsync,
  };
}