import React from 'react';
import { motion } from 'framer-motion';
import { FileBarChart, AlertCircle, Award, CheckCircle2 } from 'lucide-react';
import { useParentGrades } from '../../hooks/useParentPortal';
import { useParentChild } from '../../contexts/ParentChildContext';

export default function ParentGrades() {
  const { activeChildId } = useParentChild();
  const { data, isLoading, isError } = useParentGrades(activeChildId);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="h-10 w-64 bg-slate-200 dark:bg-white/10 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-white dark:bg-[#0A0F1C] rounded-3xl border border-slate-200 dark:border-white/10" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white dark:bg-[#0A0F1C] rounded-3xl border border-slate-200 dark:border-white/10 p-12 text-center max-w-2xl mx-auto">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Unable to Load Academic Records</h2>
        <p className="text-slate-500 text-sm">Failed to retrieve exam marks. Please try again later.</p>
      </div>
    );
  }

  const summary = data?.summary || { totalExams: 0, averageScore: 0 };
  const results = data?.results || [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Academic Records</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Review your child's published examination scores, percentages, and grade standings.</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Exams Evaluated</span>
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400">
              <FileBarChart className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4">{summary.totalExams}</p>
        </div>

        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Average Percentage</span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-teal-600 dark:text-teal-400 mt-4">{summary.averageScore}%</p>
        </div>

        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Overall Academic Standing</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-4">
            {summary.averageScore >= 75 ? 'Good Standing' : summary.averageScore >= 50 ? 'Satisfactory' : 'Needs Focus'}
          </p>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-white/5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Exam Scorecard</h2>
        </div>

        {results.length === 0 ? (
          <div className="py-16 text-center">
            <FileBarChart className="w-14 h-14 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">No Academic Records Published</h3>
            <p className="text-slate-500 text-sm">Exam scores for this term will appear here once verified by faculty.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-white/5">
                <tr>
                  <th className="p-4 pl-6 font-semibold">Subject / Course</th>
                  <th className="p-4 font-semibold">Exam Title</th>
                  <th className="p-4 font-semibold">Marks Obtained</th>
                  <th className="p-4 font-semibold">Score (%)</th>
                  <th className="p-4 font-semibold">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {results.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 pl-6 font-medium text-slate-900 dark:text-white">
                      {r.courseName} {r.courseCode ? `(${r.courseCode})` : ''}
                    </td>
                    <td className="p-4 text-slate-600 dark:text-slate-300">
                      {r.examName} ({r.examType})
                    </td>
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">
                      {r.score} / {r.maxMarks}
                    </td>
                    <td className="p-4 font-medium text-teal-600 dark:text-teal-400">
                      {r.percentage}%
                    </td>
                    <td className="p-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                        r.grade.startsWith('A') ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                        r.grade.startsWith('B') ? 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-400' :
                        r.grade.startsWith('C') ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                        'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                      }`}>
                        {r.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
