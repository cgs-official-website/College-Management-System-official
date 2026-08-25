import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, 
  XCircle, 
  Calendar, 
  CheckCircle2, 
  Plus, 
  X, 
  Clock, 
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useStudentAttendance, useStudentLeaveRequests } from '../../hooks/useStudentPortal';

const StudentAttendanceDashboard = () => {
  const { data: attendanceData, isLoading: isAttLoading } = useStudentAttendance();
  const { data: leaveData, createLeaveRequest, isCreating } = useStudentLeaveRequests();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'Sick Leave',
    fromDate: '',
    toDate: '',
    reason: ''
  });

  const attendance = attendanceData?.data || { percentage: 100, totalDays: 0, presentDays: 0, absentDays: 0, records: [] };
  const leaveRequests = leaveData?.data || [];

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.fromDate || !leaveForm.toDate || !leaveForm.reason.trim()) {
      toast.error('Please complete all leave fields');
      return;
    }

    try {
      await createLeaveRequest(leaveForm);
      toast.success('Leave application submitted successfully!');
      setIsModalOpen(false);
      setLeaveForm({ leaveType: 'Sick Leave', fromDate: '', toDate: '', reason: '' });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to submit leave application');
    }
  };

  if (isAttLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Attendance & Leaves</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track your academic presence percentage and apply for student leaves.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)} 
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Apply for Leave
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        {[
          { 
            title: 'Overall Attendance', 
            value: `${attendance.percentage}%`, 
            icon: CheckSquare, 
            color: attendance.percentage >= 75 ? 'text-emerald-500' : 'text-rose-500', 
            bg: attendance.percentage >= 75 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-rose-50 dark:bg-rose-500/10' 
          },
          { title: 'Total Sessions', value: attendance.totalDays, icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { title: 'Days Present', value: attendance.presentDays, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Days Absent', value: attendance.absentDays, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
        ].map((stat, idx) => (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} key={idx} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{stat.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}><stat.icon className={`w-6 h-6 ${stat.color}`} /></div>
            </div>
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity rounded-full ${stat.bg.split(' ')[0].replace('50', '500')}`} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Log */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Daily Attendance Records</h2>
            <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-white/10 rounded-full text-slate-600 dark:text-slate-400">
              {attendance.records?.length || 0} Recorded
            </span>
          </div>

          {(!attendance.records || attendance.records.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-16 text-center p-6">
              <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <CheckSquare className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Daily Attendance Marked</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Daily attendance marked by subject faculty will appear here chronologically.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[420px] overflow-y-auto">
              {attendance.records.map((rec) => {
                const isPresent = rec.status === 'present' || rec.status === 'late';
                const formattedDate = new Date(rec.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                return (
                  <div key={rec.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isPresent ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10'}`}>
                        {isPresent ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{rec.course?.name || 'Class Session'}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{formattedDate}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase ${
                      rec.status === 'present' 
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' 
                        : rec.status === 'late'
                        ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10'
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10'
                    }`}>
                      {rec.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Leave Requests Log */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Leave Applications</h2>
            <span className="text-xs font-bold px-2 py-0.5 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full">
              {leaveRequests.length}
            </span>
          </div>

          <div className="p-6 flex-1 overflow-y-auto max-h-[420px]">
            {leaveRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">No Leave History</p>
                <p className="text-xs text-slate-500 mt-1">Submit a leave request when required.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {leaveRequests.map((leave) => (
                  <div key={leave.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{leave.reason}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        leave.status === 'approved' 
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' 
                          : leave.status === 'rejected'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                      }`}>
                        {leave.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {new Date(leave.fromDate).toLocaleDateString()} - {new Date(leave.toDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Leave Application Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white dark:bg-[#0A0F1C] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Apply for Leave</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleApplyLeave} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Leave Category</label>
                  <select 
                    value={leaveForm.leaveType}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white"
                  >
                    <option>Sick Leave</option>
                    <option>Personal Reason</option>
                    <option>Family Emergency</option>
                    <option>Academic Event / Competition</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">From Date</label>
                    <input 
                      type="date" 
                      value={leaveForm.fromDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, fromDate: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">To Date</label>
                    <input 
                      type="date" 
                      value={leaveForm.toDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, toDate: e.target.value })}
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white" 
                      required 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Reason Description</label>
                  <textarea 
                    rows="3" 
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    placeholder="Provide details regarding your leave..." 
                    className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white resize-none" 
                    required
                  ></textarea>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isCreating} className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center gap-2 disabled:opacity-50">
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Submit Application
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentAttendanceDashboard;
