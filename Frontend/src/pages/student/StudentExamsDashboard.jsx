import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, Award, Calendar, Loader2 } from 'lucide-react';
import { useStudentExams, useStudentResults } from '../../hooks/useStudentPortal';
import { api } from '../../services/apiClient';

const TH = 'p-4 text-sm font-bold text-slate-500 dark:text-slate-400';

function MarkCell({ row }) {
  if (!row.published) {
    return (
      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
        Not Published
      </span>
    );
  }
  if (row.isAbsent) {
    return (
      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
        AB
      </span>
    );
  }
  if (row.obtainedMarks === null || row.obtainedMarks === undefined) {
    return <span className="text-slate-400">-</span>;
  }
  return <span className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">{row.obtainedMarks}</span>;
}

function ExamTypeTable({ group }) {
  return (
    <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">{group.examTypeName}</h3>
        <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg">
          Semester {group.semester}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
              <th className={TH}>Course Code</th>
              <th className={TH}>Course Name</th>
              <th className={`${TH} text-center w-32`}>Max Marks</th>
              <th className={`${TH} text-center w-44`}>Obtained Marks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {group.rows.map((r) => (
              <tr key={r.subjectId} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                <td className="p-4 font-bold text-slate-900 dark:text-white">{r.code}</td>
                <td className="p-4 text-slate-700 dark:text-slate-200">{r.name}</td>
                <td className="p-4 text-center text-slate-600 dark:text-slate-300">{r.maxMarks ?? '-'}</td>
                <td className="p-4 text-center">
                  <MarkCell row={r} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : 'TBA';

const StudentExamsDashboard = () => {
  const { data: examsData, isLoading: isExamsLoading } = useStudentExams();
  const { data: resultsData, isLoading: isResultsLoading } = useStudentResults();
  const [activeTab, setActiveTab] = useState('results');

  const {
    data: internalData,
    isLoading: isInternalLoading,
    error: internalError,
  } = useQuery({
    queryKey: ['student-internal-results'],
    queryFn: async () => (await api.get('/student/internal-results')).data,
  });

  const exams = examsData?.data || [];
  const groups = internalData?.exams || [];
  const legacyResults = resultsData?.data || [];

  if (isExamsLoading || isResultsLoading || isInternalLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const tabClass = (key) =>
    `px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
      activeTab === key
        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25'
        : 'bg-white dark:bg-[#0A0F1C] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50'
    }`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Exams & Results</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          View your examination schedule and published internal exam marks.
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-white/10 pb-3">
        <button onClick={() => setActiveTab('results')} className={tabClass('results')}>
          <Award className="w-4 h-4" />
          Internal Marks
        </button>
        <button onClick={() => setActiveTab('upcoming')} className={tabClass('upcoming')}>
          <Calendar className="w-4 h-4" />
          Examination Schedule ({exams.length})
        </button>
      </div>

      {activeTab === 'results' ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {internalError && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-sm text-rose-700 dark:text-rose-300">
              {internalError?.data?.error?.message || internalError?.message || 'Failed to load results'}
            </div>
          )}

          {!internalError && groups.length === 0 && legacyResults.length === 0 && (
            <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm flex flex-col items-center justify-center py-16 text-center p-6">
              <Award className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No internal exams yet</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">
                Your subjects and marks appear here once an internal exam is scheduled for your semester.
              </p>
            </div>
          )}

          {groups.map((g) => (
            <ExamTypeTable key={`${g.examTypeId}-${g.semester}`} group={g} />
          ))}

          {legacyResults.length > 0 && (
            <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 dark:border-white/5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Other results</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {legacyResults.map((res) => (
                  <div key={res.id} className="p-5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{res.exam?.title || 'Assessment'}</p>
                      <p className="text-xs text-slate-500 mt-1">{res.exam?.course?.name || 'Subject'}</p>
                    </div>
                    <div>
                      <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">
                        {res.score ?? 'AB'}
                      </span>
                      <span className="text-xs text-slate-500 ml-1">/ {res.exam?.maxMarks || 100}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 dark:border-white/5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Examination Schedule</h2>
          </div>

          {exams.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center p-6">
              <ClipboardList className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No exams scheduled</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">
                Timetables appear here once scheduled.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                    <th className={TH}>Date</th>
                    <th className={TH}>Time</th>
                    <th className={TH}>Course Code</th>
                    <th className={TH}>Course Name</th>
                    <th className={TH}>Exam</th>
                    <th className={TH}>Hall</th>
                    <th className={TH}>Max Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                  {exams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                      <td className="p-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {formatDate(exam.date)}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {exam.startTime && exam.endTime ? `${exam.startTime} - ${exam.endTime}` : 'TBA'}
                      </td>
                      <td className="p-4 font-bold text-slate-900 dark:text-white">{exam.subjectCode || '-'}</td>
                      <td className="p-4 text-slate-700 dark:text-slate-200">
                        {exam.subjectName || exam.title}
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 text-xs font-bold rounded-md bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">
                          {exam.examName || exam.type}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">{exam.room || '-'}</td>
                      <td className="p-4 text-slate-600 dark:text-slate-300">{exam.maxMarks ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default StudentExamsDashboard;