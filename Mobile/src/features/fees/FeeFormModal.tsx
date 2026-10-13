import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SheetModal } from '../../components/ui/SheetModal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../contexts/AuthContext';
import { useStudents } from '../../hooks/useStudents';

const today = () => new Date().toISOString().split('T')[0];
const blank = () => ({ studentId: '', feeType: 'Tuition Fee', amount: '', dueDate: today(), status: 'pending', paymentMethod: '' });

const studentName = (s: any) => s?.name || `${s?.firstName || ''} ${s?.lastName || ''}`.trim() || s?.email || 'Student';
const classOf = (s: any) => (s?.class ? `${s.class}${s.section ? `-${s.section}` : ''}` : s?.gradeClass || '');

/** Web: pages/admin/fees/FeeFormModal.jsx */
export function FeeFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }: any) {
  const { userData } = useAuth();
  const { students } = useStudents(userData?.collegeId || 'default_college_id');
  const [v, setV] = useState<any>(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setV(initialData ? { ...blank(), ...initialData, amount: String(initialData.amount ?? ''), dueDate: String(initialData.dueDate || today()).slice(0, 10), paymentMethod: initialData.paymentMethod || '' } : blank());
  }, [isOpen, initialData]);

  const set = (k: string) => (x: string) => setV((p: any) => ({ ...p, [k]: x }));

  const studentOptions = useMemo(
    () => (students || []).map((s: any) => ({ value: s.id, label: `${studentName(s)}${classOf(s) ? ` (Class ${classOf(s)})` : ''}` })),
    [students],
  );

  const submit = () => {
    const e: Record<string, string> = {};
    if (!v.studentId) e.studentId = 'Student is required';
    if (!String(v.amount).trim() || !(Number(v.amount) > 0)) e.amount = 'Amount is required';
    if (!v.dueDate) e.dueDate = 'Due date is required';
    setErrors(e);
    if (Object.keys(e).length) return;

    const selected = (students || []).find((s: any) => s.id === v.studentId);
    const amount = Number(v.amount);
    onSubmit({
      ...v,
      amount,
      amountDue: amount,
      amountPaid: v.status === 'paid' ? amount : initialData?.amountPaid || 0,
      studentName: selected ? studentName(selected) : initialData?.studentName || 'Student',
      studentClass: selected ? classOf(selected) : initialData?.studentClass || '',
    });
  };

  const footer = (
    <View style={styles.footer}>
      <Button title="Cancel" variant="outline" onPress={onClose} style={styles.flex} />
      <View style={{ width: 10 }} />
      <Button title={initialData ? 'Update Record' : 'Create Record'} loading={isLoading} onPress={submit} style={styles.flex} />
    </View>
  );

  return (
    <SheetModal visible={isOpen} onClose={onClose} title={initialData ? 'Edit Fee Record' : 'Create Fee Record'} tall footer={footer}>
      <Select label="Select Student" required value={v.studentId} onChange={set('studentId')} options={studentOptions} placeholder="Search and select student..." searchable error={errors.studentId} />
      <Select
        label="Fee Type" value={v.feeType} onChange={set('feeType')}
        options={['Tuition Fee', 'Hostel Fee', 'Transport Fee', 'Library Fee', 'Exam Fee', 'Miscellaneous'].map((x) => ({ value: x, label: x }))}
      />
      <Input label="Amount (₹)" required placeholder="e.g. 50000" value={String(v.amount)} onChangeText={(x) => set('amount')(x.replace(/[^0-9.]/g, ''))} keyboardType="decimal-pad" error={errors.amount} />
      <Input label="Due Date (YYYY-MM-DD)" required placeholder="2026-01-31" value={v.dueDate} onChangeText={set('dueDate')} error={errors.dueDate} />
      <Select
        label="Status" value={v.status} onChange={set('status')}
        options={[{ value: 'pending', label: 'Pending' }, { value: 'paid', label: 'Paid' }, { value: 'overdue', label: 'Overdue' }]}
      />
      <Select
        label="Payment Method" value={v.paymentMethod} onChange={set('paymentMethod')} placeholder="Not Paid"
        options={[
          { value: '', label: 'Not Paid' }, { value: 'Cash', label: 'Cash' }, { value: 'Bank Transfer', label: 'Bank Transfer' },
          { value: 'Credit Card', label: 'Credit Card' }, { value: 'UPI', label: 'UPI' },
        ]}
      />
    </SheetModal>
  );
}

export default FeeFormModal;

const styles = StyleSheet.create({ flex: { flex: 1 }, footer: { flexDirection: 'row', marginTop: 6 } });