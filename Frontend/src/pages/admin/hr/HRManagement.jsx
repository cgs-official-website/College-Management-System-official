import React, { useState } from 'react';
import { Plus, Search, Filter, Mail, Phone, MoreVertical, Edit, Trash2, Building, Shield } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useStaff } from '../../../hooks/useStaff';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { StaffFormModal } from './StaffFormModal';
import { useConfirm } from '../../../contexts/ConfirmContext';

export default function HRManagement() {
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { staff, isLoading, addStaff, updateStaff, deleteStaff, isAdding, isUpdating } = useStaff(collegeId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const filteredStaff = staff.filter(member => {
    const fullName = `${member.firstName || ''} ${member.lastName || ''} ${member.name || ''}`.toLowerCase();
    const dept = (member.department || '').toLowerCase();
    const email = (member.email || '').toLowerCase();
    const search = (searchTerm || '').toLowerCase();
    
    return fullName.includes(search) || dept.includes(search) || email.includes(search);
  });

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (member) => {
    setEditingStaff(member);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: "Are you sure you want to completely remove this staff member? This action cannot be undone." })) {
      await deleteStaff(id);
    }
  };

  const handleSubmit = async (data) => {
    try {
      if (editingStaff) {
        await updateStaff({ id: editingStaff.id, data });
      } else {
        await addStaff(data);
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const getRoleBadge = (role) => {
    switch(role) {
      case 'hod': return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max"><Shield className="w-3 h-3"/> HOD</span>;
      case 'teacher': return <span className="px-2.5 py-1 bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400 rounded-md text-xs font-bold uppercase tracking-wider w-max">Teacher</span>;
      case 'admin': return <span className="px-2.5 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400 rounded-md text-xs font-bold uppercase tracking-wider w-max">Admin</span>;
      default: return <span className="px-2.5 py-1 bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400 rounded-md text-xs font-bold uppercase tracking-wider w-max">Support</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">HR & Staff Directory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage all college employees and faculty.</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white dark:bg-[#0A0F1C] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input 
            placeholder="Search by name, email, or department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 mb-0"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="px-4">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4 pl-6">Staff Member</th>
                <th className="p-4">Role & Dept</th>
                <th className="p-4">Contact Details</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {isLoading ? (
                [1, 2, 3, 4].map(n => (
                  <tr key={n} className="animate-pulse">
                    <td className="p-4 pl-6"><div className="h-10 w-48 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4"><div className="h-6 w-24 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4"><div className="h-6 w-32 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4"><div className="h-6 w-16 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4 pr-6"></td>
                  </tr>
                ))
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-slate-500 dark:text-slate-400">
                    No staff members found matching your search.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {member.firstName?.charAt(0) || member.name?.charAt(0) || 'U'}{member.lastName?.charAt(0) || ''}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{member.firstName || member.name} {member.lastName || ''}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Joined: {member.joinDate || 'N/A'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5">
                        {getRoleBadge(member.role)}
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Building className="w-3 h-3" /> {member.department || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {member.email}</div>
                        {member.phone && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5" /> {member.phone}</div>}
                      </div>
                    </td>
                    <td className="p-4">
                      {(member.status || member.accountStatus || 'unknown') === 'active' ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span> {(member.status || member.accountStatus || 'unknown').replace('_', ' ')}
                        </span>
                      )}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(member)} className="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-lg shadow-sm">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(member.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-lg shadow-sm">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StaffFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingStaff}
        isLoading={isAdding || isUpdating}
      />
    </div>
  );
}
