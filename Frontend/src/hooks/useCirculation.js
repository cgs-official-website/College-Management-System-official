import { useState, useCallback } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const errMsg = (e, fallback) => e?.response?.data?.error?.message || e?.message || fallback;

export function useCirculation() {
  const [transactions, setTransactions] = useState([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  const fetchTransactions = useCallback(async (params = {}) => {
    setIsLoading(true);
    try {
      const query = new URLSearchParams(
        Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
      ).toString();
      const res = await api.get(`/library/transactions${query ? `?${query}` : ''}`);
      setTransactions(res.data || []);
      setMeta(res.meta || { page: 1, totalPages: 1, total: 0 });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error(errMsg(error, 'Failed to load circulation records'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const searchStudents = useCallback(async (q) => {
    try {
      const res = await api.get(`/library/students/search?q=${encodeURIComponent(q)}`);
      return res.data || [];
    } catch (error) {
      console.error('Student search failed:', error);
      return [];
    }
  }, []);

  const getStudentSummary = useCallback(async (studentId) => {
    try {
      const res = await api.get(`/library/students/${studentId}/summary`);
      return res.data;
    } catch (error) {
      toast.error(errMsg(error, 'Failed to load student details'));
      return null;
    }
  }, []);

  const issueBook = async (payload) => {
    setIsWorking(true);
    try {
      const res = await api.post('/library/issue', payload);
      toast.success('Book issued successfully!');
      return res.data;
    } catch (error) {
      toast.error(errMsg(error, 'Failed to issue book'));
      throw error;
    } finally {
      setIsWorking(false);
    }
  };

  const returnBook = async (id, payload) => {
    setIsWorking(true);
    try {
      const res = await api.post(`/library/return/${id}`, payload);
      const fine = Number(res.data?.fineAmount || 0);
      if (fine > 0) toast(`Returned. Fine of ₹${fine.toFixed(2)} recorded.`, { icon: '⚠️' });
      else toast.success('Book returned successfully!');
      return res.data;
    } catch (error) {
      toast.error(errMsg(error, 'Failed to return book'));
      throw error;
    } finally {
      setIsWorking(false);
    }
  };

  const renewBook = async (id) => {
    setIsWorking(true);
    try {
      const res = await api.post(`/library/renew/${id}`);
      toast.success('Loan renewed!');
      return res.data;
    } catch (error) {
      toast.error(errMsg(error, 'Failed to renew loan'));
      throw error;
    } finally {
      setIsWorking(false);
    }
  };

  const fetchSettings = useCallback(async () => {
    try {
      const res = await api.get('/library/settings');
      return res.data;
    } catch (error) {
      toast.error(errMsg(error, 'Failed to load library settings'));
      return null;
    }
  }, []);

  const saveSettings = async (payload) => {
    setIsWorking(true);
    try {
      const res = await api.put('/library/settings', payload);
      toast.success('Library settings saved!');
      return res.data;
    } catch (error) {
      toast.error(errMsg(error, 'Failed to save settings'));
      throw error;
    } finally {
      setIsWorking(false);
    }
  };

  return {
    transactions, meta, isLoading, isWorking,
    fetchTransactions, searchStudents, getStudentSummary,
    issueBook, returnBook, renewBook,
    fetchSettings, saveSettings,
  };
}