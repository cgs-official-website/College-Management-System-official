import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  User, 
  GraduationCap, 
  Filter,
  Loader2,
  FileText
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/apiClient';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { Pagination } from '../../../components/ui/Pagination';
import toast from 'react-hot-toast';

export default function LeaveRequestsDashboard() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, approved, rejected
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Fetch leave requests
  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['admin-leaves'],
    queryFn: async () => {
      const res = await api.get('/leaves');
      const raw = res?.data ?? res;
      return Array.isArray(raw) ? raw : [];
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      const res = await api.patch(`/leaves/${id}/status`, { status });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-leaves'] });
      toast.success(`Leave request marked as ${variables.status}!`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to update status');
    }
  });

  const handleAction = async (id, studentName, status) => {
    const isApproved = status === 'approved';
    const isConfirmed = await confirm({
      title: isApproved ? 'Approve Leave Request' : 'Reject Leave Request',
      message: `Are you sure you want to ${status} the leave request submitted by ${studentName}?`,
      confirmText: isApproved ? 'Approve' : 'Reject',
      type: isApproved ? 'primary' : 'danger'
    });

    if (isConfirmed) {
      updateStatusMutation.mutate({ id, status });
    }
  };

  // Filter & paginate
  const filtered = leaves.filter((l) => {
    const matchesSearch = 
      (l.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.admissionNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.reason || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter !== 'all') {
      return matchesSearch && (l.status || '').toLowerCase() === statusFilter;
    }
    return matchesSearch;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const pendingCount = leaves.filter(l => (l.status || '').toLowerCase() === 'pending').length;
  const approvedCount = leaves.filter(l => (l.status || '').toLowerCase() === 'approved').length;
  const rejectedCount = leaves.filter(l => (l.status || '').toLowerCase() === 'rejected').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Leave Requests Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Review, evaluate, and manage student attendance leave applications and medical leave reasons.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Total Applications', value: leaves.length, icon: Calendar, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Pending Approval', value: pendingCount, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { title: 'Approved', value: approvedCount, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Rejected', value: rejectedCount, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                  {isLoading ? '...' : stat.value}
                </h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student, admission no, department..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { label: 'All Requests', value: 'all' },
            { label: 'Pending', value: 'pending' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' }
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === f.value
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="py-4 px-6">Student Details</th>
                <th className="py-4 px-6">Academic Info</th>
                <th className="py-4 px-6">Duration</th>
                <th className="py-4 px-6">Reason / Details</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
                    Loading leave requests...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Calendar className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    No leave requests found matching your filter.
                  </td>
                </tr>
              ) : (
                paginated.map((item) => {
                  const from = new Date(item.fromDate);
                  const to = new Date(item.toDate);
                  const daysDiff = Math.max(1, Math.round((to - from) / (1000 * 60 * 60 * 24)) + 1);
                  const status = (item.status || 'pending').toLowerCase();

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {item.studentName?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{item.studentName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{item.studentEmail}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{item.admissionNumber}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {item.department} {item.section ? `• Sec ${item.section}` : ''}
                        </p>
                      </td>

                      <td className="py-4 px-6">
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          {from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          {daysDiff} {daysDiff === 1 ? 'day' : 'days'}
                        </span>
                      </td>

                      <td className="py-4 px-6 max-w-xs">
                        <p className="text-slate-700 dark:text-slate-300 text-xs line-clamp-2" title={item.reason}>
                          {item.reason}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Applied: {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </td>

                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : status === 'rejected'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                        }`}>
                          {status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        {status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAction(item.id, item.studentName, 'approved')}
                              disabled={updateStatusMutation.isPending}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleAction(item.id, item.studentName, 'rejected')}
                              disabled={updateStatusMutation.isPending}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">
                            Reviewed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > pageSize && (
          <div className="p-4 border-t border-slate-200 dark:border-white/10 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filtered.length / pageSize)}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
