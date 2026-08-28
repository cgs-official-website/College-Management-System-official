import React, { useState } from 'react';
import { useDepartments } from '../../../hooks/useDepartments';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Pagination } from '../../../components/ui/Pagination';
import { Search, Plus, Trash2, Edit2, Building2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { ExcelUploadButton } from '../../../components/ui/ExcelUploadButton';

export default function DepartmentsTab({ onSelect }) {
  const { departments, isLoading, createDepartment, updateDepartment, deleteDepartment, bulkImport } = useDepartments();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const confirm = useConfirm();

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const filtered = departments.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    d.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedDepts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenAdd = () => {
    setEditingDept(null);
    reset({ name: '', code: '' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    reset({ name: dept.name, code: dept.code });
    setIsFormOpen(true);
  };

  const onSubmit = async (data) => {
    if (editingDept) {
      await updateDepartment.mutateAsync({ id: editingDept.id, data });
    } else {
      await createDepartment.mutateAsync(data);
    }
    setIsFormOpen(false);
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: "Are you sure you want to delete this department? This might fail if it has active courses attached." })) {
      await deleteDepartment.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search departments..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 mb-0"
          />
        </div>
        <div className="flex gap-2">
          <ExcelUploadButton onUpload={bulkImport.mutateAsync} isLoading={bulkImport.isPending} />
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add Department
          </Button>
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            {editingDept ? 'Edit Department' : 'New Department'}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Department Name" 
                placeholder="e.g. Computer Science"
                {...register('name', { required: 'Name is required' })} 
                error={errors.name?.message} 
              />
              <Input 
                label="Department Code" 
                placeholder="e.g. CSE"
                {...register('code', { required: 'Code is required' })} 
                error={errors.code?.message} 
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={createDepartment.isPending || updateDepartment.isPending}>
                Save Department
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading departments...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No departments found</h3>
            <p className="text-slate-500 dark:text-slate-400">Add a department to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Code</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {paginatedDepts.map(dept => (
                  <tr key={dept.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 dark:text-white">{dept.name}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-medium">
                      {dept.code}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="outline" onClick={() => onSelect(dept)}>
                          View Programs
                        </Button>
                        <button onClick={() => handleOpenEdit(dept)} className="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(dept.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length > 0 && (
              <Pagination
                totalItems={filtered.length}
                currentPage={currentPage}
                pageSize={pageSize}
                pageSizeOptions={[10, 20, 50, 100]}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
