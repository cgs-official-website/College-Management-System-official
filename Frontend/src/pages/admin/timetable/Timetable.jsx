import React, { useState } from 'react';
import { 
  Plus, 
  Clock, 
  MapPin, 
  User, 
  Edit2, 
  Trash2, 
  Calendar, 
  BookOpen, 
  GraduationCap, 
  CheckCircle2, 
  Sparkles,
  Layers
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTimetable } from '../../../hooks/useTimetable';
import { Button } from '../../../components/ui/Button';
import { TimetableFormModal } from './TimetableFormModal';
import { useConfirm } from '../../../contexts/ConfirmContext';

export default function Timetable() {
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { schedules, isLoading, addSchedule, updateSchedule, deleteSchedule, isAdding, isUpdating } = useTimetable(collegeId);
  
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Filter schedules for the selected day
  const filteredSchedules = schedules.filter(s => s.dayOfWeek === selectedDay);

  const handleOpenAdd = () => {
    setEditingSchedule(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (schedule) => {
    setEditingSchedule(schedule);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: "Are you sure you want to delete this class schedule?" })) {
      await deleteSchedule(id);
    }
  };

  const handleApprove = async (id) => {
    if (await confirm({ message: "Approve this timetable schedule?" })) {
      await updateSchedule({ id, data: { status: 'approved' } });
    }
  };

  const handleSubmit = async (data) => {
    try {
      if (editingSchedule) {
        await updateSchedule({ id: editingSchedule.id, data });
      } else {
        await addSchedule(data);
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  // Helper to extract clean initials from faculty name
  const getInitials = (name) => {
    if (!name) return 'F';
    const parts = name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/i, '').trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - Product Primary Theme */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-[#043324] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-primary-500/10">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-primary-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 backdrop-blur-md border border-primary-500/20 text-xs font-semibold text-primary-300 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-primary-400" />
            Academic Schedule Management
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Timetable & Scheduling</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Coordinate weekly class periods, faculty allocations, and lab/room assignments seamlessly.
          </p>
        </div>
        <div className="relative z-10 shrink-0">
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-600/30 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Schedule Class
          </button>
        </div>
      </div>

      {/* Days Tabs Bar - Product Primary Theme */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-[#0A0F1C] p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-x-auto hide-scrollbar">
        <div className="flex gap-2">
          {daysOfWeek.map(day => {
            const count = schedules.filter(s => s.dayOfWeek === day).length;
            const isSelected = selectedDay === day;
            return (
              <button 
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                  isSelected 
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{day}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                  isSelected 
                    ? 'bg-white/20 text-white' 
                    : 'bg-slate-200/70 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center gap-2 pr-2 text-xs font-bold text-slate-400 dark:text-slate-500">
          <Layers className="w-4 h-4 text-primary-500" />
          <span>{filteredSchedules.length} Sessions on {selectedDay}</span>
        </div>
      </div>

      {/* Grid Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-56 bg-slate-100 dark:bg-white/5 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200/80 dark:border-white/10 rounded-3xl p-12 sm:p-16 text-center max-w-xl mx-auto shadow-sm">
          <div className="w-16 h-16 bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary-600 dark:text-primary-400">
            <Calendar className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No sessions scheduled for {selectedDay}</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
            Keep your curriculum organized by allocating lectures, lab sessions, and teachers for this day.
          </p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-primary-600/25"
          >
            <Plus className="w-4 h-4" />
            Add First Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSchedules.map((schedule) => {
            const initials = getInitials(schedule.teacherName);
            const isDuplicateSubtitle = schedule.courseName && schedule.subject && schedule.courseName.toLowerCase() === schedule.subject.toLowerCase();

            return (
              <div 
                key={schedule.id} 
                className="group relative bg-white dark:bg-[#0A0F1C] border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-primary-500/40 dark:hover:border-primary-500/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Top Accent Gradient Bar - Product Primary */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-600 via-primary-500 to-emerald-400 opacity-80 group-hover:opacity-100 transition-opacity" />

                <div>
                  {/* Card Header: Time & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200/60 dark:border-primary-500/20 text-primary-700 dark:text-primary-300 text-xs font-extrabold tracking-tight">
                      <Clock className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400 shrink-0" />
                      <span>{schedule.startTime} – {schedule.endTime}</span>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleOpenEdit(schedule)} 
                        className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-primary-50 dark:hover:bg-primary-500/20 text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 border border-slate-200/60 dark:border-white/5 transition-colors" 
                        title="Edit Schedule"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(schedule.id)} 
                        className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200/60 dark:border-white/5 transition-colors" 
                        title="Delete Schedule"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subject Title */}
                  <h3 
                    className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors leading-snug line-clamp-2 mb-2" 
                    title={schedule.subject}
                  >
                    {schedule.subject}
                  </h3>

                  {/* Course / Program Badge - Product Primary Theme */}
                  <div className="flex flex-wrap items-center gap-2 mb-5">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-50 dark:bg-primary-500/10 text-primary-800 dark:text-primary-300 border border-primary-200/60 dark:border-primary-500/20 max-w-full truncate">
                      <BookOpen className="w-3 h-3 text-primary-600 dark:text-primary-400 shrink-0" />
                      <span className="truncate">{schedule.courseCode || schedule.courseName || 'Academic Course'}</span>
                    </span>
                    
                    {!isDuplicateSubtitle && schedule.courseName && (
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate max-w-[160px]">
                        {schedule.courseName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Footer: Structured Faculty & Room (Product Primary Accents) */}
                <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-3 mt-auto">
                  {/* Faculty Row */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-700 via-primary-600 to-primary-500 text-white font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm shadow-primary-600/20">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {schedule.teacherName}
                      </p>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                        Faculty Instructor
                      </p>
                    </div>
                  </div>

                  {/* Venue / Room Row */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-dashed border-slate-100 dark:border-white/5 text-xs">
                    <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-semibold">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      Venue:
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200/70 dark:border-white/10 font-bold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                      {schedule.room}
                    </span>
                  </div>

                  {/* Status Approval Button (if pending) */}
                  {schedule.status === 'pending' && (userData?.role === 'admin' || userData?.role === 'superadmin') && (
                    <div className="pt-2">
                      <button 
                        onClick={() => handleApprove(schedule.id)} 
                        className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl shadow-md shadow-primary-500/20 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve Schedule
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Class Modal */}
      <TimetableFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingSchedule}
        isLoading={isAdding || isUpdating}
      />
    </div>
  );
}
