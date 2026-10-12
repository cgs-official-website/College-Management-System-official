import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';

const errMsg = (err: any, fallback: string) => err?.message || fallback;

/** Web: hooks/useComplaints.js  (GET/POST/PATCH/DELETE /complaints) */
export function useComplaints() {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/complaints');
      setItems(Array.isArray(res?.data) ? res.data : []);
      setIsError(false);
    } catch (err: any) {
      setIsError(true);
      toast.error(errMsg(err, 'Failed to load complaints'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createItem = async (newItem: any) => {
    setIsCreating(true);
    try {
      const res = await api.post<any>('/complaints', newItem);
      toast.success('Complaints item created successfully');
      await load();
      return res?.data;
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to create complaints item'));
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  const updateItem = async ({ id, ...data }: { id: string; [k: string]: any }) => {
    setIsUpdating(true);
    try {
      const res = await api.patch<any>(`/complaints/${id}`, data);
      toast.success('Complaint status updated successfully');
      await load();
      return res?.data;
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to update complaint'));
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteItem = async (id: string) => {
    setIsDeleting(true);
    try {
      await api.delete(`/complaints/${id}`);
      toast.success('Complaints item deleted successfully');
      await load();
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to delete complaints item'));
      throw err;
    } finally {
      setIsDeleting(false);
    }
  };

  return { items, isLoading, isError, isCreating, isUpdating, isDeleting, createItem, updateItem, deleteItem, refetch: load };
}

export default useComplaints;