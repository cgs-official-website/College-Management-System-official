import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useDepartments } from '../../../hooks/useDepartments';

import { api } from '../../../services/apiClient';

export function StaffFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }) {
  const { departments } = useDepartments();
  const [roles, setRoles] = useState([]);
  
  useEffect(() => {
    if (isOpen) {
      api.get('/roles').then(res => {
        if (res.data) {
          setRoles(res.data);
        }
      }).catch(err => console.error("Failed to fetch roles", err));
    }
  }, [isOpen]);

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: initialData || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'staff',
      customRoleId: '',
      staffType: 'teaching',
      department: '',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active'
    }
  });

  const staffType = watch('staffType');

  useEffect(() => {
    if (isOpen) {
      reset(initialData ? {
        ...initialData,
        customRoleId: initialData.customRoleId || '',
        staffType: initialData.departmentId ? 'teaching' : 'non-teaching'
      } : {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: 'staff',
        customRoleId: '',
        staffType: 'teaching',
        department: '',
        joinDate: new Date().toISOString().split('T')[0],
        status: 'active'
      });
    }
  }, [isOpen, initialData, reset]);

  const onFormSubmit = (data) => {
    const selectedRole = roles.find(r => r.id === data.customRoleId);
    const designation = selectedRole ? selectedRole.name : 'Staff';

    const payload = {
      ...data,
      role: 'staff', // base role is handled by backend or customRole now
      name: `${data.firstName} ${data.lastName}`.trim(),
      designation: designation,
      customRoleId: data.customRoleId || null
    };
    
    if (data.staffType === 'non-teaching') {
      delete payload.departmentId;
    }

    onSubmit(payload);
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
              label="First Name (Optional)" 
              placeholder="e.g. Robert"
              {...register('firstName')}
              error={errors.firstName?.message}
            />
            <Input 
              label="Last Name (Optional)" 
              placeholder="e.g. Oppenheimer"
              {...register('lastName')}
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
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-[#0A0F1C] p-4 rounded-2xl border border-slate-200 dark:border-white/10">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs">2</span>
            Employment Details
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select 
              label="Staff Category" 
              {...register('staffType')}
              options={[
                { value: 'teaching', label: 'Teaching Staff' },
                { value: 'non-teaching', label: 'Non-Teaching Staff' }
              ]}
            />
            <div className="space-y-1">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Role / Designation</label>
              <select 
                {...register('customRoleId')}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white"
              >
                <option value="">Standard Staff (No special permissions)</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            {staffType === 'teaching' && (
              <div className="space-y-1">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Department</label>
                <select 
                  {...register('departmentId', { required: "Department is required for teaching staff" })}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white"
                >
                  <option value="">Select a Department</option>
                  {departments?.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                {errors.departmentId && <p className="text-red-500 text-sm mt-1">{errors.departmentId.message}</p>}
              </div>
            )}
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
