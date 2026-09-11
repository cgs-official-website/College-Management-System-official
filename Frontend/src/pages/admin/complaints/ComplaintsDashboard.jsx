import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  MessageSquareWarning, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Search, 
  Clock, 
  Eye, 
  User, 
  GraduationCap, 
  Loader2,
  Filter,
  Plus
} from 'lucide-react';
import { useComplaints } from '../../../hooks/useComplaints';
import { Pagination } from '../../../components/ui/Pagination';
import { useConfirm } from '../../../contexts/ConfirmContext';

export default function ComplaintsDashboard() {
  const confirm = useConfirm();
  const { items: complaints = [], isLoading, createItem, updateItem } = useComplaints();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, open, in_progress, resolved
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // New complaint form
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'Academics',
    priority: 'medium'
  });

  const handleStatusChange = async (complaint, newStatus) => {
    try {
      await updateItem({ id: complaint.id, status: newStatus });
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.description.trim()) {
      return toast.error('Please enter subject and description');
    }
    try {
      await createItem(formData);
      setIsLogModalOpen(false);
      setFormData({ subject: '', description: '', category: 'Academics', priority: 'medium' });
    } catch (err) {
      console.error(err);
    }
  };

  // Filter & pagination
  const filtered = complaints.filter((c) => {
    const matchesSearch = 
      (c.subject || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.admissionNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.category || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter !== 'all') {
      return matchesSearch && (c.status || '').toLowerCase() === statusFilter;
    }
    return matchesSearch;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const openCount = complaints.filter(c => (c.status || '').toLowerCase() === 'open').length;
  const inProgressCount = complaints.filter(c => (c.status || '').toLowerCase() === 'in_progress').length;
  const resolvedCount = complaints.filter(c => ['resolved', 'closed'].includes((c.status || '').toLowerCase())).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Complaints & Grievance Desk
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Review student grievances, support tickets, campus maintenance requests, and track resolutions.
          </p>
        </div>
        <button 
          onClick={() => setIsLogModalOpen(true)}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Log Complaint
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Total Grievances', value: complaints.length, icon: MessageSquareWarning, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Open Tickets', value: openCount, icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
          { title: 'Under Investigation', value: inProgressCount, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { title: 'Resolved Tickets', value: resolvedCount, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
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

      {/* Search and Filters */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search student, issue, category..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { label: 'All Tickets', value: 'all' },
            { label: 'Open', value: 'open' },
            { label: 'In Progress', value: 'in_progress' },
            { label: 'Resolved', value: 'resolved' }
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

      {/* Complaints Table */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="py-4 px-6">Complainant (Student)</th>
                <th className="py-4 px-6">Student ID</th>
                <th className="py-4 px-6">Subject & Description</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Logged Date</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
                    Loading grievance tickets...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <MessageSquareWarning className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    No grievance records found matching criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((c) => {
                  const status = (c.status || 'open').toLowerCase();

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                            {c.studentName?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{c.studentName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{c.department}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          {c.studentId || c.admissionNumber || 'N/A'}
                        </span>
                      </td>

                      <td className="py-4 px-6 max-w-xs">
                        <p className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{c.subject}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{c.description}</p>
                      </td>

                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">
                          {c.category || 'General'}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-slate-500 text-xs">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-6">
                        <select
                          value={status}
                          onChange={(e) => handleStatusChange(c, e.target.value)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-full border outline-none cursor-pointer transition-colors ${
                            status === 'open'
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                              : status === 'in_progress'
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                          }`}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="closed">Closed</option>
                        </select>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedComplaint(c)}
                          className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors"
                          title="View Full Complaint"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
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

      {/* Modal: View Details */}
      <AnimatePresence>
        {selectedComplaint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedComplaint(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Grievance Details
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {selectedComplaint.subject}
                </h2>
              </div>

              <div className="space-y-4 text-sm">
                <div className="p-3.5 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-medium">Student Name:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{selectedComplaint.studentName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Admission ID:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{selectedComplaint.studentId || selectedComplaint.admissionNumber}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Department:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{selectedComplaint.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Category:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{selectedComplaint.category}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Issue Description
                  </h4>
                  <p className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10 text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedComplaint.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/10">
                  <span className="text-xs text-slate-400">
                    Logged on: {new Date(selectedComplaint.createdAt).toLocaleString()}
                  </span>
                  <button
                    onClick={() => setSelectedComplaint(null)}
                    className="px-4 py-2 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Log Complaint */}
      <AnimatePresence>
        {isLogModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative"
            >
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                Log Institutional Complaint
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Record a new support ticket or administrative grievance.
              </p>

              <form onSubmit={handleLogSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  >
                    <option value="Academics">Academics</option>
                    <option value="Hostel">Hostel & Mess</option>
                    <option value="Infrastructure">Infrastructure & Labs</option>
                    <option value="IT & WiFi">IT & WiFi</option>
                    <option value="Transport">Transport</option>
                    <option value="Fees">Fees & Accounts</option>
                    <option value="General">General Administration</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Subject *
                  </label>
                  <input
                    type="text"
                    placeholder="Brief description of the problem"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Detailed Description *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Describe the complaint with full context..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsLogModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-md transition-all"
                  >
                    Submit Ticket
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
