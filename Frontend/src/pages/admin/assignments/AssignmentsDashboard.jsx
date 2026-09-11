import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Calendar, 
  Clock, 
  Users, 
  Trash2, 
  Eye, 
  X, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../../services/apiClient';
import { useCourses } from '../../../hooks/useCourses';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { Pagination } from '../../../components/ui/Pagination';
import toast from 'react-hot-toast';

export default function AssignmentsDashboard() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { courses } = useCourses();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, closed
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [submissionsModalAssignment, setSubmissionsModalAssignment] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Form state
  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    description: '',
    dueDate: '',
    maxScore: 100
  });

  // Query assignments
  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['admin-assignments'],
    queryFn: async () => {
      const res = await api.get('/assignments');
      const raw = res?.data ?? res;
      return Array.isArray(raw) ? raw : [];
    }
  });

  // Query submissions for selected assignment
  const { data: submissions = [], isLoading: isLoadingSubmissions } = useQuery({
    queryKey: ['admin-assignment-submissions', submissionsModalAssignment?.id],
    queryFn: async () => {
      if (!submissionsModalAssignment?.id) return [];
      const res = await api.get(`/assignments/${submissionsModalAssignment.id}/submissions`);
      const raw = res?.data ?? res;
      return Array.isArray(raw) ? raw : [];
    },
    enabled: !!submissionsModalAssignment?.id
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/assignments', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-assignments'] });
      toast.success('Assignment created successfully!');
      setIsCreateModalOpen(false);
      setFormData({ courseId: '', title: '', description: '', dueDate: '', maxScore: 100 });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || 'Failed to create assignment');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/assignments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-assignments'] });
      toast.success('Assignment deleted successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to delete assignment');
    }
  });

  const handleDelete = async (id, title) => {
    const isConfirmed = await confirm({
      title: 'Delete Assignment',
      message: `Are you sure you want to delete "${title}"? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger'
    });
    if (isConfirmed) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!formData.courseId) return toast.error('Please select a course/subject');
    if (!formData.title.trim()) return toast.error('Please enter a title');
    if (!formData.dueDate) return toast.error('Please select a due date');

    createMutation.mutate({
      ...formData,
      maxScore: Number(formData.maxScore) || 100
    });
  };

  // Filter & paginate
  const filtered = assignments.filter((a) => {
    const matchesSearch = 
      (a.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.teacherName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    if (statusFilter === 'active') return matchesSearch && a.status === 'active';
    if (statusFilter === 'closed') return matchesSearch && a.status === 'closed';
    return matchesSearch;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const activeCount = assignments.filter(a => a.status === 'active').length;
  const closedCount = assignments.filter(a => a.status === 'closed').length;
  const totalSubmissions = assignments.reduce((acc, a) => acc + (a.submissionsCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Assignments Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Create, monitor, and manage coursework assignments and student submissions across classes.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Assignment
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Total Assignments', value: assignments.length, icon: BookOpen, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Active Due Dates', value: activeCount, icon: Clock, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Closed / Expired', value: closedCount, icon: CheckCircle2, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { title: 'Student Submissions', value: totalSubmissions, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
        ].map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                  {isLoading ? '...' : stat.value}
                </h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search assignments, courses, faculty..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { label: 'All Assignments', value: 'all' },
            { label: 'Active', value: 'active' },
            { label: 'Closed', value: 'closed' }
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                statusFilter === f.value
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assignments Table */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="py-4 px-6">Assignment Details</th>
                <th className="py-4 px-6">Course / Subject</th>
                <th className="py-4 px-6">Assigned By</th>
                <th className="py-4 px-6">Due Date</th>
                <th className="py-4 px-6 text-center">Submissions</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
                    Loading assignments...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <BookOpen className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    No assignments found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((a) => {
                  const isClosed = a.status === 'closed';
                  const formattedDue = new Date(a.dueDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  });

                  return (
                    <tr key={a.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-6">
                        <p className="font-bold text-slate-900 dark:text-white">{a.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{a.description}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{a.subject}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-slate-600 dark:text-slate-400 font-medium">{a.teacherName}</span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span>{formattedDue}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => setSubmissionsModalAssignment(a)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                          title="Click to view student submissions"
                        >
                          <Users className="w-3 h-3" />
                          <span>{a.submissionsCount}</span>
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          isClosed 
                            ? 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400' 
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                        }`}>
                          {isClosed ? 'Closed' : 'Active'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSubmissionsModalAssignment(a)}
                            className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors"
                            title="View Submissions"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(a.id, a.title)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Delete Assignment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > pageSize && (
          <div className="p-4 border-t border-slate-200 dark:border-white/10 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filtered.length / pageSize)}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Modal: Create Assignment */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-xl shadow-2xl relative"
            >
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                Create New Assignment
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                Publish a new coursework task or homework for enrolled students.
              </p>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Course / Class *
                  </label>
                  <select
                    value={formData.courseId}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  >
                    <option value="">Select a Course / Subject</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.code || 'Course'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Midterm Project Report"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Description & Instructions *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide assignment goals, guidelines, and submission requirements..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                      required
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Maximum Score
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={formData.maxScore}
                      onChange={(e) => setFormData({ ...formData, maxScore: e.target.value })}
                      className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Publish Assignment
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: View Submissions */}
      <AnimatePresence>
        {submissionsModalAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative max-h-[85vh] flex flex-col"
            >
              <button
                onClick={() => setSubmissionsModalAssignment(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                  Student Submissions
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {submissionsModalAssignment.title}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Course: {submissionsModalAssignment.subject} • Total Submissions: {submissions.length}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {isLoadingSubmissions ? (
                  <div className="py-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
                    Loading student submissions...
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    No submissions uploaded by students yet.
                  </div>
                ) : (
                  submissions.map((sub) => (
                    <div
                      key={sub.id}
                      className="p-4 rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white text-sm">
                          {sub.studentName}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Adm No: {sub.admissionNumber} • {sub.department}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Submitted: {new Date(sub.submittedAt).toLocaleString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                          {sub.status || 'Submitted'}
                        </span>
                        {sub.fileUrl && (
                          <a
                            href={sub.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View Work
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
