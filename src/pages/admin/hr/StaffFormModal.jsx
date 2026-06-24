import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';

export function StaffFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }) {
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: initialData || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'teacher',
      department: '',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active'
    }
  });

  useEffect(() => {
    if (isOpen) {
      reset(initialData || {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'teacher',
        department: '',
        joinDate: new Date().toISOString().split('T')[0],
        status: 'active'
      });
    }
  }, [isOpen, initialData, reset]);

  const onFormSubmit = (data) => {
    onSubmit(data);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData ? "Edit Staff Member" : "Add New Staff Member"}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        
        <div className="bg-slate-50 dark:bg-[#0A0F1C] p-4 rounded-2xl border border-slate-200 dark:border-white/10">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center text-xs">1</span>
            Personal Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input 
              label="First Name" 
              placeholder="e.g. Robert"
              {...register('firstName', { required: "First name is required" })}
              error={errors.firstName?.message}
            />
            <Input 
              label="Last Name" 
              placeholder="e.g. Oppenheimer"
              {...register('lastName', { required: "Last name is required" })}
              error={errors.lastName?.message}
            />
            <Input 
              label="Email Address" 
              type="email"
              placeholder="robert@college.edu"
              {...register('email', { required: "Email is required" })}
              error={errors.email?.message}
            />
            <Input 
              label="Phone Number" 
              placeholder="+1 234 567 8900"
              {...register('phone')}
            />
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-[#0A0F1C] p-4 rounded-2xl border border-slate-200 dark:border-white/10">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">2</span>
            Employment Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select 
              label="Role / Designation" 
              {...register('role')}
              options={[
                { value: 'teacher', label: 'Teacher / Professor' },
                { value: 'hod', label: 'Head of Department' },
                { value: 'admin', label: 'Administrative Staff' },
                { value: 'support', label: 'Support Staff' }
              ]}
            />
            <Input 
              label="Department" 
              placeholder="e.g. Computer Science"
              {...register('department', { required: "Department is required" })}
              error={errors.department?.message}
            />
            <Input 
              label="Join Date" 
              type="date"
              {...register('joinDate')}
            />
            <Select 
              label="Status" 
              {...register('status')}
              options={[
                { value: 'active', label: 'Active / Employed' },
                { value: 'on_leave', label: 'On Leave' },
                { value: 'resigned', label: 'Resigned / Inactive' }
              ]}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10 mt-6">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {initialData ? "Save Changes" : "Add Staff Member"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
