import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, User, BookOpen, Loader2 } from 'lucide-react';
import { useStudentTimetable } from '../../hooks/useStudentPortal';

const DAYS = [
  { id: 1, name: 'Monday' },
  { id: 2, name: 'Tuesday' },
  { id: 3, name: 'Wednesday' },
  { id: 4, name: 'Thursday' },
  { id: 5, name: 'Friday' },
  { id: 6, name: 'Saturday' },
];

const StudentTimetableDashboard = () => {
  const { data: timetableData, isLoading } = useStudentTimetable();
  const [activeDay, setActiveDay] = useState(new Date().getDay() || 1); // default to today (or Mon if Sun)

  const slots = timetableData?.data || [];
  const currentDaySlots = slots.filter(s => s.dayOfWeek === activeDay);

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
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Weekly Timetable</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Class schedule, lecture halls, and instructor allocations for your section.</p>
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {DAYS.map((day) => {
          const isSelected = activeDay === day.id;
          const count = slots.filter(s => s.dayOfWeek === day.id).length;

          return (
            <button
              key={day.id}
              onClick={() => setActiveDay(day.id)}
              className={`px-5 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2.5 ${
                isSelected
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
                  : 'bg-white dark:bg-[#0A0F1C] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
              }`}
            >
              <span>{day.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-500'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Day Slots List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {DAYS.find(d => d.id === activeDay)?.name} Schedule
          </h2>
          <span className="text-xs font-bold px-3 py-1 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full">
            {currentDaySlots.length} Classes
          </span>
        </div>

        {currentDaySlots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center p-6">
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Classes Scheduled</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">No lecture sessions are scheduled for {DAYS.find(d => d.id === activeDay)?.name}.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {currentDaySlots.map((slot) => (
              <div key={slot.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0 font-extrabold text-sm">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{slot.course?.name || 'Lecture Session'}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        {slot.course?.code || 'CRS'}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500" />
                        Room {slot.room || 'TBA'}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-blue-500" />
                        {slot.teacher?.user?.name || 'Faculty'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <span className="inline-flex items-center px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-mono">
                    {slot.startTime} - {slot.endTime}
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

export default StudentTimetableDashboard;
