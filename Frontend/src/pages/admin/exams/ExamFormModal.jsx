import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useDepartments } from '../../../hooks/useDepartments';
import { useCourses } from '../../../hooks/useCourses';
import { Sparkles, Edit3 } from 'lucide-react';

const PRESET_EXAM_TYPES = [
  'Midterm Exam',
  'Final Exam / Semester End',
  'Internal Assessment 1',
  'Internal Assessment 2',
  'Unit Test',
  'Model Examination',
  'Practical / Lab Exam',
  'Quiz / Class Test',
  'Viva Voce'
];

export function ExamFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }) {
  const { departments, isLoading: isDepartmentsLoading } = useDepartments();
  const { courses, isLoading: isCoursesLoading } = useCourses();

  const [isCustomType, setIsCustomType] = useState(false);
  
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
  const selectedType = watch('type');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        const isPreset = PRESET_EXAM_TYPES.includes(initialData.type);
        setIsCustomType(!isPreset && Boolean(initialData.type));
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
          type: isPreset ? initialData.type : 'CUSTOM',
          customType: isPreset ? '' : (initialData.type || '')
        });
      } else {
        setIsCustomType(false);
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

  useEffect(() => {
    if (selectedType === 'CUSTOM') {
      setIsCustomType(true);
    } else if (PRESET_EXAM_TYPES.includes(selectedType)) {
      setIsCustomType(false);
    }
  }, [selectedType]);

  // Filter courses for the selected department
  const filteredCourses = selectedDeptId 
    ? courses.filter(c => c.departmentId === selectedDeptId)
    : courses;

  const onFormSubmit = (data) => {
    const selectedDept = departments.find(d => d.id === data.departmentId);
    const selectedCourse = courses.find(c => c.id === data.courseId);
    const examType = isCustomType ? (data.customType?.trim() || 'Custom Exam') : data.type;

    const finalData = {
      ...data,
      name: data.title,
      date: data.examDate,
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
              {...register('type')}
              options={[
                ...PRESET_EXAM_TYPES.map(t => ({ value: t, label: t })),
                { value: 'CUSTOM', label: '✨ + Create Custom Exam Type...' }
              ]}
            />
          </div>

          <Input 
            label="Total Marks" 
            type="number"
            {...register('totalMarks')}
          />
        </div>

        {/* Custom Exam Type Input (Revealed when Custom is selected) */}
        {isCustomType && (
          <div className="p-4 bg-primary-50/60 dark:bg-primary-500/5 border border-primary-200/80 dark:border-primary-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-primary-800 dark:text-primary-300">
              <Edit3 className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span>Custom Exam Type Name</span>
            </div>
            <Input 
              placeholder="e.g. Pre-Semester Practical Test, Surprise Assessment 1, etc."
              {...register('customType', { required: isCustomType ? "Please enter a custom exam type" : false })}
              error={errors.customType?.message}
              className="bg-white dark:bg-[#060D1A]"
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
          <Input 
            label="Room / Examination Hall" 
            placeholder="e.g. Main Auditorium Hall 2"
            {...register('room')}
          />
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
