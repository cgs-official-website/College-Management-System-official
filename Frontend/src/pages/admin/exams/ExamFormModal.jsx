import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useDepartments } from '../../../hooks/useDepartments';
import { useCourses } from '../../../hooks/useCourses';

export function ExamFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }) {
  const { departments, isLoading: isDepartmentsLoading } = useDepartments();
  const { courses, isLoading: isCoursesLoading } = useCourses();
  
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: initialData || {
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

  useEffect(() => {
    if (isOpen) {
      reset(initialData || {
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
  }, [isOpen, initialData, reset]);

  // Filter courses for the selected department
  const filteredCourses = selectedDeptId 
    ? courses.filter(c => c.departmentId === selectedDeptId)
    : courses;

  const onFormSubmit = (data) => {
    const selectedDept = departments.find(d => d.id === data.departmentId);
    const selectedCourse = courses.find(c => c.id === data.courseId);

    const finalData = {
      ...data,
      name: data.title,
      date: data.examDate,
      maxMarks: Number(data.totalMarks) || 100,
      totalMarks: Number(data.totalMarks) || 100,
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
            placeholder="e.g. Mid-Term Examination"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select 
            label="Exam Type"
            {...register('type')}
            options={[
              { value: 'Midterm', label: 'Midterm Exam' },
              { value: 'Final', label: 'Final Exam / Semester End' },
              { value: 'Internal', label: 'Internal Assessment' },
              { value: 'Practical', label: 'Practical / Lab Exam' },
              { value: 'Quiz', label: 'Quiz / Class Test' }
            ]}
          />

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
