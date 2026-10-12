import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';

export interface InventoryFilters {
  categoryId?: string;
  search?: string;
  status?: string;
  includeArchived?: boolean;
  auditLogs?: {
    movementType?: string;
    inventoryItemId?: string;
    categoryId?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  };
}

const qs = (obj: Record<string, any>) => {
  const p = Object.entries(obj)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return p.length ? `?${p.join('&')}` : '';
};
const list = (res: any): any[] => (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);

let categoriesCache: any[] = [];

/** Web: hooks/useInventory.js (products, categories, audit logs/movements). */
export const useInventory = (filters: InventoryFilters = {}, tab: 'products' | 'categories' | 'audit-logs' = 'products') => {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>(categoriesCache);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(!categoriesCache.length);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isAuditLogsLoading, setIsAuditLogsLoading] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const itemsReq = useRef(0);
  const auditReq = useRef(0);

  const a = filters.auditLogs || {};
  const itemsKey = `${filters.categoryId || ''}|${filters.search || ''}|${filters.status || ''}|${filters.includeArchived ? 1 : 0}`;
  const auditKey = `${a.movementType || ''}|${a.inventoryItemId || ''}|${a.categoryId || ''}|${a.search || ''}|${a.startDate || ''}|${a.endDate || ''}`;

  const fetchItems = useCallback(async () => {
    const id = ++itemsReq.current;
    try {
      const res = await api.get<any>(
        `/inventory${qs({
          categoryId: filters.categoryId,
          search: filters.search,
          status: filters.status,
          includeArchived: filters.includeArchived ? 'true' : undefined,
        })}`,
      );
      if (id === itemsReq.current) setItems(list(res));
    } catch (err: any) {
      if (id === itemsReq.current) toast.error(err?.message || 'Failed to load inventory');
    } finally {
      if (id === itemsReq.current) setIsLoading(false);
    }
  }, [itemsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCategories = useCallback(async () => {
    try {
      const res = await api.get<any>('/inventory/categories');
      const data = list(res);
      categoriesCache = data;
      setCategories(data);
    } catch {
      /* silent */
    } finally {
      setIsCategoriesLoading(false);
    }
  }, []);

  const fetchAudit = useCallback(async () => {
    const id = ++auditReq.current;
    setIsAuditLogsLoading(true);
    try {
      const res = await api.get<any>(`/inventory/audit-logs${qs(a)}`);
      if (id === auditReq.current) setAuditLogs(list(res));
    } catch {
      /* silent */
    } finally {
      if (id === auditReq.current) setIsAuditLogsLoading(false);
    }
  }, [auditKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void fetchItems(); }, [fetchItems]);
  useEffect(() => { void fetchCategories(); }, [fetchCategories]);
  // audit logs are only fetched while that tab is open (keeps the other tabs light)
  useEffect(() => { if (tab === 'audit-logs') void fetchAudit(); }, [tab, fetchAudit]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchItems(), fetchCategories(), tab === 'audit-logs' ? fetchAudit() : Promise.resolve()]);
  }, [fetchItems, fetchCategories, fetchAudit, tab]);

  const run = async <T,>(name: string, fn: () => Promise<T>, success: string, failure: string): Promise<T> => {
    setBusy((b) => ({ ...b, [name]: true }));
    try {
      const out = await fn();
      toast.success(success);
      await refreshAll();
      return out;
    } catch (err: any) {
      toast.error(err?.message || failure);
      throw err;
    } finally {
      setBusy((b) => ({ ...b, [name]: false }));
    }
  };

  const createItem = (payload: any) =>
    run('create', async () => (await api.post<any>('/inventory', payload))?.data, 'Product added successfully!', 'Failed to add product');
  const updateItem = ({ id, ...payload }: any) =>
    run('update', async () => (await api.put<any>(`/inventory/${id}`, payload))?.data, 'Product updated successfully!', 'Failed to update product');
  const deleteItem = (id: string) =>
    run('delete', async () => (await api.delete<any>(`/inventory/${id}`))?.data, 'Product removed successfully!', 'Failed to remove product');
  const bulkImport = (rows: any[]) =>
    run('import', async () => {
      const res = await api.post<any>('/inventory/bulk', { data: rows });
      const stats = res?.data || {};
      if (stats.failed > 0) toast.error(`${stats.failed} row(s) failed.`);
      return stats;
    }, 'Inventory import completed!', 'Failed to import inventory');

  const createCategory = (payload: any) =>
    run('createCat', async () => (await api.post<any>('/inventory/categories', payload))?.data, 'Category created!', 'Failed to create category');
  const updateCategory = ({ id, ...payload }: any) =>
    run('updateCat', async () => (await api.patch<any>(`/inventory/categories/${id}`, payload))?.data, 'Category updated!', 'Failed to update category');
  const deleteCategory = (id: string) =>
    run('deleteCat', async () => (await api.delete<any>(`/inventory/categories/${id}`))?.data, 'Category deleted!', 'Failed to delete category');

  const recordMovement = (payload: any) =>
    run('movement', async () => (await api.post<any>('/inventory/movements', payload))?.data,
      payload.movementType === 'INBOUND' ? 'Inbound stock added successfully!' : 'Outbound stock issued successfully!',
      'Failed to record stock movement');

  return {
    items, isLoading, categories, isCategoriesLoading, auditLogs, isAuditLogsLoading,
    isCreating: !!busy.create, isUpdating: !!busy.update, isDeleting: !!busy.delete, isImporting: !!busy.import,
    isCreatingCategory: !!busy.createCat, isUpdatingCategory: !!busy.updateCat, isDeletingCategory: !!busy.deleteCat,
    isRecordingMovement: !!busy.movement,
    createItem, updateItem, deleteItem, bulkImport,
    createCategory, updateCategory, deleteCategory, recordMovement,
    refetch: refreshAll,
  };
};