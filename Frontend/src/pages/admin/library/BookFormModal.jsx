import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';

export function BookFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }) {
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: initialData || {
      title: '',
      author: '',
      isbn: '',
      category: 'Textbook',
      totalCopies: 1,
      availableCopies: 1,
      location: ''
    }
  });

  useEffect(() => {
    if (isOpen) {
      reset(initialData || {
        title: '',
        author: '',
        isbn: '',
        category: 'Textbook',
        totalCopies: 1,
        availableCopies: 1,
        location: ''
      });
    }
  }, [isOpen, initialData, reset]);

  const onFormSubmit = (data) => {
    // Ensure numbers are properly parsed
    const total = Number(data.totalCopies);
    const available = initialData 
      ? initialData.availableCopies + (total - initialData.totalCopies) // Adjust available based on difference
      : total; 
      
    const finalData = {
      ...data,
      totalCopies: total,
      availableCopies: available
    };
    onSubmit(finalData);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={initialData ? "Edit Book Details" : "Add New Book"}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Book Title" 
            placeholder="e.g. Introduction to Algorithms"
            {...register('title', { required: "Title is required" })}
            error={errors.title?.message}
          />
          <Input 
            label="Author" 
            placeholder="e.g. Thomas H. Cormen"
            {...register('author', { required: "Author is required" })}
            error={errors.author?.message}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="ISBN Number" 
            placeholder="e.g. 978-0262033848"
            {...register('isbn')}
          />
          <Select 
            label="Category" 
            {...register('category')}
            options={[
              { value: 'Textbook', label: 'Textbook' },
              { value: 'Reference', label: 'Reference' },
              { value: 'Fiction', label: 'Fiction' },
              { value: 'Journal', label: 'Journal / Magazine' },
              { value: 'Other', label: 'Other' }
            ]}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Total Copies" 
            type="number"
            min="1"
            {...register('totalCopies', { required: "Total copies is required" })}
            error={errors.totalCopies?.message}
          />
          <Input 
            label="Shelf Location" 
            placeholder="e.g. Section A, Row 3"
            {...register('location')}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10 mt-6">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {initialData ? "Save Changes" : "Add Book"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
