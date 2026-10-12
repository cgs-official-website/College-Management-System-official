import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';

function mutation<TArgs, TResult>(fn: (args: TArgs) => Promise<TResult>, onDone?: () => void) {
  return {
    isPending: false,
    mutateAsync: async (args: TArgs) => {
      const result = await fn(args);
      onDone?.();
      return result;
    },
  };
}

export function useColleges() {
  const [colleges, setColleges] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);

  const load = useCallback(async (silent = false) => {
    silent ? setIsRefetching(true) : setIsLoading(true);
    try {
      const res = await api.get<any>('/colleges');
      setColleges(Array.isArray(res?.data) ? res.data : []);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshAfter = useCallback(() => { load(true); }, [load]);

  const onboardCollege = useMemo(() => mutation<any, any>(async (payload) => {
    const res = await api.post<any>('/colleges/onboard', payload);
    await load(true);
    return res?.data ?? res;
  }), [load]);

  const updateCollegeStatus = useMemo(() => mutation<{ id: string; status: string }, any>(async ({ id, status }) => {
    const res = await api.put<any>(`/colleges/${id}/status`, { status });
    await load(true);
    return res;
  }), [load]);

  const deleteCollege = useMemo(() => mutation<string, any>(async (id) => {
    const res = await api.delete<any>(`/colleges/${id}`);
    await load(true);
    return res;
  }), [load]);

  const updateCollegeSubscription = useMemo(() => mutation<{ id: string; planTier: string; status: string; currentPeriodEnd: string | null }, any>(async ({ id, planTier, status, currentPeriodEnd }) => {
    const res = await api.put<any>(`/colleges/${id}/subscription`, { planTier, status, currentPeriodEnd });
    await load(true);
    return res?.data ?? res;
  }), [load]);

  const refetch = async (_silent = false) => { await load(true); };
  return { colleges, isLoading, isRefetching, refetch, onboardCollege, updateCollegeStatus, deleteCollege, updateCollegeSubscription };
}
