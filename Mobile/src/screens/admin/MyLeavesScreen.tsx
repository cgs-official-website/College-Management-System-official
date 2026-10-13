import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Clock, Send } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge, toneForStatus } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

const LEAVE_TYPES = ['Sick Leave', 'Other'];
const emptyForm = { leaveType: 'Sick Leave', fromDate: '', toDate: '', reason: '' };
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());

/** Web: pages/teacher/TeacherMyLeaves.jsx (admin "MyLeaves" module) */
export default function MyLeavesScreen() {
  const { colors } = useTheme();
  const [form, setForm] = useState({ ...emptyForm });
  const [leaves, setLeaves] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/leaves/my');
      const raw = res?.data ?? [];
      setLeaves(Array.isArray(raw) ? raw : []);
    } catch {
      /* keep previous */
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async () => {
    if (!form.fromDate || !form.toDate || !form.reason.trim()) { toast.error('Please complete all leave fields'); return; }
    if (!isDate(form.fromDate) || !isDate(form.toDate)) { toast.error('Use date format YYYY-MM-DD'); return; }
    if (form.toDate < form.fromDate) { toast.error('To date cannot be before from date'); return; }
    setIsSubmitting(true);
    try {
      await api.post('/leaves/staff', form);
      toast.success('Leave application submitted to admin!');
      setForm({ ...emptyForm });
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit leave application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fmt = (d: string) => new Date(d).toLocaleDateString();

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => { setIsRefreshing(true); await load(); setIsRefreshing(false); }}>
      <Text style={[styles.title, { color: colors.text }]}>My Leaves</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Apply for leave. Your request goes to the admin for approval.</Text>

      <Card style={styles.formCard}>
        <Text style={[styles.heading, { color: colors.text }]}>Apply for Leave</Text>
        <Select label="Leave Category" value={form.leaveType} onChange={(v) => setForm({ ...form, leaveType: v })} options={LEAVE_TYPES.map((t) => ({ value: t, label: t }))} />
        <Input
          label="From Date (YYYY-MM-DD)" required placeholder="2026-10-15" value={form.fromDate}
          onChangeText={(v) => setForm((p) => ({ ...p, fromDate: v, toDate: p.toDate && p.toDate < v ? '' : p.toDate }))}
        />
        <Input label="To Date (YYYY-MM-DD)" required placeholder="2026-10-16" value={form.toDate} onChangeText={(v) => setForm({ ...form, toDate: v })} />
        <Input label="Reason Description" required multiline placeholder="Provide details regarding your leave..." value={form.reason} onChangeText={(v) => setForm({ ...form, reason: v })} />
        <Button title="Submit Application" icon={Send} loading={isSubmitting} onPress={submit} />
      </Card>

      <View style={styles.histHead}>
        <Text style={[styles.heading, { color: colors.text }]}>Leave Applications</Text>
        <Badge label={String(leaves.length)} tone="primary" />
      </View>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : leaves.length === 0 ? (
        <EmptyState icon={Clock} title="No Leave History" message="Your submitted leaves will appear here." />
      ) : (
        leaves.map((l: any) => {
          const status = (l.status || 'pending').toLowerCase();
          return (
            <Card key={l.id} style={styles.leaveCard}>
              <View style={styles.leaveTop}>
                <Text style={[styles.leaveType, { color: colors.text }]} numberOfLines={1}>{l.leaveType || 'Leave'}{l.roleName ? ` • ${l.roleName}` : ''}</Text>
                <Badge label={status.toUpperCase()} tone={toneForStatus(status)} small />
              </View>
              <Text style={[styles.dates, { color: colors.primary }]}>{fmt(l.fromDate)} - {fmt(l.toDate)}</Text>
              <Text style={[styles.reason, { color: colors.textMuted }]}>{l.reason}</Text>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, marginTop: 3, marginBottom: 14, lineHeight: 19 },
  formCard: { padding: 14, marginBottom: 16 },
  heading: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold, marginBottom: 10 },
  histHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  loader: { minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  leaveCard: { padding: 14, marginBottom: 10 },
  leaveTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  leaveType: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.extrabold, marginRight: 8 },
  dates: { fontSize: 12, fontWeight: fontWeight.bold, marginTop: 6 },
  reason: { fontSize: 12, lineHeight: 18, marginTop: 4 },
});