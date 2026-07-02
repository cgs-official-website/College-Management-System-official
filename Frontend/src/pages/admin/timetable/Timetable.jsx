import React, { useState } from 'react';
import { Plus, Clock, MapPin, User, Edit, Trash2, Calendar } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTimetable } from '../../../hooks/useTimetable';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Timetable & Scheduling</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage weekly class schedules, teachers, and rooms.</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Schedule Class
        </Button>
      </div>

      {/* Days Tabs */}
      <div className="flex overflow-x-auto gap-2 bg-white dark:bg-[#0A0F1C] p-2 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm hide-scrollbar">
        {daysOfWeek.map(day => (
          <button 
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${selectedDay === day ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-100 dark:border-primary-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-slate-300 border border-transparent'}`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Grid Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-40 bg-slate-100 dark:bg-white/5 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredSchedules.length === 0 ? (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No classes scheduled for {selectedDay}</h3>
          <p className="text-slate-500 dark:text-slate-400">Click "Schedule Class" to add a new session to this day.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredSchedules.map((schedule) => (
            <div key={schedule.id} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col">
              <div className="flex justify-between items-start mb-4">
                
                {/* Time Badge */}
                <div className="flex items-center gap-2 bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 rounded-lg px-3 py-1.5 text-primary-700 dark:text-primary-400 text-sm font-bold tracking-wide">
                  <Clock className="w-4 h-4" />
                  {schedule.startTime} - {schedule.endTime}
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenEdit(schedule)} className="p-1.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors bg-slate-50 dark:bg-white/5 rounded-lg" title="Edit">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(schedule.id)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-slate-50 dark:bg-white/5 rounded-lg" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate pr-2">{schedule.subject}</h3>
                {schedule.status === 'pending' && (
                  <span className="shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                    Pending
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">{schedule.courseName}</p>

              <div className="mt-auto space-y-3 pt-4 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{schedule.teacherName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="font-bold text-slate-900 dark:text-white">{schedule.room}</span>
                  </div>
                </div>
                
                {schedule.status === 'pending' && (userData?.role === 'admin' || userData?.role === 'superadmin') && (
                  <div className="pt-2">
                    <Button onClick={() => handleApprove(schedule.id)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30 py-2">
                      Approve Schedule
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
