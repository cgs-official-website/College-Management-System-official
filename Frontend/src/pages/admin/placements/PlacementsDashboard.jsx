import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { Briefcase, X } from 'lucide-react';

const PlacementsDashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddDrive = (e) => {
    e.preventDefault();
    toast.success('Placement drive added successfully!');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Placement Cell</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage placement drives, internships, and student recruitment.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center gap-2"
        >
          <Briefcase className="w-4 h-4" />
          Add Placement Drive
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {[
          { title: 'Students Placed', value: '185', icon: Briefcase, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Total Drives', value: '14', icon: Briefcase, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Top CTC', value: '24 LPA', icon: Briefcase, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
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
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upcoming Placement Drives</h2>
          <button className="text-primary-600 dark:text-primary-400 text-sm font-bold hover:underline">View All</button>
        </div>
          <div className="w-full">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 text-sm text-slate-500 dark:text-slate-400">
                    <th className="pb-3 font-medium">Company</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">CTC (LPA)</th>
                    <th className="pb-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {[
                    { company: 'Google', role: 'Software Engineer', ctc: '24.0', date: 'Oct 15, 2026' },
                    { company: 'TCS Digital', role: 'System Analyst', ctc: '7.5', date: 'Oct 20, 2026' },
                    { company: 'Amazon', role: 'SDE-1', ctc: '21.0', date: 'Nov 02, 2026' }
                  ].map((drive, i) => (
                    <tr key={i} className="border-b border-slate-100 dark:border-white/5 last:border-0">
                      <td className="py-4 font-bold text-slate-900 dark:text-white">{drive.company}</td>
                      <td className="py-4 text-slate-600 dark:text-slate-300">{drive.role}</td>
                      <td className="py-4 font-medium text-primary-600 dark:text-primary-400">{drive.ctc}</td>
                      <td className="py-4 text-slate-500">{drive.date}</td>
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
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Schedule Placement Drive</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddDrive} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Company Name</label>
                  <input type="text" placeholder="e.g. Google, Microsoft" className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Job Roles</label>
                    <input type="text" placeholder="e.g. SDE, Analyst" className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Expected CTC</label>
                    <input type="text" placeholder="e.g. 10-15 LPA" className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Eligible Courses</label>
                    <select className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white">
                      <option>B.Tech CSE & IT</option>
                      <option>MBA All Branches</option>
                      <option>All UG Courses</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Drive Date</label>
                    <input type="date" className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Additional Requirements</label>
                  <textarea rows="2" placeholder="e.g. Min 7.0 CGPA, No active backlogs..." className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white resize-none"></textarea>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all">Schedule Drive</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlacementsDashboard;
