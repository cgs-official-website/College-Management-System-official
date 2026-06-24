import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useCourses } from '../../../hooks/useCourses';
import { useAuth } from '../../../contexts/AuthContext';

export function AdmissionFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }) {
  const { userData } = useAuth();
  const { courses } = useCourses(userData?.collegeId);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: initialData || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      courseId: '',
      previousSchool: '',
      status: 'Pending'
    }
  });

  useEffect(() => {
    if (isOpen) {
      reset(initialData || {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        courseId: '',
        previousSchool: '',
        status: 'Pending'
      });
    }
  }, [isOpen, initialData, reset]);

  const onFormSubmit = (data) => {
    const selectedCourse = courses.find(c => c.id === data.courseId);
    
    const finalData = {
      ...data,
      courseName: selectedCourse ? selectedCourse.name : 'Unknown Course',
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
      title={initialData ? "Review Application" : "New Admission Inquiry"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="First Name" 
            placeholder="e.g. John"
            {...register('firstName', { required: "First name is required" })}
            error={errors.firstName?.message}
          />
          <Input 
            label="Last Name" 
            placeholder="e.g. Doe"
            {...register('lastName', { required: "Last name is required" })}
            error={errors.lastName?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Email Address" 
            type="email"
            placeholder="john.doe@example.com"
            {...register('email')}
          />
          <Input 
            label="Phone Number" 
            placeholder="+1 234 567 890"
            {...register('phone')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select 
            label="Applied Course / Program" 
            {...register('courseId', { required: "Course selection is required" })}
            error={errors.courseId?.message}
            options={[{ value: '', label: 'Select a course...' }, ...courseOptions]}
          />
          <Input 
            label="Previous School / Institution" 
            placeholder="e.g. Lincoln High School"
            {...register('previousSchool')}
          />
        </div>

        {initialData && (
          <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10 mt-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Admission Decision</h3>
            <Select 
              label="Application Status" 
              {...register('status')}
              options={[
                { value: 'Pending', label: 'Pending Review' },
                { value: 'Approved', label: 'Approved (Ready to Enroll)' },
                { value: 'Rejected', label: 'Rejected' },
                { value: 'Waitlisted', label: 'Waitlisted' }
              ]}
            />
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10 mt-6">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {initialData ? "Save Decision" : "Add Inquiry"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
