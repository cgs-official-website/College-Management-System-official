import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, Calendar, CheckSquare, Bell, Clock, ChevronRight } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../../firebase/config';

export default function TeacherDashboard() {
  const { userData } = useAuth();
  const [stats, setStats] = useState({
    totalClasses: 0,
    studentsTaught: 0,
    attendanceRate: 0,
    pendingGrades: 0
  });
  const [notices, setNotices] = useState([]);
  const [todayClasses, setTodayClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!userData?.collegeId) return;
        
        // Fetch recent notices
        const noticesQuery = query(
          collection(db, 'notices'),
          where('collegeId', 'in', [userData.collegeId, 'all'])
        );
        const noticesSnap = await getDocs(noticesQuery);
        let noticesList = noticesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort and limit client-side to avoid requiring a composite index
        noticesList.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || 0;
          return timeB - timeA;
        });
        noticesList = noticesList.slice(0, 3);
        
        const filteredNotices = noticesList.filter(n => 
          n.targetAudience === 'all' || 
          n.targetAudience === 'teachers' || 
          n.targetAudience === 'staff'
        );
        
        setNotices(filteredNotices);
        
        // Fetch actual stats
        const coursesQ = query(collection(db, 'courses'), where('collegeId', '==', userData.collegeId));
        const coursesSnap = await getDocs(coursesQ);
        
        const studentsQ = query(collection(db, 'students'), where('collegeId', '==', userData.collegeId));
        const studentsSnap = await getDocs(studentsQ);

        const assignmentsQ = query(
          collection(db, 'assignments'), 
          where('teacherId', '==', userData.uid)
        );
        const assignmentsSnap = await getDocs(assignmentsQ);

        setStats({
          totalClasses: coursesSnap.size,
          studentsTaught: studentsSnap.size,
          attendanceRate: 0, // Placeholder until aggregation
          pendingGrades: assignmentsSnap.size
        });

        // Fetch today's schedule
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = days[new Date().getDay()];

        const scheduleQ = query(
          collection(db, 'timetables'), 
          where('teacherId', '==', userData.uid),
          where('day', '==', todayName)
        );
        const scheduleSnap = await getDocs(scheduleQ);
        setTodayClasses(scheduleSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome back, {userData?.firstName || 'Teacher'}!
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Here is your academic overview for today.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        {[
          { title: 'Classes Today', value: stats.totalClasses, trend: '', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { title: 'Students', value: stats.studentsTaught, trend: '', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Avg Attendance', value: `${stats.attendanceRate}%`, trend: '', icon: CheckSquare, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-500/10' },
          { title: 'Pending Grades', value: stats.pendingGrades, trend: '', icon: Calendar, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
        ].map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
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
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-4">{stat.trend}</p>
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity rounded-full ${stat.bg.split(' ')[0].replace('50', '500')}`} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Today's Schedule</h2>
            <button className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:underline">View Full Schedule</button>
          </div>
          
          <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <div className="space-y-6">
              {todayClasses.map((cls, idx) => (
                <div key={idx} className="flex gap-4 relative">
                  {idx !== todayClasses.length - 1 && (
                    <div className="absolute left-6 top-10 bottom-[-24px] w-0.5 bg-slate-100 dark:bg-white/5" />
                  )}
                  <div className="w-12 pt-1 text-right">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{cls.time.split(' ')[0]}</p>
                    <p className="text-[10px] text-slate-400 uppercase">{cls.time.split(' ')[1]}</p>
                  </div>
                  <div className="flex-1 bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5 hover:border-primary-500/30 transition-colors group cursor-pointer">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{cls.subject}</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{cls.class}</p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {cls.room}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Announcements */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Announcements</h2>
          </div>
          
          <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notices.length > 0 ? (
              <div className="space-y-6">
                {notices.map((notice) => (
                  <div key={notice.id} className="group cursor-pointer">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center shrink-0 text-primary-600 dark:text-primary-400">
                        <Bell className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {notice.title}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {notice.content}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span className="text-[10px] font-medium text-slate-400">
                            {notice.createdAt?.toDate?.()?.toLocaleDateString() || 'Recent'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">No announcements</p>
                <p className="text-xs text-slate-500 mt-1">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
