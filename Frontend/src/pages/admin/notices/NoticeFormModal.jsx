import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useAuth } from '../../../contexts/AuthContext';

export function NoticeFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }) {
  const { userData } = useAuth();
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: initialData || {
      title: '',
      content: '',
      targetAudience: 'all',
      priority: 'normal'
    }
  });

  useEffect(() => {
    if (isOpen) {
      reset(initialData || {
        title: '',
        content: '',
        targetAudience: 'all',
        priority: 'normal'
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
      title={initialData ? "Edit Notice" : "Create New Notice"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        <Input 
          label="Notice Title" 
          placeholder="e.g. End of Semester Examinations"
          {...register('title', { required: "Title is required" })}
          error={errors.title?.message}
        />

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
            Notice Content
          </label>
          <textarea
            {...register('content', { required: "Content is required" })}
            rows={5}
            className={`w-full px-4 py-3 bg-white dark:bg-[#0A0F1C] border rounded-xl text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 text-slate-900 dark:text-white placeholder-slate-400 ${errors.content ? 'border-red-500 focus:border-red-500 focus:ring-red-500/50' : 'border-slate-200 dark:border-white/10 focus:border-primary-500'}`}
            placeholder="Write the full announcement here..."
          />
          {errors.content && <p className="mt-1.5 text-sm text-red-500">{errors.content.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select 
            label="Target Audience" 
            {...register('targetAudience')}
            options={[
              { value: 'all', label: 'Everyone (Students & Staff)' },
              { value: 'students', label: 'Students Only' },
              { value: 'staff', label: 'Staff & Teachers Only' }
            ]}
          />
          <Select 
            label="Priority Level" 
            {...register('priority')}
            options={[
              { value: 'low', label: 'Low (Informational)' },
              { value: 'normal', label: 'Normal' },
              { value: 'high', label: 'High (Urgent)' }
            ]}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10 mt-6">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {initialData ? "Save Changes" : "Publish Notice"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
