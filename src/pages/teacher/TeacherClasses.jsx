import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, BookOpen, Clock, MapPin, ChevronRight, AlertCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function TeacherClasses() {
  const { userData } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        if (!userData?.collegeId) return;
        
        // Fetch courses and filter by teacher client-side to avoid requiring composite indexes
        const q = query(
          collection(db, 'courses'), 
          where('collegeId', '==', userData.collegeId)
        );
        const snap = await getDocs(q);
        const myCourses = snap.docs.filter(doc => doc.data().assignedTeacher === userData.uid);
        
        // Fetch actual enrollment counts
        const fetchedCourses = await Promise.all(myCourses.map(async (docSnap) => {
          const courseData = docSnap.data();
          const studentQ = query(collection(db, 'students'), where('courseId', '==', docSnap.id));
          const studentSnap = await getDocs(studentQ);
          
          return {
            id: docSnap.id,
            enrolledCount: studentSnap.size,
            ...courseData
          };
        }));
        
        setCourses(fetchedCourses);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load classes');
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, [userData]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Classes</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage the classes and subjects you are currently teaching.</p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-white dark:bg-[#0A0F1C] rounded-2xl border border-slate-200 dark:border-white/10 animate-pulse" />
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center mt-6">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Classes Assigned</h3>
          <p className="text-slate-500">You have not been assigned to any classes for this semester yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {courses.map((course, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              key={course.id}
              className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all group flex flex-col h-full"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <span className="px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider">
                  {course.code || 'CODE'}
                </span>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                {course.name}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-1">
                {course.department || 'General'} Department
              </p>

              <div className="space-y-3 mb-6">
                <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                  <Users className="w-4 h-4 mr-2 opacity-70" />
                  <span className="font-medium text-slate-900 dark:text-white mr-1">{course.enrolledCount}</span> Students Enrolled
                </div>
                <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                  <Clock className="w-4 h-4 mr-2 opacity-70" />
                  3 Credits / 45 Hrs
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 gap-3">
                <button 
                  onClick={() => navigate('/teacher/attendance')}
                  className="w-full py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold transition-colors"
                >
                  Attendance
                </button>
                <button 
                  onClick={() => navigate('/teacher/assignments')}
                  className="w-full py-2 bg-teal-50 dark:bg-teal-500/10 hover:bg-teal-100 dark:hover:bg-teal-500/20 text-teal-700 dark:text-teal-400 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-1"
                >
                  Assignments <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
