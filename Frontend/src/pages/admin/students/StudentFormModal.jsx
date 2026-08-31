import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useAuth } from '../../../contexts/AuthContext';
import { useCourses } from '../../../hooks/useCourses';
import { useSections } from '../../../hooks/useSections';

const getInitialValues = (initialData) => ({
  firstName: initialData?.firstName || '',
  lastName: initialData?.lastName || '',
  email: initialData?.email || '',
  phone: initialData?.phone || initialData?.studentMobile || '',
  dob: initialData?.dob || (initialData?.dateOfBirth ? (typeof initialData.dateOfBirth === 'string' ? initialData.dateOfBirth.split('T')[0] : new Date(initialData.dateOfBirth).toISOString().split('T')[0]) : ''),
  gender: initialData?.gender || '',
  courseId: initialData?.courseId || '',
  sectionId: initialData?.sectionId || '',
  parentName: initialData?.parentName || initialData?.fatherName || '',
  parentPhone: initialData?.parentPhone || initialData?.parentMobile || '',
  address: initialData?.address || '',
  residenceType: initialData?.residenceType || 'Day Scholar'
});

export function StudentFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }) {
  const { userData } = useAuth();
  const { courses } = useCourses();
  
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: getInitialValues(initialData)
  });

  useEffect(() => {
    if (isOpen) {
      reset(getInitialValues(initialData));
    }
  }, [isOpen, initialData, reset]);

  const selectedCourseId = watch('courseId');
  const { sections } = useSections(selectedCourseId);

  const onFormSubmit = (data) => {
    // Strip null/undefined values to avoid Zod validation errors
    const sanitized = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== null && v !== undefined)
    );
    const finalData = {
      ...sanitized,
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
              placeholder="student@example.com"
              {...register('email', { 
                required: "Email is required",
                pattern: { 
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i, 
                  message: "Invalid email address" 
                }
              })}
              error={errors.email?.message}
            />
            <Input 
              label="Phone Number" 
              placeholder="e.g. 9876543210"
              {...register('phone', {
                pattern: { value: /^[0-9]{10}$/, message: "Phone number must be exactly 10 digits" }
              })}
              onInput={(e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
              }}
              maxLength={10}
              error={errors.phone?.message}
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
                { value: '', label: 'Select Gender' },
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
              label="Class / Course" 
              {...register('courseId', { required: "Course is required" })}
              error={errors.courseId?.message}
              options={[{ value: '', label: 'Select a course' }, ...courses.map(c => ({ value: c.id, label: c.name }))]}
            />
            <div className="space-y-1">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Section</label>
              <select 
                {...register('sectionId')}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white"
                disabled={!selectedCourseId}
              >
                <option value="">Select a section</option>
                {sections?.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              {errors.sectionId && <p className="text-red-500 text-sm mt-1">{errors.sectionId.message}</p>}
            </div>
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
              placeholder="e.g. 9876543210"
              {...register('parentPhone', { 
                required: "Parent phone is required",
                pattern: { value: /^[0-9]{10}$/, message: "Phone number must be exactly 10 digits" }
              })}
              onInput={(e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
              }}
              maxLength={10}
              error={errors.parentPhone?.message}
            />
            <div className="md:col-span-2">
              <Input 
                label="Home Address" 
                {...register('address')}
              />
            </div>
            <div className="md:col-span-2">
              <Select 
                label="Residence Type" 
                {...register('residenceType')}
                options={[
                  { value: 'Day Scholar', label: 'Day Scholar' },
                  { value: 'Hosteller', label: 'Hosteller' }
                ]}
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
