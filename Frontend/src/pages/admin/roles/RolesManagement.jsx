import { useState, useEffect, useCallback, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  Save, 
  Users, 
  AlertCircle, 
  RefreshCw, 
  Layers, 
  Info,
  CheckSquare,
  Square
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { api } from '../../../services/apiClient';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useConfirm } from '../../../contexts/ConfirmContext';

export default function RolesManagement() {
  const confirm = useConfirm();
  const selectAllId = useId();
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // 409 Delete Conflict Modal State
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');
  const [conflictCount, setConflictCount] = useState(0);

  // Load detailed role permissions
  const loadRolePermissions = useCallback(async (roleId) => {
    setIsLoadingDetails(true);
    try {
      const res = await api.get(`/roles/${roleId}`);
      const roleData = res.data;
      setSelectedRole(roleData);

      // Map permissions
      const permList = (roleData.permissions || []).map(p => ({
        moduleId: p.moduleId,
        moduleKey: p.moduleKey,
        moduleLabel: p.moduleLabel,
        canCreate: Boolean(p.canCreate),
        canRead: Boolean(p.canRead),
        canUpdate: Boolean(p.canUpdate),
        canDelete: Boolean(p.canDelete),
      }));

      setPermissions(permList);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to fetch role details:', err);
      toast.error('Failed to load permissions for role.');
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  // Fetch all roles and modules
  const fetchInitialData = useCallback(async (targetRoleId = null) => {
    setIsLoadingRoles(true);
    setError(null);
    try {
      const [modulesRes, rolesRes] = await Promise.all([
        api.get('/modules'),
        api.get('/roles')
      ]);

      const fetchedModules = modulesRes.data || [];
      const fetchedRoles = rolesRes.data || [];

      setModules(fetchedModules);
      setRoles(fetchedRoles);

      if (fetchedRoles.length > 0) {
        const active = targetRoleId
          ? fetchedRoles.find(r => r.id === targetRoleId) || fetchedRoles[0]
          : fetchedRoles[0];
        await loadRolePermissions(active.id);
      } else {
        setSelectedRole(null);
      }
    } catch (err) {
      console.error('Failed to load roles data:', err);
      setError(err.message || 'Failed to load roles & permissions.');
      toast.error('Failed to load roles.');
    } finally {
      setIsLoadingRoles(false);
    }
  }, [loadRolePermissions]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleSelectRole = async (role) => {
    if (hasUnsavedChanges) {
      const discard = await confirm({
        title: "Unsaved Changes",
        message: "You have unsaved permission changes. Do you want to discard them and switch roles?"
      });
      if (!discard) return;
    }
    loadRolePermissions(role.id);
  };

  const handlePermissionToggle = (moduleId, actionKey) => {
    if (selectedRole?.isSystemRole) return;

    setPermissions(prev => prev.map(p => {
      if (p.moduleId === moduleId) {
        return { ...p, [actionKey]: !p[actionKey] };
      }
      return p;
    }));
    setHasUnsavedChanges(true);
  };

  const handleToggleAllForModule = (moduleId, checkAll) => {
    if (selectedRole?.isSystemRole) return;

    setPermissions(prev => prev.map(p => {
      if (p.moduleId === moduleId) {
        return {
          ...p,
          canCreate: checkAll,
          canRead: checkAll,
          canUpdate: checkAll,
          canDelete: checkAll,
        };
      }
      return p;
    }));
    setHasUnsavedChanges(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole || selectedRole.isSystemRole) return;

    setIsSaving(true);
    try {
      await api.put(`/roles/${selectedRole.id}/permissions`, {
        permissions: permissions.map(p => ({
          moduleId: p.moduleId,
          canCreate: p.canCreate,
          canRead: p.canRead,
          canUpdate: p.canUpdate,
          canDelete: p.canDelete,
        }))
      });

      toast.success(`Permissions for '${selectedRole.name}' saved successfully!`);
      setHasUnsavedChanges(false);
    } catch (err) {
      console.error('Failed to save permissions:', err);
      toast.error(err.message || 'Failed to save permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    setIsCreating(true);
    try {
      const res = await api.post('/roles', { name: newRoleName.trim() });
      toast.success(`Role '${newRoleName.trim()}' created!`);
      setIsCreateOpen(false);
      setNewRoleName('');
      
      await fetchInitialData();
      if (res.data?.id) {
        loadRolePermissions(res.data.id);
      }
    } catch (err) {
      console.error('Failed to create role:', err);
      toast.error(err.message || 'Failed to create role.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRenameRole = async (e) => {
    e.preventDefault();
    if (!selectedRole || !renameValue.trim()) return;

    setIsRenaming(true);
    try {
      await api.put(`/roles/${selectedRole.id}`, { name: renameValue.trim() });
      toast.success(`Role renamed to '${renameValue.trim()}'!`);
      setIsRenameOpen(false);
      
      await fetchInitialData();
      loadRolePermissions(selectedRole.id);
    } catch (err) {
      console.error('Failed to rename role:', err);
      toast.error(err.message || 'Failed to rename role.');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (role.isSystemRole) {
      toast.error('System roles are protected and cannot be deleted.');
      return;
    }

    const ok = await confirm({
      title: `Delete Role '${role.name}'?`,
      message: "Are you sure you want to permanently delete this custom role?",
      confirmText: "Delete Role",
      variant: "danger"
    });

    if (!ok) return;

    try {
      await api.delete(`/roles/${role.id}`);
      toast.success(`Role '${role.name}' deleted.`);
      fetchInitialData();
    } catch (err) {
      if (err.status === 409) {
        setConflictCount(err.count || role.userCount || 1);
        setConflictMessage(err.message || `Cannot delete role '${role.name}' because users are currently assigned to it.`);
        setConflictModalOpen(true);
      } else {
        toast.error(err.message || 'Failed to delete role.');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-xl">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Roles & Permissions
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Create custom institutional roles and assign granular CRUD permissions per module.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="secondary" 
            onClick={fetchInitialData} 
            disabled={isLoadingRoles}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingRoles ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={() => setIsCreateOpen(true)}
            className="flex items-center gap-2 shadow-lg shadow-primary-500/20"
          >
            <Plus className="w-4 h-4" />
            Create Role
          </Button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Roles List (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Institution Roles ({roles.length})
            </span>
          </div>

          {isLoadingRoles ? (
            <div className="space-y-3 py-4">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="h-16 rounded-2xl bg-slate-100 dark:bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-slate-500">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
              <p className="text-sm">{error}</p>
              <Button size="sm" variant="secondary" onClick={fetchInitialData} className="mt-3">
                Retry
              </Button>
            </div>
          ) : roles.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <Layers className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">No roles found.</p>
              <Button size="sm" onClick={() => setIsCreateOpen(true)} className="mt-3">
                Create First Role
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {roles.map(role => {
                const isSelected = selectedRole?.id === role.id;

                return (
                  <motion.div
                    key={role.id}
                    onClick={() => handleSelectRole(role)}
                    className={`group relative p-4 rounded-2xl cursor-pointer transition-all duration-200 border ${
                      isSelected
                        ? 'bg-primary-50/70 dark:bg-primary-500/10 border-primary-300 dark:border-primary-500/30 shadow-sm'
                        : 'bg-slate-50/50 dark:bg-white/[0.02] hover:bg-slate-100/80 dark:hover:bg-white/5 border-slate-100 dark:border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          role.isSystemRole 
                            ? 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300' 
                            : 'bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400'
                        }`}>
                          {role.isSystemRole ? <Lock className="w-4 h-4" /> : role.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {role.name}
                            </p>
                            {role.isSystemRole && (
                              <span className="px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-md">
                                System
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                            <Users className="w-3 h-3" />
                            <span>{role.userCount || 0} user{role.userCount === 1 ? '' : 's'} assigned</span>
                          </p>
                        </div>
                      </div>

                      {!role.isSystemRole && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            title="Rename Role"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRole(role);
                              setRenameValue(role.name);
                              setIsRenameOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-white dark:hover:bg-white/10 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Delete Role"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRole(role);
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-white dark:hover:bg-white/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Permissions Matrix (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-6">
          
          {selectedRole ? (
            <>
              {/* Role Header Info */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-5 border-b border-slate-100 dark:border-white/5">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                      {selectedRole.name}
                    </h2>
                    {selectedRole.isSystemRole ? (
                      <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                        <Lock className="w-3 h-3" /> System Role (Protected)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                        Custom Role
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {selectedRole.isSystemRole 
                      ? 'System roles possess fixed default privileges across the platform and cannot be modified.'
                      : 'Configure granular module permissions. Remember to save changes before navigating away.'}
                  </p>
                </div>

                {!selectedRole.isSystemRole && (
                  <Button
                    onClick={handleSavePermissions}
                    isLoading={isSaving}
                    disabled={!hasUnsavedChanges || isSaving}
                    className={`flex items-center gap-2 ${
                      hasUnsavedChanges 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20' 
                        : ''
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    Save Matrix
                  </Button>
                )}
              </div>

              {/* Unsaved changes alert */}
              {hasUnsavedChanges && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-3.5 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>You have unsaved changes in the permission matrix for this role.</span>
                  </div>
                  <button 
                    onClick={handleSavePermissions}
                    className="font-bold underline hover:opacity-80 ml-2"
                  >
                    Save now
                  </button>
                </motion.div>
              )}

              {/* Permissions Table Matrix */}
              {isLoadingDetails ? (
                <div className="space-y-4 py-8">
                  {[1, 2, 3, 4, 5].map(n => (
                    <div key={n} className="h-12 bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-3.5 px-4">Module Name</th>
                        <th className="py-3.5 px-3 text-center">Create</th>
                        <th className="py-3.5 px-3 text-center">Read</th>
                        <th className="py-3.5 px-3 text-center">Update</th>
                        <th className="py-3.5 px-3 text-center">Delete</th>
                        {!selectedRole.isSystemRole && (
                          <th className="py-3.5 px-3 text-right">Toggle All</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {permissions.map((perm) => {
                        const allChecked = perm.canCreate && perm.canRead && perm.canUpdate && perm.canDelete;

                        return (
                          <tr 
                            key={perm.moduleId}
                            className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                          >
                            <td className="py-4 px-4">
                              <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {perm.moduleLabel || perm.moduleKey}
                              </p>
                              <p className="text-[11px] font-mono text-slate-400">
                                module: {perm.moduleKey}
                              </p>
                            </td>

                            {/* Create */}
                            <td className="py-4 px-3 text-center">
                              <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={perm.canCreate}
                                  disabled={selectedRole.isSystemRole}
                                  onChange={() => handlePermissionToggle(perm.moduleId, 'canCreate')}
                                  className="w-4 h-4 text-primary-600 rounded border-slate-300 dark:border-white/20 focus:ring-primary-500 disabled:opacity-50"
                                />
                              </label>
                            </td>

                            {/* Read */}
                            <td className="py-4 px-3 text-center">
                              <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={perm.canRead}
                                  disabled={selectedRole.isSystemRole}
                                  onChange={() => handlePermissionToggle(perm.moduleId, 'canRead')}
                                  className="w-4 h-4 text-primary-600 rounded border-slate-300 dark:border-white/20 focus:ring-primary-500 disabled:opacity-50"
                                />
                              </label>
                            </td>

                            {/* Update */}
                            <td className="py-4 px-3 text-center">
                              <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={perm.canUpdate}
                                  disabled={selectedRole.isSystemRole}
                                  onChange={() => handlePermissionToggle(perm.moduleId, 'canUpdate')}
                                  className="w-4 h-4 text-primary-600 rounded border-slate-300 dark:border-white/20 focus:ring-primary-500 disabled:opacity-50"
                                />
                              </label>
                            </td>

                            {/* Delete */}
                            <td className="py-4 px-3 text-center">
                              <label className="inline-flex items-center justify-center p-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={perm.canDelete}
                                  disabled={selectedRole.isSystemRole}
                                  onChange={() => handlePermissionToggle(perm.moduleId, 'canDelete')}
                                  className="w-4 h-4 text-primary-600 rounded border-slate-300 dark:border-white/20 focus:ring-primary-500 disabled:opacity-50"
                                />
                              </label>
                            </td>

                            {/* Quick Select All */}
                            {!selectedRole.isSystemRole && (
                              <td className="py-4 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleToggleAllForModule(perm.moduleId, !allChecked)}
                                  className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1"
                                >
                                  {allChecked ? 'Clear' : 'All'}
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center text-slate-400">
              <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <h3 className="text-base font-bold text-slate-700 dark:text-slate-300">No Role Selected</h3>
              <p className="text-xs mt-1">Select a role from the left panel to inspect or configure permissions.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Custom Role"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateRole} className="space-y-5">
          <Input
            label="Role Name"
            placeholder="e.g. Accountant, Librarian, Hostel Warden"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
            required
            autoFocus
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Once created, you can immediately grant or restrict granular access per module.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
            <Button variant="secondary" type="button" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating}>
              Create Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* Rename Role Modal */}
      <Modal
        isOpen={isRenameOpen}
        onClose={() => setIsRenameOpen(false)}
        title="Rename Role"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRenameRole} className="space-y-5">
          <Input
            label="Role Name"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            required
            autoFocus
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
            <Button variant="secondary" type="button" onClick={() => setIsRenameOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isRenaming}>
              Save Name
            </Button>
          </div>
        </form>
      </Modal>

      {/* 409 Conflict Modal on Role Deletion */}
      <Modal
        isOpen={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        title="Cannot Delete Role (Assigned Users)"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="text-center">
            <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">
              {conflictMessage}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              There are currently <span className="font-bold text-slate-900 dark:text-white">{conflictCount}</span> user(s) assigned to this custom role.
            </p>
          </div>
          <div className="bg-slate-50 dark:bg-white/5 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400">
            <Info className="w-4 h-4 inline mr-1 text-primary-500" />
            Please reassign these users to another role under <strong>HR & Staff</strong> or <strong>Students Directory</strong> before deleting this role.
          </div>
          <div className="flex justify-end pt-3">
            <Button onClick={() => setConflictModalOpen(false)}>
              Understand
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
