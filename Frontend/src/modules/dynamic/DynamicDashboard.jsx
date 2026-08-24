import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useGetFields } from '../builder/useBuilder';
import { useDynamicRecords, useCreateDynamicRecord, useDeleteDynamicRecord } from './useDynamic';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function DynamicDashboard() {
  const { entitySlug } = useParams();
  
  const { data: fieldsData, isLoading: fieldsLoading } = useGetFields(entitySlug);
  const { data: recordsData, isLoading: recordsLoading } = useDynamicRecords(entitySlug);
  
  const createMutation = useCreateDynamicRecord(entitySlug);
  const deleteMutation = useDeleteDynamicRecord(entitySlug);

  const [formData, setFormData] = useState({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });

  const fields = fieldsData?.fields || [];
  const sections = fieldsData?.sections || [];
  const records = recordsData || [];

  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData, {
      onSuccess: () => {
        toast.success('Record saved!');
        setFormData({});
        setIsFormOpen(false);
      },
      onError: () => toast.error('Failed to save record')
    });
  };

  const triggerDelete = (id) => {
    setDeleteModal({ isOpen: true, id });
  };

  const confirmDelete = () => {
    deleteMutation.mutate(deleteModal.id, {
      onSuccess: () => {
        toast.success('Record deleted!');
        setDeleteModal({ isOpen: false, id: null });
      },
      onError: () => {
        toast.error('Failed to delete');
        setDeleteModal({ isOpen: false, id: null });
      }
    });
  };

  if (fieldsLoading || recordsLoading) return <div className="p-8 text-center text-slate-500">Loading module...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight capitalize">
            {entitySlug?.replace('-', ' ')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage dynamic records.</p>
        </div>
        <Button onClick={() => setIsFormOpen(!isFormOpen)}>
          <Plus className="w-4 h-4 mr-2" />
          {isFormOpen ? 'Cancel' : 'Add Record'}
        </Button>
      </div>

      {isFormOpen && (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-6">
              {sections.map(section => {
                const sectionFields = fields.filter(f => f.sectionId === section.id);
                if (sectionFields.length === 0) return null;
                
                return (
                  <div key={section.id} className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-white/10">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200">{section.name}</h3>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-[#0A0F1C]">
                      {sectionFields.map(field => (
                        <div key={field.id}>
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                            {field.name} {field.isRequired && <span className="text-red-500">*</span>}
                          </label>
                          {field.type === 'boolean' ? (
                            <input 
                              type="checkbox"
                              checked={formData[field.key] || false}
                              onChange={e => handleInputChange(field.key, e.target.checked)}
                              className="w-4 h-4 mt-2 text-primary-600 rounded border-slate-300"
                            />
                          ) : (
                            <input 
                              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                              required={field.isRequired}
                              value={formData[field.key] || ''}
                              onChange={e => handleInputChange(field.key, e.target.value)}
                              className="w-full text-sm p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Uncategorized Fields */}
              {fields.filter(f => !f.sectionId).length > 0 && (
                <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                  {sections.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-white/10">
                      <h3 className="font-bold text-slate-800 dark:text-slate-200">Other Information</h3>
                    </div>
                  )}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-[#0A0F1C]">
                    {fields.filter(f => !f.sectionId).map(field => (
                      <div key={field.id}>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                          {field.name} {field.isRequired && <span className="text-red-500">*</span>}
                        </label>
                        {field.type === 'boolean' ? (
                          <input 
                            type="checkbox"
                            checked={formData[field.key] || false}
                            onChange={e => handleInputChange(field.key, e.target.checked)}
                            className="w-4 h-4 mt-2 text-primary-600 rounded border-slate-300"
                          />
                        ) : (
                          <input 
                            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                            required={field.isRequired}
                            value={formData[field.key] || ''}
                            onChange={e => handleInputChange(field.key, e.target.value)}
                            className="w-full text-sm p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4">
              <Button type="submit" isLoading={createMutation.isLoading}>Save Record</Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50">
              <tr>
                {fields.slice(0, 5).map(field => (
                  <th key={field.id} className="px-6 py-3">{field.name}</th>
                ))}
                {fields.length === 0 && <th className="px-6 py-3">No fields defined</th>}
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={Math.max(2, fields.length + 1)} className="px-6 py-8 text-center text-slate-500">
                    No records found.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    {fields.slice(0, 5).map(field => (
                      <td key={field.id} className="px-6 py-4">
                        {String(record.data[field.key] ?? '-')}
                      </td>
                    ))}
                    {fields.length === 0 && <td className="px-6 py-4">-</td>}
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => triggerDelete(record.id)}
                        className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={confirmDelete}
        title="Delete Record"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmText="Delete Record"
        isDestructive={true}
        isLoading={deleteMutation.isLoading}
      />
    </div>
  );
}
