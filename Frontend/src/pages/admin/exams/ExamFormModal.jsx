import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useDepartments } from '../../../hooks/useDepartments';
import { useCourses } from '../../../hooks/useCourses';
import { Sparkles, Edit3 } from 'lucide-react';

const ALLOWED_EXAM_TYPES = ['Midterm', 'Final', 'Quiz', 'Practical', 'Internal', 'Semester'];

const EXAM_TYPE_OPTIONS = [
  { value: 'Midterm', label: 'Midterm Exam' },
  { value: 'Internal', label: 'Internal Assessment' },
  { value: 'Semester', label: 'Semester Exam' },
  { value: 'Final', label: 'Final Exam / End Semester' },
  { value: 'Quiz', label: 'Quiz / Class Test' },
  { value: 'Practical', label: 'Practical / Lab Exam' }
];

export const normalizeExamType = (type) => {
  if (!type) return 'Midterm';
  if (ALLOWED_EXAM_TYPES.includes(type)) return type;

  const lower = String(type).toLowerCase().trim();
  if (lower.includes('mid')) return 'Midterm';
  if (lower.includes('internal') || lower.includes('unit') || lower.includes('cat') || lower.includes('model') || lower.includes('assessment')) return 'Internal';
  if (lower.includes('sem')) return 'Semester';
  if (lower.includes('final')) return 'Final';
  if (lower.includes('quiz') || lower.includes('test')) return 'Quiz';
  if (lower.includes('pract') || lower.includes('lab') || lower.includes('viva')) return 'Practical';

  return 'Midterm';
};

export const normalizeHall = (rawHall) => {
  if (!rawHall) return '';
  let h = String(rawHall).trim().toLowerCase();
  h = h.replace(/^(?:hall|room)\s*(?:no\.?|number|-|:)?\s*/i, '').trim();
  return h;
};

export const normalizeTime = (t) => {
  if (!t || typeof t !== 'string') return null;
  const match = t.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
};

export function ExamFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading, existingExams = [] }) {
  const { departments, isLoading: isDepartmentsLoading } = useDepartments();
  const { courses = [], isLoading: isCoursesLoading, error: coursesError } = useCourses();
  
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      title: '',
      departmentId: '',
      courseId: '',
      subject: '',
      examDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '12:00',
      room: '',
      totalMarks: 100,
      type: 'Midterm'
    }
  });

  const selectedDeptId = watch('departmentId');
  const watchedRoom = watch('room');
  const watchedDate = watch('examDate');
  const watchedStartTime = watch('startTime');
  const watchedEndTime = watch('endTime');

  const hallConflictMessage = React.useMemo(() => {
    if (!watchedRoom || !watchedRoom.trim() || !watchedDate) return null;
    const normWatchedHall = normalizeHall(watchedRoom);
    if (!normWatchedHall) return null;

    const normWatchedStart = normalizeTime(watchedStartTime);
    const normWatchedEnd = normalizeTime(watchedEndTime);

    const targetDateStr = String(watchedDate).split('T')[0];

    const conflict = existingExams.find((ex) => {
      if (initialData?.id && ex.id === initialData.id) return false;
      if (ex.status?.toLowerCase() === 'cancelled') return false;

      const exDateStr = (ex.date || ex.examDate || '').split('T')[0];
      if (exDateStr !== targetDateStr) return false;

      const exNormHall = normalizeHall(ex.room);
      if (!exNormHall || exNormHall !== normWatchedHall) return false;

      const exStart = normalizeTime(ex.startTime);
      const exEnd = normalizeTime(ex.endTime);

      if (!normWatchedStart || !normWatchedEnd || !exStart || !exEnd) {
        return true;
      }

      return normWatchedStart < exEnd && normWatchedEnd > exStart;
    });

    if (!conflict) return null;

    const exStart = normalizeTime(conflict.startTime);
    const exEnd = normalizeTime(conflict.endTime);
    const timeStr = exStart && exEnd ? ` from ${exStart} to ${exEnd}` : '';
    const conflictName = conflict.title || conflict.name || 'another exam';
    const rawTrimmed = String(watchedRoom).trim();
    const hallDisplay = /hall/i.test(rawTrimmed) ? rawTrimmed : `Hall ${rawTrimmed}`;
    return `${hallDisplay} is already booked${timeStr} for ${conflictName}.`;
  }, [watchedRoom, watchedDate, watchedStartTime, watchedEndTime, existingExams, initialData]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const safeType = normalizeExamType(initialData.type);
        reset({
          title: initialData.title || initialData.name || '',
          departmentId: initialData.departmentId || '',
          courseId: initialData.courseId || '',
          subject: initialData.subject || initialData.name || '',
          examDate: initialData.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          startTime: initialData.startTime || '09:00',
          endTime: initialData.endTime || '12:00',
          room: initialData.room || '',
          totalMarks: initialData.maxMarks || initialData.totalMarks || 100,
          type: safeType
        });
      } else {
        reset({
          title: '',
          departmentId: '',
          courseId: '',
          subject: '',
          examDate: new Date().toISOString().split('T')[0],
          startTime: '09:00',
          endTime: '12:00',
          room: '',
          totalMarks: 100,
          type: 'Midterm'
        });
      }
    }
  }, [isOpen, initialData, reset]);

  // Filter courses for the selected department
  const filteredCourses = selectedDeptId 
    ? courses.filter(c => c.departmentId === selectedDeptId)
    : courses;

  const onFormSubmit = (data) => {
    const selectedDept = departments.find(d => d.id === data.departmentId);
    const selectedCourse = courses.find(c => c.id === data.courseId);
    const examType = normalizeExamType(data.type);

    const finalData = {
      ...data,
      name: data.title,
      date: data.examDate,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      room: data.room ? data.room.trim() : 'Main Hall',
      maxMarks: Number(data.totalMarks) || 100,
      totalMarks: Number(data.totalMarks) || 100,
      type: examType,
      departmentId: data.departmentId || (selectedCourse ? selectedCourse.departmentId : null),
      departmentName: selectedDept ? selectedDept.name : (selectedCourse?.department?.name || 'General'),
      departmentCode: selectedDept ? selectedDept.code : (selectedCourse?.department?.code || null),
      courseId: data.courseId || null,
      courseName: selectedCourse ? selectedCourse.name : (data.subject || selectedDept?.name || 'General Program')
    };
    onSubmit(finalData);
  };

  const departmentOptions = departments.map(d => ({
    value: d.id,
    label: `${d.name} (${d.code})`
  }));

  const courseOptions = filteredCourses.map(c => ({
    value: c.id,
    label: `${c.name} (${c.code})`
  }));

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData ? "Edit Exam Schedule" : "Schedule New Exam"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Exam Title *" 
            placeholder="e.g. First Internal Assessment"
            {...register('title', { required: "Title is required" })}
            error={errors.title?.message}
          />
          
          <Select 
            label="Department *" 
            {...register('departmentId', { required: "Department is required" })}
            error={errors.departmentId?.message}
            options={[
              { value: '', label: isDepartmentsLoading ? 'Loading departments...' : 'Select department...' }, 
              ...departmentOptions
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select 
            label="Course / Program" 
            {...register('courseId')}
            options={[
              { value: '', label: courseOptions.length > 0 ? 'Select course (optional)...' : 'No courses for this dept (optional)' }, 
              ...courseOptions
            ]}
          />

          <Input 
            label="Subject / Paper Name *" 
            placeholder="e.g. Data Structures & Algorithms"
            {...register('subject', { required: "Subject is required" })}
            error={errors.subject?.message}
          />
        </div>

        {/* Exam Type & Total Marks */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Select 
              label="Exam Type *"
              {...register('type', { required: "Exam type is required" })}
              options={EXAM_TYPE_OPTIONS}
            />
          </div>

          <Input 
            label="Total Marks" 
            type="number"
            {...register('totalMarks')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input 
            label="Exam Date *" 
            type="date"
            {...register('examDate', { required: "Date is required" })}
            error={errors.examDate?.message}
          />
          <Input 
            label="Start Time *" 
            type="time"
            {...register('startTime', { required: "Start time is required" })}
          />
          <Input 
            label="End Time *" 
            type="time"
            {...register('endTime', { required: "End time is required" })}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <Input 
              label="Room / Examination Hall" 
              placeholder="e.g. Main Auditorium Hall 2"
              {...register('room')}
            />
            {hallConflictMessage && (
              <p className="text-xs text-rose-500 font-semibold mt-1 flex items-center gap-1.5 bg-rose-50 dark:bg-rose-500/10 p-2 rounded-lg border border-rose-200 dark:border-rose-500/20">
                <span>⚠️</span>
                <span>{hallConflictMessage}</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10 mt-6">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} className="bg-primary-600 hover:bg-primary-700 text-white">
            {initialData ? "Save Changes" : "Schedule Exam"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
