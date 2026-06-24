import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useAuth } from '../../../contexts/AuthContext';

export function StudentFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }) {
  const { userData } = useAuth();
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: initialData || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dob: '',
      gender: '',
      class: '',
      section: '',
      parentName: '',
      parentPhone: '',
      address: ''
    }
  });

  useEffect(() => {
    if (isOpen) {
      reset(initialData || {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dob: '',
        gender: '',
        class: '',
        section: '',
        parentName: '',
        parentPhone: '',
        address: ''
      });
    }
  }, [isOpen, initialData, reset]);

  const onFormSubmit = (data) => {
    // Inject collegeId
    const finalData = {
      ...data,
      collegeId: userData?.collegeId || 'default_college_id'
    };
    onSubmit(finalData);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData ? "Edit Student" : "Add New Student"}
      maxWidth="max-w-4xl"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        {/* Personal Info */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 border-b border-slate-200 dark:border-white/10 pb-2">
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="First Name" 
              {...register('firstName', { required: "First name is required" })}
              error={errors.firstName?.message}
            />
            <Input 
              label="Last Name" 
              {...register('lastName', { required: "Last name is required" })}
              error={errors.lastName?.message}
            />
            <Input 
              label="Email" 
              type="email"
              {...register('email')}
            />
            <Input 
              label="Phone Number" 
              {...register('phone')}
            />
            <Input 
              label="Date of Birth" 
              type="date"
              {...register('dob')}
            />
            <Select 
              label="Gender" 
              {...register('gender', { required: "Gender is required" })}
              error={errors.gender?.message}
              options={[
                { value: 'male', label: 'Male' },
                { value: 'female', label: 'Female' },
                { value: 'other', label: 'Other' }
              ]}
            />
          </div>
        </div>

        {/* Academic Info */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 border-b border-slate-200 dark:border-white/10 pb-2 mt-6">
            Academic Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select 
              label="Class" 
              {...register('class', { required: "Class is required" })}
              error={errors.class?.message}
              options={[
                { value: '1', label: 'Class 1' },
                { value: '2', label: 'Class 2' },
                { value: '10', label: 'Class 10' },
                { value: '12', label: 'Class 12' }
              ]}
            />
            <Select 
              label="Section" 
              {...register('section')}
              options={[
                { value: 'A', label: 'Section A' },
                { value: 'B', label: 'Section B' },
                { value: 'C', label: 'Section C' }
              ]}
            />
          </div>
        </div>

        {/* Parent Info */}
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 border-b border-slate-200 dark:border-white/10 pb-2 mt-6">
            Parent/Guardian Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="Parent/Guardian Name" 
              {...register('parentName', { required: "Parent name is required" })}
              error={errors.parentName?.message}
            />
            <Input 
              label="Parent Phone" 
              {...register('parentPhone', { required: "Parent phone is required" })}
              error={errors.parentPhone?.message}
            />
            <div className="md:col-span-2">
              <Input 
                label="Home Address" 
                {...register('address')}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10 mt-6">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {initialData ? "Save Changes" : "Add Student"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
