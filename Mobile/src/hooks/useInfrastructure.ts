import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';

const unwrap = (res: any): any[] => {
  const d = res?.data?.data || res?.data || res;
  return Array.isArray(d) ? d : [];
};
const errMsg = (err: any, fallback: string) => err?.message || fallback;

const cache = new Map<string, { facilities: any[]; requests: any[] }>();

/** Web: hooks/useInfrastructure.js */
export function useInfrastructure(collegeId?: string | null) {
  const key = collegeId || 'default_college_id';
  const [facilities, setFacilities] = useState<any[]>(cache.get(key)?.facilities || []);
  const [requests, setRequests] = useState<any[]>(cache.get(key)?.requests || []);
  const [isLoading, setIsLoading] = useState(!cache.has(key));
  const [isRequestsLoading, setIsRequestsLoading] = useState(!cache.has(key));
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);

  const save = (next: { facilities?: any[]; requests?: any[] }) => {
    const cur = cache.get(key) || { facilities: [], requests: [] };
    cache.set(key, { ...cur, ...next });
  };

  const fetchFacilities = useCallback(async () => {
    try {
      const res = await api.get<any>('/infrastructure');
      const data = unwrap(res);
      setFacilities(data);
      save({ facilities: data });
    } catch {
      toast.error('Failed to load facilities');
    } finally {
      setIsLoading(false);
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.get<any>('/infrastructure/requests');
      const data = unwrap(res);
      setRequests(data);
      save({ requests: data });
    } catch {
      toast.error('Failed to load facility requests');
    } finally {
      setIsRequestsLoading(false);
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!collegeId) { setIsLoading(false); setIsRequestsLoading(false); return; }
    void fetchFacilities();
    void fetchRequests();
  }, [collegeId, fetchFacilities, fetchRequests]);

  const addFacility = async (data: any) => {
    setIsAdding(true);
    try {
      await api.post('/infrastructure', data);
      toast.success('Facility registered successfully!');
      await fetchFacilities();
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to add facility.'));
      throw err;
    } finally {
      setIsAdding(false);
    }
  };

  const updateFacility = async ({ id, data }: { id: string; data: any }) => {
    setIsUpdating(true);
    try {
      await api.put(`/infrastructure/${id}`, data);
      toast.success('Facility updated successfully!');
      await fetchFacilities();
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to update facility.'));
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteFacility = async (id: string) => {
    try {
      await api.delete(`/infrastructure/${id}`);
      toast.success('Facility removed');
      const next = facilities.filter((f) => f.id !== id);
      setFacilities(next);
      save({ facilities: next });
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to delete facility'));
      throw err;
    }
  };

  const createRequest = async (data: any) => {
    setIsRequesting(true);
    try {
      await api.post('/infrastructure/requests', data);
      toast.success('Permission request submitted to Admin!');
      await fetchRequests();
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to submit request.'));
      throw err;
    } finally {
      setIsRequesting(false);
    }
  };

  const reviewRequest = async ({ id, status, adminRemarks }: { id: string; status: string; adminRemarks?: string }) => {
    setIsReviewing(true);
    try {
      await api.put(`/infrastructure/requests/${id}/review`, { status, adminRemarks });
      toast.success(`Request ${status === 'approved' ? 'Approved' : 'Rejected'} successfully!`);
      await fetchRequests();
    } catch (err: any) {
      toast.error(errMsg(err, 'Failed to update request.'));
      throw err;
    } finally {
      setIsReviewing(false);
    }
  };

  return {
    facilities, requests, isLoading, isRequestsLoading,
    isAdding, isUpdating, isReviewing, isRequesting,
    addFacility, updateFacility, deleteFacility, createRequest, reviewRequest,
    refetch: async () => { await Promise.all([fetchFacilities(), fetchRequests()]); },
  };
}