import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';
import { syncChannel } from '../utils/syncChannel';

const cache = new Map<string, any[]>();

/** Web: hooks/useFees.js */
export function useFees(collegeId?: string | null) {
  const key = collegeId || 'default_college_id';
  const [fees, setFees] = useState<any[]>(cache.get(key) || []);
  const [isLoading, setIsLoading] = useState(!cache.has(key));
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchFees = useCallback(async (silent = false) => {
    if (!collegeId) { setIsLoading(false); return; }
    if (!silent && !cache.has(key)) setIsLoading(true);
    try {
      const res = await api.get<any>('/fees');
      const data = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      cache.set(key, data);
      setFees(data);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load fee records');
    } finally {
      setIsLoading(false);
    }
  }, [collegeId, key]);

  useEffect(() => { void fetchFees(); }, [fetchFees]);

  const addFee = async (data: any) => {
    setIsAdding(true);
    try {
      const res = await api.post<any>('/fees', data);
      toast.success('Fee record created successfully!');
      await fetchFees(true);
      syncChannel.publish('fees');
      return res;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record fee.');
      throw err;
    } finally {
      setIsAdding(false);
    }
  };

  const updateFee = async ({ id, data }: { id: string; data: any }) => {
    setIsUpdating(true);
    try {
      const res = await api.put<any>(`/fees/${id}`, data);
      toast.success('Fee record updated successfully!');
      await fetchFees(true);
      syncChannel.publish('fees');
      return res;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update fee record.');
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteFee = async (id: string) => {
    try {
      const res = await api.delete<any>(`/fees/${id}`);
      toast.success('Fee record deleted.');
      const next = (cache.get(key) || []).filter((f) => f.id !== id);
      cache.set(key, next);
      setFees(next);
      syncChannel.publish('fees');
      return res;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete fee record.');
      throw err;
    }
  };

  return { fees, isLoading, isAdding, isUpdating, addFee, updateFee, deleteFee, refetch: () => fetchFees(true) };
}