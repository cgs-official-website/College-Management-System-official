import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export function useCalendar(initialFilters = {}) {
  const { userData, userRole } = useAuth();
  const collegeId = userData?.collegeId || userData?.college?.id;

  const [events, setEvents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filters, setFilters] = useState(initialFilters);

  useEffect(() => {
    setFilters(initialFilters);
  }, [
    initialFilters.type,
    initialFilters.month,
    initialFilters.year,
    initialFilters.search,
    initialFilters.startDate,
    initialFilters.endDate,
    initialFilters.targetAudience
  ]);

  // Role Rule check: College Admins, Principals, and HODs
  const normalizedRole = String(userRole || userData?.role || '').toLowerCase();
  const customRoleName = String(userData?.customRole?.name || userData?.customRoleName || '').toLowerCase();
  const designation = String(userData?.designation || userData?.teacherProfile?.designation || '').toLowerCase();

  const isHod = normalizedRole === 'hod' ||
                normalizedRole.includes('hod') ||
                Boolean(userData?.isHod) ||
                Boolean(userData?.isHOD) ||
                customRoleName === 'hod' ||
                customRoleName.includes('hod') ||
                designation === 'hod' ||
                designation.includes('hod') ||
                designation.includes('head of department');

  const isAdmin = normalizedRole === 'admin' || normalizedRole === 'superadmin' || normalizedRole === 'principal';
  const initialCanManage = isAdmin;

  const [backendCanManage, setBackendCanManage] = useState(null);
  const [userDepartment, setUserDepartment] = useState(null);
  const canManage = backendCanManage !== null ? (isAdmin && backendCanManage) : isAdmin;

  const fetchEvents = useCallback(async (customFilters) => {
    setIsLoading(true);
    try {
      const activeFilters = customFilters || filters;
      const params = new URLSearchParams();
      if (collegeId) params.append('collegeId', collegeId);
      if (activeFilters.type && activeFilters.type !== 'all') params.append('type', activeFilters.type);
      if (activeFilters.month) params.append('month', activeFilters.month);
      if (activeFilters.year) params.append('year', activeFilters.year);
      if (activeFilters.search) params.append('search', activeFilters.search);
      if (activeFilters.startDate) params.append('startDate', activeFilters.startDate);
      if (activeFilters.endDate) params.append('endDate', activeFilters.endDate);
      if (activeFilters.targetAudience && activeFilters.targetAudience !== 'all') {
        params.append('targetAudience', activeFilters.targetAudience);
      }

      const qs = params.toString();
      const response = await api.get(qs ? `/calendar/events?${qs}` : '/calendar/events');

      const raw = response?.data || response;
      const canManageVal = response?.canManage !== undefined
        ? response.canManage
        : (response?.data?.canManage !== undefined
          ? response.data.canManage
          : (raw?.canManage !== undefined ? raw.canManage : null));

      if (canManageVal !== null && canManageVal !== undefined) {
        setBackendCanManage(Boolean(canManageVal));
      }

      const deptVal = response?.userDepartment || response?.data?.userDepartment || raw?.userDepartment;
      if (deptVal) {
        setUserDepartment(deptVal);
      }

      let list = [];
      if (Array.isArray(response)) {
        list = response;
      } else if (Array.isArray(response?.data)) {
        list = response.data;
      } else if (Array.isArray(response?.data?.data)) {
        list = response.data.data;
      }

      setEvents(list);
    } catch (error) {
      // If server returned 404 (route warming up or unmounted), fall back to empty list gracefully
      if (error?.status === 404 || error?.code === 'ECONNREFUSED') {
        console.warn('[useCalendar] Calendar endpoint pending/offline, defaulting to empty state.');
        setEvents([]);
      } else if (error?.status !== 403) {
        toast.error(error?.message || 'Failed to load calendar events');
        setEvents([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [collegeId, filters]);

  const fetchSummary = useCallback(async () => {
    try {
      const qs = collegeId ? `?collegeId=${collegeId}` : '';
      const res = await api.get(`/calendar/summary${qs}`);
      const sum = res?.data || res;
      if (sum && typeof sum === 'object') {
        setSummary(sum);
      }
    } catch (_) {
      // Non-blocking summary load
    }
  }, [collegeId]);

  useEffect(() => {
    fetchEvents();
    fetchSummary();
  }, [fetchEvents, fetchSummary]);

  const addEvent = async (eventData) => {
    if (!canManage) {
      toast.error('Only College Admins and HODs can schedule calendar events or exams.');
      throw new Error('Unauthorized');
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...eventData,
        collegeId
      };
      const res = await api.post('/calendar/events', payload);
      toast.success(payload.type === 'exam' ? 'Exam scheduled successfully!' : 'Event created successfully!');
      await fetchEvents();
      fetchSummary();
      return res?.data || res;
    } catch (error) {
      const errMsg = error.response?.data?.error || error.message || 'Failed to create calendar item';
      toast.error(errMsg);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateEvent = async (id, eventData) => {
    if (!canManage) {
      toast.error('Only College Admins and HODs can edit calendar events or exams.');
      throw new Error('Unauthorized');
    }
    setIsSubmitting(true);
    try {
      const payload = {
        ...eventData,
        collegeId
      };
      const res = await api.put(`/calendar/events/${id}`, payload);
      toast.success('Calendar item updated successfully!');
      
      const updated = res?.data?.data || res?.data || res;
      if (updated && updated.id) {
        setEvents((prev) =>
          prev.map((ev) => (ev.id === id ? { ...ev, ...updated } : ev))
        );
      }

      await fetchEvents();
      fetchSummary();
      return res?.data || res;
    } catch (error) {
      const errMsg = error.response?.data?.error || error.message || 'Failed to update calendar item';
      toast.error(errMsg);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteEvent = async (id) => {
    if (!canManage) {
      toast.error('Only College Admins and HODs can delete calendar events or exams.');
      throw new Error('Unauthorized');
    }
    setIsSubmitting(true);
    try {
      const qs = collegeId ? `?collegeId=${collegeId}` : '';
      await api.delete(`/calendar/events/${id}${qs}`);
      toast.success('Item deleted from calendar.');
      setEvents((prev) => prev.filter((ev) => ev.id !== id));
      await fetchEvents();
      fetchSummary();
    } catch (error) {
      const errMsg = error.response?.data?.error || error.message || 'Failed to delete calendar item';
      toast.error(errMsg);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const applySaturdayRule = async ({ year, month, rule }) => {
    if (!canManage) {
      toast.error('Only College Admins and HODs can configure Saturday holidays.');
      throw new Error('Unauthorized');
    }
    setIsSubmitting(true);
    try {
      const payload = {
        collegeId,
        year,
        month,
        rule
      };
      const res = await api.post('/calendar/saturday-rule', payload);
      toast.success(res?.data?.message || 'Saturday holidays configured successfully!');
      await fetchEvents();
      fetchSummary();
      return res?.data || res;
    } catch (error) {
      const errMsg = error.response?.data?.error || error.message || 'Failed to configure Saturday holidays';
      toast.error(errMsg);
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    events,
    summary,
    isLoading,
    isSubmitting,
    canManage,
    isAdmin,
    isHod,
    userData,
    userRole: normalizedRole,
    userDepartment,
    filters,
    setFilters,
    fetchEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    applySaturdayRule
  };
}
