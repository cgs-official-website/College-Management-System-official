import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquareWarning, Clock, CheckCircle2, Plus, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ParentComplaints = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSubmitComplaint = (e) => {
    e.preventDefault();
    toast.success('Your complaint has been submitted. The college will respond shortly.');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Complaints</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Raise concerns regarding your child's college experience.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Raise Complaint
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {[
          { title: 'My Open Tickets', value: '0', icon: MessageSquareWarning, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'In Progress', value: '0', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { title: 'Resolved', value: '0', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
        ].map((stat, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx}
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{stat.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity rounded-full ${stat.bg.split(' ')[0].replace('50', '500')}`} />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 dark:border-white/5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Complaint History</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center p-6">
          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
            <MessageSquareWarning className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Complaints Filed</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">You haven't filed any complaints yet. Use the "Raise Complaint" button if you have any concerns.</p>
        </div>
      </motion.div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-[#0A0F1C] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Raise a Complaint</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmitComplaint} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                  <input type="text" placeholder="Brief title of your concern" className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                    <select className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white">
                      <option>Academics</option>
                      <option>Hostel & Safety</option>
                      <option>Fees & Billing</option>
                      <option>Transport</option>
                      <option>Faculty Concern</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                    <select className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white">
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Description</label>
                  <textarea rows="4" placeholder="Describe your concern in detail..." className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white resize-none" required></textarea>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all">Submit Complaint</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ParentComplaints;
