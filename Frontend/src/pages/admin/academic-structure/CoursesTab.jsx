import React, { useState } from 'react';
import { useCourses } from '../../../hooks/useCourses';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Search, Plus, Trash2, Edit2, GraduationCap, ChevronLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { useDepartments } from '../../../hooks/useDepartments';

export default function CoursesTab({ departmentId, departmentName, onSelect, onClearFilter }) {
  const { courses, isLoading, createCourse, updateCourse, deleteCourse } = useCourses(departmentId);
  const { departments } = useDepartments(); // needed for the dropdown when adding/editing if no department is selected
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const confirm = useConfirm();

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const filtered = courses.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingCourse(null);
    reset({ name: '', code: '', semester: 8, credits: 160, departmentId: departmentId || '' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (course) => {
    setEditingCourse(course);
    reset({ 
      name: course.name, 
      code: course.code, 
      semester: course.semester, 
      credits: course.credits,
      departmentId: course.departmentId 
    });
    setIsFormOpen(true);
  };

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      semester: parseInt(data.semester, 10),
      credits: parseInt(data.credits, 10)
    };

    if (editingCourse) {
      await updateCourse.mutateAsync({ id: editingCourse.id, data: payload });
    } else {
      await createCourse.mutateAsync(payload);
    }
    setIsFormOpen(false);
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: "Are you sure you want to delete this program? Active sections will be impacted." })) {
      await deleteCourse.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      {departmentId && (
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <button onClick={onClearFilter} className="hover:text-primary-600 flex items-center">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Departments
          </button>
          <span>/</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">{departmentName} Programs</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search programs..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 mb-0"
          />
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-2" /> Add Program
        </Button>
      </div>

      {isFormOpen && (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            {editingCourse ? 'Edit Program' : 'New Program'}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Program Name" 
                placeholder="e.g. B.Tech Computer Science"
                {...register('name', { required: 'Name is required' })} 
                error={errors.name?.message} 
              />
              <Input 
                label="Program Code" 
                placeholder="e.g. BTECH-CSE"
                {...register('code', { required: 'Code is required' })} 
                error={errors.code?.message} 
              />
              
              <Input 
                label="Total Semesters / Years" 
                type="number"
                {...register('semester', { required: 'Duration is required', min: 1 })} 
                error={errors.semester?.message} 
              />
              
              <div className="space-y-1">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Department</label>
                <select 
                  {...register('departmentId', { required: 'Department is required' })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white"
                >
                  <option value="">Select a Department</option>
                  {departments?.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {errors.departmentId && <p className="text-red-500 text-sm mt-1">{errors.departmentId.message}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={createCourse.isPending || updateCourse.isPending}>
                Save Program
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading programs...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No programs found</h3>
            <p className="text-slate-500 dark:text-slate-400">Add a program to this department.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Program</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Department</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Duration</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {filtered.map(course => (
                  <tr key={course.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 dark:text-white">{course.name}</div>
                      <div className="text-sm text-slate-500">{course.code}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-300 font-medium">
                      {course.department?.name || 'Unknown'}
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-300">
                      {course.semester} Semesters
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="outline" onClick={() => onSelect(course)}>
                          View Classes
                        </Button>
                        <button onClick={() => handleOpenEdit(course)} className="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(course.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
