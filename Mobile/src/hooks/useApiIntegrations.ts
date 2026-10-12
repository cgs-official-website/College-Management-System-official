import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { toast } from '../utils/toast';

/** Web: hooks/useApiIntegrations.js  (GET/POST /integrations) */
export function useApiIntegrations() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/integrations');
      setIntegrations(Array.isArray(res?.data) ? res.data : []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load integration settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const saveIntegration = async (payload: any) => {
    setIsSaving(true);
    try {
      const res = await api.post<any>('/integrations', payload);
      toast.success('Integration settings saved successfully!');
      await load();
      return res?.data;
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save integration settings');
      throw err;
    } finally {
      setIsSaving(false);
    }
  };

  return { integrations, isLoading, isSaving, saveIntegration, refetch: load };
}

export default useApiIntegrations;