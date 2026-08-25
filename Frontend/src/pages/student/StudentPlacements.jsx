import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Building, Calendar, Award, CheckCircle2, Loader2, ArrowUpRight } from 'lucide-react';
import { useStudentPlacements } from '../../hooks/useStudentPortal';

const StudentPlacements = () => {
  const { data: placementsData, isLoading } = useStudentPlacements();
  const drives = placementsData?.data || [];

  const totalDrives = drives.length;
  const upcomingDrives = drives.filter(d => d.status === 'upcoming').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Placement Drives</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Explore campus recruitment opportunities, company CTC packages, and eligibility criteria.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {[
          { title: 'Campus Drives', value: totalDrives, icon: Briefcase, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Upcoming Drives', value: upcomingDrives, icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Eligible Status', value: 'Verified', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
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

      {/* Placement Drives List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Recruitment Opportunities</h2>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 rounded-full">
            {drives.length} Listed
          </span>
        </div>

        {drives.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center p-6">
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Active Drives</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Upcoming campus placements organized by the training & placement cell will be posted here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {drives.map((drive) => (
              <div key={drive.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0 font-extrabold text-sm">
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{drive.companyName}</h3>
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                        {drive.ctc}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-semibold">
                      Role: {drive.role}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Eligibility: {drive.eligibilityCriteria}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {drive.driveDate ? `Drive Date: ${new Date(drive.driveDate).toLocaleDateString()}` : 'Date Announced Soon'}
                  </span>
                  <span className="text-[11px] text-primary-600 font-bold mt-1 inline-flex items-center gap-0.5">
                    Open for Application <ArrowUpRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default StudentPlacements;
