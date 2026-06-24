import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Calendar, BookOpen, Bell, AlertCircle, Activity, Award } from 'lucide-react';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

export default function ParentDashboard() {
  const { userData } = useAuth();
  const [childData, setChildData] = useState(null);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      console.log('fetchDashboardData started. userData:', userData);
      try {
        if (!userData?.collegeId) {
          console.log('No collegeId, returning early');
          return;
        }

        console.log('Fetching notices...');
        // Fetch notices targeted at parents or all
        const noticesQ = query(
          collection(db, 'notices'),
          where('collegeId', 'in', [userData.collegeId, 'all']),
          orderBy('createdAt', 'desc'),
          limit(5)
        );
        
        // Add a safety timeout to prevent hanging forever
        const noticesSnap = await Promise.race([
          getDocs(noticesQ),
          new Promise((_, reject) => setTimeout(() => reject(new Error('getDocs Timeout')), 5000))
        ]);
        
        console.log('Notices fetched:', noticesSnap.size);
        setNotices(noticesSnap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(n => n.targetAudience === 'all' || n.targetAudience === 'parents')
        );

        console.log('Fetching child data...');
        // Fetch child data if linked
        if (userData.studentId) {
          const studentRef = doc(db, 'students', userData.studentId);
          const studentSnap = await getDoc(studentRef);
          if (studentSnap.exists()) {
            console.log('Child data found');
            setChildData({ id: studentSnap.id, ...studentSnap.data() });
          } else {
            console.log('Child data not found');
          }
        }
      } catch (err) {
        console.error('Error fetching parent dashboard:', err);
      } finally {
        console.log('Setting loading to false');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userData]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
        <div className="lg:col-span-2 h-64 bg-white dark:bg-[#0A0F1C] rounded-2xl border border-slate-200 dark:border-white/10" />
        <div className="h-64 bg-white dark:bg-[#0A0F1C] rounded-2xl border border-slate-200 dark:border-white/10" />
      </div>
    );
  }

  if (!userData?.studentId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white dark:bg-[#0A0F1C] rounded-3xl border border-slate-200 dark:border-white/10 p-12 text-center">
        <div className="w-20 h-20 bg-amber-50 dark:bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
          <AlertCircle className="w-10 h-10 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">No Child Linked</h2>
        <p className="text-slate-500 max-w-md">
          Your parent account is active, but it hasn't been linked to a student profile yet. Please contact the college administration to link your account to your child's records.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Parent Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Monitor your child's academic progress and attendance.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Child Profile Card */}
        <div className="lg:col-span-2 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-teal-500/20">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shrink-0 shadow-inner">
              <User className="w-12 h-12 text-white drop-shadow-md" />
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-3xl font-bold mb-1">{childData?.name || 'Student Name'}</h2>
              <p className="text-teal-100 font-medium mb-4 flex items-center justify-center md:justify-start gap-2">
                <BookOpen className="w-4 h-4" />
                {childData?.course || 'Enrolled Course'} • {childData?.section || 'Section'}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-white/20">
                <div>
                  <p className="text-teal-100 text-xs uppercase tracking-wider mb-1">Roll No</p>
                  <p className="font-bold text-lg">{childData?.rollNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-teal-100 text-xs uppercase tracking-wider mb-1">Attendance</p>
                  <p className="font-bold text-lg">{childData?.attendancePercentage || '0'}%</p>
                </div>
                <div>
                  <p className="text-teal-100 text-xs uppercase tracking-wider mb-1">CGPA</p>
                  <p className="font-bold text-lg">{childData?.cgpa || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-teal-100 text-xs uppercase tracking-wider mb-1">Status</p>
                  <p className="font-bold text-lg text-emerald-200">Active</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Sidebar */}
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-500" />
            Recent Activity
          </h3>
          
          <div className="text-center py-8">
            <Activity className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3 opacity-50" />
            <p className="text-slate-500 text-sm font-medium">No recent activity</p>
          </div>
        </div>

        {/* College Notices */}
        <div className="lg:col-span-3 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 lg:p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-xl text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-6 h-6 text-teal-500" />
              College Announcements
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
                  transition={{ delay: idx * 0.1 }}
                  key={notice.id}
                  className="p-5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 hover:shadow-md transition-all group cursor-pointer"
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
                    {new Date(notice.createdAt?.toDate()).toLocaleDateString()}
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
