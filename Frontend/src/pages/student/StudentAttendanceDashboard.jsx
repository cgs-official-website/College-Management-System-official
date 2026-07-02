import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckSquare, XCircle, Calendar, CheckCircle2, Plus, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const StudentAttendanceDashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleApplyLeave = (e) => {
    e.preventDefault();
    toast.success('Leave application submitted successfully!');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Attendance</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track your attendance percentage and apply for leaves.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Apply for Leave
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        {[
          { title: 'Overall Attendance', value: 'N/A', icon: CheckSquare, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Total Classes', value: '0', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { title: 'Days Present', value: '0', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Days Absent', value: '0', icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Attendance Records</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center p-6">
          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
            <CheckSquare className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Attendance Records</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Your daily attendance log will appear here once your teachers start marking attendance.</p>
        </div>
      </motion.div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white dark:bg-[#0A0F1C] w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Apply for Leave</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleApplyLeave} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Leave Type</label>
                  <select className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white">
                    <option>Sick Leave</option>
                    <option>Personal Reason</option>
                    <option>Family Emergency</option>
                    <option>Event / Competition</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">From Date</label>
                    <input type="date" className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">To Date</label>
                    <input type="date" className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Reason</label>
                  <textarea rows="3" placeholder="Describe the reason for your leave..." className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white resize-none" required></textarea>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all">Submit Application</button>
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
