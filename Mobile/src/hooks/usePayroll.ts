import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

function useAction<A, R>(fn: (args: A) => Promise<R>) {
  const [isPending, setIsPending] = useState(false);
  const ref = useRef(fn);
  ref.current = fn;
  const mutateAsync = useCallback(async (args: A) => {
    setIsPending(true);
    try { return await ref.current(args); } finally { setIsPending(false); }
  }, []);
  return { isPending, mutateAsync };
}

const asList = (res: any): any[] => (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);

/** Web: usePayrolls(filters) -> GET /payroll?month&year&status */
export const usePayrolls = (filters: { month?: number; year?: number; status?: string } = {}) => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const reqId = useRef(0);

  const load = useCallback(async (silent = false) => {
    const id = ++reqId.current;
    if (!silent) setIsLoading(true);
    try {
      const params: Record<string, any> = {};
      Object.entries(filters || {}).forEach(([k, v]) => {
        if (v !== '' && v !== null && v !== undefined) params[k] = v;
      });
      const res = await api.get<any>('/payroll', { params });
      if (id !== reqId.current) return;
      setData(asList(res));
      setIsError(false);
    } catch {
      if (id === reqId.current) setIsError(true);
    } finally {
      if (id === reqId.current) setIsLoading(false);
    }
  }, [filters?.month, filters?.year, filters?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void load(); }, [load]);
  return { data, isLoading, isError, refetch: () => load(true) };
};

export const useMyPayslips = () => {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/payroll/my-payslips');
      setData(asList(res));
    } catch {
      setData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return { data, isLoading, refetch: load };
};

/** Same record mapping as web usePayroll() (used by staff/teacher payslip screens). */
export const usePayroll = () => {
  const query = useMyPayslips();
  const records = query.data.map((r: any) => ({
    ...r,
    basicSalary: r.basicPay ?? r.basicSalary ?? 0,
    allowances: r.allowances ?? ((r.hra || 0) + (r.da || 0) + (r.specialAllowance || 0)),
    deductions: r.deductions ?? ((r.pf || 0) + (r.esi || 0) + (r.pt || 0) + (r.tds || 0) + (r.otherDeductions || 0)),
    netSalary: r.netPay ?? r.netSalary ?? 0,
    month: r.month ? `${new Date(0, r.month - 1).toLocaleString('default', { month: 'long' })} ${r.year}` : r.month,
  }));
  return { ...query, records };
};

export const useCreatePayslip = () =>
  useAction<any, any>(async (payload) => {
    const res = await api.post<any>('/payroll', payload);
    return res?.data || res;
  });

export const useBulkImportPayrolls = () =>
  useAction<any[], any>(async (rows) => {
    const res = await api.post<any>('/payroll/bulk-import', rows);
    return res;
  });

export const useUpdatePayrollStatus = () =>
  useAction<{ id: string; data: any }, any>(async ({ id, data }) => {
    const res = await api.patch<any>(`/payroll/${id}/status`, data);
    return res?.data || res;
  });