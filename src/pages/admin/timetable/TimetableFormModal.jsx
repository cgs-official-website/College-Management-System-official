import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useCourses } from '../../../hooks/useCourses';
import { useStaff } from '../../../hooks/useStaff';
import { useAuth } from '../../../contexts/AuthContext';

export function TimetableFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }) {
  const { userData } = useAuth();
  const { courses } = useCourses(userData?.collegeId);
  const { staff } = useStaff(userData?.collegeId);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: initialData || {
      subject: '',
      courseId: '',
      teacherId: '',
      dayOfWeek: 'Monday',
      startTime: '09:00',
      endTime: '10:00',
      room: ''
    }
  });

  useEffect(() => {
    if (isOpen) {
      reset(initialData || {
        subject: '',
        courseId: '',
        teacherId: '',
        dayOfWeek: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
        room: ''
      });
    }
  }, [isOpen, initialData, reset]);

  const onFormSubmit = (data) => {
    const selectedCourse = courses.find(c => c.id === data.courseId);
    const selectedTeacher = staff.find(s => s.id === data.teacherId);
    
    const finalData = {
      ...data,
      courseName: selectedCourse ? selectedCourse.name : 'Unknown Course',
      teacherName: selectedTeacher ? `${selectedTeacher.firstName} ${selectedTeacher.lastName}` : 'TBA'
    };
    onSubmit(finalData);
  };

  const courseOptions = courses.map(c => ({
    value: c.id,
    label: c.name
  }));

  const teacherOptions = staff.filter(s => s.role === 'teacher' || s.role === 'hod').map(s => ({
    value: s.id,
    label: `${s.firstName} ${s.lastName} (${s.department})`
  }));

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData ? "Edit Class Schedule" : "Schedule New Class"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Subject Name" 
            placeholder="e.g. Advanced Calculus"
            {...register('subject', { required: "Subject is required" })}
            error={errors.subject?.message}
          />
          <Select 
            label="Course / Program" 
            {...register('courseId', { required: "Course is required" })}
            error={errors.courseId?.message}
            options={[{ value: '', label: 'Select course...' }, ...courseOptions]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select 
            label="Assign Teacher" 
            {...register('teacherId')}
            options={[{ value: '', label: 'Select teacher...' }, ...teacherOptions]}
          />
          <Input 
            label="Room / Lab" 
            placeholder="e.g. Room 302"
            {...register('room', { required: "Room is required" })}
            error={errors.room?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select 
            label="Day of Week" 
            {...register('dayOfWeek')}
            options={[
              { value: 'Monday', label: 'Monday' },
              { value: 'Tuesday', label: 'Tuesday' },
              { value: 'Wednesday', label: 'Wednesday' },
              { value: 'Thursday', label: 'Thursday' },
              { value: 'Friday', label: 'Friday' },
              { value: 'Saturday', label: 'Saturday' }
            ]}
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

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10 mt-6">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {initialData ? "Save Changes" : "Schedule Class"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
