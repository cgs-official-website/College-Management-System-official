import React, { useState, useEffect } from 'react';
import { useSubjects } from '../../../hooks/useSubjects';
import { useCourses } from '../../../hooks/useCourses';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Search, Plus, Trash2, Edit2, BookOpen } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { ExcelUploadButton } from '../../../components/ui/ExcelUploadButton';

const SUBJECT_IMPORT_FIELDS = [
  { name: 'Program_Code', required: true, type: 'String', description: 'Code or name of an existing program', example: 'BTECH-CSE' },
  { name: 'Semester', required: true, type: 'Number', description: 'Semester number within the program', example: '3' },
  { name: 'Subject_Code', required: true, type: 'String', description: 'Unique subject code within the program', example: 'CS301' },
  { name: 'Subject_Name', required: true, type: 'String', description: 'Name of the subject', example: 'Data Structures' },
  { name: 'Credits', required: false, type: 'Number', description: 'Credits of this subject (default 0)', example: '4' },
  { name: 'Type', required: false, type: 'String', description: 'THEORY, LAB or PROJECT (default THEORY)', example: 'THEORY' },
];

const TYPE_STYLES = {
  THEORY: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  LAB: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  PROJECT: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
};

const selectClass =
  'w-full px-4 py-3 bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white';

const TH = 'py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider';

export default function SubjectsTab({ courseId: initialCourseId }) {
  const { courses } = useCourses();
  const [courseId, setCourseId] = useState(initialCourseId || '');
  const [semester, setSemester] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);
  const confirm = useConfirm();

  useEffect(() => {
    if (initialCourseId) setCourseId(initialCourseId);
  }, [initialCourseId]);

  const selectedCourse = courses.find((c) => c.id === courseId);
  const semesterOptions = selectedCourse
    ? Array.from({ length: selectedCourse.semester }, (_, i) => i + 1)
    : [];

  const { subjects, isLoading, createSubject, updateSubject, deleteSubject, bulkImport } =
    useSubjects(courseId || null, semester || null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const filtered = subjects.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingSubject(null);
    reset({ code: '', name: '', credits: 0, type: 'THEORY', semester: semester || 1, isActive: true });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (s) => {
    setEditingSubject(s);
    reset({ code: s.code, name: s.name, credits: s.credits, type: s.type, semester: s.semester, isActive: s.isActive });
    setIsFormOpen(true);
  };

  const onSubmit = async (data) => {
    const payload = {
      courseId,
      code: data.code,
      name: data.name,
      type: data.type,
      semester: parseInt(data.semester, 10),
      credits: parseInt(data.credits, 10) || 0,
      isActive: !!data.isActive,
    };
    try {
      if (editingSubject) {
        await updateSubject.mutateAsync({ id: editingSubject.id, data: payload });
      } else {
        await createSubject.mutateAsync(payload);
      }
      setIsFormOpen(false);
    } catch {
      // toast is shown by the mutation's onError
    }
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: 'Delete this subject? This is blocked if it is already in use.' })) {
      try { await deleteSubject.mutateAsync(id); } catch { /* toast shown */ }
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <div className="space-y-1">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Program</label>
          <select
            value={courseId}
            onChange={(e) => { setCourseId(e.target.value); setSemester(''); }}
            className={selectClass}
          >
            <option value="">All programs</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Semester</label>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            disabled={!courseId}
            className={selectClass}
          >
            <option value="">All semesters</option>
            {semesterOptions.map((n) => (
              <option key={n} value={n}>Semester {n}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search subjects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 mb-0"
          />
        </div>
        <div className="flex gap-2">
          <ExcelUploadButton
            onUpload={bulkImport.mutateAsync}
            isLoading={bulkImport.isPending}
            title="Import Subjects"
            description="Upload an Excel (.xlsx, .xls) or CSV file with one row per subject."
            fields={SUBJECT_IMPORT_FIELDS}
            notes="1. Program_Code must match an existing program. 2. Semester must be within the program's total semesters. 3. Type is THEORY, LAB or PROJECT. 4. An existing Subject_Code in the same program is updated."
            sampleFileName="subjects_import_template.xlsx"
          />
          <Button onClick={handleOpenAdd} disabled={!courseId} title={!courseId ? 'Select a program first' : ''}>
            <Plus className="w-4 h-4 mr-2" /> Add Subject
          </Button>
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
            {editingSubject ? 'Edit Subject' : `New Subject for ${selectedCourse?.name || ''}`}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Subject Code"
                placeholder="e.g. CS301"
                {...register('code', { required: 'Code is required' })}
                error={errors.code?.message}
              />
              <Input
                label="Subject Name"
                placeholder="e.g. Data Structures"
                {...register('name', { required: 'Name is required' })}
                error={errors.name?.message}
              />
              <div className="space-y-1">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Semester</label>
                <select {...register('semester', { required: true })} className={selectClass}>
                  {semesterOptions.map((n) => (
                    <option key={n} value={n}>Semester {n}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Credits"
                type="number"
                {...register('credits', { min: 0 })}
                error={errors.credits?.message}
              />
              <div className="space-y-1">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Type</label>
                <select {...register('type')} className={selectClass}>
                  <option value="THEORY">Theory</option>
                  <option value="LAB">Lab</option>
                  <option value="PROJECT">Project</option>
                </select>
              </div>
              <label className="flex items-center gap-2 pt-8 text-sm font-bold text-slate-700 dark:text-slate-300">
                <input type="checkbox" {...register('isActive')} className="w-4 h-4" />
                Active
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={createSubject.isPending || updateSubject.isPending}>
                Save Subject
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading subjects...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No subjects found</h3>
            <p className="text-slate-500 dark:text-slate-400">
              {courseId ? 'Add subjects for this program and semester.' : 'Select a program to add subjects.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <th className={TH}>Subject</th>
                  <th className={TH}>Program</th>
                  <th className={TH}>Sem</th>
                  <th className={TH}>Type</th>
                  <th className={TH}>Credits</th>
                  <th className={TH}>Status</th>
                  <th className={`${TH} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900 dark:text-white">{s.name}</div>
                      <div className="text-sm text-slate-500">{s.code}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-300">{s.course?.name}</td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-300">{s.semester}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-block px-2 py-1 text-xs font-bold rounded-md ${TYPE_STYLES[s.type]}`}>{s.type}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-slate-300">{s.credits}</td>
                    <td className="py-4 px-6 text-sm text-slate-600 dark:text-slate-300">{s.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(s)} className="p-2 text-slate-400 hover:text-primary-600 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(s.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
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