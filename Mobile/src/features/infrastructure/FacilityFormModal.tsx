import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SheetModal } from '../../components/ui/SheetModal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

const blank = () => ({ name: '', type: 'Classroom', capacity: '30', building: '', status: 'operational', features: '' });

/** Web: pages/admin/infrastructure/FacilityFormModal.jsx */
export function FacilityFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }: any) {
  const [v, setV] = useState<any>(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setV(
      initialData
        ? { ...blank(), ...initialData, capacity: String(initialData.capacity ?? ''), building: initialData.building || initialData.location || '', features: initialData.features || '' }
        : blank(),
    );
  }, [isOpen, initialData]);

  const set = (k: string) => (x: string) => setV((p: any) => ({ ...p, [k]: x }));

  const submit = () => {
    const e: Record<string, string> = {};
    if (!v.name.trim()) e.name = 'Name is required';
    if (!String(v.capacity).trim()) e.capacity = 'Capacity is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    onSubmit({ name: v.name.trim(), type: v.type, capacity: Number(v.capacity) || 0, building: v.building, status: v.status, features: v.features });
  };

  const footer = (
    <View style={styles.footer}>
      <Button title="Cancel" variant="outline" onPress={onClose} style={styles.flex} />
      <View style={{ width: 10 }} />
      <Button title={initialData ? 'Save Changes' : 'Register Facility'} loading={isLoading} onPress={submit} style={styles.flex} />
    </View>
  );

  return (
    <SheetModal visible={isOpen} onClose={onClose} title={initialData ? 'Edit Facility' : 'Register New Facility'} tall footer={footer}>
      <Input label="Facility Name / Room No." required placeholder="e.g. Main Auditorium" value={v.name} onChangeText={set('name')} error={errors.name} />
      <Select
        label="Facility Type" value={v.type} onChange={set('type')}
        options={[
          { value: 'Classroom', label: 'Classroom' }, { value: 'Laboratory', label: 'Laboratory' }, { value: 'Auditorium', label: 'Auditorium / Hall' },
          { value: 'Library', label: 'Library Section' }, { value: 'Sports', label: 'Sports Facility' }, { value: 'Other', label: 'Other' },
        ]}
      />
      <Input label="Seating Capacity" required value={String(v.capacity)} onChangeText={(x) => set('capacity')(x.replace(/\D/g, ''))} keyboardType="number-pad" error={errors.capacity} />
      <Input label="Building / Block" placeholder="e.g. Block A" value={v.building} onChangeText={set('building')} />
      <Select
        label="Operational Status" value={v.status} onChange={set('status')}
        options={[
          { value: 'operational', label: 'Operational (Available)' }, { value: 'maintenance', label: 'Under Maintenance' }, { value: 'closed', label: 'Closed / Inactive' },
        ]}
      />
      <Input label="Special Features (Optional)" placeholder="e.g. Projector, AC, Sound System" value={v.features} onChangeText={set('features')} />
    </SheetModal>
  );
}

export default FacilityFormModal;

const styles = StyleSheet.create({ flex: { flex: 1 }, footer: { flexDirection: 'row', marginTop: 6 } });