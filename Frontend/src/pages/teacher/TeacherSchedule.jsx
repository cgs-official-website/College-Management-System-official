import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar as CalendarIcon, Clock, MapPin, Users, BookOpen } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function TeacherSchedule() {
  const { userData } = useAuth();
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [scheduleData, setScheduleData] = useState({});
  const [loading, setLoading] = useState(true);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        if (!userData?.collegeId) return;
        
        const q = query(
          collection(db, 'timetable'), 
          where('collegeId', '==', userData.collegeId),
          where('teacherId', '==', userData.uid)
        );
        const snap = await getDocs(q);
        
        const data = {};
        days.forEach(d => data[d] = []); // Initialize all days empty
        
        snap.docs.forEach(doc => {
          const item = { id: doc.id, ...doc.data() };
          
          // Only show approved schedules for regular teachers
          if (item.status === 'pending' && userData?.role !== 'hod' && userData?.role !== 'admin') {
            return;
          }

          const day = item.dayOfWeek || item.day;
          if (data[day]) {
            data[day].push({
              ...item,
              time: `${item.startTime} - ${item.endTime}`
            });
          }
        });
        
        setScheduleData(data);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load schedule');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSchedule();
  }, [userData]);

  const todayClasses = scheduleData[selectedDay] || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Schedule</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View your weekly timetable and class assignments.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Sidebar - Days */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
          <div className="p-4 border-b border-slate-200 dark:border-white/10">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary-500" />
              This Week
            </h3>
          </div>
          <div className="p-2 space-y-1">
            {days.map(day => {
              const count = scheduleData[day]?.length || 0;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                    selectedDay === day 
                      ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 font-bold' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <span>{day}</span>
                  {count > 0 && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      selectedDay === day 
                        ? 'bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400' 
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content - Classes */}
        <div className="flex-1 p-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            {selectedDay}'s Classes
            {todayClasses.length > 0 && (
              <span className="text-sm font-medium text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-lg ml-2">
                {todayClasses.length} sessions
              </span>
            )}
          </h2>

          {todayClasses.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <CalendarIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No Classes Scheduled</h3>
              <p className="text-slate-500">You have a free day today. Enjoy your break!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {todayClasses.map((cls, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={cls.id}
                  className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow hover:border-primary-500/30 group"
                >
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center">
                    
                    {/* Time Block */}
                    <div className="flex-shrink-0 w-40">
                      <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 font-bold mb-1">
                        <Clock className="w-4 h-4" />
                        {cls.time.split(' - ')[0]}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 ml-6">
                        to {cls.time.split(' - ')[1]}
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="hidden sm:block w-px h-12 bg-slate-200 dark:bg-white/10" />

                    {/* Class Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {cls.subject}
                        </h3>
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                          cls.type === 'Lecture' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                          cls.type === 'Practical' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                          'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                        }`}>
                          {cls.type}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mt-2">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          {cls.class}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          {cls.room}
                        </div>
                      </div>
                    </div>
                    
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
