import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useDepartments } from '../../../hooks/useDepartments';
import { useCourses } from '../../../hooks/useCourses';
import { Sparkles } from 'lucide-react';

export const PRESET_EXAM_TYPES = [
  { value: 'Midterm Exam', label: 'Midterm Exam' },
  { value: 'Internal Assessment 1', label: 'Internal Assessment 1' },
  { value: 'Internal Assessment 2', label: 'Internal Assessment 2' },
  { value: 'Semester Exam', label: 'Semester Exam' },
  { value: 'Final Exam / End Semester', label: 'Final Exam / End Semester' },
  { value: 'Unit Test', label: 'Unit Test' },
  { value: 'Model Examination', label: 'Model Examination' },
  { value: 'Practical / Lab Exam', label: 'Practical / Lab Exam' },
  { value: 'Quiz / Class Test', label: 'Quiz / Class Test' },
  { value: 'Viva Voce', label: 'Viva Voce' },
];

export const EXAM_TYPE_OPTIONS = [
  ...PRESET_EXAM_TYPES,
  { value: 'CUSTOM', label: '+ Custom (Type / Create Exam)...' },
];

export const parseExamType = (rawType) => {
  if (!rawType) return { isPreset: true, value: 'Midterm Exam', custom: '' };
  const str = String(rawType).trim();

  // Direct match with preset values (case-insensitive)
  const direct = PRESET_EXAM_TYPES.find(p => p.value.toLowerCase() === str.toLowerCase());
  if (direct) return { isPreset: true, value: direct.value, custom: '' };

  // Match legacy shorthands
  const lower = str.toLowerCase();
  if (lower === 'midterm' || lower.includes('mid-term') || lower.includes('midterm')) {
    return { isPreset: true, value: 'Midterm Exam', custom: '' };
  }
  if (lower === 'internal 1' || lower.includes('assessment 1') || lower.includes('cat-1') || lower.includes('cat 1')) {
    return { isPreset: true, value: 'Internal Assessment 1', custom: '' };
  }
  if (lower === 'internal 2' || lower.includes('assessment 2') || lower.includes('cat-2') || lower.includes('cat 2')) {
    return { isPreset: true, value: 'Internal Assessment 2', custom: '' };
  }
  if (lower === 'internal' || lower.includes('internal assessment')) {
    return { isPreset: true, value: 'Internal Assessment 1', custom: '' };
  }
  if (lower.includes('unit test') || lower.includes('unit-test') || lower === 'unit') {
    return { isPreset: true, value: 'Unit Test', custom: '' };
  }
  if (lower.includes('model')) {
    return { isPreset: true, value: 'Model Examination', custom: '' };
  }
  if (lower.includes('viva')) {
    return { isPreset: true, value: 'Viva Voce', custom: '' };
  }
  if (lower === 'final' || lower.includes('end semester') || lower.includes('end sem')) {
    return { isPreset: true, value: 'Final Exam / End Semester', custom: '' };
  }
  if (lower === 'semester' || lower.includes('semester exam') || lower.includes('sem exam')) {
    return { isPreset: true, value: 'Semester Exam', custom: '' };
  }
  if (lower === 'quiz' || lower.includes('quiz') || lower.includes('class test')) {
    return { isPreset: true, value: 'Quiz / Class Test', custom: '' };
  }
  if (lower === 'practical' || lower.includes('practical') || lower.includes('lab exam')) {
    return { isPreset: true, value: 'Practical / Lab Exam', custom: '' };
  }

  // Any non-preset type is custom
  return { isPreset: false, value: 'CUSTOM', custom: str };
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
      type: 'Midterm Exam',
      customType: ''
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
        const typeInfo = parseExamType(initialData.type);
        let dateStr = new Date().toISOString().split('T')[0];
        if (initialData.date || initialData.examDate) {
          try {
            const raw = String(initialData.date || initialData.examDate);
            if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
              dateStr = raw.slice(0, 10);
            } else {
              dateStr = new Date(raw).toISOString().split('T')[0];
            }
          } catch {
            dateStr = new Date().toISOString().split('T')[0];
          }
        }

        reset({
          title: initialData.title || initialData.name || '',
          departmentId: initialData.departmentId || '',
          courseId: initialData.courseId || '',
          subject: initialData.subject || initialData.name || '',
          examDate: dateStr,
          startTime: initialData.startTime || '09:00',
          endTime: initialData.endTime || '12:00',
          room: initialData.room || initialData.hall || '',
          totalMarks: initialData.maxMarks || initialData.totalMarks || 100,
          type: typeInfo.value,
          customType: typeInfo.custom
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
          type: 'Midterm Exam',
          customType: ''
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
    const resolvedType = data.type === 'CUSTOM'
      ? (data.customType?.trim() || 'Custom Exam')
      : data.type;
    const roomValue = data.room ? data.room.trim() : '';

    const finalData = {
      ...data,
      name: data.title,
      date: data.examDate,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      room: data.room ? data.room.trim() : 'Main Hall',
      maxMarks: Number(data.totalMarks) || 100,
      totalMarks: Number(data.totalMarks) || 100,
      type: resolvedType,
      room: roomValue,
      hall: roomValue,
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
    label: d.code ? `${d.name} (${d.code})` : d.name
  }));

  const courseOptions = filteredCourses.map(c => ({
    value: c.id,
    label: c.code ? `${c.name} (${c.code})` : c.name
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

        {/* Custom Exam Type Input (Displayed when Custom is selected) */}
        {selectedType === 'CUSTOM' && (
          <div className="bg-primary-50/60 dark:bg-primary-500/10 p-4 rounded-2xl border border-primary-200 dark:border-primary-500/20 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary-700 dark:text-primary-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Define Custom Exam Type</span>
            </div>
            <Input
              label="Custom Exam Type Name *"
              placeholder="e.g. Surprise Test, Certification Assessment, CAT-1, Mock Gate..."
              {...register('customType', {
                validate: (val) => {
                  if (selectedType === 'CUSTOM' && (!val || !val.trim())) {
                    return "Please enter custom exam type name";
                  }
                  return true;
                }
              })}
              error={errors.customType?.message}
            />
          </div>
        )}

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
