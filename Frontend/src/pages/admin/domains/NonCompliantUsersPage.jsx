import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Users, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Globe, 
  ArrowLeft, 
  Mail, 
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../../services/apiClient';

export default function NonCompliantUsersPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['non-compliant-users', page, limit, search, roleFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', limit);
      if (search.trim()) params.set('search', search.trim());
      if (roleFilter) params.set('role', roleFilter);

      const res = await api.get(`/domains/non-compliant-users?${params.toString()}`);
      return res.data?.data || res.data || {};
    },
    keepPreviousData: true,
  });

  const users = data?.users || [];
  const pagination = data?.pagination || { total: 0, page: 1, limit: 20, totalPages: 0 };
  const verifiedDomains = data?.verifiedDomains || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              to="/admin/domains"
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0F1C] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
              title="Back to Domain Management"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Non-Compliant Email Audit</span>
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Staff and students whose email addresses do not match your verified institutional domains.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/domains"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-primary-500 dark:hover:border-primary-500 bg-white dark:bg-[#0A0F1C] text-slate-700 dark:text-slate-200 text-sm font-semibold transition-all shadow-sm"
          >
            <Globe className="w-4 h-4 text-primary-500" />
            <span>Manage Domains</span>
          </Link>
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0F1C] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Verified Domains Badge Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Active Verified Domains:</span>
          {verifiedDomains.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 ml-1">
              {verifiedDomains.map((vd) => (
                <span
                  key={vd}
                  className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 font-mono text-xs font-bold"
                >
                  @{vd}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-normal italic">
              None verified yet (All domains permitted)
            </span>
          )}
        </div>

        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Total Flagged: <strong className="text-slate-900 dark:text-white">{pagination.total}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2.5 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/30 transition-all shadow-sm"
          >
            <option value="">All Roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="staff">Staff</option>
            <option value="hod">HOD</option>
          </select>
        </div>
      </div>

      {/* Main Content States */}
      {isLoading ? (
        <div className="p-12 text-center bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-3" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading audit records...</p>
        </div>
      ) : isError ? (
        <div className="p-8 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-3xl text-red-600 dark:text-red-400">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2" />
          <p className="font-semibold text-sm">Failed to load non-compliant users audit.</p>
          <p className="text-xs mt-1 text-slate-500">{error?.message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all"
          >
            Retry
          </button>
        </div>
      ) : verifiedDomains.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#0A0F1C] border border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
          <Globe className="w-12 h-12 mx-auto text-amber-500 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Verified Domains Yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Until your college configures and verifies an official domain, all email addresses are accepted and no accounts will appear non-compliant.
          </p>
          <Link
            to="/admin/domains"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs shadow-md transition-all"
          >
            Go to Domain Management
          </Link>
        </div>
      ) : users.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">100% Institution Compliance</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            All active students, teachers, and staff members have email addresses matching your verified institutional domains.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">User</th>
                  <th className="py-3.5 px-6">Role</th>
                  <th className="py-3.5 px-6">Non-Compliant Email</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {users.map((u) => {
                  const roleCls = 
                    u.role === 'student'
                      ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/20'
                      : u.role === 'teacher' || u.role === 'hod'
                      ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/20'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-xs">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white leading-tight">
                              {u.name || 'Unnamed User'}
                            </p>
                            <p className="text-[11px] font-mono text-slate-400">
                              ID: {u.id?.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase ${roleCls}`}>
                          {u.role}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-rose-600 dark:text-rose-400 font-semibold bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-500/20">
                            {u.email}
                          </span>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 capitalize">
                          {u.accountStatus || 'Active'}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-xs text-slate-500">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="p-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <div>
                Showing page <strong className="text-slate-900 dark:text-white">{pagination.page}</strong> of{' '}
                <strong className="text-slate-900 dark:text-white">{pagination.totalPages}</strong>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={pagination.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
