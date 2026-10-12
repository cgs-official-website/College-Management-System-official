import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

export function useEmailTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);

  const load = useCallback(async (silent = false) => {
    silent ? setIsRefetching(true) : setIsLoading(true);
    try {
      const res = await api.get<any>('/email-templates');
      setTemplates(Array.isArray(res?.data) ? res.data : []);
    } finally {
      setIsLoading(false);
      setIsRefetching(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateTemplate = {
    isPending: false,
    mutateAsync: async (payload: { id: string; name: string; subject: string; status?: string; contentHtml?: string }) => {
      const res = await api.put<any>(`/email-templates/${payload.id}`, payload);
      const updated = res?.data;
      if (updated) setTemplates((prev) => prev.map((t) => (t.id === payload.id ? updated : t)));
      return res;
    },
  };

  return { templates, isLoading, isRefetching, refetch: load, updateTemplate };
}
