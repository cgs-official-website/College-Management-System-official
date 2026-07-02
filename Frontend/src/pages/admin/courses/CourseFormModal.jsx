import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useStaff } from '../../../hooks/useStaff';
import { useAuth } from '../../../contexts/AuthContext';

export function CourseFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }) {
  const { userData } = useAuth();
  const { staff } = useStaff(userData?.collegeId);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: initialData ? {
      ...initialData,
      sections: initialData.sections ? initialData.sections.join(', ') : ''
    } : {
      name: '',
      code: '',
      duration: '4 Years',
      hodId: '',
      description: '',
      sections: '',
      assignedTeacher: ''
    }
  });

  useEffect(() => {
    if (isOpen) {
      reset(initialData ? {
        ...initialData,
        sections: initialData.sections ? initialData.sections.join(', ') : ''
      } : {
        name: '',
        code: '',
        duration: '4 Years',
        hodId: '',
        description: '',
        sections: '',
        assignedTeacher: ''
      });
    }
  }, [isOpen, initialData, reset]);

  const onFormSubmit = (data) => {
    const sectionsArray = data.sections
      ? data.sections.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    onSubmit({
      ...data,
      sections: sectionsArray
    });
  };

  const staffOptions = staff.map(s => ({
    value: s.id,
    label: `${s.firstName} ${s.lastName} - ${s.department}`
  }));

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData ? "Edit Class" : "Create New Class"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Class Name" 
            placeholder="e.g. Computer Science"
            {...register('name', { required: "Class name is required" })}
            error={errors.name?.message}
          />
          <Input 
            label="Class Code" 
            placeholder="e.g. CS-101"
            {...register('code', { required: "Class code is required" })}
            error={errors.code?.message}
          />
        </div>

        <div>
          <Input 
            label="Sections (Comma Separated)" 
            placeholder="e.g. A, B, C or Morning, Evening"
            {...register('sections')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select 
            label="Class Duration" 
            {...register('duration')}
            options={[
              { value: '1 Year', label: '1 Year' },
              { value: '2 Years', label: '2 Years' },
              { value: '3 Years', label: '3 Years' },
              { value: '4 Years', label: '4 Years' },
              { value: '5 Years', label: '5 Years' }
            ]}
          />
          <Select 
            label="Primary Teacher (Assigned)" 
            {...register('assignedTeacher', { required: "Assigned Teacher is required" })}
            error={errors.assignedTeacher?.message}
            options={[{ value: '', label: 'Select Teacher...' }, ...staffOptions]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select 
            label="Head of Department (Optional)" 
            {...register('hodId')}
            options={[{ value: '', label: 'Select HOD...' }, ...staffOptions]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Class Description
          </label>
          <textarea
            {...register('description')}
            rows={3}
            className="w-full px-4 py-3 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 text-slate-900 dark:text-white placeholder-slate-400"
            placeholder="Brief description of the class..."
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10 mt-6">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {initialData ? "Save Changes" : "Create Class"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
