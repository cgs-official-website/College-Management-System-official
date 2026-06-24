import React, { useState } from 'react';
import { useStudents } from '../../../hooks/useStudents';
import { useAuth } from '../../../contexts/AuthContext';
import { DataTable } from '../../../components/tables/DataTable';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Search, Plus, Upload, Edit, Trash2, Eye } from 'lucide-react';
import { StudentFormModal } from './StudentFormModal';
import toast from 'react-hot-toast';
import { useConfirm } from '../../../contexts/ConfirmContext';

export default function StudentList() {
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { students, isLoading, addStudent, updateStudent, deleteStudent, isAdding, isUpdating } = useStudents(collegeId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  const filteredStudents = students.filter(student => {
    const searchString = `${student.firstName} ${student.lastName} ${student.admissionNo}`.toLowerCase();
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
    if (await confirm({ message: "Are you sure you want to delete this student?" })) {
      await deleteStudent(id);
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

  const columns = [
    {
      header: 'Admission No',
      accessorKey: 'admissionNo',
      cell: (row) => <span className="font-medium text-primary-600 dark:text-primary-400">{row.admissionNo}</span>
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
          <p className="text-xs text-slate-500">{row.parentPhone}</p>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => (
        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
          row.status === 'active' 
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
            : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-400'
        }`}>
          {row.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            title="Edit"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleDelete(row.id)}
            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Students Directory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage student records and information.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => toast('Bulk import coming soon!')}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Student
          </Button>
        </div>
      </div>

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
        columns={columns}
        data={filteredStudents}
        isLoading={isLoading}
        emptyMessage="No students found. Add one to get started."
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
