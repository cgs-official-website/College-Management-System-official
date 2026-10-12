import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';
import { syncChannel } from '../utils/syncChannel';

/** Web: hooks/useNotices.js  (GET/POST/PUT/DELETE /notices) */
export function useNotices(collegeId?: string | null) {
  const [notices, setNotices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchNotices = useCallback(async () => {
    if (!collegeId) { setIsLoading(false); return; }
    try {
      const res = await api.get<any>('/notices');
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setNotices(list);
    } catch (error: any) {
      toast.error('Failed to load notices');
    } finally {
      setIsLoading(false);
    }
  }, [collegeId]);

  useEffect(() => { void fetchNotices(); }, [fetchNotices]);

  const addNotice = async (data: any) => {
    setIsAdding(true);
    try {
      await api.post('/notices', data);
      toast.success('Notice published successfully!');
      await fetchNotices();
      syncChannel.publish('notices');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to publish notice.');
      throw error;
    } finally {
      setIsAdding(false);
    }
  };

  const updateNotice = async ({ id, data }: { id: string; data: any }) => {
    setIsUpdating(true);
    try {
      await api.put(`/notices/${id}`, data);
      toast.success('Notice updated successfully.');
      await fetchNotices();
      syncChannel.publish('notices');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update notice.');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteNotice = async (id: string) => {
    try {
      await api.delete(`/notices/${id}`);
      toast.success('Notice deleted');
      await fetchNotices();
      syncChannel.publish('notices');
    } catch {
      toast.error('Failed to delete notice');
    }
  };

  return { notices, isLoading, addNotice, updateNotice, deleteNotice, isAdding, isUpdating, refresh: fetchNotices, refetch: fetchNotices };
}

export default useNotices;