import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';

const errMsg = (err: any, fallback: string) => err?.message || fallback;

const EMPTY_STATS = { totalBlocks: 0, totalCapacity: 0, occupiedBeds: 0, occupancyRate: '0%' };

/** Web: hooks/useHostel.js  (GET/POST/DELETE /hostel, GET /hostel/students, PUT /hostel/students/:id/room, POST /hostel/bulk) */
export function useHostel(collegeId?: string | null) {
  const [items, setItems] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(EMPTY_STATS);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isAssigningRoom, setIsAssigningRoom] = useState(false);

  const fetchBlocks = useCallback(async () => {
    try {
      const res = await api.get<any>('/hostel');
      const rows = Array.isArray(res?.data) ? res.data : [];
      setItems(rows);
      setStats(res?.stats || { ...EMPTY_STATS, totalBlocks: rows.length });
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to load hostel blocks'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await api.get<any>('/hostel/students');
      setStudents(Array.isArray(res?.data) ? res.data : []);
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to load hosteller students'));
    } finally {
      setIsLoadingStudents(false);
    }
  }, []);

  useEffect(() => {
    if (!collegeId) { setIsLoading(false); setIsLoadingStudents(false); return; }
    void fetchBlocks();
    void fetchStudents();
  }, [collegeId, fetchBlocks, fetchStudents]);

  const createItem = async (newItem: any) => {
    setIsAdding(true);
    try {
      const res = await api.post<any>('/hostel', newItem);
      toast.success('Hostel block created successfully!');
      await fetchBlocks();
      return res?.data;
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to create hostel block'));
      throw err;
    } finally {
      setIsAdding(false);
    }
  };

  const deleteItem = async (id: string) => {
    setIsDeleting(true);
    try {
      await api.delete(`/hostel/${id}`);
      toast.success('Hostel block removed.');
      await Promise.all([fetchBlocks(), fetchStudents()]);
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to delete hostel block'));
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  const assignRoom = async ({ id, hostelBlockId, hostelRoom }: { id: string; hostelBlockId: string; hostelRoom: string }) => {
    setIsAssigningRoom(true);
    try {
      const res = await api.put<any>(`/hostel/students/${id}/room`, { hostelBlockId, hostelRoom });
      toast.success('Room assigned successfully!');
      await fetchStudents();
      return res?.data;
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to assign room'));
      throw err;
    } finally {
      setIsAssigningRoom(false);
    }
  };

  const bulkImport = async (data: any[]) => {
    setIsImporting(true);
    try {
      const res = await api.post<any>('/hostel/bulk', { data });
      const result = res?.data || {};
      toast.success(`Imported ${result.successful || 0} rooms successfully!`);
      if (result.failed > 0) toast.error(`${result.failed} failed.`);
      await fetchBlocks();
      return res;
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to bulk import hostel rooms'));
      throw err;
    } finally {
      setIsImporting(false);
    }
  };

  return {
    items, stats, students,
    isLoading, isLoadingStudents, isAdding, isDeleting, isImporting, isAssigningRoom,
    createItem, deleteItem, assignRoom, bulkImport,
    refetch: async () => { await Promise.all([fetchBlocks(), fetchStudents()]); },
  };
}

export default useHostel;