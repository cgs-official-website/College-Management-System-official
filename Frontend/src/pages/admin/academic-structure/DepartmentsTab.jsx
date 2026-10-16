import React, { useState } from 'react';
import { useDepartments } from '../../../hooks/useDepartments';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Pagination } from '../../../components/ui/Pagination';
import { Search, Plus, Trash2, Edit2, Building2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { ExcelUploadButton } from '../../../components/ui/ExcelUploadButton';
import { Modal } from '../../../components/ui/Modal';
import { CustomFieldsSection } from '../../../modules/builder/CustomFieldsSection';

const DEPT_IMPORT_FIELDS = [
  {
    name: 'Department Name',
    required: true,
    type: 'String',
    description: 'Full name of the department',
    example: 'Computer Science',
  },
  {
    name: 'Department Code',
    required: true,
    type: 'String',
    description: 'Short unique code (will be uppercased automatically)',
    example: 'CSE',
  },
];

export default function DepartmentsTab({ onSelect }) {
  const { departments, isLoading, createDepartment, updateDepartment, deleteDepartment, bulkImport } = useDepartments();
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const confirm = useConfirm();

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const filtered = departments.filter(d => 
    (d.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (d.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingDept(null);
    reset({ name: '', code: '', customFields: {} });
  };

  const paginatedDepts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleOpenAdd = () => {
    setEditingDept(null);
    reset({ name: '', code: '', customFields: {} });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    reset({ name: dept.name, code: dept.code, customFields: dept.customFields || {} });
    setIsFormOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        name: data.name?.trim(),
        code: data.code?.trim().toUpperCase(),
        customFields: data.customFields || {},
      };

      if (editingDept) {
        await updateDepartment.mutateAsync({ id: editingDept.id, data: payload });
      } else {
        await createDepartment.mutateAsync(payload);
      }
      handleCloseForm();
    } catch {
      // Error is surfaced via mutation onError toast
    }
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: "Are you sure you want to delete this department? This will fail if active courses or students are attached." })) {
      try {
        await deleteDepartment.mutateAsync(id);
      } catch {
        // Error is surfaced via mutation onError toast
      }
    }
  };

  // Strip trailing asterisks from Excel header keys before sending to backend.
  // ExcelUploadButton generates headers as "Column Name*" for required fields.
  // departments.routes.js reads "Department Name" (no asterisk), so we normalise here.
  // Other modules (Staff, Sections, Library, Hostel) already read BOTH forms
  // (e.g. row['Staff_Name*'] || row['Staff_Name']), so they are unaffected.
  const handleBulkImport = async (rows) => {
    const stripped = rows.map(row => {
      const clean = {};
      for (const [k, v] of Object.entries(row)) {
        clean[k.replace(/\*+$/, '').trim()] = v;
      }
      return clean;
    });
    const res = await bulkImport.mutateAsync(stripped);
    const stats = res?.data ?? res;
    if (stats?.failed > 0) {
      setImportSummary(stats);
    }
    return res;
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
          <ExcelUploadButton
            onUpload={handleBulkImport}
            isLoading={bulkImport.isPending}
            title="Import Departments"
            description="Upload an Excel (.xlsx) or CSV file. Download the template first."
            fields={DEPT_IMPORT_FIELDS}
            instructionsNote="1. Do not delete or rename header columns in row 1 of the Template sheet. 2. Fields marked with an asterisk (*) are required. 3. Row 2 is a sample. Delete it before importing."
            sampleFileName="departments_import_template.xlsx"
          />
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
            {/* Custom Fields (Module Builder) */}
            <CustomFieldsSection model="Department" register={register} errors={errors} />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={handleCloseForm}>Cancel</Button>
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

      {importSummary && (
        <Modal
          isOpen={!!importSummary}
          onClose={() => setImportSummary(null)}
          title="Import Results"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 text-sm">
              <span className="font-semibold text-amber-800 dark:text-amber-300">
                {importSummary.successful} department(s) imported, {importSummary.failed} failed.
              </span>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Failed Rows</h4>
              <ul className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                {(importSummary.errors || []).map((err, idx) => (
                  <li key={idx} className="py-2 flex items-start gap-2 text-red-600 dark:text-red-400">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/40 shrink-0">
                      Row {err.row}
                    </span>
                    <span>{err.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end pt-2">
              <Button onClick={() => setImportSummary(null)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
