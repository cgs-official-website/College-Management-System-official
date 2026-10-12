import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, Award, Calendar, Clock, BookOpen, CheckCircle2, Loader2 } from 'lucide-react';
import { useStudentExams, useStudentResults } from '../../hooks/useStudentPortal';

const StudentExamsDashboard = () => {
  const { data: examsData, isLoading: isExamsLoading } = useStudentExams();
  const { data: resultsData, isLoading: isResultsLoading } = useStudentResults();
  const [activeTab, setActiveTab] = useState('upcoming');

  const exams = examsData?.data || [];
  const results = resultsData?.data || [];

  const totalExams = exams.length;
  const publishedResults = results.length;

  if (isExamsLoading || isResultsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Exams & Results</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">View scheduled examinations, hall schedules, and published academic report cards.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {[
          { title: 'Scheduled Exams', value: totalExams, icon: Calendar, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Published Results', value: publishedResults, icon: Award, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Academic Standing', value: 'Good', icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
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

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('upcoming')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'upcoming'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
              : 'bg-white dark:bg-[#0A0F1C] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Examination Schedule ({exams.length})
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === 'results'
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
              : 'bg-white dark:bg-[#0A0F1C] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50'
          }`}
        >
          <Award className="w-4 h-4" />
          Marks & Report Card ({results.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'upcoming' ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-white/5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upcoming Exams</h2>
          </div>

          {exams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center p-6">
              <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <ClipboardList className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Upcoming Exams</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Midterm and end-semester examination timetables will appear here once published by the examination cell.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {exams.map((exam) => (
                <div key={exam.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0 font-extrabold text-sm">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{exam.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <BookOpen className="w-3.5 h-3.5" />
                          {exam.course?.name || 'General Course'}
                        </span>
                        <span>Type: {exam.type || 'Written Examination'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {exam.date ? new Date(exam.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'TBA'}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">Max Marks: {exam.maxMarks || 100}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-white/5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Academic Results</h2>
          </div>

          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center p-6">
              <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Award className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Results Published</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Evaluated marks and grade cards will be displayed here once released by the examination committee.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {results.map((res) => (
                <div key={res.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{res.exam?.title || 'Academic Assessment'}</h3>
                    <p className="text-xs text-slate-500 mt-1">{res.exam?.course?.name || 'Subject'}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                      {res.score ?? 'N/A'}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">/ {res.exam?.maxMarks || 100}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default StudentExamsDashboard;
