import React, { useState } from 'react';
import { useGetEntities, useCreateEntity, useCreateField, useGetFields, useDeleteEntity, useCreateSection, useDeleteSection } from './useBuilder';
import { Button } from '../../components/ui/Button';
import { ConfirmModal } from '../../components/ui/ConfirmModal';
import { Plus, Database, Settings2, GripVertical, Check, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ModuleBuilder() {
  const { data: entitiesData, isLoading: entitiesLoading } = useGetEntities();
  const createEntity = useCreateEntity();
  const deleteEntity = useDeleteEntity();
  const createField = useCreateField();
  const createSection = useCreateSection();
  const deleteSection = useDeleteSection();
  
  const [activeEntity, setActiveEntity] = useState(null);
  const [newEntityData, setNewEntityData] = useState({ name: '', slug: '' });
  const [newSectionName, setNewSectionName] = useState('');
  
  const [deleteEntityModal, setDeleteEntityModal] = useState({ isOpen: false, id: null, slug: null });
  const [deleteSectionModal, setDeleteSectionModal] = useState({ isOpen: false, id: null });
  
  const { data: fieldsData, isLoading: fieldsLoading } = useGetFields(activeEntity);
  const [newField, setNewField] = useState({ name: '', key: '', type: 'text', isRequired: false, sectionId: '' });

  const handleCreateEntity = (e) => {
    e.preventDefault();
    createEntity.mutate(newEntityData, {
      onSuccess: () => {
        toast.success('Module created!');
        setNewEntityData({ name: '', slug: '' });
      },
      onError: (err) => {
        const msg = err.data?.message || err.message || 'Failed to create module';
        toast.error(msg);
      }
    });
  };

  const triggerDeleteEntity = (e, id, slug) => {
    e.stopPropagation();
    setDeleteEntityModal({ isOpen: true, id, slug });
  };

  const confirmDeleteEntity = () => {
    const { id, slug } = deleteEntityModal;
    deleteEntity.mutate(id, {
      onSuccess: () => {
        toast.success('Module deleted!');
        if (activeEntity === slug) setActiveEntity(null);
        setDeleteEntityModal({ isOpen: false, id: null, slug: null });
      },
      onError: (err) => {
        const msg = err.data?.message || err.message || 'Failed to delete module';
        toast.error(msg);
        setDeleteEntityModal({ isOpen: false, id: null, slug: null });
      }
    });
  };

  const handleCreateField = (e) => {
    e.preventDefault();
    const dynamicEntity = entitiesData?.find(en => en.slug === activeEntity);
    
    const fieldPayload = {
      ...newField,
      entityId: dynamicEntity ? dynamicEntity.id : undefined,
      hardcodedModel: dynamicEntity ? undefined : activeEntity,
      sectionId: newField.sectionId || undefined
    };

    createField.mutate(fieldPayload, {
      onSuccess: () => {
        toast.success('Field added!');
        setNewField({ name: '', key: '', type: 'text', isRequired: false });
      },
      onError: (err) => {
        const msg = err.data?.message || err.message || 'Failed to add field';
        toast.error(msg);
      }
    });
  };

  const handleCreateSection = (e) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;
    const dynamicEntity = entitiesData?.find(en => en.slug === activeEntity);
    
    createSection.mutate({
      name: newSectionName,
      entityId: dynamicEntity ? dynamicEntity.id : undefined,
      hardcodedModel: dynamicEntity ? undefined : activeEntity
    }, {
      onSuccess: () => {
        toast.success('Section created!');
        setNewSectionName('');
      },
      onError: (err) => {
        const msg = err.data?.message || err.message || 'Failed to create section';
        toast.error(msg);
      }
    });
  };

  const triggerDeleteSection = (id) => {
    setDeleteSectionModal({ isOpen: true, id });
  };

  const confirmDeleteSection = () => {
    const { id } = deleteSectionModal;
    deleteSection.mutate({ id, model: activeEntity }, {
      onSuccess: () => {
        toast.success('Section deleted!');
        setDeleteSectionModal({ isOpen: false, id: null });
      },
      onError: (err) => {
        toast.error(err.data?.message || err.message || 'Failed to delete section');
        setDeleteSectionModal({ isOpen: false, id: null });
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Module Builder</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Design custom data modules or extend existing ones.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">Core Modules</h2>
            <div className="space-y-1">
              {['Student', 'Teacher', 'Admission', 'Course', 'Department'].map(model => (
                <button
                  key={model}
                  onClick={() => setActiveEntity(model)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeEntity === model ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                >
                  <Database className="w-4 h-4" />
                  {model}
                </button>
              ))}
            </div>
            
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider mt-6 mb-4">Custom Modules</h2>
            {entitiesLoading ? (
              <p className="text-sm text-slate-500">Loading...</p>
            ) : (
              <div className="space-y-1">
                {entitiesData?.map(ent => (
                  <div key={ent.id} className="flex gap-1 group">
                    <button
                      onClick={() => setActiveEntity(ent.slug)}
                      className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeEntity === ent.slug ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
                    >
                      <Settings2 className="w-4 h-4" />
                      <span className="truncate">{ent.name}</span>
                    </button>
                    <button 
                      onClick={(e) => triggerDeleteEntity(e, ent.id, ent.slug)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-all"
                      title="Delete Module"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/10">
              <form onSubmit={handleCreateEntity} className="space-y-3">
                <input 
                  type="text" 
                  placeholder="New Module Name" 
                  className="w-full text-sm p-2 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white"
                  value={newEntityData.name}
                  onChange={e => setNewEntityData({ ...newEntityData, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  required
                />
                <Button type="submit" className="w-full text-xs" isLoading={createEntity.isLoading}>
                  <Plus className="w-3 h-3 mr-1" /> Create Custom Module
                </Button>
              </form>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {activeEntity ? (
            <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-white/10">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Fields for {activeEntity}</h2>
                <p className="text-sm text-slate-500 mt-1">Add custom dynamic fields to this entity.</p>
              </div>
              
              <div className="p-6">
                
                {/* Sections and Fields Display */}
                <div className="space-y-8 mb-12">
                  {fieldsLoading ? (
                    <p className="text-sm text-slate-500">Loading fields...</p>
                  ) : (
                    <>
                      {/* Render Sections */}
                      {fieldsData?.sections?.map(section => (
                        <div key={section.id} className="bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden">
                          <div className="flex justify-between items-center p-4 bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-white/10">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200">{section.name}</h3>
                            <button onClick={() => triggerDeleteSection(section.id)} className="text-slate-400 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="p-4 space-y-3">
                            {fieldsData?.fields?.filter(f => f.sectionId === section.id).length === 0 ? (
                              <p className="text-xs text-slate-500 italic">No fields in this section.</p>
                            ) : (
                              fieldsData?.fields?.filter(f => f.sectionId === section.id).map(field => (
                                <div key={field.id} className="flex items-center gap-4 p-3 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm">
                                  <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
                                  <div className="flex-1">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{field.name}</p>
                                    <p className="text-xs text-slate-500 font-mono">{field.key}</p>
                                  </div>
                                  <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300">
                                    {field.type}
                                  </div>
                                  {field.isRequired && (
                                    <div className="px-3 py-1 bg-amber-100 dark:bg-amber-500/10 rounded-full text-xs font-medium text-amber-700 dark:text-amber-400">
                                      Required
                                    </div>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      ))}

                      {/* Render Uncategorized Fields */}
                      {fieldsData?.fields?.filter(f => !f.sectionId).length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Uncategorized Fields</h3>
                          {fieldsData?.fields?.filter(f => !f.sectionId).map(field => (
                            <div key={field.id} className="flex items-center gap-4 p-3 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm">
                              <GripVertical className="w-4 h-4 text-slate-400 cursor-move" />
                              <div className="flex-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-white">{field.name}</p>
                                <p className="text-xs text-slate-500 font-mono">{field.key}</p>
                              </div>
                              <div className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-medium text-slate-600 dark:text-slate-300">
                                {field.type}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {fieldsData?.sections?.length === 0 && fieldsData?.fields?.length === 0 && (
                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                          <p className="text-sm text-slate-500">No sections or fields defined yet.</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {/* Creation Forms */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-1 bg-slate-50 dark:bg-slate-800/30 p-5 rounded-xl border border-slate-200 dark:border-white/10 h-fit">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Create Section</h3>
                    <form onSubmit={handleCreateSection} className="space-y-3">
                      <div>
                        <input 
                          type="text" 
                          required
                          value={newSectionName}
                          onChange={e => setNewSectionName(e.target.value)}
                          className="w-full text-sm p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0F1C] text-slate-900 dark:text-white"
                          placeholder="e.g. Personal Details"
                        />
                      </div>
                      <Button type="submit" className="w-full" isLoading={createSection.isLoading}>
                        <Plus className="w-4 h-4 mr-2" /> Add Section
                      </Button>
                    </form>
                  </div>

                  <div className="xl:col-span-2 bg-slate-50 dark:bg-slate-800/30 p-5 rounded-xl border border-slate-200 dark:border-white/10 h-fit">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Add New Field</h3>
                  <form onSubmit={handleCreateField} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Field Label</label>
                      <input 
                        type="text" 
                        required
                        value={newField.name}
                        onChange={e => setNewField({ ...newField, name: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                        className="w-full text-sm p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0F1C] text-slate-900 dark:text-white"
                        placeholder="e.g. Blood Group"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Field Key (JSON)</label>
                      <input 
                        type="text" 
                        required
                        value={newField.key}
                        onChange={e => setNewField({ ...newField, key: e.target.value })}
                        className="w-full text-sm p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0F1C] text-slate-900 dark:text-white font-mono"
                        placeholder="e.g. blood_group"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Field Type</label>
                      <select 
                        value={newField.type}
                        onChange={e => setNewField({ ...newField, type: e.target.value })}
                        className="w-full text-sm p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0F1C] text-slate-900 dark:text-white"
                      >
                        <option value="text">Short Text</option>
                        <option value="number">Number</option>
                        <option value="date">Date</option>
                        <option value="boolean">Checkbox (Yes/No)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Section (Optional)</label>
                      <select 
                        value={newField.sectionId}
                        onChange={e => setNewField({ ...newField, sectionId: e.target.value })}
                        className="w-full text-sm p-2.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0F1C] text-slate-900 dark:text-white"
                      >
                        <option value="">No Section (Uncategorized)</option>
                        {fieldsData?.sections?.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="md:col-span-2 flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer p-2">
                        <input 
                          type="checkbox" 
                          checked={newField.isRequired}
                          onChange={e => setNewField({ ...newField, isRequired: e.target.checked })}
                          className="w-4 h-4 text-primary-600 rounded border-slate-300 focus:ring-primary-500"
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Required Field</span>
                      </label>
                    </div>
                    <div className="md:col-span-2 pt-2">
                      <Button type="submit" isLoading={createField.isLoading}>
                        <Plus className="w-4 h-4 mr-2" /> Add Field
                      </Button>
                    </div>
                  </form>
                </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm h-full flex flex-col items-center justify-center p-12 text-center">
              <Database className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Select a Module</h2>
              <p className="text-slate-500 mt-2 max-w-sm">Choose a core module or a custom module from the sidebar to start configuring its dynamic fields.</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteEntityModal.isOpen}
        onClose={() => setDeleteEntityModal({ isOpen: false, id: null, slug: null })}
        onConfirm={confirmDeleteEntity}
        title="Delete Module"
        message="Are you sure you want to delete this module and all its data? This cannot be undone."
        confirmText="Delete Module"
        isDestructive={true}
        isLoading={deleteEntity.isLoading}
      />
      
      <ConfirmModal
        isOpen={deleteSectionModal.isOpen}
        onClose={() => setDeleteSectionModal({ isOpen: false, id: null })}
        onConfirm={confirmDeleteSection}
        title="Delete Section"
        message="Are you sure you want to delete this section and ALL fields inside it? This cannot be undone."
        confirmText="Delete Section"
        isDestructive={true}
        isLoading={deleteSection.isLoading}
      />
    </div>
  );
}
