import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SheetModal } from '../../components/ui/SheetModal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useStaff } from '../../hooks/useStaff';
import { fontSize, fontWeight } from '../../theme/typography';

const NUM_KEYS = ['basicPay', 'hra', 'da', 'specialAllowance', 'pf', 'esi', 'pt', 'tds', 'otherDeductions'] as const;
const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));

const initialForm = () => ({
  staffId: '', month: String(new Date().getMonth() + 1), year: String(new Date().getFullYear()),
  basicPay: '0', hra: '0', da: '0', specialAllowance: '0', pf: '0', esi: '0', pt: '0', tds: '0', otherDeductions: '0',
});

const n = (x: any) => Number(x) || 0;
const inr = (x: number) => `₹${x.toFixed(2)}`;

/** Web: pages/admin/payroll/PayslipFormModal.jsx (same PF 12% / ESI 0.75% auto calc) */
export function PayslipFormModal({ isOpen, onClose, onSubmit, isLoading }: any) {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const { staff } = useStaff(userData?.collegeId);
  const [f, setF] = useState<any>(initialForm());

  useEffect(() => { if (isOpen) setF(initialForm()); }, [isOpen]);

  const change = (key: string) => (value: string) =>
    setF((prev: any) => {
      const next = { ...prev, [key]: key === 'staffId' || key === 'month' ? value : value.replace(/[^0-9.]/g, '') };
      if (['basicPay', 'hra', 'da', 'specialAllowance'].includes(key)) {
        const basic = n(next.basicPay);
        const gross = basic + n(next.hra) + n(next.da) + n(next.specialAllowance);
        next.pf = String(Math.round(basic * 0.12));
        next.esi = String(Math.round(gross * 0.0075));
      }
      return next;
    });

  const gross = n(f.basicPay) + n(f.hra) + n(f.da) + n(f.specialAllowance);
  const deductions = n(f.pf) + n(f.esi) + n(f.pt) + n(f.tds) + n(f.otherDeductions);
  const net = gross - deductions;

  const staffOptions = useMemo(
    () => (staff || []).map((s: any) => ({ value: s.userId || s.id, label: s.name ? `${s.name} (${s.email || 'Staff'})` : s.email || s.id })),
    [staff],
  );

  const submit = () => {
    if (!f.staffId) return;
    const payload: any = { staffId: f.staffId, month: n(f.month), year: n(f.year) };
    NUM_KEYS.forEach((k) => { payload[k] = n(f[k]); });
    onSubmit(payload);
  };

  const num = (label: string, key: string) => (
    <Input label={label} value={String(f[key])} onChangeText={change(key)} keyboardType="decimal-pad" />
  );
  const total = (label: string, value: string, tone?: string) => (
    <View style={[styles.total, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
      <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>{label}</Text>
      <Text style={{ color: tone || colors.text, fontSize: fontSize.md, fontWeight: fontWeight.extrabold }}>{value}</Text>
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      <Button title="Cancel" variant="outline" onPress={onClose} style={styles.flex} />
      <View style={{ width: 10 }} />
      <Button title="Create Payslip" loading={isLoading} disabled={!f.staffId} onPress={submit} style={styles.flex} />
    </View>
  );

  return (
    <SheetModal visible={isOpen} onClose={onClose} title="Create Payslip" tall footer={footer}>
      <Select label="Staff Member" required value={f.staffId} onChange={change('staffId')} options={staffOptions} placeholder="Select Staff Member" />
      <Select label="Month" required value={f.month} onChange={change('month')} options={monthOptions} />
      <Input label="Year" required value={String(f.year)} onChangeText={(x) => setF((p: any) => ({ ...p, year: x.replace(/\D/g, '').slice(0, 4) }))} keyboardType="number-pad" />

      <Text style={[styles.heading, { color: colors.text }]}>Earnings</Text>
      {num('Basic Pay', 'basicPay')}
      {num('HRA', 'hra')}
      {num('DA', 'da')}
      {num('Special Allowance', 'specialAllowance')}
      {total('Gross Pay', inr(gross))}

      <Text style={[styles.heading, { color: colors.text }]}>Deductions</Text>
      {num('PF', 'pf')}
      {num('ESI', 'esi')}
      {num('PT', 'pt')}
      {num('TDS', 'tds')}
      {num('Other Deductions', 'otherDeductions')}
      {total('Total Deductions', inr(deductions), colors.danger)}

      <View style={{ height: 8 }} />
      {total('Net Pay', inr(net), colors.primary)}
    </SheetModal>
  );
}

export default PayslipFormModal;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { flexDirection: 'row', marginTop: 6 },
  heading: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold, marginTop: 8, marginBottom: 8 },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 6 },
});