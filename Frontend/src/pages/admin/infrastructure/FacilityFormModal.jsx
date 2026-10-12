import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';

export function FacilityFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }) {
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: initialData || {
      name: '',
      type: 'Classroom',
      capacity: 30,
      building: '',
      status: 'operational',
      features: ''
    }
  });

  useEffect(() => {
    if (isOpen) {
      reset(initialData || {
        name: '',
        type: 'Classroom',
        capacity: 30,
        building: '',
        status: 'operational',
        features: ''
      });
    }
  }, [isOpen, initialData, reset]);

  const onFormSubmit = (data) => {
    const finalData = {
      ...data,
      capacity: Number(data.capacity)
    };
    onSubmit(finalData);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData ? "Edit Facility Details" : "Add New Facility"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Facility Name / Room No." 
            placeholder="e.g. Room 101 or Main Auditorium"
            {...register('name', { required: "Name is required" })}
            error={errors.name?.message}
          />
          <Select 
            label="Facility Type" 
            {...register('type')}
            options={[
              { value: 'Classroom', label: 'Classroom' },
              { value: 'Laboratory', label: 'Laboratory' },
              { value: 'Auditorium', label: 'Auditorium / Hall' },
              { value: 'Library', label: 'Library Section' },
              { value: 'Sports', label: 'Sports Facility' },
              { value: 'Other', label: 'Other' }
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Seating Capacity" 
            type="number"
            min="1"
            {...register('capacity', { required: "Capacity is required" })}
            error={errors.capacity?.message}
          />
          <Input 
            label="Building / Block" 
            placeholder="e.g. Science Block, West Wing"
            {...register('building')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select 
            label="Operational Status" 
            {...register('status')}
            options={[
              { value: 'operational', label: 'Operational (Available)' },
              { value: 'maintenance', label: 'Under Maintenance' },
              { value: 'closed', label: 'Closed / Inactive' }
            ]}
          />
          <Input 
            label="Special Features (Optional)" 
            placeholder="e.g. Projector, AC, Smart Board"
            {...register('features')}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10 mt-6">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {initialData ? "Save Changes" : "Add Facility"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
