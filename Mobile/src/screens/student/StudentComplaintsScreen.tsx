import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Clock, MessageSquareWarning, Plus } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SheetModal } from '../../components/ui/SheetModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { useStudentComplaints } from '../../hooks/useStudentPortal';
import { toast } from '../../utils/toast';
import { formatDate, titleCase } from '../../utils/format';
import { fontSize, fontWeight } from '../../theme/typography';

const CATEGORIES = ['Academics', 'Hostel', 'Infrastructure', 'IT & WiFi', 'Canteen / Food', 'Transport', 'Other'].map((c) => ({
  label: c,
  value: c,
}));
const PRIORITIES = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const emptyForm = { subject: '', category: 'Academics', priority: 'medium', description: '' };

const statusTone = (s?: string): BadgeTone =>
  s === 'resolved' || s === 'closed' ? 'success' : s === 'in_progress' ? 'warning' : 'primary';

/** Web: pages/student/StudentComplaints.jsx */
export default function StudentComplaintsScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isRefreshing, refetch, createComplaint, isCreating } = useStudentComplaints();
  const complaints: any[] = Array.isArray(data) ? data : [];

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const openTickets = complaints.filter((c) => c.status === 'open').length;
  const inProgress = complaints.filter((c) => c.status === 'in_progress').length;
  const resolved = complaints.filter((c) => c.status === 'resolved' || c.status === 'closed').length;

  const close = () => {
    if (isCreating) return;
    setOpen(false);
    setForm(emptyForm);
  };

  const submit = async () => {
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error('Please enter a subject and description');
      return;
    }
    try {
      await createComplaint({ ...form, subject: form.subject.trim(), description: form.description.trim() });
      setOpen(false);
      setForm(emptyForm);
    } catch {
      // toast already shown by the hook
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefreshing} onRefresh={refetch}>
      <Text style={[styles.title, { color: colors.text }]}>Grievances & Complaints</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Raise academic or campus support tickets and track resolution progress.
      </Text>

      <Button title="Raise Complaint" icon={Plus} onPress={() => setOpen(true)} style={{ marginBottom: 16 }} />

      {isLoading ? (
        <Loader label="Loading tickets..." />
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard compact title="Open Tickets" value={openTickets} icon={MessageSquareWarning} tone="primary" />
            <StatCard compact title="In Progress" value={inProgress} icon={Clock} tone="warning" />
            <StatCard compact title="Resolved" value={resolved} icon={CheckCircle2} tone="success" />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>My Grievance Tickets</Text>
            <Badge label={`${complaints.length} Total`} tone="neutral" />
          </View>

          {complaints.length === 0 ? (
            <EmptyState
              icon={MessageSquareWarning}
              title="No Complaints Filed"
              message={'You haven\'t filed any support grievances yet. Tap "Raise Complaint" if you need administrative assistance.'}
              actionLabel="Raise Complaint"
              onAction={() => setOpen(true)}
            />
          ) : (
            complaints.map((c) => (
              <Card key={c.id} style={styles.card}>
                <View style={styles.topRow}>
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                    {c.subject}
                  </Text>
                  <Badge label={String(c.status || 'open').replace('_', ' ').toUpperCase()} tone={statusTone(c.status)} small />
                </View>
                {c.category ? (
                  <View style={{ marginTop: 6 }}>
                    <Badge label={c.category} tone="neutral" small />
                  </View>
                ) : null}
                <Text style={[styles.desc, { color: colors.textMuted }]}>{c.description}</Text>
                <View style={[styles.footer, { borderTopColor: colors.border }]}>
                  <Text style={[styles.meta, { color: colors.textSubtle }]}>Submitted: {formatDate(c.createdAt)}</Text>
                  <Text style={[styles.meta, { color: colors.text, fontWeight: fontWeight.bold }]}>
                    Priority: {titleCase(c.priority)}
                  </Text>
                </View>
              </Card>
            ))
          )}
        </>
      )}

      <SheetModal
        visible={open}
        onClose={close}
        title="Raise a Complaint"
        tall
        footer={
          <View style={styles.footerBtns}>
            <Button title="Cancel" variant="outline" fullWidth={false} onPress={close} disabled={isCreating} />
            <Button title="Submit Grievance" loading={isCreating} onPress={submit} style={{ flex: 1 }} />
          </View>
        }>
        <Input
          label="Subject"
          required
          value={form.subject}
          onChangeText={(t) => setForm({ ...form, subject: t })}
          placeholder="Brief title of your grievance"
        />
        <Select
          label="Category"
          value={form.category}
          options={CATEGORIES}
          onChange={(v) => setForm({ ...form, category: v })}
        />
        <Select
          label="Priority"
          value={form.priority}
          options={PRIORITIES}
          onChange={(v) => setForm({ ...form, priority: v })}
        />
        <Input
          label="Description"
          required
          multiline
          value={form.description}
          onChangeText={(t) => setForm({ ...form, description: t })}
          placeholder="Describe the issue in detail..."
        />
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  subtitle: { fontSize: fontSize.sm, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginRight: 8 },
  card: { marginBottom: 12 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  desc: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 10 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
  meta: { fontSize: fontSize.xs },
  footerBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});