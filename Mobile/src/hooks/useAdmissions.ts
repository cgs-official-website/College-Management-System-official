import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';

function useAction<A, R>(fn: (args: A) => Promise<R>) {
  const [isPending, setIsPending] = useState(false);
  const ref = useRef(fn);
  ref.current = fn;

  const mutateAsync = useCallback(async (args: A) => {
    setIsPending(true);
    try {
      return await ref.current(args);
    } finally {
      setIsPending(false);
    }
  }, []);

  return { isPending, mutateAsync };
}

/** Web parity: Frontend/src/hooks/useAdmissions.js -> /admin/admissions */
export const useAdmissions = (collegeId?: string | null) => {
  const [admissions, setAdmissions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const load = useCallback(async () => {
    if (!collegeId) {
      setAdmissions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.get<any>('/admin/admissions');
      setAdmissions(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
      setError(null);
    } catch (err: any) {
      setAdmissions([]);
      setError(err);
      // Do not rethrow from the effect path: this prevents the React Native
      // "Uncaught (in promise)" red screen for a normal API error.
      toast.error(err?.message || 'Failed to load admissions.');
    } finally {
      setIsLoading(false);
    }
  }, [collegeId]);

  useEffect(() => {
    load();
  }, [load]);

  const addAdmission = useAction<any, any>(async (data) => {
    try {
      const res = await api.post<any>('/admin/admissions/apply', data);
      await load();
      toast.success('Admission application created');
      return res?.data;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create admission application.');
      throw err;
    }
  });

  const updateAdmission = useAction<{ id: string; data: any }, any>(async ({ id, data }) => {
    try {
      const res = await api.put<any>(`/admin/admissions/${id}`, data);
      await load();
      toast.success('Admission updated');
      return res?.data;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update admission.');
      throw err;
    }
  });

  const deleteAdmission = useAction<string, any>(async (id) => {
    try {
      const res = await api.delete<any>(`/admin/admissions/${id}`);
      await load();
      toast.success('Application deleted');
      return res?.data;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete application.');
      throw err;
    }
  });

  const allotSeat = useAction<string, any>(async (id) => {
    try {
      const res = await api.post<any>('/admin/admissions/allot', { admissionId: id });
      await load();
      toast.success('Seat approved and allotted');
      return res?.data;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to approve the application.');
      throw err;
    }
  });

  return {
    admissions,
    isLoading,
    error,
    refetch: load,
    isAdding: addAdmission.isPending,
    isUpdating: updateAdmission.isPending,
    isDeleting: deleteAdmission.isPending,
    isAllotting: allotSeat.isPending,
    addAdmission: addAdmission.mutateAsync,
    updateAdmission: updateAdmission.mutateAsync,
    deleteAdmission: deleteAdmission.mutateAsync,
    allotSeat: allotSeat.mutateAsync,
  };
};
