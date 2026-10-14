import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';

const asList = (res: any): any[] => (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);

/** Web: hooks/useProjects.js  (GET /projects, GET /projects/timesheets, POST /projects/timesheets) */
export const useProjects = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLogging, setIsLogging] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      setProjects(asList(await api.get<any>('/projects')));
    } catch {
      setProjects([]);
    }
  }, []);

  const loadTimesheets = useCallback(async () => {
    try {
      setTimesheets(asList(await api.get<any>('/projects/timesheets')));
    } catch {
      setTimesheets([]);
    }
  }, []);

  const refetch = useCallback(async () => {
    await Promise.all([loadProjects(), loadTimesheets()]);
  }, [loadProjects, loadTimesheets]);

  useEffect(() => {
    (async () => {
      await refetch();
      setIsLoading(false);
    })();
  }, [refetch]);

  const logHours = async (data: any) => {
    setIsLogging(true);
    try {
      const res = await api.post<any>('/projects/timesheets', data);
      toast.success('Hours logged successfully!');
      await loadTimesheets();
      return res?.data;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to log hours');
      throw err;
    } finally {
      setIsLogging(false);
    }
  };

  return { projects, timesheets, isLoading, isLogging, logHours, refetch };
};

export default useProjects;