import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileBarChart, 
  Clock, 
  CheckCircle2, 
  Upload, 
  AlertCircle, 
  FileText, 
  Loader2, 
  ExternalLink,
  X 
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useStudentAssignments } from '../../hooks/useStudentPortal';

const StudentAssignmentsDashboard = () => {
  const { data: assignmentsData, isLoading, submitAssignment, isSubmitting } = useStudentAssignments();
  const assignments = assignmentsData?.data || [];

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissionUrl, setSubmissionUrl] = useState('');

  const pendingCount = assignments.filter(a => a.status === 'Pending' || a.status === 'Overdue').length;
  const submittedCount = assignments.filter(a => a.status === 'Submitted' || a.status === 'Graded').length;
  const gradedCount = assignments.filter(a => a.status === 'Graded').length;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!submissionUrl.trim()) {
      toast.error('Please provide a submission link or document URL');
      return;
    }

    try {
      await submitAssignment({
        assignmentId: selectedAssignment.id,
        fileUrl: submissionUrl.trim()
      });
      toast.success('Assignment submitted successfully!');
      setSelectedAssignment(null);
      setSubmissionUrl('');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to submit assignment');
    }
  };

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
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Assignments</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Track upcoming deadlines, submit course projects, and review grading feedback.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
        {[
          { title: 'Pending', value: pendingCount, icon: Clock, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
          { title: 'Submitted', value: submittedCount, icon: Upload, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { title: 'Graded', value: gradedCount, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Total Assigned', value: assignments.length, icon: FileBarChart, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
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
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Assignments & Submissions</h2>
          <span className="text-xs font-bold px-3 py-1 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full border border-primary-100 dark:border-primary-500/20">
            {assignments.length} Total
          </span>
        </div>

        {assignments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center p-6">
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <FileBarChart className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Assignments Yet</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Assignments assigned by your professors will appear here for online submission.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {assignments.map((assignment) => {
              const isOverdue = assignment.status === 'Overdue';
              const isSubmitted = assignment.status === 'Submitted' || assignment.status === 'Graded';
              const formattedDate = assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No due date';

              return (
                <div key={assignment.id} className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-sm border ${
                      isSubmitted 
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : isOverdue
                        ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400'
                        : 'bg-primary-50 dark:bg-primary-500/10 border-primary-100 dark:border-primary-500/20 text-primary-600 dark:text-primary-400'
                    }`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{assignment.title}</h3>
                        <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 font-medium">
                          {assignment.courseName}
                        </span>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                          assignment.status === 'Graded'
                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                            : assignment.status === 'Submitted'
                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20'
                            : isOverdue
                            ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                            : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20'
                        }`}>
                          {assignment.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{assignment.description}</p>
                      
                      {assignment.score !== null && (
                        <div className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                          <span>Grade Score: {assignment.score} / 100</span>
                          {assignment.feedback && <span className="text-slate-500 font-normal">Feedback: "{assignment.feedback}"</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0 justify-end">
                    <div className="text-right text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                      <p className="font-semibold text-slate-900 dark:text-white">Due: {formattedDate}</p>
                      {assignment.submittedAt && <p className="text-[11px] text-emerald-600">Submitted on {new Date(assignment.submittedAt).toLocaleDateString()}</p>}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedAssignment(assignment);
                        setSubmissionUrl(assignment.submissionFileUrl || '');
                      }}
                      className={`px-4 py-2 text-xs font-bold rounded-xl shadow-sm transition-all flex items-center gap-1.5 ${
                        isSubmitted
                          ? 'bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300'
                          : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/30'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      {isSubmitted ? 'Update Submission' : 'Submit Assignment'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Submission Modal */}
      <AnimatePresence>
        {selectedAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedAssignment(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-white dark:bg-[#0A0F1C] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Submit Assignment</h3>
                  <p className="text-xs text-slate-500">{selectedAssignment.title} • {selectedAssignment.courseName}</p>
                </div>
                <button onClick={() => setSelectedAssignment(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Document or Project URL
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Paste your submission link (e.g. Google Drive, GitHub repository, or Cloud document link).
                  </p>
                  <input
                    type="url"
                    value={submissionUrl}
                    onChange={(e) => setSubmissionUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm dark:text-white"
                    required
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setSelectedAssignment(null)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center gap-2 disabled:opacity-50">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Confirm Submission
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentAssignmentsDashboard;
