import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useCourses } from '../../../hooks/useCourses';
import { useAuth } from '../../../contexts/AuthContext';

export function ExamFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }) {
  const { userData } = useAuth();
  const { courses } = useCourses(userData?.collegeId);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: initialData || {
      title: '',
      courseId: '',
      subject: '',
      examDate: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '12:00',
      room: '',
      totalMarks: 100
    }
  });

  useEffect(() => {
    if (isOpen) {
      reset(initialData || {
        title: '',
        courseId: '',
        subject: '',
        examDate: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '12:00',
        room: '',
        totalMarks: 100
      });
    }
  }, [isOpen, initialData, reset]);

  const onFormSubmit = (data) => {
    const selectedCourse = courses.find(c => c.id === data.courseId);
    const finalData = {
      ...data,
      totalMarks: Number(data.totalMarks),
      courseName: selectedCourse ? selectedCourse.name : 'Unknown Course'
    };
    onSubmit(finalData);
  };

  const courseOptions = courses.map(c => ({
    value: c.id,
    label: c.name
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
            label="Exam Title" 
            placeholder="e.g. Mid-Term Examination"
            {...register('title', { required: "Title is required" })}
            error={errors.title?.message}
          />
          <Select 
            label="Course / Department" 
            {...register('courseId', { required: "Course is required" })}
            error={errors.courseId?.message}
            options={[{ value: '', label: 'Select course...' }, ...courseOptions]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Subject" 
            placeholder="e.g. Data Structures"
            {...register('subject', { required: "Subject is required" })}
            error={errors.subject?.message}
          />
          <Input 
            label="Total Marks" 
            type="number"
            {...register('totalMarks')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input 
            label="Exam Date" 
            type="date"
            {...register('examDate', { required: "Date is required" })}
            error={errors.examDate?.message}
          />
          <Input 
            label="Start Time" 
            type="time"
            {...register('startTime', { required: "Start time is required" })}
          />
          <Input 
            label="End Time" 
            type="time"
            {...register('endTime', { required: "End time is required" })}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Input 
            label="Room / Hall" 
            placeholder="e.g. Main Auditorium"
            {...register('room')}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10 mt-6">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {initialData ? "Save Changes" : "Schedule Exam"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
