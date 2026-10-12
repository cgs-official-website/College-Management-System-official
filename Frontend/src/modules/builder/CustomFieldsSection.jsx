import React from 'react';
import { Input } from '../../components/ui/Input';
import { useGetFields } from './useBuilder';

/**
 * Renders custom fields defined in Module Builder for a given model.
 * Props:
 *   model    – exact model name: 'Student' | 'Teacher' | 'Course' | 'Department' | 'Admission'
 *   register – react-hook-form register function
 *   errors   – react-hook-form errors object
 */
export function CustomFieldsSection({ model, register, errors }) {
  const { data: fieldsData, isLoading } = useGetFields(model);

  if (isLoading) return null;

  const fields   = fieldsData?.fields   || [];
  const sections = fieldsData?.sections || [];

  if (fields.length === 0) return null;

  const renderField = (field) => {
    if (field.type === 'boolean') {
      return (
        <label key={field.id} className="flex items-center gap-2 cursor-pointer col-span-1">
          <input
            type="checkbox"
            className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
            {...register(`customFields.${field.key}`)}
          />
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{field.name}</span>
        </label>
      );
    }

    return (
      <Input
        key={field.id}
        label={field.isRequired ? `${field.name} *` : field.name}
        type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
        {...register(`customFields.${field.key}`, {
          required: field.isRequired ? `${field.name} is required` : false,
        })}
        error={errors?.customFields?.[field.key]?.message}
      />
    );
  };

  // Fields that belong to a section
  const sectionedFieldIds = new Set(sections.flatMap(s =>
    fields.filter(f => f.sectionId === s.id).map(f => f.id)
  ));

  // Fields with no section
  const unsectionedFields = fields.filter(f => !sectionedFieldIds.has(f.id));

  return (
    <div className="space-y-6 mt-6">
      {/* Sectioned fields */}
      {sections.map(section => {
        const sectionFields = fields.filter(f => f.sectionId === section.id);
        if (sectionFields.length === 0) return null;
        return (
          <div key={section.id}>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 border-b border-slate-200 dark:border-white/10 pb-2">
              {section.name}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sectionFields.map(renderField)}
            </div>
          </div>
        );
      })}

      {/* Unsectioned fields */}
      {unsectionedFields.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 border-b border-slate-200 dark:border-white/10 pb-2">
            Additional Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {unsectionedFields.map(renderField)}
          </div>
        </div>
      )}
    </div>
  );
}
