import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Clock, MessageSquareWarning, Plus } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { useComplaints } from '../../hooks/useComplaints';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/layout/ScreenHeader';
import { Badge } from '../../components/ui/Badge';
import type { BadgeTone } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatCard } from '../../components/ui/StatCard';
import { SheetModal } from '../../components/ui/SheetModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { fontSize, fontWeight } from '../../theme/typography';

const CATEGORIES = ['Infrastructure', 'IT & Equipment', 'Classroom Issues', 'HR & Workplace', 'Other'];
const PRIORITIES = ['Low', 'Medium', 'High'];
const EMPTY = { subject: '', category: 'Infrastructure', priority: 'Medium', description: '' };

const opts = (list: string[]) => list.map((v) => ({ value: v, label: v }));

/** Same colours as the web status pill: open = primary, resolved = green, anything else = amber. */
const statusTone = (status?: string): BadgeTone =>
  status === 'open' ? 'primary' : status === 'resolved' ? 'success' : 'warning';

/** Web: pages/teacher/TeacherComplaints.jsx (useComplaints -> GET/POST /complaints) */
export default function TeacherComplaintsScreen() {
  const { colors } = useTheme();
  const { items: complaints, isLoading, isCreating, createItem, refetch } = useComplaints();

  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const count = (s: string) => complaints.filter((c: any) => c.status === s).length;

  const set = (k: keyof typeof EMPTY) => (v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  const closeModal = () => {
    setOpen(false);
    setErrors({});
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!form.subject.trim()) e.subject = 'Subject is required';
    if (!form.description.trim()) e.description = 'Description is required';
    setErrors(e);
    if (Object.keys(e).length) return;

    try {
      await createItem(form);
      setOpen(false);
      setForm({ ...EMPTY });
    } catch {
      // error toast is shown by the hook
    }
  };

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
      }}>
      <PageHeader
        title="My Complaints"
        subtitle="Raise issues related to infrastructure, IT, or workplace concerns."
        action={<Button title="Raise Complaint" icon={Plus} onPress={() => setOpen(true)} />}
      />

      {/* Stats - teacher only sees their own */}
      <View style={styles.stats}>
        <StatCard title="My Open Tickets" value={count('open')} icon={MessageSquareWarning} tone="primary" square />
        <StatCard title="In Progress" value={count('in_progress')} icon={Clock} tone="warning" square />
        <StatCard title="Resolved" value={count('resolved')} icon={CheckCircle2} tone="success" square />
      </View>

      <Text style={[styles.heading, { color: colors.text }]}>My Complaint History</Text>

      {isLoading ? (
        <Loader label="Loading complaints..." />
      ) : complaints.length === 0 ? (
        <Card>
          <EmptyState
            icon={MessageSquareWarning}
            title="No Complaints Filed"
            message={'You haven\'t filed any complaints yet. Use the "Raise Complaint" button to report an issue to administration.'}
          />
        </Card>
      ) : (
        complaints.map((c: any) => (
          <Card key={c.id} style={styles.card}>
            <View style={styles.top}>
              <Text style={[styles.subject, { color: colors.text }]} numberOfLines={2}>
                {c.subject}
              </Text>
              <Badge label={String(c.status || '').toUpperCase()} tone={statusTone(c.status)} small />
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.meta, { color: colors.textMuted }]}>{c.category}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}
              </Text>
            </View>
          </Card>
        ))
      )}

      <SheetModal
        visible={open}
        onClose={closeModal}
        title="Raise a Complaint"
        tall
        footer={
          <View style={styles.footerRow}>
            <View style={styles.flex}>
              <Button title="Cancel" variant="outline" onPress={closeModal} />
            </View>
            <View style={styles.flex}>
              <Button title="Submit Complaint" loading={isCreating} onPress={submit} />
            </View>
          </View>
        }>
        <Input
          label="Subject"
          required
          placeholder="Brief title of your issue"
          value={form.subject}
          onChangeText={set('subject')}
          error={errors.subject}
        />
        <Select label="Category" value={form.category} options={opts(CATEGORIES)} onChange={set('category')} />
        <Select label="Priority" value={form.priority} options={opts(PRIORITIES)} onChange={set('priority')} />
        <Input
          label="Description"
          required
          multiline
          placeholder="Describe the issue in detail..."
          value={form.description}
          onChangeText={set('description')}
          error={errors.description}
        />
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 4, marginBottom: 16 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  heading: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, marginBottom: 12 },
  card: { marginBottom: 12 },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  subject: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  meta: { fontSize: fontSize.sm },
  footerRow: { flexDirection: 'row', gap: 12 },
});