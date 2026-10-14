import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';

export type TrafficRange = '24h' | '7d' | '30d' | '90d';

export interface TrafficPoint {
  label: string;
  pageViews: number;
  uniqueVisitors: number;
  totalRequests?: number;
  avgLatencyMs?: number;
}

export interface ModuleUsageItem {
  name: string;
  count: number;
  isActive: boolean;
  unit?: string;
}

export interface CollegeAnalysis {
  id: string;
  name: string;
  slug: string;
  status: string;
  users: { total: number; students: number; teachers: number; admins: number };
  activeModuleCount: number;
  totalModules: number;
  moduleAdoptionRate: number;
  activityScore: number;
  activityLevel: string;
  moduleUsage: Record<string, ModuleUsageItem>;
}

export interface LeaderboardItem {
  id: string;
  name: string;
  slug?: string;
  status?: string;
  requests: number;
  visitors?: number;
  bandwidthGB?: number;
  percentage?: number;
}

export interface TrafficLog {
  id?: string;
  timestamp?: string;
  method?: string;
  path?: string;
  collegeName?: string;
  status?: number;
  latencyMs?: number;
}

export interface TrafficData {
  monitoring: {
    colleges: { total: number; active: number; trial: number; activeRatePct: number };
    users: { total: number; active: number; pending: number; students: number; teachers: number };
    admins: { total: number; active: number; pending: number };
  };
  summary: {
    totalPageViews: number;
    totalUniqueVisitors: number;
    totalRequests: number;
    totalBandwidthGB: number;
    avgLatencyMs: number;
    liveActiveSessions: number;
    errorRatePct: number;
    healthStatus: string;
  };
  range?: string;
  collegeAnalysis: CollegeAnalysis[];
  timeline: TrafficPoint[];
  collegeTrafficLeaderboard: LeaderboardItem[];
  devices: { name: string; value: number; color?: string }[];
  browsers: { name: string; percentage: number; color?: string }[];
  liveLogs: TrafficLog[];
}

const EMPTY_SUMMARY: TrafficData['summary'] = {
  totalPageViews: 0,
  totalUniqueVisitors: 0,
  totalRequests: 0,
  totalBandwidthGB: 0,
  avgLatencyMs: 0,
  liveActiveSessions: 0,
  errorRatePct: 0,
  healthStatus: 'Unknown',
};

const MODULE_KEYS: [string, string, string][] = [
  ['attendance', 'Attendance', 'Records'],
  ['fees', 'Fee Ledger', 'Invoices'],
  ['assignments', 'Assignments', 'Tasks'],
  ['exams', 'Examinations', 'Exams'],
  ['courses', 'Courses & Depts', 'Programs'],
  ['transport', 'Transport', 'Routes'],
  ['hostel', 'Hostel', 'Blocks'],
  ['library', 'Library', 'Books'],
  ['store', 'Campus Store', 'Sales'],
];

/** Fills any field the backend left out so screens never crash on a partial payload. */
function normalize(raw: any): TrafficData {
  const monitoring = raw?.monitoring || {};
  const collegeAnalysis: CollegeAnalysis[] = (raw?.collegeAnalysis || []).map((c: any) => {
    const moduleUsage: Record<string, ModuleUsageItem> = {};
    MODULE_KEYS.forEach(([k, name, unit]) => {
      const m = c?.moduleUsage?.[k];
      moduleUsage[k] = { name: m?.name || name, count: Number(m?.count) || 0, isActive: !!m?.isActive, unit: m?.unit || unit };
    });
    return {
      id: String(c.id),
      name: c.name || 'Unnamed college',
      slug: c.slug || String(c.id),
      status: (c.status || 'active').toLowerCase(),
      users: {
        total: Number(c?.users?.total) || 0,
        students: Number(c?.users?.students) || 0,
        teachers: Number(c?.users?.teachers) || 0,
        admins: Number(c?.users?.admins) || 0,
      },
      activeModuleCount: Number(c.activeModuleCount) || 0,
      totalModules: Number(c.totalModules) || MODULE_KEYS.length,
      moduleAdoptionRate: Number(c.moduleAdoptionRate) || 0,
      activityScore: Number(c.activityScore) || 0,
      activityLevel: c.activityLevel || '-',
      moduleUsage,
    };
  });

  return {
    monitoring: {
      colleges: { total: 0, active: 0, trial: 0, activeRatePct: 0, ...(monitoring.colleges || {}) },
      users: { total: 0, active: 0, pending: 0, students: 0, teachers: 0, ...(monitoring.users || {}) },
      admins: { total: 0, active: 0, pending: 0, ...(monitoring.admins || {}) },
    },
    summary: { ...EMPTY_SUMMARY, ...(raw?.summary || {}) },
    range: raw?.range,
    collegeAnalysis,
    timeline: Array.isArray(raw?.timeline) ? raw.timeline : [],
    collegeTrafficLeaderboard: Array.isArray(raw?.collegeTrafficLeaderboard) ? raw.collegeTrafficLeaderboard : [],
    devices: Array.isArray(raw?.devices) ? raw.devices : [],
    browsers: Array.isArray(raw?.browsers) ? raw.browsers : [],
    liveLogs: Array.isArray(raw?.liveLogs) ? raw.liveLogs : [],
  };
}

/** Used only when GET /traffic/stats is unavailable: real college directory counts, NO invented traffic numbers. */
function buildFromColleges(list: any[]): TrafficData {
  const active = list.filter((c) => (c.status || 'active') === 'active');
  const admins = list.reduce((a, c) => a + (c.users?.filter((u: any) => u.role === 'admin')?.length || 0), 0);
  const users = list.reduce((a, c) => a + (c.users?.length || 0), 0);
  return normalize({
    monitoring: {
      colleges: {
        total: list.length,
        active: active.length,
        trial: Math.max(0, list.length - active.length),
        activeRatePct: list.length ? Math.round((active.length / list.length) * 100) : 0,
      },
      users: { total: users, active: users },
      admins: { total: admins, active: admins },
    },
    collegeAnalysis: list.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      status: c.status,
      users: {
        total: c.users?.length || 0,
        admins: c.users?.filter((u: any) => u.role === 'admin')?.length || 0,
      },
    })),
  });
}

/** Super Admin traffic + all-college monitoring. Web: SuperTraffic.jsx (GET /traffic/stats?range=). */
export function useTraffic(range: TrafficRange) {
  const [data, setData] = useState<TrafficData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  /** true when /traffic/stats failed and we are showing the college directory only */
  const [isFallback, setIsFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      const id = ++reqId.current;
      silent ? setIsRefetching(true) : setIsLoading(true);
      try {
        const res = await api.get<any>('/traffic/stats', { params: { range } });
        const payload = res?.data ?? (res?.monitoring ? res : null);
        if (payload && (payload.monitoring || payload.summary || payload.timeline || payload.collegeAnalysis)) {
          if (id !== reqId.current) return;
          setData(normalize(payload));
          setIsFallback(false);
          setError(null);
          return;
        }
        throw new Error('Unexpected traffic response');
      } catch (e: any) {
        try {
          const colRes = await api.get<any>('/colleges');
          if (id !== reqId.current) return;
          setData(buildFromColleges(Array.isArray(colRes?.data) ? colRes.data : []));
          setIsFallback(true);
          setError(e?.message || null);
        } catch (e2: any) {
          if (id !== reqId.current) return;
          setError(e2?.message || e?.message || 'Failed to load traffic data');
        }
      } finally {
        if (id === reqId.current) {
          setIsLoading(false);
          setIsRefetching(false);
        }
      }
    },
    [range],
  );

  useEffect(() => {
    load();
  }, [load]);

  const refetch = useCallback(() => load(true), [load]);
  return { data, isLoading, isRefetching, isFallback, error, refetch };
}
