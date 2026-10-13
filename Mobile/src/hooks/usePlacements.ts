import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';
import { syncChannel } from '../utils/syncChannel';

const errMsg = (err: any, fallback: string) => err?.message || fallback;

/** Web: hooks/usePlacements.js  (GET/POST/DELETE /placements) */
export function usePlacements(collegeId?: string | null) {
  const [items, setItems] = useState<any[]>([]);
  const [serverStats, setServerStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/placements');
      setItems(Array.isArray(res?.data) ? res.data : []);
      setServerStats(res?.stats || null);
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to load placement drives'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!collegeId) { setIsLoading(false); return; }
    void load();
    // keep in sync when another screen publishes a placements change (web: broadcastSync('placements'))
    return syncChannel.subscribe('placements', () => { void load(); });
  }, [collegeId, load]);

  const stats = serverStats || { totalDrives: items.length, studentsPlaced: 0, topCtc: '0 LPA' };

  const createItem = async (newItem: any) => {
    setIsAdding(true);
    try {
      const res = await api.post<any>('/placements', newItem);
      syncChannel.publish('placements');
      toast.success('Placement drive added successfully!');
      await load();
      return res?.data;
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to add placement drive'));
      throw err;
    } finally {
      setIsAdding(false);
    }
  };

  const deleteItem = async (id: string) => {
    setIsDeleting(true);
    try {
      await api.delete(`/placements/${id}`);
      syncChannel.publish('placements');
      toast.success('Placement drive removed.');
      await load();
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to delete placement drive'));
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  return { items, stats, isLoading, isAdding, isDeleting, createItem, deleteItem, refetch: load };
}

export default usePlacements;