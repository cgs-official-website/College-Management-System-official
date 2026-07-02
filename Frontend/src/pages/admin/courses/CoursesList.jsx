import React, { useState } from 'react';
import { Plus, Search, BookOpen, Clock, Users, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useCourses } from '../../../hooks/useCourses';
import { useStaff } from '../../../hooks/useStaff';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { CourseFormModal } from './CourseFormModal';
import { useConfirm } from '../../../contexts/ConfirmContext';

export default function CoursesList() {
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { courses, isLoading, addCourse, updateCourse, deleteCourse, isAdding, isUpdating } = useCourses(collegeId);
  const { staff } = useStaff(collegeId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  const filteredCourses = courses.filter(course => 
    (course.name || course.courseName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (course.code || course.courseCode || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingCourse(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (course) => {
    setEditingCourse(course);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: "Are you sure you want to delete this course?" })) {
      await deleteCourse(id);
    }
  };

  const handleSubmit = async (data) => {
    try {
      if (editingCourse) {
        await updateCourse({ id: editingCourse.id, data });
      } else {
        await addCourse(data);
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Classes & Sections</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage all classes and their sections offered by the college.</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Create Class
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex gap-4 bg-white dark:bg-[#0A0F1C] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input 
            placeholder="Search by class name or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 mb-0"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-40 bg-slate-100 dark:bg-white/5 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No classes found</h3>
          <p className="text-slate-500 dark:text-slate-400">Add classes to start managing your college's academic structure.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredCourses.map((course, idx) => (
            <div 
              key={course.id}
              className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-500/10 dark:to-primary-500/20 flex items-center justify-center text-primary-600 dark:text-primary-400">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{course.name || course.courseName}</h3>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{course.code || course.courseCode}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenEdit(course)} className="p-1.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors bg-slate-50 dark:bg-white/5 rounded-lg">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(course.id)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-slate-50 dark:bg-white/5 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {course.sections && course.sections.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-2">
                    {course.sections.map(sec => (
                      <span key={sec} className="px-2 py-1 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 text-xs font-bold rounded-md">
                        Section {sec}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {course.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{course.description}</p>
              )}

              {course.assignedTeacher && (
                <div className="mb-4 text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span className="font-medium">Teacher: </span>
                  {staff.find(s => s.id === course.assignedTeacher)?.firstName} {staff.find(s => s.id === course.assignedTeacher)?.lastName}
                </div>
              )}

              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {course.duration}
                </div>
                {/* Placeholder for total students enrolled in this course */}
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium px-3 py-1 bg-slate-50 dark:bg-white/5 rounded-lg">
                  <Users className="w-4 h-4 text-primary-500" />
                  <span className="font-bold text-slate-900 dark:text-white">Active</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CourseFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingCourse}
        isLoading={isAdding || isUpdating}
      />
    </div>
  );
}
