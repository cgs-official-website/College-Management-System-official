import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';

const STANDARD_CATEGORIES = ['Textbook', 'Reference', 'Fiction', 'Journal', 'Other'];

const emptyValues = {
  title: '',
  author: '',
  isbn: '',
  category: 'Textbook',
  customCategory: '',
  totalCopies: 1,
  price: '',
  location: ''
};

const buildDefaults = (book) => {
  if (!book) return emptyValues;
  const isStandard = STANDARD_CATEGORIES.includes(book.category);
  return {
    title: book.title || '',
    author: book.author || '',
    isbn: book.isbn || '',
    category: isStandard ? book.category : (book.category ? 'Other' : 'Textbook'),
    customCategory: isStandard || !book.category ? '' : book.category,
    totalCopies: book.totalCopies ?? 1,
    price: book.price ?? '',
    location: book.location || ''
  };
};

export function BookFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }) {
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: buildDefaults(initialData)
  });

  const selectedCategory = watch('category');

  useEffect(() => {
    if (isOpen) {
      reset(buildDefaults(initialData));
    }
  }, [isOpen, initialData, reset]);

  const onFormSubmit = (data) => {
    const total = Number(data.totalCopies);
    const customCategory = (data.customCategory || '').trim();
    const category = data.category === 'Other' && customCategory ? customCategory : data.category;

    const finalData = {
      title: data.title,
      author: data.author,
      isbn: data.isbn,
      category,
      totalCopies: total,
      price: Number(data.price),
      location: data.location
    };

    if (!initialData) {
      finalData.availableCopies = total;
    }

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

        {selectedCategory === 'Other' && (
          <Input 
            label="Specify Category (optional)" 
            placeholder="e.g. Biography, Comics, Newspaper"
            {...register('customCategory')}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input 
            label="Total Copies" 
            type="number"
            min="1"
            {...register('totalCopies', {
              required: "Total copies is required",
              min: { value: 1, message: "Must be at least 1" }
            })}
            error={errors.totalCopies?.message}
          />
          <Input 
            label="Price (₹)" 
            type="number"
            min="0.01"
            step="0.01"
            placeholder="e.g. 450"
            {...register('price', {
              required: "Price is required",
              validate: (v) => Number(v) > 0 || "Enter a price greater than 0"
            })}
            error={errors.price?.message}
          />
        </div>

        <Input 
          label="Shelf Location" 
          placeholder="e.g. Section A, Row 3"
          {...register('location')}
        />

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