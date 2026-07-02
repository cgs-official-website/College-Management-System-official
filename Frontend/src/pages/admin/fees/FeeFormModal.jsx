import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { useStudents } from '../../../hooks/useStudents';
import { useAuth } from '../../../contexts/AuthContext';

export function FeeFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }) {
  const { userData } = useAuth();
  const { students } = useStudents(userData?.collegeId);
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: initialData || {
      studentId: '',
      feeType: 'Tuition Fee',
      amount: '',
      dueDate: new Date().toISOString().split('T')[0],
      status: 'pending',
      paymentMethod: ''
    }
  });

  useEffect(() => {
    if (isOpen) {
      reset(initialData || {
        studentId: '',
        feeType: 'Tuition Fee',
        amount: '',
        dueDate: new Date().toISOString().split('T')[0],
        status: 'pending',
        paymentMethod: ''
      });
    }
  }, [isOpen, initialData, reset]);

  const onFormSubmit = (data) => {
    // Attach the student's name for easier display later
    const selectedStudent = students.find(s => s.id === data.studentId);
    const finalData = {
      ...data,
      amount: Number(data.amount),
      studentName: selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : 'Unknown Student',
      studentClass: selectedStudent ? `${selectedStudent.class}-${selectedStudent.section}` : ''
    };
    onSubmit(finalData);
  };

  const studentOptions = students.map(s => ({
    value: s.id,
    label: `${s.firstName} ${s.lastName} (Class ${s.class}-${s.section})`
  }));

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData ? "Edit Fee Record" : "Create Fee Record"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        
        <div className="grid grid-cols-1 gap-4">
          <Select 
            label="Select Student" 
            {...register('studentId', { required: "Student is required" })}
            error={errors.studentId?.message}
            options={[{ value: '', label: 'Search and select student...' }, ...studentOptions]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select 
            label="Fee Type" 
            {...register('feeType')}
            options={[
              { value: 'Tuition Fee', label: 'Tuition Fee' },
              { value: 'Hostel Fee', label: 'Hostel Fee' },
              { value: 'Transport Fee', label: 'Transport Fee' },
              { value: 'Library Fee', label: 'Library Fee' },
              { value: 'Exam Fee', label: 'Exam Fee' },
              { value: 'Miscellaneous', label: 'Miscellaneous' }
            ]}
          />
          <Input 
            label="Amount (₹)" 
            type="number"
            placeholder="e.g. 50000"
            {...register('amount', { required: "Amount is required" })}
            error={errors.amount?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input 
            label="Due Date" 
            type="date"
            {...register('dueDate', { required: "Due date is required" })}
            error={errors.dueDate?.message}
          />
          <Select 
            label="Status" 
            {...register('status')}
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'paid', label: 'Paid' },
              { value: 'overdue', label: 'Overdue' }
            ]}
          />
          <Select 
            label="Payment Method" 
            {...register('paymentMethod')}
            options={[
              { value: '', label: 'Not Paid' },
              { value: 'Cash', label: 'Cash' },
              { value: 'Bank Transfer', label: 'Bank Transfer' },
              { value: 'Credit Card', label: 'Credit Card' },
              { value: 'UPI', label: 'UPI' }
            ]}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10 mt-6">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {initialData ? "Update Record" : "Create Record"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
