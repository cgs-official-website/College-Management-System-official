import React from 'react';
import { motion } from 'framer-motion';
import { User, BookOpen, Bell, AlertCircle, Activity, IndianRupee, ShieldCheck } from 'lucide-react';
import { useParentDashboard } from '../../hooks/useParentPortal';
import { useParentChild } from '../../contexts/ParentChildContext';

export default function ParentDashboard() {
  const { activeChildId } = useParentChild();
  const { data, isLoading, isError } = useParentDashboard(activeChildId);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-10 w-64 bg-slate-200 dark:bg-white/10 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          <div className="lg:col-span-2 h-64 bg-white dark:bg-[#0A0F1C] rounded-3xl border border-slate-200 dark:border-white/10" />
          <div className="h-64 bg-white dark:bg-[#0A0F1C] rounded-3xl border border-slate-200 dark:border-white/10" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white dark:bg-[#0A0F1C] rounded-3xl border border-slate-200 dark:border-white/10 p-12 text-center max-w-2xl mx-auto">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Unable to Load Dashboard</h2>
        <p className="text-slate-500 text-sm">Failed to retrieve parent dashboard data. Please verify your connection or try again later.</p>
      </div>
    );
  }

  const hasLinkedChild = data?.hasLinkedChild;
  const child = data?.child;
  const notices = data?.notices || [];

  if (!hasLinkedChild || !child) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Parent Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Monitor your child's academic progress and campus updates.</p>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white dark:bg-[#0A0F1C] rounded-3xl border border-slate-200 dark:border-white/10 p-12 text-center">
          <div className="w-20 h-20 bg-amber-50 dark:bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">No Student Linked</h2>
          <p className="text-slate-500 max-w-md mb-4 text-sm leading-relaxed">
            Your parent account is verified, but has not yet been linked to a student profile. Please contact the college administration to link your account to your child's roll number.
          </p>
        </div>

        {/* Notices still visible to parents even without linked child */}
        {notices.length > 0 && (
          <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 lg:p-8 shadow-sm">
            <h3 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2 mb-6">
              <Bell className="w-6 h-6 text-teal-500" />
              Campus Announcements
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notices.map((notice) => (
                <div key={notice.id} className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10">
                  <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold mb-2 bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400">
                    {notice.category || 'General'}
                  </span>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-1">{notice.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">{notice.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Parent Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Monitor your child's academic progress, attendance, and fee status.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Child Profile Banner */}
        <div className="lg:col-span-2 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-teal-500/20">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shrink-0 shadow-inner">
              <User className="w-12 h-12 text-white drop-shadow-md" />
            </div>
            <div className="text-center md:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                <h2 className="text-3xl font-bold">{child.name}</h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 border border-white/30">
                  {child.residenceType}
                </span>
              </div>
              <p className="text-teal-100 font-medium mb-4 flex items-center justify-center md:justify-start gap-2">
                <BookOpen className="w-4 h-4" />
                {child.course} • Section {child.section} ({child.department})
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-white/20">
                <div>
                  <p className="text-teal-100 text-xs uppercase tracking-wider mb-1">Roll No</p>
                  <p className="font-bold text-lg">{child.rollNumber}</p>
                </div>
                <div>
                  <p className="text-teal-100 text-xs uppercase tracking-wider mb-1">Attendance</p>
                  <p className="font-bold text-lg">{child.attendancePercentage}%</p>
                </div>
                <div>
                  <p className="text-teal-100 text-xs uppercase tracking-wider mb-1">Fee Balance</p>
                  <p className="font-bold text-lg">₹{child.totalFeeDue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-teal-100 text-xs uppercase tracking-wider mb-1">Account</p>
                  <p className="font-bold text-lg text-emerald-200 capitalize flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" />
                    {child.status}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Insights Sidebar */}
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-500" />
              Quick Summary
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Classes Attended</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">{child.totalClasses} sessions</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold">
                  {child.attendancePercentage}%
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Dues</p>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                    {child.totalFeeDue === 0 ? 'Fully Paid' : `₹${child.totalFeeDue.toLocaleString()}`}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                  child.totalFeeDue === 0 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                }`}>
                  <IndianRupee className="w-5 h-5" />
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-slate-400 mt-4 text-center">Data synchronized in real time with the college registrar.</p>
        </div>

        {/* Campus Notices */}
        <div className="lg:col-span-3 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 lg:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-6 h-6 text-teal-500" />
              Campus Announcements
            </h3>
          </div>

          {notices.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
              <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 font-medium">No recent announcements</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {notices.map((notice, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={notice.id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 hover:shadow-md transition-all group"
                >
                  <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold mb-3 ${
                    notice.priority === 'high' ? 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400' :
                    'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400'
                  }`}>
                    {notice.category || 'General'}
                  </span>
                  <h4 className="font-bold text-slate-900 dark:text-white mb-2 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {notice.title}
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 mb-3">
                    {notice.content}
                  </p>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    {new Date(notice.createdAt).toLocaleDateString()}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
