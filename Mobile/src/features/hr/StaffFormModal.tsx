import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SheetModal } from '../../components/ui/SheetModal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useTheme } from '../../contexts/ThemeContext';
import { useDepartments } from '../../hooks/useDepartments';
import { api } from '../../api/client';
import { fontSize, fontWeight } from '../../theme/typography';

const today = () => new Date().toISOString().split('T')[0];
const emptyForm = () => ({
  firstName: '', lastName: '', email: '', phone: '', teacherId: '',
  staffType: 'teaching', customRoleId: '', departmentId: '', joinDate: today(), status: 'active',
});

/** Web: pages/admin/hr/StaffFormModal.jsx */
export function StaffFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }: any) {
  const { colors } = useTheme();
  const { departments } = useDepartments();
  const [roles, setRoles] = useState<any[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [v, setV] = useState<any>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setV(
      initialData
        ? {
            ...emptyForm(),
            ...initialData,
            teacherId: initialData.teacherId || '',
            customRoleId: initialData.customRoleId || '',
            departmentId: initialData.departmentId || '',
            joinDate: initialData.joinDate ? String(initialData.joinDate).slice(0, 10) : today(),
            staffType: initialData.staffType === 'non-teaching' || initialData.role === 'staff' ? 'non-teaching' : 'teaching',
          }
        : emptyForm(),
    );
    setRolesLoading(true);
    api
      .get<any>('/roles')
      .then((res) => setRoles(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setRolesLoading(false));
  }, [isOpen, initialData]);

  const set = (k: string) => (x: string) => setV((p: any) => ({ ...p, [k]: x }));

  // Roles are per category (backend rejects a teaching role on non-teaching staff and vice versa)
  const wantedCategory = v.staffType === 'non-teaching' ? 'non_teaching' : 'teaching';
  // If the server sends no role.category (older backend), do not filter - show every role
  const categorySupported = roles.some((r) => r.category === 'teaching' || r.category === 'non_teaching');
  const roleOptions = categorySupported
    ? roles.filter((r) => (r.category === 'teaching' ? 'teaching' : 'non_teaching') === wantedCategory)
    : roles;
  const changeStaffType = (x: string) =>
    setV((p: any) => {
      const next = x === 'non-teaching' ? 'non_teaching' : 'teaching';
      const current = roles.find((r) => r.id === p.customRoleId);
      const stillValid = !current || !categorySupported || (current.category === 'teaching' ? 'teaching' : 'non_teaching') === next;
      return { ...p, staffType: x, customRoleId: stillValid ? p.customRoleId : '' };
    });

  const submit = () => {
    const e: Record<string, string> = {};
    if (!String(v.teacherId || '').trim()) e.teacherId = v.staffType === 'non-teaching' ? 'Staff ID is required.' : 'Teacher ID is required.';
    if (v.staffType === 'non-teaching' && !v.customRoleId) e.customRoleId = 'Role is required for non-teaching staff.';
    if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = 'Please enter a valid email address.';
    if (v.phone && !/^[0-9]{10}$/.test(v.phone)) e.phone = 'Phone number must be exactly 10 digits.';
    if (v.staffType === 'teaching' && !v.departmentId) e.departmentId = 'Department is required for teaching staff';
    setErrors(e);
    if (Object.keys(e).length) return;

    const isNonTeaching = v.staffType === 'non-teaching';
    const selectedRole = roles.find((r) => r.id === v.customRoleId);
    // Teaching role named "HOD" makes the account an HOD; any other choice returns it to teacher (faculty stays faculty)
    const isHodRole = !isNonTeaching && String(selectedRole?.name || '').trim().toLowerCase() === 'hod';
    const teachingRole = isHodRole ? 'hod' : initialData?.role === 'faculty' ? 'faculty' : 'teacher';
    const payload: any = {
      ...v,
      role: isNonTeaching ? 'staff' : teachingRole,
      name: `${v.firstName} ${v.lastName}`.trim(),
      designation: selectedRole ? selectedRole.name : isNonTeaching ? 'Staff' : 'Teacher',
      customRoleId: v.customRoleId || null,
      teacherId: String(v.teacherId).trim(),
    };
    if (isNonTeaching) delete payload.departmentId;
    onSubmit(payload);
  };

  const section = (n: string, title: string) => (
    <View style={styles.sectionHead}>
      <View style={[styles.sectionNum, { backgroundColor: colors.primarySoft }]}>
        <Text style={{ color: colors.primary, fontSize: 11, fontWeight: fontWeight.extrabold }}>{n}</Text>
      </View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      <Button title="Cancel" variant="outline" onPress={onClose} style={styles.flex} />
      <View style={{ width: 10 }} />
      <Button title={initialData ? 'Save Changes' : 'Add Staff Member'} loading={isLoading} onPress={submit} style={styles.flex} />
    </View>
  );

  return (
    <SheetModal visible={isOpen} onClose={onClose} title={initialData ? 'Edit Staff Member' : 'Add New Staff Member'} tall footer={footer}>
      {section('1', 'Personal Details')}
      <Input label="First Name (Optional)" placeholder="e.g. Robert" value={v.firstName} onChangeText={set('firstName')} />
      <Input label="Last Name (Optional)" placeholder="e.g. Oppenheimer" value={v.lastName} onChangeText={set('lastName')} />
      <Input
        label="Email Address (optional)" placeholder="Leave blank, teacher will enter their own" value={v.email}
        onChangeText={set('email')} keyboardType="email-address" autoCapitalize="none" error={errors.email}
      />
      <Input
        label="Phone Number" placeholder="e.g. 9876543210" value={v.phone} keyboardType="number-pad" maxLength={10}
        onChangeText={(x) => set('phone')(x.replace(/\D/g, '').slice(0, 10))} error={errors.phone}
      />
      <Input
        label={v.staffType === 'non-teaching' ? 'Staff ID' : 'Teacher ID'} required
        placeholder={v.staffType === 'non-teaching' ? 'e.g. STF001' : 'e.g. TCH001'}
        value={v.teacherId} onChangeText={set('teacherId')} autoCapitalize="characters" error={errors.teacherId}
      />

      {section('2', 'Employment Details')}
      <Select
        label="Staff Category" value={v.staffType} onChange={changeStaffType}
        options={[{ value: 'teaching', label: 'Teaching Staff' }, { value: 'non-teaching', label: 'Non-Teaching Staff' }]}
      />
      {v.staffType === 'non-teaching' ? (
        <>
          <Select
            label="Role" required value={v.customRoleId} onChange={set('customRoleId')}
            placeholder={rolesLoading ? 'Loading roles...' : 'Select a Role'} disabled={rolesLoading}
            options={roleOptions.map((r) => ({ value: r.id, label: r.name }))} error={errors.customRoleId}
          />
          {!rolesLoading && roleOptions.length === 0 ? (
            <Text style={{ color: colors.warning, fontSize: 12, marginTop: -6, marginBottom: 12 }}>
              No roles yet. Create one in Roles & Permissions.
            </Text>
          ) : null}
        </>
      ) : (
        <Select
          label="Role / Designation" value={v.customRoleId} onChange={set('customRoleId')} placeholder="Teacher (Standard)"
          options={[{ value: '', label: 'Teacher (Standard)' }, ...roleOptions.map((r) => ({ value: r.id, label: r.name }))]}
        />
      )}
      {v.staffType === 'teaching' ? (
        <Select
          label="Department" required value={v.departmentId} onChange={set('departmentId')} placeholder="Select a Department"
          options={(departments || []).map((d: any) => ({ value: d.id, label: d.name }))} error={errors.departmentId}
        />
      ) : null}
      <Input label="Join Date (YYYY-MM-DD)" value={v.joinDate} onChangeText={set('joinDate')} placeholder="2026-01-31" />
      <Select
        label="Status" value={v.status} onChange={set('status')}
        options={[
          { value: 'active', label: 'Active / Employed' },
          { value: 'on_leave', label: 'On Leave' },
          { value: 'resigned', label: 'Resigned / Inactive' },
        ]}
      />
    </SheetModal>
  );
}

export default StaffFormModal;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { flexDirection: 'row', marginTop: 6 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 10 },
  sectionNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold, textTransform: 'uppercase', letterSpacing: 0.6 },
});