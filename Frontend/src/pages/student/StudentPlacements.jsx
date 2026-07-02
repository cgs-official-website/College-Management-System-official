import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Building2, TrendingUp, Users } from 'lucide-react';

const StudentPlacements = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Placement Cell</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View upcoming placement drives and apply for eligible opportunities.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {[
          { title: 'Upcoming Drives', value: '0', icon: Briefcase, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'My Applications', value: '0', icon: Building2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Offers Received', value: '0', icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
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

      {/* Upcoming Drives */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 dark:border-white/5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upcoming Placement Drives</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Click "Apply" on any drive you are eligible for.</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center p-6">
          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Upcoming Drives</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">When the placement cell schedules drives, eligible opportunities will be listed here for you to apply.</p>
        </div>
      </motion.div>

      {/* My Applications */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 dark:border-white/5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Applications</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center p-6">
          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
            <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Applications Yet</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Your application status (Applied, Shortlisted, Selected, Rejected) will be tracked here.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default StudentPlacements;
