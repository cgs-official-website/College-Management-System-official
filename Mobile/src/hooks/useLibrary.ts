import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';

const cache = new Map<string, any[]>();

/** Web: hooks/useLibrary.js */
export function useLibrary(collegeId?: string | null) {
  const key = collegeId || 'default_college_id';
  const [books, setBooks] = useState<any[]>(cache.get(key) || []);
  const [isLoading, setIsLoading] = useState(!cache.has(key));
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const fetchBooks = useCallback(async (silent = false) => {
    if (!collegeId) { setIsLoading(false); return; }
    if (!silent && !cache.has(key)) setIsLoading(true);
    try {
      const res = await api.get<any>('/library');
      const data = Array.isArray(res?.data) ? res.data : [];
      cache.set(key, data);
      setBooks(data);
    } catch {
      toast.error('Failed to load library inventory');
    } finally {
      setIsLoading(false);
    }
  }, [collegeId, key]);

  useEffect(() => { void fetchBooks(); }, [fetchBooks]);

  const addBook = async (data: any) => {
    setIsAdding(true);
    try {
      await api.post('/library', data);
      toast.success('Book added to inventory!');
      await fetchBooks(true);
    } catch (err) {
      toast.error('Failed to add book.');
      throw err;
    } finally {
      setIsAdding(false);
    }
  };

  const updateBook = async ({ id, data }: { id: string; data: any }) => {
    setIsUpdating(true);
    try {
      await api.put(`/library/${id}`, data);
      toast.success('Book details updated!');
      await fetchBooks(true);
    } catch (err) {
      toast.error('Failed to update book.');
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteBook = async (id: string) => {
    try {
      await api.delete(`/library/${id}`);
      const next = (cache.get(key) || []).filter((b) => b.id !== id);
      cache.set(key, next);
      setBooks(next);
      toast.success('Book removed from inventory.');
    } catch (err) {
      toast.error('Failed to remove book.');
      throw err;
    }
  };

  const bulkImport = async (rows: any[]) => {
    setIsImporting(true);
    try {
      const res = await api.post<any>('/library/bulk', { data: rows });
      const stats = res?.data || {};
      toast.success(`Imported ${stats.successful || 0} books successfully!`);
      if (stats.failed > 0) toast.error(`${stats.failed} failed.`);
      await fetchBooks(true);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to bulk import books.');
      throw err;
    } finally {
      setIsImporting(false);
    }
  };

  return { books, isLoading, isAdding, isUpdating, isImporting, addBook, updateBook, deleteBook, bulkImport, refetch: () => fetchBooks(true) };
}

// ---------------------------------------------------------------------------
// Circulation + settings (Backend: modules/library/library.circulation.controller.js)
// ---------------------------------------------------------------------------
const listOf = (res: any): any[] => (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? (res as any) : []);

export function useLibraryCirculation(filter: 'active' | 'overdue' | 'returned' | 'all' = 'active', enabled = true) {
  const [loans, setLoans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBusy, setIsBusy] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    const params: Record<string, any> = { limit: 100 };
    if (filter === 'active') params.status = 'ISSUED';
    if (filter === 'overdue') params.overdue = 'true';
    if (filter === 'returned') params.status = 'RETURNED';
    try {
      const res = await api.get<any>('/library/transactions', { params });
      setLoans(listOf(res));
    } catch {
      setLoans([]);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, filter]);
  useEffect(() => { setIsLoading(true); void load(); }, [load]);

  const run = async (fn: () => Promise<any>, ok: string, fail: string) => {
    setIsBusy(true);
    try {
      await fn();
      toast.success(ok);
      await load();
    } catch (err: any) {
      toast.error(err?.message || fail);
      throw err;
    } finally {
      setIsBusy(false);
    }
  };

  const issueBook = (payload: { studentId: string; bookId: string }) =>
    run(() => api.post('/library/issue', payload), 'Book issued successfully!', 'Failed to issue book.');
  const returnBook = (id: string, condition: 'GOOD' | 'DAMAGED' | 'LOST' = 'GOOD') =>
    run(() => api.post(`/library/return/${id}`, { condition }), 'Book returned.', 'Failed to return book.');
  const renewBook = (id: string) =>
    run(() => api.post(`/library/renew/${id}`, {}), 'Loan renewed.', 'Failed to renew loan.');

  return { loans, isLoading, isBusy, issueBook, returnBook, renewBook, refetch: load };
}

/** GET /library/students/search?q= (min 2 chars) */
export async function searchLibraryStudents(q: string): Promise<any[]> {
  try {
    const res = await api.get<any>('/library/students/search', { params: { q } });
    return listOf(res);
  } catch {
    return [];
  }
}

/** GET /library/students/:id/summary -> { canBorrow, blockedReason, activeLoans, pendingFines, limit } */
export async function getLibraryStudentSummary(studentId: string): Promise<any | null> {
  try {
    const res = await api.get<any>(`/library/students/${studentId}/summary`);
    return res?.data || null;
  } catch {
    return null;
  }
}

export const DEFAULT_LIBRARY_SETTINGS = { loanDays: 14, maxBooksPerStudent: 3, maxRenewals: 2, graceDays: 0, finePerDay: 2 };

export function useLibrarySettings(enabled = true) {
  const [settings, setSettings] = useState<any>(DEFAULT_LIBRARY_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await api.get<any>('/library/settings');
      setSettings({ ...DEFAULT_LIBRARY_SETTINGS, ...(res?.data || {}) });
    } catch {
      /* keep defaults */
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);
  useEffect(() => { void load(); }, [load]);

  const saveSettings = async (data: any) => {
    setIsSaving(true);
    try {
      const res = await api.put<any>('/library/settings', data);
      setSettings({ ...DEFAULT_LIBRARY_SETTINGS, ...(res?.data || data) });
      toast.success('Library settings saved!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save settings.');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return { settings, isLoading, isSaving, saveSettings };
}