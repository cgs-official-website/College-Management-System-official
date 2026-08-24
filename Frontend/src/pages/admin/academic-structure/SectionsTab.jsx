import React, { useState } from 'react';
import { useSections } from '../../../hooks/useSections';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Search, Plus, Trash2, Edit2, Users, ChevronLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { useCourses } from '../../../hooks/useCourses';
import { useAuth } from '../../../contexts/AuthContext';
import { useStaff } from '../../../hooks/useStaff';
import { ExcelUploadButton } from '../../../components/ui/ExcelUploadButton';

export default function SectionsTab({ courseId, courseName, onClearFilter }) {
  const { userData } = useAuth();
  const { sections, isLoading, createSection, updateSection, deleteSection, bulkImport } = useSections(courseId);
  const { courses } = useCourses(); // needed for dropdown if no course selected
  const { staff } = useStaff(userData?.collegeId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const confirm = useConfirm();

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const filtered = sections.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingSection(null);
    setSelectedTeachers([]);
    reset({ name: '', capacity: 60, courseId: courseId || '' });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (section) => {
    setEditingSection(section);
    setSelectedTeachers(section.teachers?.map(t => t.id) || []);
    reset({ name: section.name, capacity: section.capacity, courseId: section.courseId });
    setIsFormOpen(true);
  };

  const onSubmit = async (data) => {
    const payload = { 
      ...data, 
      capacity: parseInt(data.capacity, 10),
      teacherIds: selectedTeachers
    };
    if (editingSection) {
      await updateSection.mutateAsync({ id: editingSection.id, data: payload });
    } else {
      await createSection.mutateAsync(payload);
    }
    setIsFormOpen(false);
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: "Are you sure you want to delete this class section?" })) {
      await deleteSection.mutateAsync(id);
    }
  };

  return (
    <div className="space-y-6">
      {courseId && (
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <button onClick={onClearFilter} className="hover:text-primary-600 flex items-center">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to Programs
          </button>
          <span>/</span>
          <span className="font-medium text-slate-700 dark:text-slate-300">{courseName} Classes</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search classes..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 mb-0"
          />
        </div>
        <div className="flex gap-2">
          <ExcelUploadButton onUpload={bulkImport.mutateAsync} isLoading={bulkImport.isPending} />
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-2" /> Add Class
          </Button>
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            {editingSection ? 'Edit Class' : 'New Class'}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input 
                label="Class Name" 
                placeholder="e.g. Year 1 - Section A"
                {...register('name', { required: 'Name is required' })} 
                error={errors.name?.message} 
              />
              <Input 
                label="Student Capacity" 
                type="number"
                {...register('capacity', { required: 'Capacity is required', min: 1 })} 
                error={errors.capacity?.message} 
              />
              <div className="space-y-1">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Program / Course</label>
                <select 
                  {...register('courseId', { required: 'Program is required' })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white"
                >
                  <option value="">Select a Program</option>
                  {courses?.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.courseId && <p className="text-red-500 text-sm mt-1">{errors.courseId.message}</p>}
              </div>
              <div className="space-y-1 col-span-1 md:col-span-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Assigned Staff / Class Teachers</label>
                <select 
                  multiple
                  value={selectedTeachers}
                  onChange={(e) => {
                    const values = Array.from(e.target.selectedOptions, option => option.value);
                    setSelectedTeachers(values);
                  }}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white h-32"
                >
                  {staff?.map(t => (
                    <option key={t.id} value={t.id}>{t.user?.name || t.user?.email || 'Teacher'}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 dark:text-slate-400">Hold Ctrl (Windows) or Cmd (Mac) to select multiple.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={createSection.isPending || updateSection.isPending}>
                Save Class
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading classes...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No classes found</h3>
            <p className="text-slate-500 dark:text-slate-400">Add a class to this program.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Class Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Program</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Capacity</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned Staff</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {filtered.map(section => (
                  <tr key={section.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 dark:text-white">{section.name}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-slate-700 dark:text-slate-300">{section.course?.name || courseName || 'N/A'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 text-sm font-medium">
                        <Users className="w-3.5 h-3.5" />
                        {section.capacity}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1">
                        {section.teachers && section.teachers.length > 0 ? (
                          section.teachers.map(t => (
                            <span key={t.id} className="inline-block px-2 py-1 text-xs font-medium bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-md">
                              {t.user?.name || t.user?.email}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">None</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(section)} className="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(section.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
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
