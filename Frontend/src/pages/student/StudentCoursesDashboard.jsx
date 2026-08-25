import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, FileText, CheckCircle2, Award, Clock, Layers, Loader2 } from 'lucide-react';
import { useStudentCourses } from '../../hooks/useStudentPortal';

const StudentCoursesDashboard = () => {
  const { data: coursesData, isLoading } = useStudentCourses();
  const courses = coursesData?.data || [];

  const totalCredits = courses.reduce((acc, c) => acc + (c.credits || 3), 0);

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
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Courses</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">View your enrolled subjects, course credits, and curriculum details.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {[
          { title: 'Enrolled Courses', value: courses.length, icon: BookOpen, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Total Credits', value: totalCredits, icon: Award, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Department', value: courses[0]?.department?.code || 'Academic', icon: Layers, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
        ].map((stat, idx) => (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} key={idx} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{stat.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}><stat.icon className={`w-6 h-6 ${stat.color}`} /></div>
            </div>
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity rounded-full ${stat.bg.split(' ')[0].replace('50', '500')}`} />
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Curriculum Subjects</h2>
          <span className="text-xs font-bold px-3 py-1 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full border border-primary-100 dark:border-primary-500/20">
            {courses.length} Registered Subjects
          </span>
        </div>

        {courses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center p-6">
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Courses Enrolled</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Your department course allocations will appear here once academic registration is finalized.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {courses.map((course) => (
              <div key={course.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0 font-extrabold text-sm">
                    {course.code?.slice(0, 3) || 'CRS'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{course.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 font-mono font-medium">
                        {course.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                      {course.description || `Official course syllabus for ${course.name}.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs text-slate-500 dark:text-slate-400 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-emerald-500" />
                    <span><strong className="text-slate-900 dark:text-white">{course.credits || 3}</strong> Credits</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-primary-500" />
                    <span>Semester <strong className="text-slate-900 dark:text-white">{course.semester || 1}</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default StudentCoursesDashboard;
