import React from 'react';
import { motion } from 'framer-motion';
import { Megaphone, AlertCircle, Bell, Calendar, Pin, Loader2 } from 'lucide-react';
import { useStudentNotices } from '../../hooks/useStudentPortal';

const StudentNoticesDashboard = () => {
  const { data: noticesData, isLoading } = useStudentNotices();
  const notices = noticesData?.data || [];

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
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Notice Board</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Official circulars, academic notices, and important campus announcements.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        {notices.length === 0 ? (
          <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Active Notices</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">Campus announcements published by the administration will appear here.</p>
          </div>
        ) : (
          notices.map((notice) => {
            const isHigh = notice.priority === 'high' || notice.priority === 'urgent';
            const formattedDate = new Date(notice.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric'
            });

            return (
              <motion.div 
                key={notice.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
              >
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    isHigh
                      ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20'
                      : 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-500/20'
                  }`}>
                    <Megaphone className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{notice.title}</h3>
                        {isHigh && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">
                            Important
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formattedDate}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 leading-relaxed whitespace-pre-wrap">
                      {notice.content}
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </motion.div>
    </div>
  );
};

export default StudentNoticesDashboard;
