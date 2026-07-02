import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { MessageSquareWarning, ShieldAlert, CheckCircle2, AlertTriangle, X } from 'lucide-react';

const ComplaintsDashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleLogComplaint = (e) => {
    e.preventDefault();
    toast.success('Complaint logged successfully!');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Complaints & Helpdesk</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage student and staff grievances and support tickets.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center gap-2"
        >
          <AlertTriangle className="w-4 h-4" />
          Log Complaint
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {[
          { title: 'Open Tickets', value: '12', icon: MessageSquareWarning, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'In Progress', value: '8', icon: ShieldAlert, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { title: 'Resolved', value: '156', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Avg. Resolution Time', value: '24 hrs', icon: AlertTriangle, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
        ].map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden group"
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
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Complaints</h2>
          <div className="flex gap-2">
             <button className="px-3 py-1 text-xs font-bold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-lg">All</button>
             <button className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg">Open</button>
             <button className="px-3 py-1 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg">Resolved</button>
          </div>
        </div>
        <div className="w-full mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-sm text-slate-500 dark:text-slate-400">
                  <th className="pb-3 font-medium">Ticket ID</th>
                  <th className="pb-3 font-medium">Issue Description</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { id: 'TKT-1042', issue: 'WiFi not working in B-Block Library', category: 'IT & WiFi', status: 'Open' },
                  { id: 'TKT-1041', issue: 'Request for projector repair in Room 302', category: 'Infrastructure', status: 'In Progress' },
                  { id: 'TKT-1039', issue: 'Mess food quality issue', category: 'Hostel', status: 'Resolved' }
                ].map((ticket, i) => (
                  <tr key={i} className="border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
                    <td className="py-4 font-bold text-slate-900 dark:text-white">{ticket.id}</td>
                    <td className="py-4 text-slate-600 dark:text-slate-300">{ticket.issue}</td>
                    <td className="py-4 text-slate-500">{ticket.category}</td>
                    <td className="py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                        ticket.status === 'Open' ? 'bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400' :
                        ticket.status === 'In Progress' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                        'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                      }`}>
                        {ticket.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Log a New Complaint</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleLogComplaint} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Complaint Title</label>
                  <input type="text" placeholder="Brief description of the issue" className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Category</label>
                    <select className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white">
                      <option>Infrastructure</option>
                      <option>Academics</option>
                      <option>Hostel</option>
                      <option>IT & WiFi</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                    <select className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white">
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Detailed Description</label>
                  <textarea rows="3" placeholder="Please provide more details..." className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white resize-none" required></textarea>
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

export default ComplaintsDashboard;
