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
            staffType: initialData.staffType || (initialData.departmentId ? 'teaching' : 'non-teaching'),
          }
        : emptyForm(),
    );
    api.get<any>('/roles').then((res) => setRoles(Array.isArray(res?.data) ? res.data : [])).catch(() => {});
  }, [isOpen, initialData]);

  const set = (k: string) => (x: string) => setV((p: any) => ({ ...p, [k]: x }));

  const submit = () => {
    const e: Record<string, string> = {};
    if (!String(v.teacherId || '').trim()) e.teacherId = 'Teacher ID is required.';
    if (v.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = 'Please enter a valid email address.';
    if (v.phone && !/^[0-9]{10}$/.test(v.phone)) e.phone = 'Phone number must be exactly 10 digits.';
    if (v.staffType === 'teaching' && !v.departmentId) e.departmentId = 'Department is required for teaching staff';
    setErrors(e);
    if (Object.keys(e).length) return;

    const selectedRole = roles.find((r) => r.id === v.customRoleId);
    const payload: any = {
      ...v,
      role: v.staffType === 'non-teaching' ? 'staff' : 'teacher',
      name: `${v.firstName} ${v.lastName}`.trim(),
      designation: selectedRole ? selectedRole.name : 'Staff',
      customRoleId: v.customRoleId || null,
      teacherId: String(v.teacherId).trim(),
    };
    if (v.staffType === 'non-teaching') delete payload.departmentId;
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
      <Input label="Teacher ID" required placeholder="e.g. TCH001" value={v.teacherId} onChangeText={set('teacherId')} autoCapitalize="characters" error={errors.teacherId} />

      {section('2', 'Employment Details')}
      <Select
        label="Staff Category" value={v.staffType} onChange={set('staffType')}
        options={[{ value: 'teaching', label: 'Teaching Staff' }, { value: 'non-teaching', label: 'Non-Teaching Staff' }]}
      />
      <Select
        label="Role / Designation" value={v.customRoleId} onChange={set('customRoleId')} placeholder="Standard Staff (No special permissions)"
        options={[{ value: '', label: 'Standard Staff (No special permissions)' }, ...roles.map((r) => ({ value: r.id, label: r.name }))]}
      />
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