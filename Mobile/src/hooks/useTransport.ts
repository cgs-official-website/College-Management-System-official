import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';

const errMsg = (err: any, fallback: string) => err?.message || fallback;

/** Web: hooks/useTransport.js  (GET/POST/DELETE /transport, POST /transport/bulk) */
export function useTransport(collegeId?: string | null) {
  const [items, setItems] = useState<any[]>([]);
  const [serverStats, setServerStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/transport');
      const rows = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : Array.isArray(res?.items) ? res.items : [];
      setItems(rows);
      setServerStats(res?.stats || null);
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to load transport routes'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!collegeId) { setIsLoading(false); return; }
    void load();
  }, [collegeId, load]);

  const stats = {
    totalBuses: serverStats?.totalBuses ?? items.length,
    activeRoutes: serverStats?.activeRoutes ?? items.filter((r) => r.status !== 'Maintenance').length,
    registeredStudents: serverStats?.registeredStudents ?? items.reduce((acc, r) => acc + (r.studentsCount || 0), 0),
    qrScansToday: serverStats?.qrScansToday ?? (items.length > 0 ? items.length * 45 : 0),
  };

  const createItem = async (newItem: any) => {
    setIsAdding(true);
    try {
      const res = await api.post<any>('/transport', newItem);
      toast.success('Transport route created successfully!');
      await load();
      return res;
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to create transport route'));
      throw err;
    } finally {
      setIsAdding(false);
    }
  };

  const deleteItem = async (id: string) => {
    setIsDeleting(true);
    try {
      await api.delete(`/transport/${id}`);
      toast.success('Transport route removed.');
      await load();
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to delete transport route'));
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  const bulkImport = async (data: any[]) => {
    setIsImporting(true);
    try {
      const res = await api.post<any>('/transport/bulk', { data });
      const result = res?.data || res || {};
      const count = result.successful ?? res?.successful ?? 0;
      toast.success(`Imported ${count} transport route${count === 1 ? '' : 's'} successfully!`);
      if (result.failed > 0) toast.error(`${result.failed} row(s) failed.`);
      await load();
      return res;
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to bulk import transport routes'));
      throw err;
    } finally {
      setIsImporting(false);
    }
  };

  return { items, stats, isLoading, isAdding, isDeleting, isImporting, createItem, deleteItem, bulkImport, refetch: load };
}

export default useTransport;