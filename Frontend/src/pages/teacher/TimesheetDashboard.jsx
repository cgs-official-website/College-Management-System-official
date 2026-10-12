import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Play, Square, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const TimesheetDashboard = () => {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState(null);

  const handleToggleClock = () => {
    if (isClockedIn) {
      setIsClockedIn(false);
      setClockInTime(null);
      toast.success('Successfully clocked out.');
    } else {
      setIsClockedIn(true);
      setClockInTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      toast.success('Successfully clocked in!');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Timesheet</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Log your daily working hours.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
        {/* Clock In Widget */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-4 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden"
        >
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors ${
            isClockedIn ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
          }`}>
            <Clock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
            {isClockedIn ? 'Currently Clocked In' : 'Not Clocked In'}
          </h3>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">
            {isClockedIn ? `Since ${clockInTime}` : 'Ready to start your day?'}
          </p>
          <button
            onClick={handleToggleClock}
            className={`w-full py-3 text-sm font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
              isClockedIn ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/30' : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/30'
            }`}
          >
            {isClockedIn ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
            {isClockedIn ? 'Clock Out' : 'Clock In'}
          </button>
        </motion.div>

        {/* Stats */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Weekly Hours</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">0 <span className="text-lg text-slate-400 font-medium">/ 40h</span></h3>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary-50 dark:bg-primary-500/10">
                <Calendar className="w-6 h-6 text-primary-500" />
              </div>
            </div>
            <div className="mt-6 w-full bg-slate-100 dark:bg-white/5 rounded-full h-2 overflow-hidden">
              <div className="bg-primary-500 h-full rounded-full" style={{ width: '0%' }}></div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Days Present</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">0 <span className="text-lg text-slate-400 font-medium">/ 0</span></h3>
              </div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
            <div className="mt-6 w-full bg-slate-100 dark:bg-white/5 rounded-full h-2 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: '0%' }}></div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Logs Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Logs</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center p-6">
          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Time Logs Yet</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Your daily clock-in/clock-out history will appear here. Use the widget above to start logging.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default TimesheetDashboard;
