import React, { useState } from 'react';
import { useStudents } from '../../../hooks/useStudents';
import { useAuth } from '../../../contexts/AuthContext';
import { DataTable } from '../../../components/tables/DataTable';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Search, Plus, Edit, Trash2, CheckCircle, Clock } from 'lucide-react';
import { StudentFormModal } from './StudentFormModal';
import toast from 'react-hot-toast';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { ExcelUploadButton } from '../../../components/ui/ExcelUploadButton';
import { api } from '../../../services/api';
import { useQueryClient } from '@tanstack/react-query';

export default function StudentList() {
  const confirm = useConfirm();
  const { userData } = useAuth();
  const queryClient = useQueryClient();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { students, isLoading, addStudent, updateStudent, deleteStudent, isAdding, isUpdating, isImporting, bulkImport } = useStudents(collegeId);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'active'
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [activatingId, setActivatingId] = useState(null);

  // Split students by status
  const pendingStudents = students.filter(s => s.status === 'pending');
  const activeStudents = students.filter(s => s.status === 'active');

  const tabStudents = activeTab === 'pending' ? pendingStudents
    : activeTab === 'active' ? activeStudents
    : students;

  const filteredStudents = tabStudents.filter(student => {
    const searchString = `${student.firstName} ${student.lastName} ${student.admissionNo} ${student.registerNumber || ''} ${student.studentRegNo || ''} ${student.rollNumber || ''}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const handleOpenAdd = () => {
    setEditingStudent(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (student) => {
    setEditingStudent(student);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: "Are you sure you want to delete this user?" })) {
      await deleteStudent(id);
    }
  };

  const handleActivate = async (student) => {
    if (!(await confirm({
      message: `Activate account for ${student.firstName} ${student.lastName}? They will be able to log in immediately.`,
      confirmLabel: 'Activate',
    }))) return;

    setActivatingId(student.id);
    try {
      await api.patch(`/students/${student.id}/activate`);
      toast.success(`${student.firstName} ${student.lastName}'s account has been activated.`);
      // Invalidate the students query so the list refreshes
      queryClient.invalidateQueries({ queryKey: ['students', collegeId] });
    } catch (err) {
      toast.error(err.message || 'Failed to activate student account.');
    } finally {
      setActivatingId(null);
    }
  };

  const handleSubmit = async (data) => {
    try {
      if (editingStudent) {
        await updateStudent({ id: editingStudent.id, data });
      } else {
        await addStudent(data);
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  // Columns for active / all tabs
  const baseColumns = [
    {
      header: 'Admission No',
      accessorKey: 'admissionNo',
      cell: (row) => <span className="font-medium text-primary-600 dark:text-primary-400">{row.admissionNo}</span>
    },
    {
      header: 'Student Reg No',
      accessorKey: 'registerNumber',
      cell: (row) => (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 font-medium">
          {row.registerNumber || row.studentRegNo || row.rollNumber || '-'}
        </span>
      )
    },
    {
      header: 'Name',
      accessorKey: 'name',
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-xs">
            {row.firstName?.[0]}{row.lastName?.[0]}
          </div>
          <div>
            <p className="font-medium">{row.firstName} {row.lastName}</p>
            <p className="text-xs text-slate-500">{row.email}</p>
          </div>
        </div>
      )
    },
    {
      header: 'Class',
      accessorKey: 'class',
      cell: (row) => `${row.class || '-'} ${row.section ? `(${row.section})` : ''}`
    },
    {
      header: 'Parent/Guardian',
      accessorKey: 'parentName',
      cell: (row) => (
        <div>
          <p>{row.parentName || '-'}</p>
          {row.parentPhone && (
            <p className="text-xs text-slate-500">{row.parentPhone}</p>
          )}
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => {
        const isPending = row.status === 'pending';
        return (
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            isPending
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
          }`}>
            {isPending ? 'Pending Approval' : 'Active'}
          </span>
        );
      }
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (row) => (
        <div className="flex items-center gap-2">
          {/* Activate button — only for pending students */}
          {row.status === 'pending' && (
            <button
              onClick={() => handleActivate(row)}
              disabled={activatingId === row.id}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 transition-colors disabled:opacity-50"
              title="Activate student account"
            >
              {activatingId === row.id
                ? <><Clock className="w-3.5 h-3.5 animate-spin" /> Activating...</>
                : <><CheckCircle className="w-3.5 h-3.5" /> Activate</>
              }
            </button>
          )}
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-500 hover:text-primary-600 transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(row.id)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg text-slate-500 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const tabs = [
    { key: 'all', label: 'All Students', count: students.length },
    {
      key: 'pending',
      label: 'Pending Approval',
      count: pendingStudents.length,
      badge: pendingStudents.length > 0
    },
    { key: 'active', label: 'Active', count: activeStudents.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Students Directory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage student records and import admissions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ExcelUploadButton
            onUpload={bulkImport}
            isLoading={isImporting}
          />
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-white/10">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
              tab.badge
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Pending banner */}
      {activeTab !== 'pending' && pendingStudents.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-sm">
          <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="text-amber-700 dark:text-amber-400">
            <strong>{pendingStudents.length} student{pendingStudents.length > 1 ? 's' : ''}</strong> waiting for approval.{' '}
            <button
              onClick={() => setActiveTab('pending')}
              className="underline font-semibold hover:no-underline"
            >
              Review now
            </button>
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input
            placeholder="Search students by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <DataTable
        columns={baseColumns}
        data={filteredStudents}
        isLoading={isLoading}
        emptyMessage={
          activeTab === 'pending'
            ? 'No students pending approval.'
            : 'No students found. Add one to get started.'
        }
      />

      <StudentFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingStudent}
        isLoading={isAdding || isUpdating}
      />
    </div>
  );
}
