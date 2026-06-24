import React, { useState } from 'react';
import { Plus, Search, Building, Users, MapPin, CheckCircle, Wrench, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useInfrastructure } from '../../../hooks/useInfrastructure';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { FacilityFormModal } from './FacilityFormModal';
import { useConfirm } from '../../../contexts/ConfirmContext';

export default function Infrastructure() {
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { facilities, isLoading, addFacility, updateFacility, deleteFacility, isAdding, isUpdating } = useInfrastructure(collegeId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState(null);

  const filteredFacilities = facilities.filter(fac => 
    fac.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fac.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fac.building.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingFacility(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (facility) => {
    setEditingFacility(facility);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: "Are you sure you want to remove this facility from the registry?" })) {
      await deleteFacility(id);
    }
  };

  const handleSubmit = async (data) => {
    try {
      if (editingFacility) {
        await updateFacility({ id: editingFacility.id, data });
      } else {
        await addFacility(data);
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Infrastructure & Facilities</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage classrooms, labs, buildings, and maintenance states.</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Facility
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white dark:bg-[#0A0F1C] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input 
            placeholder="Search by room name, type, or building..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 mb-0"
          />
        </div>
      </div>

      {/* Grid Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-48 bg-slate-100 dark:bg-white/5 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredFacilities.length === 0 ? (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Building className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No facilities found</h3>
          <p className="text-slate-500 dark:text-slate-400">Click "Add Facility" to register classrooms, labs, and more.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredFacilities.map((fac) => (
            <div key={fac.id} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col">
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-50 to-emerald-50 dark:from-primary-500/10 dark:to-emerald-500/10 flex items-center justify-center text-primary-500 border border-primary-100 dark:border-primary-500/20">
                    <Building className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">{fac.name}</h3>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{fac.type}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenEdit(fac)} className="p-1.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors bg-slate-50 dark:bg-white/5 rounded-lg">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(fac.id)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-slate-50 dark:bg-white/5 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{fac.building || 'Main Campus'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span>Capacity: <strong className="text-slate-900 dark:text-white">{fac.capacity}</strong></span>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                {fac.status === 'operational' ? (
                  <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-lg">
                    <CheckCircle className="w-4 h-4" /> Operational
                  </div>
                ) : fac.status === 'maintenance' ? (
                  <div className="flex items-center gap-1.5 text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 px-3 py-1 rounded-lg">
                    <Wrench className="w-4 h-4" /> Maintenance
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 px-3 py-1 rounded-lg">
                    <Building className="w-4 h-4" /> Closed
                  </div>
                )}

                {fac.features && (
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    {fac.features}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <FacilityFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingFacility}
        isLoading={isAdding || isUpdating}
      />
    </div>
  );
}
