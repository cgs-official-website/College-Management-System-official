import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';

const list = (res: any): any[] => (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
const qs = (o: Record<string, any>) => {
  const p = Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return p.length ? `?${p.join('&')}` : '';
};

export interface StoreFilters { search?: string; categoryId?: string; status?: 'active' | 'inactive' | 'all' }

/** Backend: modules/store (items, categories, restock/adjust, sales, bulk) */
export function useStore(filters: StoreFilters = {}, tab: 'products' | 'sale' | 'history' | 'categories' = 'products') {
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);
  const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
  const [sales, setSales] = useState<any[]>([]);
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [isSalesLoading, setIsSalesLoading] = useState(false);
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const itemsReq = useRef(0);

  const key = `${filters.search || ''}|${filters.categoryId || ''}|${filters.status || 'active'}`;

  const fetchItems = useCallback(async () => {
    const id = ++itemsReq.current;
    try {
      const res = await api.get<any>(`/store${qs({ search: filters.search, categoryId: filters.categoryId, status: filters.status || 'active' })}`);
      if (id === itemsReq.current) setItems(list(res));
    } catch (err: any) {
      if (id === itemsReq.current) toast.error(err?.message || 'Failed to load store items');
    } finally {
      if (id === itemsReq.current) setIsLoading(false);
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCategories = useCallback(async () => {
    try {
      setCategories(list(await api.get<any>('/store/categories')));
    } catch { /* silent */ } finally {
      setIsCategoriesLoading(false);
    }
  }, []);

  const fetchSales = useCallback(async () => {
    setIsSalesLoading(true);
    try {
      const res: any = await api.get<any>('/store/sales?limit=100');
      setSales(list(res));
      setSalesSummary(res?.meta?.summary || null);
    } catch { /* silent */ } finally {
      setIsSalesLoading(false);
    }
  }, []);

  useEffect(() => { void fetchItems(); }, [fetchItems]);
  useEffect(() => { void fetchCategories(); }, [fetchCategories]);
  useEffect(() => { if (tab === 'history') void fetchSales(); }, [tab, fetchSales]);

  const refetch = useCallback(async () => {
    await Promise.all([fetchItems(), fetchCategories(), tab === 'history' ? fetchSales() : Promise.resolve()]);
  }, [fetchItems, fetchCategories, fetchSales, tab]);

  const run = async <T,>(name: string, fn: () => Promise<T>, ok: string, fail: string, after: 'all' | 'items' = 'all'): Promise<T> => {
    setBusy((b) => ({ ...b, [name]: true }));
    try {
      const out = await fn();
      toast.success(ok);
      if (after === 'items') await fetchItems(); else await refetch();
      return out;
    } catch (err: any) {
      toast.error(err?.message || fail);
      throw err;
    } finally {
      setBusy((b) => ({ ...b, [name]: false }));
    }
  };

  /** GET /store/:id/movements -> stock history (latest first, max 200) */
  const getMovements = async (id: string): Promise<any[]> => {
    try {
      return list(await api.get<any>(`/store/${id}/movements`));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load stock history');
      return [];
    }
  };

  /** POST /store/upload (multipart, field 'image') -> { imageUrl, imagePublicId } */
  const uploadImage = async (file: { uri: string; name: string; type: string }) => {
    const fd = new FormData();
    fd.append('image', { uri: file.uri, name: file.name, type: file.type } as any);
    try {
      const res = await api.post<any>('/store/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      return res?.data as { imageUrl: string; imagePublicId: string };
    } catch (err: any) {
      toast.error(err?.message || 'Failed to upload image');
      throw err;
    }
  };

  const createItem = (p: any) => run('create', async () => (await api.post<any>('/store', p))?.data, 'Item created!', 'Failed to create item');
  const updateItem = ({ id, ...p }: any) => run('update', async () => (await api.patch<any>(`/store/${id}`, p))?.data, 'Item updated!', 'Failed to update item');
  const deleteItem = (id: string) => run('delete', async () => (await api.delete<any>(`/store/${id}`))?.data, 'Item removed', 'Failed to remove item');
  const restockItem = ({ id, quantity, note }: any) => run('restock', async () => (await api.post<any>(`/store/${id}/restock`, { quantity, note }))?.data, 'Stock added!', 'Failed to restock');
  const adjustItem = ({ id, newStock, note }: any) => run('adjust', async () => (await api.post<any>(`/store/${id}/adjust`, { newStock, note }))?.data, 'Stock adjusted!', 'Failed to adjust stock');
  const bulkImport = (rows: any[]) =>
    run('import', async () => {
      const res = await api.post<any>('/store/bulk', { data: rows });
      const stats = res?.data || {};
      if (stats.failed > 0) toast.error(`${stats.failed} row(s) failed.`);
      return stats;
    }, 'Store import completed!', 'Failed to import items');

  const createCategory = (p: any) => run('createCat', async () => (await api.post<any>('/store/categories', p))?.data, 'Category created!', 'Failed to create category');
  const updateCategory = ({ id, ...p }: any) => run('updateCat', async () => (await api.patch<any>(`/store/categories/${id}`, p))?.data, 'Category updated!', 'Failed to update category');
  const deleteCategory = (id: string) => run('deleteCat', async () => (await api.delete<any>(`/store/categories/${id}`))?.data, 'Category deleted!', 'Failed to delete category');

  const createSale = (p: any) => run('sale', async () => (await api.post<any>('/store/sales', p))?.data, 'Sale recorded!', 'Failed to record sale');

  return {
    items, isLoading, categories, isCategoriesLoading, sales, salesSummary, isSalesLoading,
    isCreating: !!busy.create, isUpdating: !!busy.update, isImporting: !!busy.import, isRestocking: !!busy.restock || !!busy.adjust,
    isSavingCategory: !!busy.createCat || !!busy.updateCat, isSelling: !!busy.sale,
    getMovements, uploadImage, createItem, updateItem, deleteItem, restockItem, adjustItem, bulkImport,
    createCategory, updateCategory, deleteCategory, createSale, refetch,
  };
}