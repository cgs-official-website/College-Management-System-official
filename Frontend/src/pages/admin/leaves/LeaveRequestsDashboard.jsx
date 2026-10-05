import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  GraduationCap,
  Briefcase,
  X,
  Mail,
  FileText,
  Download
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/apiClient';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Pagination } from '../../../components/ui/Pagination';
import toast from 'react-hot-toast';

const TYPE_TABS = [
  { value: 'employee', label: 'Employee Leaves', icon: Briefcase },
  { value: 'student', label: 'Student Leaves', icon: GraduationCap }
];

const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' }
];

const cardTitleMap = {
  employee: 'Employee Leave Requests',
  student: 'Student Leave Requests'
};

const typeOf = (l) =>
  l.applicantType || (l.requesterRole === 'student' ? 'student' : 'employee');

export default function LeaveRequestsDashboard() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();

  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  useEffect(() => {
    if (!isAdmin) setTypeFilter('student');
  }, [isAdmin]);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('employee'); 
  const [statusFilter, setStatusFilter] = useState('all'); 
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const pageSize = 8;

  const effectiveType = isAdmin ? typeFilter : 'student';

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ['admin-leaves'],
    queryFn: async () => {
      const res = await api.get('/leaves');
      const raw = res?.data ?? res;
      return Array.isArray(raw) ? raw : [];
    }
  });

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

  const handleAction = async (id, name, status) => {
    const isApproved = status === 'approved';
    const ok = await confirm({
      title: isApproved ? 'Approve Leave Request' : 'Reject Leave Request',
      message: `Are you sure you want to ${isApproved ? 'approve' : 'reject'} the leave request submitted by ${name}?`,
      confirmText: isApproved ? 'Approve' : 'Reject',
      type: isApproved ? 'primary' : 'danger'
    });
    if (ok) updateStatusMutation.mutate({ id, status });
  };

  const byType = leaves.filter((l) => typeOf(l) === effectiveType);
  const q = searchTerm.toLowerCase();
  const filtered = byType.filter((l) => {
    const matchesSearch = [
      l.applicantName,
      l.applicantEmail,
      l.admissionNumber,
      l.department,
      l.roleName,
      l.designation,
      l.reason
    ].some((v) => (v || '').toLowerCase().includes(q));

    const matchesStatus =
      statusFilter === 'all' || (l.status || '').toLowerCase() === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const count = (s) => byType.filter((l) => (l.status || '').toLowerCase() === s).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Leave Requests Management
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          {isAdmin
            ? 'Review and approve or reject leave applications from employees and students.'
            : 'Review and approve or reject leave applications from students.'}
        </p>
      </div>

      {/* Applicant type tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-white/10">
        {TYPE_TABS.filter((t) => isAdmin || t.value === 'student').map(({ value, label, icon: Icon }) => {
          const active = typeFilter === value;
          return (
            <button
              key={value}
              onClick={() => {
                setTypeFilter(value);
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: cardTitleMap[effectiveType], value: byType.length, icon: Calendar, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Pending Approval', value: count('pending'), icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { title: 'Approved', value: count('approved'), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Rejected', value: count('rejected'), icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' }
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm"
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

      {/* Search + status tabs */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={
              typeFilter === 'student'
                ? 'Search name, admission no, department...'
                : 'Search name, role, department...'
            }
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          {STATUS_TABS.map(({ value, label }) => {
            const active = statusFilter === value;
            return (
              <button
                key={value}
                onClick={() => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  active
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="py-4 px-6">Applicant</th>
                <th className="py-4 px-6">{effectiveType === 'student' ? 'Academic Info' : effectiveType === 'employee' ? 'Role / Department' : 'Details'}</th>
                <th className="py-4 px-6">Duration</th>
                <th className="py-4 px-6">Reason</th>
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
                  const days = Math.max(1, Math.round((to - from) / 86400000) + 1);
                  const status = (item.status || 'pending').toLowerCase();
                  const isStudent = typeOf(item) === 'student';
                  const name = item.applicantName || item.studentName || 'Applicant';
                  const email = item.applicantEmail || item.studentEmail;

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedLeave(item)}
                      className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{email}</p>
                            <span
                              className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                isStudent
                                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                                  : 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400'
                              }`}
                            >
                              {isStudent ? <GraduationCap className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                              {isStudent ? 'STUDENT' : 'EMPLOYEE'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {isStudent ? (
                          <>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.admissionNumber || 'N/A'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {item.department} {item.section ? `• Sec ${item.section}` : ''}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                              {item.roleName || 'Staff'}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {[item.designation, item.department].filter(Boolean).join(' • ')}
                            </p>
                          </>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          {from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -{' '}
                          {to.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <span className="text-[11px] text-slate-400 font-semibold">
                          {days} {days === 1 ? 'day' : 'days'}
                        </span>
                      </td>

                      <td className="py-4 px-6 max-w-xs">
                        {item.leaveType && (
                          <p className="text-[11px] font-bold text-primary-600 dark:text-primary-400 mb-0.5">
                            {item.leaveType}
                          </p>
                        )}
                        <p className="text-slate-700 dark:text-slate-300 text-xs line-clamp-2" title={item.reason}>
                          {item.reason}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Applied: {new Date(item.createdAt).toLocaleDateString()}
                        </p>
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                              : status === 'rejected'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                          }`}
                        >
                          {status.toUpperCase()}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        {status === 'pending' ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAction(item.id, name, 'approved')}
                              disabled={updateStatusMutation.isPending}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                            </button>
                            <button
                              onClick={() => handleAction(item.id, name, 'rejected')}
                              disabled={updateStatusMutation.isPending}
                              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium italic">Reviewed</span>
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

      {selectedLeave && (
        <LeaveDetailModal
          leave={selectedLeave}
          isPending={updateStatusMutation.isPending}
          onClose={() => setSelectedLeave(null)}
          onAction={(id, name, status) => {
            setSelectedLeave(null); 
            handleAction(id, name, status);
          }}
        />
      )}
    </div>
  );
}

function DetailField({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5 break-words">
        {value || '—'}
      </p>
    </div>
  );
}

function LeaveDetailModal({ leave, onClose, onAction, isPending }) {
  const [showProofModal, setShowProofModal] = useState(false);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isStudent = typeOf(leave) === 'student';
  const name = leave.applicantName || leave.studentName || 'Applicant';
  const email = leave.applicantEmail || leave.studentEmail;
  const status = (leave.status || 'pending').toLowerCase();

  const from = new Date(leave.fromDate);
  const to = new Date(leave.toDate);
  const days = Math.max(1, Math.round((to - from) / 86400000) + 1);
  const fmt = (d) =>
    new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const statusCls =
    status === 'approved'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
      : status === 'rejected'
      ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
      : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-white dark:bg-[#0A0F1C] w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Leave Request Details</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Applicant */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 flex items-center justify-center font-bold text-lg shrink-0">
              {name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 dark:text-white truncate">{name}</p>
              {email && (
                <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                  <Mail className="w-3 h-3" /> {email}
                </p>
              )}
              <span
                className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  isStudent
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                    : 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400'
                }`}
              >
                {isStudent ? <GraduationCap className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                {isStudent ? 'STUDENT' : 'EMPLOYEE'}
              </span>
            </div>
            <span className={`ml-auto px-2.5 py-1 rounded-full text-xs font-bold ${statusCls}`}>
              {status.toUpperCase()}
            </span>
          </div>

          {/* Applicant details */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
            {isStudent ? (
              <>
                <DetailField label="Admission No" value={leave.admissionNumber} />
                <DetailField label="Roll No" value={leave.rollNumber} />
                <DetailField label="Department" value={leave.department} />
                <DetailField label="Section" value={leave.section} />
              </>
            ) : (
              <>
                <DetailField label="Role" value={leave.roleName} />
                <DetailField label="Designation" value={leave.designation} />
                <DetailField label="Department" value={leave.department} />
              </>
            )}
          </div>

          {/* Leave details */}
          <div className="grid grid-cols-2 gap-4">
            <DetailField label="Leave Type" value={leave.leaveType} />
            <DetailField label="Duration" value={`${days} ${days === 1 ? 'day' : 'days'}`} />
            <DetailField label="From" value={fmt(leave.fromDate)} />
            <DetailField label="To" value={fmt(leave.toDate)} />
            <DetailField label="Applied On" value={fmt(leave.createdAt)} />
            <DetailField label="Last Updated" value={fmt(leave.updatedAt)} />
          </div>

          {/* Reason */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Reason</p>
            <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-words">
              {leave.reason || '—'}
            </div>
          </div>
          
          {/* Proof */}
          {leave.hasProof && (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Proof</p>
              <button
                type="button"
                onClick={() => setShowProofModal(true)}
                className="w-full flex items-center gap-3 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 hover:border-primary-400 transition-colors"
              >
                <FileText className="w-5 h-5 text-primary-500 shrink-0" />
                <span className="flex-1 text-left text-sm font-semibold text-slate-700 dark:text-slate-300 truncate">
                  {leave.proofFileName || 'Attached file'}
                </span>
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400">View</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Close
          </button>
          {status === 'pending' && (
            <>
              <button
                onClick={() => onAction(leave.id, name, 'rejected')}
                disabled={isPending}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
              <button
                onClick={() => onAction(leave.id, name, 'approved')}
                disabled={isPending}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Approve
              </button>
            </>
          )}
        </div>
      </motion.div>
      {showProofModal && (
        <ProofViewerModal
          leaveId={leave.id}
          fileName={leave.proofFileName}
          mimeType={leave.proofMimeType}
          onClose={() => setShowProofModal(false)}
        />
      )}
    </div>
  );
}

function ProofViewerModal({ leaveId, fileName, mimeType, onClose }) {
  const [proofUrl, setProofUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let objectUrl = null;
    setLoading(true);
    setError(false);

    api
      .get(`/leaves/${leaveId}/proof`, { responseType: 'blob' })
      .then((response) => {
        const blob = response instanceof Blob ? response : response.data;
        objectUrl = window.URL.createObjectURL(blob);
        setProofUrl(objectUrl);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));

    return () => {
      if (objectUrl) window.URL.revokeObjectURL(objectUrl);
    };
  }, [leaveId]);

  const handleDownload = () => {
    if (!proofUrl) return;
    const a = document.createElement('a');
    a.href = proofUrl;
    a.download = fileName || 'proof';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-white dark:bg-[#0A0F1C] w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
              {fileName || 'Attached file'}
            </h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {proofUrl && (
              <button
                type="button"
                onClick={handleDownload}
                title="Download"
                className="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                <Download className="w-5 h-5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center bg-slate-50 dark:bg-white/[0.02]">
          {loading ? (
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          ) : error ? (
            <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">Failed to load proof file.</p>
          ) : proofUrl && mimeType?.startsWith('image/') ? (
            <img
              src={proofUrl}
              alt={fileName || 'Proof'}
              className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-sm"
            />
          ) : proofUrl && mimeType === 'application/pdf' ? (
            <iframe
              src={proofUrl}
              title="Proof document"
              className="w-full h-[60vh] rounded-lg border border-slate-200 dark:border-white/10 bg-white"
            />
          ) : proofUrl ? (
            <div className="flex flex-col items-center gap-3 text-center py-8">
              <FileText className="w-12 h-12 text-primary-500" />
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs">
                Preview isn't available for this file type. Use the download icon above to open it.
              </p>
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}