import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Loader2, Send, Clock, Paperclip } from 'lucide-react';

const LEAVE_TYPES = ['Sick Leave', 'Other'];

const fieldCls =
  'w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white';
const labelCls = 'block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1';

const emptyForm = { leaveType: 'Sick Leave', fromDate: '', toDate: '', reason: '' };

export default function TeacherMyLeaves() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [proofFile, setProofFile] = useState(null);
  const { data: myLeaves = [], isLoading: leavesLoading } = useQuery({
    queryKey: ['staff-my-leaves'],
    queryFn: async () => {
      const res = await api.get('/leaves/my');
      const raw = res?.data ?? [];
      return Array.isArray(raw) ? raw : [];
    }
  });

  const submitMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/leaves/staff', payload);
      return res?.data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-my-leaves'] });
      toast.success('Leave application submitted to admin!');
      setForm(emptyForm);
      setProofFile(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to submit leave application');
    }
  });

    const ALLOWED_PROOF_TYPES = [
    'image/jpeg', 'image/png', 'image/webp', 'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  const handleProofChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) { setProofFile(null); return; }

    if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
      toast.error('Proof must be an image, PDF, or Word document');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Proof file must be under 5 MB');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProofFile({ name: file.name, mimeType: file.type, dataUrl: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.fromDate || !form.toDate || !form.reason.trim()) {
      toast.error('Please complete all leave fields');
      return;
    }
    if (form.toDate < form.fromDate) {
      toast.error('To date cannot be before from date');
      return;
    }
    submitMutation.mutate({
      ...form,
      proofFileName: proofFile?.name || undefined,
      proofMimeType: proofFile?.mimeType || undefined,
      proofDataUrl: proofFile?.dataUrl || undefined
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Leaves</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Apply for leave. Your request goes to the admin for approval.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6 space-y-4 h-fit"
        >
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Apply for Leave</h2>

          <div>
            <label className={labelCls}>Leave Category</label>
            <select
              value={form.leaveType}
              onChange={(e) => setForm({ ...form, leaveType: e.target.value })}
              className={fieldCls}
            >
              {LEAVE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>From Date</label>
              <input
                type="date"
                value={form.fromDate}
                onChange={(e) => {
                  const from = e.target.value;
                  setForm({
                    ...form,
                    fromDate: from,
                    toDate: form.toDate && form.toDate < from ? '' : form.toDate
                  });
                }}
                className={fieldCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>To Date</label>
              <input
                type="date"
                min={form.fromDate || undefined}
                value={form.toDate}
                onChange={(e) => setForm({ ...form, toDate: e.target.value })}
                className={fieldCls}
                required
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Reason Description</label>
            <textarea
              rows="3"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Provide details regarding your leave..."
              className={`${fieldCls} resize-none`}
              required
            />
          </div>
          <div>
            <label className={labelCls}>Proof (optional)</label>
            <label className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/20 rounded-xl cursor-pointer hover:border-primary-500 transition-colors">
              <Paperclip className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="text-sm text-slate-500 dark:text-slate-400 truncate">
                {proofFile ? proofFile.name : 'Attach image, PDF, or Word doc (max 5 MB)'}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf,.doc,.docx"
                onChange={handleProofChange}
                className="hidden"
              />
            </label>
            {proofFile && (
              <button
                type="button"
                onClick={() => setProofFile(null)}
                className="text-xs font-bold text-rose-500 hover:underline mt-1"
              >
                Remove file
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={submitMutation.isPending}
            className="w-full px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit Application
          </button>
        </motion.form>

        {/* History */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Leave Applications</h2>
            <span className="text-xs font-bold px-2 py-0.5 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full">
              {myLeaves.length}
            </span>
          </div>

          <div className="p-6 max-h-[560px] overflow-y-auto">
            {leavesLoading ? (
              <div className="py-12 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-primary-500" /></div>
            ) : myLeaves.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">No Leave History</p>
                <p className="text-xs text-slate-500 mt-1">Your submitted leaves will appear here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {myLeaves.map((l) => {
                  const status = (l.status || 'pending').toLowerCase();
                  return (
                    <div key={l.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 space-y-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {l.leaveType || 'Leave'}{l.roleName ? ` • ${l.roleName}` : ''}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : status === 'rejected'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                        }`}>
                          {status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {new Date(l.fromDate).toLocaleDateString()} - {new Date(l.toDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2">{l.reason}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}