import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Award, Layers, GraduationCap, Users, CalendarDays, User, Loader2 } from 'lucide-react';
import { useStudentCourses } from '../../hooks/useStudentPortal';

const StudentCoursesDashboard = () => {
  const { data: res, isLoading } = useStudentCourses();
  const info = res?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!info) {
    return (
      <div className="text-center py-16 text-slate-500 dark:text-slate-400">
        Course details are not available yet.
      </div>
    );
  }

  const { department, program, section, batchYear, currentSemester, semesters = [] } = info;

  const details = [
  { title: 'Department', value: department?.code || '—', icon: Layers, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
  { title: 'Program', value: program?.code || '—', icon: GraduationCap, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
  { title: 'Class / Section', value: section || '—', icon: Users, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10' },
  { title: 'Current Semester', value: currentSemester, icon: CalendarDays, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
];

  const cardCls = 'bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Curriculum Overview</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          A complete record of your subjects, credits and faculty.
        </p>
      </div>

      {/* Program details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {details.map((d, idx) => (
          <motion.div key={d.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }} className={`${cardCls} p-6`}>
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{d.title}</p>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mt-2 break-words">{d.value}</h3>
                {d.sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{d.sub}</p>}
              </div>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${d.bg}`}>
                <d.icon className={`w-5 h-5 ${d.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Semester-wise subjects */}
      {semesters.map((sem, idx) => {
        const isCurrent = sem.semester === currentSemester;
        return (
          <motion.div key={sem.semester} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + idx * 0.05 }} className={`${cardCls} overflow-hidden`}>
            <div className="p-5 border-b border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Semester {sem.semester}</h2>
                {isCurrent && (
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                    Current
                  </span>
                )}
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full border border-primary-100 dark:border-primary-500/20">
                {sem.subjects.length} Subjects · {sem.totalCredits} Credits
              </span>
            </div>

            {sem.subjects.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">No subjects added for this semester yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/60 dark:bg-white/[0.02]">
                      <th className="px-5 py-3 font-semibold">Course Code</th>
                      <th className="px-5 py-3 font-semibold">Course Name</th>
                      <th className="px-5 py-3 font-semibold text-center">Credits</th>
                      <th className="px-5 py-3 font-semibold">Assigned Staff</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {sem.subjects.map((sub) => (
                      <tr key={sub.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4">
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-mono font-medium">
                            {sub.code}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-semibold text-slate-900 dark:text-white">
                          {sub.name}
                          {sub.type && sub.type !== 'THEORY' && (
                            <span className="ml-2 text-[10px] font-bold text-slate-400 uppercase">{sub.type}</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-900 dark:text-white">
                            <Award className="w-3.5 h-3.5 text-emerald-500" /> {sub.credits}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                          <span className="inline-flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {sub.staffName || <span className="text-slate-400 italic">Not assigned</span>}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default StudentCoursesDashboard;