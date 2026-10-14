import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AlertCircle, Briefcase, Edit3, GraduationCap, Info, Layers, Lock, Plus, RefreshCw, Save, ShieldCheck, Trash2, Users } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { api } from '../../api/client';
import { API_URL } from '../../config/env';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { SheetModal } from '../../components/ui/SheetModal';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

const ACTIONS: { key: 'canCreate' | 'canRead' | 'canUpdate' | 'canDelete'; label: string }[] = [
  { key: 'canCreate', label: 'Create' },
  { key: 'canRead', label: 'Read' },
  { key: 'canUpdate', label: 'Update' },
  { key: 'canDelete', label: 'Delete' },
];

type RoleCategory = 'teaching' | 'non_teaching';

const CATEGORIES: { key: RoleCategory; label: string; short: string; desc: string; icon: any }[] = [
  {
    key: 'teaching',
    label: 'Teaching Staff',
    short: 'Teaching',
    desc: 'For HODs and Teachers. Only the modules you enable here appear in their Teacher app.',
    icon: GraduationCap,
  },
  {
    key: 'non_teaching',
    label: 'Non-Teaching Staff',
    short: 'Non-Teaching',
    desc: 'For office and support staff. Only the modules you enable here appear in their staff menu.',
    icon: Briefcase,
  },
];

const catOf = (r: any): RoleCategory => (r?.category === 'teaching' ? 'teaching' : 'non_teaching');

/** Permission module -> what it unlocks inside the Teacher app (see TEACHER_MODULE_PERMISSION in utils/permissions.ts). */
const TEACHER_UNLOCKS: Record<string, string> = {
  academic: 'My Classes, Assignments',
  attendance: 'Attendance, Student Leaves',
  timetable: 'Schedule, Manage Timetable (HOD)',
  exams: 'Marks & Grading',
  infrastructure: 'Facility Requests',
};

function CategoryPicker({ value, onChange, colors }: { value: RoleCategory; onChange: (c: RoleCategory) => void; colors: any }) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={[styles.catLabel, { color: colors.text }]}>Category</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map((c) => {
          const active = value === c.key;
          const Icon = c.icon;
          return (
            <Pressable
              key={c.key}
              onPress={() => onChange(c.key)}
              style={[styles.chip, { backgroundColor: active ? colors.primarySoft : colors.card, borderColor: active ? colors.primary : colors.border }]}>
              <Icon size={16} color={active ? colors.primary : colors.textMuted} />
              <Text style={[styles.chipText, { color: active ? colors.primary : colors.textMuted }]} numberOfLines={1}>{c.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Web: pages/admin/roles/RolesManagement.jsx  (GET /modules, GET/POST /roles, GET/PUT/DELETE /roles/:id, PUT /roles/:id/permissions) */
export default function RolesManagementScreen() {
  const { colors } = useTheme();
  const confirm = useConfirm();

  const [roles, setRoles] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [permissions, setPermissions] = useState<any[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(true);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleCategory, setNewRoleCategory] = useState<RoleCategory>('teaching');
  const [isCreating, setIsCreating] = useState(false);

  // Teaching / Non-Teaching tab (backend: role.category = 'teaching' | 'non_teaching')
  const [categoryTab, setCategoryTab] = useState<RoleCategory>('teaching');
  const tabRef = useRef<RoleCategory>('teaching');
  // false when the server does not send role.category (backend older than the web) -> do not mis-sort roles
  const [categorySupported, setCategorySupported] = useState(true);

  const [renameTarget, setRenameTarget] = useState<any>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameCategory, setRenameCategory] = useState<RoleCategory>('teaching');
  const [isRenaming, setIsRenaming] = useState(false);

  const [conflict, setConflict] = useState<{ open: boolean; message: string; count: number }>({ open: false, message: '', count: 0 });
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadRolePermissions = useCallback(async (roleId: string) => {
    setIsLoadingDetails(true);
    try {
      const res = await api.get<any>(`/roles/${roleId}`);
      const roleData = res.data;
      setSelectedRole(roleData);
      setPermissions((roleData.permissions || []).map((p: any) => ({
        moduleId: p.moduleId, moduleKey: p.moduleKey, moduleLabel: p.moduleLabel,
        canCreate: Boolean(p.canCreate), canRead: Boolean(p.canRead), canUpdate: Boolean(p.canUpdate), canDelete: Boolean(p.canDelete),
      })));
      setHasUnsavedChanges(false);
    } catch {
      toast.error('Failed to load permissions for role.');
    } finally {
      setIsLoadingDetails(false);
    }
  }, []);

  const fetchInitialData = useCallback(async (targetRoleId: string | null = null) => {
    setIsLoadingRoles(true);
    setError(null);
    try {
      // the web page also loads /modules here; the matrix itself comes from /roles/:id, so only roles are needed to render
      const rolesRes = await api.get<any>('/roles');
      const fetchedRoles = rolesRes.data || [];
      setRoles(fetchedRoles);
      setCategorySupported(
        fetchedRoles.length === 0 || fetchedRoles.some((r: any) => r.category === 'teaching' || r.category === 'non_teaching'),
      );
      if (__DEV__) console.log('[roles] API_URL =', API_URL, '| first role =', JSON.stringify(fetchedRoles[0]));
      if (fetchedRoles.length > 0) {
        const active = targetRoleId
          ? fetchedRoles.find((r: any) => r.id === targetRoleId) || fetchedRoles.find((r: any) => catOf(r) === tabRef.current) || fetchedRoles[0]
          : fetchedRoles.find((r: any) => catOf(r) === tabRef.current) || fetchedRoles[0];
        tabRef.current = catOf(active);
        setCategoryTab(catOf(active));
        await loadRolePermissions(active.id);
      } else {
        setSelectedRole(null);
        setPermissions([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load roles & permissions.');
      toast.error('Failed to load roles.');
    } finally {
      setIsLoadingRoles(false);
    }
  }, [loadRolePermissions]);

  useEffect(() => { void fetchInitialData(); }, [fetchInitialData]);

  const handleSelectRole = async (role: any) => {
    if (selectedRole?.id === role.id) return;
    if (hasUnsavedChanges) {
      const discard = await confirm({
        title: 'Unsaved Changes',
        message: 'You have unsaved permission changes. Do you want to discard them and switch roles?',
        confirmText: 'Discard', isDestructive: false,
      });
      if (!discard) return;
    }
    void loadRolePermissions(role.id);
  };

  const handleSelectTab = async (tab: RoleCategory) => {
    if (tab === categoryTab) return;
    if (hasUnsavedChanges) {
      const discard = await confirm({
        title: 'Unsaved Changes',
        message: 'You have unsaved permission changes. Do you want to discard them and switch category?',
        confirmText: 'Discard', isDestructive: false,
      });
      if (!discard) return;
    }
    tabRef.current = tab;
    setCategoryTab(tab);
    const first = roles.find((r: any) => catOf(r) === tab);
    if (first) {
      void loadRolePermissions(first.id);
    } else {
      setSelectedRole(null);
      setPermissions([]);
      setHasUnsavedChanges(false);
    }
  };

  const openCreate = () => {
    setNewRoleName('');
    setNewRoleCategory(categoryTab);
    setIsCreateOpen(true);
  };

  const handlePermissionToggle = (moduleId: string, actionKey: string) => {
    if (selectedRole?.isSystemRole) return;
    setPermissions((prev) => prev.map((p) => (p.moduleId === moduleId ? { ...p, [actionKey]: !p[actionKey] } : p)));
    setHasUnsavedChanges(true);
  };

  const handleToggleAllForModule = (moduleId: string, checkAll: boolean) => {
    if (selectedRole?.isSystemRole) return;
    setPermissions((prev) => prev.map((p) => (p.moduleId === moduleId ? { ...p, canCreate: checkAll, canRead: checkAll, canUpdate: checkAll, canDelete: checkAll } : p)));
    setHasUnsavedChanges(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole || selectedRole.isSystemRole) return;
    setIsSaving(true);
    try {
      await api.put(`/roles/${selectedRole.id}/permissions`, {
        permissions: permissions.map((p) => ({ moduleId: p.moduleId, canCreate: p.canCreate, canRead: p.canRead, canUpdate: p.canUpdate, canDelete: p.canDelete })),
      });
      toast.success(`Permissions for '${selectedRole.name}' saved successfully!`);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    setIsCreating(true);
    try {
      const res = await api.post<any>('/roles', { name: newRoleName.trim(), category: newRoleCategory });
      toast.success(`Role '${newRoleName.trim()}' created!`);
      setIsCreateOpen(false);
      setNewRoleName('');
      await fetchInitialData(res.data?.id || null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create role.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRenameRole = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    const body: Record<string, string> = {};
    if (renameValue.trim() !== renameTarget.name) body.name = renameValue.trim();
    if (renameCategory !== catOf(renameTarget)) body.category = renameCategory;
    if (Object.keys(body).length === 0) {
      setRenameTarget(null);
      return;
    }
    setIsRenaming(true);
    try {
      await api.put(`/roles/${renameTarget.id}`, body);
      toast.success(`Role '${renameValue.trim()}' updated!`);
      const id = renameTarget.id;
      setRenameTarget(null);
      await fetchInitialData(id);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role.');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDeleteRole = async (role: any) => {
    if (role.isSystemRole) { toast.error('System roles are protected and cannot be deleted.'); return; }
    const ok = await confirm({ title: `Delete Role '${role.name}'?`, message: 'Are you sure you want to permanently delete this custom role?', confirmText: 'Delete Role', isDestructive: true });
    if (!ok) return;
    try {
      await api.delete(`/roles/${role.id}`);
      toast.success(`Role '${role.name}' deleted.`);
      await fetchInitialData();
    } catch (err: any) {
      if (err.status === 409) {
        setConflict({ open: true, count: err.count || role.userCount || 1, message: err.message || `Cannot delete role '${role.name}' because users are currently assigned to it.` });
      } else {
        toast.error(err.message || 'Failed to delete role.');
      }
    }
  };

  const isSystem = !!selectedRole?.isSystemRole;
  const visibleRoles = categorySupported ? roles.filter((r: any) => catOf(r) === categoryTab) : roles;
  const activeCategory = CATEGORIES.find((c) => c.key === categoryTab)!;
  const selectedCategory = CATEGORIES.find((c) => c.key === catOf(selectedRole));

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => { setIsRefreshing(true); await fetchInitialData(selectedRole?.id || null); setIsRefreshing(false); }}>
      <View style={styles.headingRow}>
        <View style={[styles.headIcon, { backgroundColor: colors.primarySoft }]}><ShieldCheck size={22} color={colors.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Roles & Permissions</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Create custom institutional roles and assign granular CRUD permissions per module.</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button title="Refresh" size="sm" variant="secondary" fullWidth={false} icon={RefreshCw} disabled={isLoadingRoles} onPress={() => fetchInitialData(selectedRole?.id || null)} />
        <View style={{ width: 8 }} />
        <Button title="Create Role" size="sm" fullWidth={false} icon={Plus} onPress={openCreate} />
      </View>

      {/* Roles list */}
      {categorySupported ? (
        <>
        <View style={[styles.tabs, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
          {CATEGORIES.map((c) => {
            const active = categoryTab === c.key;
            const Icon = c.icon;
            const count = roles.filter((r: any) => catOf(r) === c.key).length;
            return (
              <Pressable key={c.key} onPress={() => handleSelectTab(c.key)} style={[styles.tab, active && { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Icon size={16} color={active ? colors.primary : colors.textMuted} />
                <Text style={[styles.tabText, { color: active ? colors.primary : colors.textMuted }]} numberOfLines={1}>{c.short} ({count})</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={[styles.tabDesc, { color: colors.textMuted }]}>{activeCategory.desc}</Text>
        </>
      ) : (
        <Card style={{ backgroundColor: colors.warningSoft, marginBottom: 14 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AlertCircle size={18} color={colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.warning, fontWeight: '800', fontSize: 13 }}>Role categories not received</Text>
              <Text style={{ color: colors.warning, fontSize: 12, lineHeight: 17, marginTop: 4 }}>
                The server this app is connected to did not send the Teaching / Non-Teaching category for roles, so they cannot be sorted like the web.
                The app backend is older than the web backend. Check API_URL in config/env.ts or redeploy the backend.
              </Text>
            </View>
          </View>
        </Card>
      )}

      <Text style={[styles.label, { color: colors.textSubtle }]}>{categorySupported ? activeCategory.label.toUpperCase() : 'INSTITUTION'} ROLES ({visibleRoles.length})</Text>
      {isLoadingRoles ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : error ? (
        <Card style={styles.errorCard}>
          <AlertCircle size={28} color={colors.danger} />
          <Text style={{ color: colors.textMuted, marginVertical: 10, textAlign: 'center' }}>{error}</Text>
          <Button title="Retry" size="sm" variant="secondary" fullWidth={false} onPress={() => fetchInitialData()} />
        </Card>
      ) : visibleRoles.length === 0 ? (
        <EmptyState icon={Layers} title={`No ${activeCategory.short.toLowerCase()} roles yet.`} actionLabel="Create Role" onAction={openCreate} />
      ) : (
        visibleRoles.map((role) => {
          const active = selectedRole?.id === role.id;
          return (
            <Pressable
              key={role.id}
              onPress={() => handleSelectRole(role)}
              style={[styles.roleCard, { backgroundColor: active ? colors.primarySoft : colors.card, borderColor: active ? colors.primary : colors.border }]}>
              <View style={[styles.roleAvatar, { backgroundColor: role.isSystemRole ? colors.cardAlt : colors.primarySoft }]}>
                {role.isSystemRole ? <Lock size={16} color={colors.textMuted} /> : <Text style={{ color: colors.primary, fontWeight: fontWeight.extrabold }}>{role.name.charAt(0).toUpperCase()}</Text>}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.nameRow}>
                  <Text style={[styles.roleName, { color: colors.text }]} numberOfLines={1}>{role.name}</Text>
                  {role.isSystemRole ? <View style={[styles.sysChip, { backgroundColor: colors.cardAlt }]}><Text style={[styles.sysText, { color: colors.textMuted }]}>SYSTEM</Text></View> : null}
                </View>
                <View style={styles.userRow}>
                  <Users size={12} color={colors.textSubtle} />
                  <Text style={[styles.meta, { color: colors.textMuted }]}> {role.userCount || 0} user{role.userCount === 1 ? '' : 's'} assigned</Text>
                </View>
              </View>
              {!role.isSystemRole ? (
                <View style={styles.roleActions}>
                  <Pressable hitSlop={8} onPress={() => { setRenameTarget(role); setRenameValue(role.name); setRenameCategory(catOf(role)); }} style={styles.smallBtn}><Edit3 size={16} color={colors.textMuted} /></Pressable>
                  <Pressable hitSlop={8} onPress={() => handleDeleteRole(role)} style={styles.smallBtn}><Trash2 size={16} color={colors.danger} /></Pressable>
                </View>
              ) : null}
            </Pressable>
          );
        })
      )}

      {/* Matrix */}
      <Card style={styles.matrix}>
        {selectedRole ? (
          <>
            <View style={styles.matrixHead}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.matrixTitle, { color: colors.text }]}>{selectedRole.name}</Text>
                <View style={styles.badgeRow}>
                  {isSystem ? (
                    <View style={[styles.pill, { backgroundColor: colors.warningSoft }]}><Lock size={11} color={colors.warning} /><Text style={[styles.pillText, { color: colors.warning }]}> System Role (Protected)</Text></View>
                  ) : (
                    <View style={[styles.pill, { backgroundColor: colors.successSoft }]}><Text style={[styles.pillText, { color: colors.success }]}>Custom Role</Text></View>
                  )}
                  {categorySupported && selectedCategory ? (
                    <View style={[styles.pill, { backgroundColor: colors.primarySoft, marginLeft: 6 }]}><Text style={[styles.pillText, { color: colors.primary }]}>{selectedCategory.short}</Text></View>
                  ) : null}
                </View>
                <Text style={[styles.meta, { color: colors.textMuted, marginTop: 6 }]}>
                  {isSystem ? 'System roles possess fixed default privileges across the platform and cannot be modified.' : 'Configure granular module permissions. Remember to save changes before navigating away.'}
                </Text>
              </View>
            </View>

            {!isSystem ? (
              <View style={{ marginTop: 12 }}>
                <Button title="Save Matrix" icon={Save} loading={isSaving} disabled={!hasUnsavedChanges || isSaving} onPress={handleSavePermissions} />
              </View>
            ) : null}

            {hasUnsavedChanges ? (
              <View style={[styles.alert, { backgroundColor: colors.warningSoft }]}>
                <AlertCircle size={16} color={colors.warning} />
                <Text style={[styles.alertText, { color: colors.warning }]}>You have unsaved changes in the permission matrix for this role.</Text>
                <Pressable onPress={handleSavePermissions}><Text style={[styles.alertLink, { color: colors.warning }]}>Save now</Text></Pressable>
              </View>
            ) : null}

            {isLoadingDetails ? (
              <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : (
              permissions.map((perm) => {
                const allChecked = perm.canCreate && perm.canRead && perm.canUpdate && perm.canDelete;
                return (
                  <View key={perm.moduleId} style={[styles.perm, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}>
                    <View style={styles.permHead}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.permName, { color: colors.text }]} numberOfLines={1}>{perm.moduleLabel || perm.moduleKey}</Text>
                        <Text style={[styles.mono, { color: colors.textSubtle }]}>module: {perm.moduleKey}</Text>
                        {catOf(selectedRole) === 'teaching' && TEACHER_UNLOCKS[perm.moduleKey] ? (
                          <Text style={[styles.unlock, { color: colors.primary }]}>Teacher app: {TEACHER_UNLOCKS[perm.moduleKey]}</Text>
                        ) : null}
                      </View>
                      {!isSystem ? (
                        <Pressable onPress={() => handleToggleAllForModule(perm.moduleId, !allChecked)} hitSlop={8}>
                          <Text style={{ color: colors.primary, fontSize: 12, fontWeight: fontWeight.bold }}>{allChecked ? 'Clear' : 'All'}</Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <View style={styles.switchGrid}>
                      {ACTIONS.map((a) => (
                        <View key={a.key} style={styles.switchCell}>
                          <Text style={[styles.switchLabel, { color: colors.textMuted }]}>{a.label}</Text>
                          <Switch
                            value={perm[a.key]} disabled={isSystem} onValueChange={() => handlePermissionToggle(perm.moduleId, a.key)}
                            trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff"
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })
            )}
          </>
        ) : (
          <EmptyState icon={ShieldCheck} title="No Role Selected" message="Select a role from the list to inspect or configure permissions." />
        )}
      </Card>

      {/* Create */}
      <SheetModal
        visible={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Custom Role"
        footer={
          <View style={styles.footer}>
            <Button title="Cancel" variant="outline" onPress={() => setIsCreateOpen(false)} style={styles.flex} />
            <View style={{ width: 10 }} />
            <Button title="Create Role" loading={isCreating} onPress={handleCreateRole} style={styles.flex} />
          </View>
        }>
        <Input label="Role Name" required placeholder="e.g. Accountant, Librarian, Hostel Warden" value={newRoleName} onChangeText={setNewRoleName} />
        <CategoryPicker value={newRoleCategory} onChange={setNewRoleCategory} colors={colors} />
        <Text style={[styles.meta, { color: colors.textMuted }]}>Once created, you can immediately grant or restrict granular access per module.</Text>
      </SheetModal>

      {/* Rename */}
      <SheetModal
        visible={!!renameTarget} onClose={() => setRenameTarget(null)} title="Edit Role"
        footer={
          <View style={styles.footer}>
            <Button title="Cancel" variant="outline" onPress={() => setRenameTarget(null)} style={styles.flex} />
            <View style={{ width: 10 }} />
            <Button title="Save Changes" loading={isRenaming} onPress={handleRenameRole} style={styles.flex} />
          </View>
        }>
        <Input label="Role Name" required value={renameValue} onChangeText={setRenameValue} />
        <CategoryPicker value={renameCategory} onChange={setRenameCategory} colors={colors} />
        <Text style={[styles.meta, { color: colors.textMuted }]}>The category can only be changed while no user is assigned to this role.</Text>
      </SheetModal>

      {/* 409 conflict */}
      <SheetModal
        visible={conflict.open} onClose={() => setConflict((c) => ({ ...c, open: false }))} title="Cannot Delete Role (Assigned Users)"
        footer={<Button title="Understand" onPress={() => setConflict((c) => ({ ...c, open: false }))} />}>
        <View style={{ alignItems: 'center' }}>
          <View style={[styles.conflictIcon, { backgroundColor: colors.warningSoft }]}><AlertCircle size={24} color={colors.warning} /></View>
          <Text style={[styles.conflictMsg, { color: colors.text }]}>{conflict.message}</Text>
          <Text style={[styles.meta, { color: colors.textMuted, textAlign: 'center', marginTop: 8 }]}>
            There are currently <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>{conflict.count}</Text> user(s) assigned to this custom role.
          </Text>
        </View>
        <View style={[styles.tip, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
          <Info size={15} color={colors.primary} />
          <Text style={[styles.meta, { color: colors.textMuted, flex: 1, marginLeft: 8, marginTop: 0 }]}>
            Please reassign these users to another role under HR & Staff or Student Directory before deleting this role.
          </Text>
        </View>
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  headIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold, letterSpacing: -0.4 },
  subtitle: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  actions: { flexDirection: 'row', marginBottom: 14 },
  label: { fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.8, marginBottom: 8 },
  loader: { minHeight: 140, alignItems: 'center', justifyContent: 'center' },
  errorCard: { alignItems: 'center', padding: 20 },
  roleCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 8, gap: 10 },
  roleAvatar: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roleName: { flexShrink: 1, fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  sysChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  sysText: { fontSize: 9, fontWeight: fontWeight.extrabold, letterSpacing: 0.5 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  meta: { fontSize: 11, marginTop: 2, lineHeight: 16 },
  roleActions: { flexDirection: 'row', gap: 4 },
  smallBtn: { padding: 6 },
  matrix: { marginTop: 14, padding: 14 },
  matrixHead: { flexDirection: 'row' },
  matrixTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  badgeRow: { flexDirection: 'row', marginTop: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  pillText: { fontSize: 11, fontWeight: fontWeight.bold },
  alert: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, padding: 12, marginTop: 12 },
  alertText: { flex: 1, fontSize: 11, lineHeight: 16 },
  alertLink: { fontSize: 11, fontWeight: fontWeight.bold, textDecorationLine: 'underline' },
  perm: { borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 10 },
  permHead: { flexDirection: 'row', alignItems: 'center' },
  permName: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  mono: { fontSize: 10, marginTop: 2 },
  switchGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  switchCell: { width: '50%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 12, paddingVertical: 2 },
  switchLabel: { fontSize: 12, fontWeight: fontWeight.medium },
  conflictIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  conflictMsg: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, textAlign: 'center', lineHeight: 20 },
  tip: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 16 },
  flex: { flex: 1 },
  footer: { flexDirection: 'row', marginTop: 6 },
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 16, padding: 4, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  tabText: { fontSize: 12, fontWeight: fontWeight.bold },
  tabDesc: { fontSize: 11, lineHeight: 16, marginTop: 8, marginBottom: 14 },
  catLabel: { fontSize: 13, fontWeight: fontWeight.bold, marginBottom: 8 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 8 },
  chipText: { fontSize: 12, fontWeight: fontWeight.bold },
  unlock: { fontSize: 10, fontWeight: fontWeight.bold, marginTop: 3 },
});