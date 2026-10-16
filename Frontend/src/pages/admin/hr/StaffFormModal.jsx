import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Loader2 } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useDepartments } from '../../../hooks/useDepartments';
import { useRoles } from '../../../hooks/useRoles';
import { CustomFieldsSection } from '../../../modules/builder/CustomFieldsSection';

export function StaffFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }) {
  const { departments } = useDepartments();
  const { roles, isLoading: isLoadingRoles, refetch: refetchRoles } = useRoles();

  const { register, handleSubmit, reset, watch, setValue, getValues, formState: { errors } } = useForm({
    defaultValues: initialData || {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      teacherId: '',
      role: 'staff',
      customRoleId: '',
      staffType: 'teaching',
      departmentId: '',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active',
      customFields: {}
    }
  });

  const staffType = watch('staffType');
  const roleCategory = staffType === 'non-teaching' ? 'non_teaching' : 'teaching';
  const filteredRoles = roles.filter(r => !r.isSystemRole && r.category === roleCategory);

  useEffect(() => {
    if (isOpen && initialData?.customRoleId && roles.length > 0) {
      setValue('customRoleId', initialData.customRoleId);
    }
  }, [roles, isOpen, initialData, setValue]);

  useEffect(() => {
    const current = getValues('customRoleId');
    if (roles.length > 0 && current && !filteredRoles.some(r => r.id === current)) {
      setValue('customRoleId', '');
    }
  }, [staffType, roles]);

  const formatToDateInput = (val) => {
    if (!val) return new Date().toISOString().split('T')[0];
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
      return d.toISOString().split('T')[0];
    } catch (_) {
      return new Date().toISOString().split('T')[0];
    }
  };

  useEffect(() => {
    if (isOpen) {
      refetchRoles();
      const isNonTeaching = initialData?.staffType === 'non-teaching' || initialData?.role === 'staff';
      const rawDate = initialData?.joiningDate || initialData?.joinDate || initialData?.createdAt;
      const formattedJoinDate = formatToDateInput(rawDate);
      reset(initialData ? {
        ...initialData,
        teacherId: initialData.teacherId || '',
        customRoleId: initialData.customRoleId || '',
        staffType: isNonTeaching ? 'non-teaching' : 'teaching',
        departmentId: initialData.departmentId || '',
        joinDate: formattedJoinDate,
        joiningDate: formattedJoinDate,
        customFields: initialData.customFields || {},
      } : {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        teacherId: '',
        role: 'staff',
        customRoleId: '',
        staffType: 'teaching',
        departmentId: '',
        joinDate: new Date().toISOString().split('T')[0],
        joiningDate: new Date().toISOString().split('T')[0],
        status: 'active',
        customFields: {}
      });
    }
  }, [isOpen, initialData, reset, refetchRoles]);

  const onFormSubmit = (data) => {
    const isNonTeaching = data.staffType === 'non-teaching';
    const selectedRole = roles.find(r => r.id === data.customRoleId);
    const designation = selectedRole ? selectedRole.name : (isNonTeaching ? 'Staff' : 'Teacher');

    const TEACHING_ROLES = ['teacher', 'hod', 'faculty'];
    const keepExisting = initialData && TEACHING_ROLES.includes(initialData.role);

    const effectiveJoinDate = data.joinDate || data.joiningDate || new Date().toISOString().split('T')[0];

    const payload = {
      ...data,
      staffType: isNonTeaching ? 'non-teaching' : 'teaching',
      role: isNonTeaching ? 'staff' : (keepExisting ? initialData.role : (data.role && data.role !== 'staff' ? data.role : 'teacher')),
      name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      designation: designation,
      customRoleId: data.customRoleId || null,
      teacherId: (data.teacherId || '').trim(),
      joiningDate: effectiveJoinDate,
      joinDate: effectiveJoinDate,
    };

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
            <div className="space-y-1.5">
              <label htmlFor="firstName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                placeholder="e.g. Robert"
                {...register('firstName', {
                  required: 'Please enter the first name.',
                  validate: (val) => (val && val.trim().length > 0) || 'Please enter the first name.'
                })}
                className={`w-full px-4 py-2.5 bg-white dark:bg-[#0A0F1C] border rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2 text-slate-900 dark:text-white placeholder-slate-400 ${
                  errors.firstName
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50'
                    : 'border-slate-200 dark:border-white/10 focus:border-primary-500 focus:ring-primary-500/50'
                }`}
              />
              {errors.firstName && <p className="text-sm text-red-500">{errors.firstName.message}</p>}
            </div>
            <Input 
              label="Last Name (Optional)" 
              placeholder="e.g. Oppenheimer"
              {...register('lastName')}
              error={errors.lastName?.message}
            />
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="e.g. robert@college.edu"
                {...register('email', {
                  required: 'Please enter an email address.',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Please enter a valid email.'
                  }
                })}
                className={`w-full px-4 py-2.5 bg-white dark:bg-[#0A0F1C] border rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2 text-slate-900 dark:text-white placeholder-slate-400 ${
                  errors.email
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50'
                    : 'border-slate-200 dark:border-white/10 focus:border-primary-500 focus:ring-primary-500/50'
                }`}
              />
              {errors.email
                ? <p className="text-sm text-red-500">{errors.email.message}</p>
                : <p className="text-xs text-slate-400 dark:text-slate-500">Required for teacher setup link and communications.</p>
              }
            </div>
            <Input 
              label="Phone Number" 
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="e.g. 9876543210"
              {...register('phone', {
                pattern: {
                  value: /^[0-9]{10}$/,
                  message: "Phone number must be exactly 10 digits."
                }
              })}
              onInput={(e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
              }}
              error={errors.phone?.message}
            />
            <div className="space-y-1.5">
              <label htmlFor="teacherId" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {staffType === 'non-teaching' ? 'Staff ID' : 'Teacher ID'} <span className="text-red-500">*</span>
              </label>
              <input
                id="teacherId"
                type="text"
                placeholder={staffType === 'non-teaching' ? 'e.g. STF001' : 'e.g. TCH001'}
                {...register('teacherId', {
                  required: staffType === 'non-teaching' ? 'Staff ID is required.' : 'Teacher ID is required.',
                  validate: (val) =>
                    val.trim().length > 0 || (staffType === 'non-teaching' ? 'Staff ID is required.' : 'Teacher ID is required.')
                })}
                className={`w-full px-4 py-2.5 bg-white dark:bg-[#0A0F1C] border rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2 font-mono text-slate-900 dark:text-white placeholder-slate-400 ${
                  errors.teacherId
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50'
                    : 'border-slate-200 dark:border-white/10 focus:border-primary-500 focus:ring-primary-500/50'
                }`}
              />
              {errors.teacherId && <p className="text-sm text-red-500">{errors.teacherId.message}</p>}
            </div>
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
            {staffType === 'non-teaching' ? (
              <div className="space-y-1">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                  Role <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select 
                    {...register('customRoleId', { 
                      required: 'Role is required for non-teaching staff.' 
                    })}
                    disabled={isLoadingRoles}
                    className={`w-full px-4 py-3 bg-white dark:bg-[#020813] border rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white ${
                      errors.customRoleId ? 'border-red-500' : 'border-slate-200 dark:border-white/10'
                    }`}
                  >
                    <option value="">
                      {isLoadingRoles ? 'Loading roles...' : 'Select a Role'}
                    </option>
                    {filteredRoles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                  {isLoadingRoles && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                    </div>
                  )}
                </div>
                {errors.customRoleId && (
                  <p className="text-red-500 text-sm mt-1">{errors.customRoleId.message}</p>
                )}
                {!isLoadingRoles && filteredRoles.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    No roles yet. Create one in Roles & Permissions.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Role / Designation</label>
                <select 
                  {...register('customRoleId')}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white"
                >
                  <option value="">Select a Role</option>
                  {filteredRoles.map(r => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
                {filteredRoles.length === 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    No teaching roles yet. Create one under Roles &amp; Permissions.
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="departmentId" className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                Department <span className="text-red-500">*</span>
              </label>
              <select 
                id="departmentId"
                {...register('departmentId', { required: "Please select a department." })}
                className={`w-full px-4 py-3 bg-white dark:bg-[#020813] border rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white ${
                  errors.departmentId ? 'border-red-500' : 'border-slate-200 dark:border-white/10'
                }`}
              >
                <option value="">Select a Department</option>
                {departments?.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {errors.departmentId && <p className="text-red-500 text-sm mt-1">{errors.departmentId.message}</p>}
            </div>

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

        {/* Custom Fields (Module Builder) */}
        <CustomFieldsSection model="Teacher" register={register} errors={errors} />

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
