import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

const StudentTimetableDashboard = () => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [activeDay, setActiveDay] = useState('Monday');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Timetable</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View your daily class schedule and practical sessions.</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl p-1 shadow-sm">
          <button className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <span className="text-sm font-bold text-slate-900 dark:text-white px-2">Current Week</span>
          <button className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>

      <div className="flex overflow-x-auto hide-scrollbar gap-2 pb-2">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex-1 text-center min-w-[120px] ${
              activeDay === day
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                : 'bg-white dark:bg-[#0A0F1C] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:border-primary-300 dark:hover:border-primary-500/30'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden min-h-[400px]"
      >
        <div className="flex flex-col items-center justify-center h-full py-20">
          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
            <CalendarIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Schedule Available</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm text-center">Your class schedule for {activeDay} will appear here once the timetable is published by the admin.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default StudentTimetableDashboard;
