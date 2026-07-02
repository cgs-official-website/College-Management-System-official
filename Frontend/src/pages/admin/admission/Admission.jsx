import React, { useState } from 'react';
import { Plus, Search, UserPlus, CheckCircle, XCircle, Clock, Edit, Trash2, ArrowRight } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useAdmissions } from '../../../hooks/useAdmissions';
import { useStudents } from '../../../hooks/useStudents';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { AdmissionFormModal } from './AdmissionFormModal';
import { motion } from 'framer-motion';
import { useConfirm } from '../../../contexts/ConfirmContext';

export default function Admission() {
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  
  const { admissions, isLoading, addAdmission, updateAdmission, deleteAdmission, isAdding, isUpdating } = useAdmissions(collegeId);
  const { addStudent } = useStudents(collegeId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAdmission, setEditingAdmission] = useState(null);

  const filteredAdmissions = admissions.filter(app => {
    const search = searchTerm.toLowerCase();
    const fName = app.firstName || app.studentName || '';
    const lName = app.lastName || '';
    const cName = app.courseName || '';
    return fName.toLowerCase().includes(search) || lName.toLowerCase().includes(search) || cName.toLowerCase().includes(search);
  });

  const handleOpenAdd = () => {
    setEditingAdmission(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (admission) => {
    setEditingAdmission(admission);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: "Are you sure you want to delete this application?" })) {
      await deleteAdmission(id);
    }
  };

  const handleSubmit = async (data) => {
    try {
      if (editingAdmission) {
        await updateAdmission({ id: editingAdmission.id, data });
        // If approved, optionally trigger auto-enrollment
        if (data.status === 'Approved' && editingAdmission.status !== 'Approved') {
          if (await confirm({ message: "This application is Approved. Would you like to automatically enroll them as a Student now?" })) {
            await enrollStudent(data);
          }
        }
      } else {
        await addAdmission(data);
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const enrollStudent = async (data) => {
    try {
      await addStudent({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        class: data.courseId || data.courseName, // fallback to name if ID is missing from old records
        section: 'A',
        gender: 'Not Specified',
        address: ''
      });
    } catch(err) {
      console.error("Error auto-enrolling:", err);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg text-xs font-bold uppercase tracking-wider w-max"><CheckCircle className="w-3.5 h-3.5" /> Approved</span>;
      case 'Rejected':
        return <span className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400 rounded-lg text-xs font-bold uppercase tracking-wider w-max"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      case 'Waitlisted':
        return <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 rounded-lg text-xs font-bold uppercase tracking-wider w-max"><Clock className="w-3.5 h-3.5" /> Waitlisted</span>;
      default:
        return <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 rounded-lg text-xs font-bold uppercase tracking-wider w-max"><Clock className="w-3.5 h-3.5" /> Pending</span>;
    }
  };

  // Stats
  const totalInquiries = admissions.length;
  const pending = admissions.filter(a => a.status === 'Pending').length;
  const approved = admissions.filter(a => a.status === 'Approved').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Admissions Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review applications and manage the prospective student pipeline.</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Inquiry
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Total Applications</p>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">{isLoading ? '...' : totalInquiries}</h3>
          </div>
          <div className="w-14 h-14 rounded-full bg-slate-50 dark:bg-white/5 flex items-center justify-center border border-slate-100 dark:border-white/10">
            <UserPlus className="w-7 h-7 text-slate-400" />
          </div>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Pending Review</p>
            <h3 className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">{isLoading ? '...' : pending}</h3>
          </div>
          <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
            <Clock className="w-7 h-7 text-blue-500" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Approved & Enrolled</p>
            <h3 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">{isLoading ? '...' : approved}</h3>
          </div>
          <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20 relative z-10">
            <CheckCircle className="w-7 h-7 text-emerald-500" />
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-emerald-500/10 blur-2xl rounded-full"></div>
        </motion.div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white dark:bg-[#0A0F1C] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input 
            placeholder="Search applicants by name or program..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 mb-0"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4 pl-6">Applicant Name</th>
                <th className="p-4">Applied Program</th>
                <th className="p-4">Contact Details</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {isLoading ? (
                [1, 2, 3].map(n => (
                  <tr key={n} className="animate-pulse">
                    <td className="p-4 pl-6"><div className="h-10 w-48 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4"><div className="h-6 w-32 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4"><div className="h-6 w-24 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4"><div className="h-8 w-24 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4 pr-6"></td>
                  </tr>
                ))
              ) : filteredAdmissions.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-white/10">
                      <UserPlus className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No applications found</h3>
                    <p className="text-slate-500 dark:text-slate-400">There are no prospective students matching your search.</p>
                  </td>
                </tr>
              ) : (
                filteredAdmissions.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {(app.firstName || app.studentName || 'A').charAt(0)}{(app.lastName || '').charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{app.firstName || app.studentName} {app.lastName || ''}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                            from {app.previousSchool || 'Unknown School'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{app.courseName}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400">{app.email}</p>
                      <p className="text-xs text-slate-500">{app.phone}</p>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(app.status)}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {(app.status === 'Pending' || app.status === 'pending') && (
                           <button onClick={() => handleOpenEdit(app)} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-primary-50 text-primary-600 hover:bg-primary-100 dark:bg-primary-500/10 dark:text-primary-400 dark:hover:bg-primary-500/20 rounded-lg transition-colors border border-primary-200 dark:border-primary-500/20">
                             Review <ArrowRight className="w-3 h-3" />
                           </button>
                        )}
                        {(app.status !== 'Pending' && app.status !== 'pending') && (
                           <button onClick={() => handleOpenEdit(app)} className="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-lg shadow-sm">
                             <Edit className="w-4 h-4" />
                           </button>
                        )}
                        <button onClick={() => handleDelete(app.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-lg shadow-sm">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AdmissionFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingAdmission}
        isLoading={isAdding || isUpdating}
      />
    </div>
  );
}
