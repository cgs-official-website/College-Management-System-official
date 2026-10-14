import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Clock, FolderKanban, Plus } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { useProjects } from '../../hooks/useProjects';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/layout/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatCard } from '../../components/ui/StatCard';
import { SheetModal } from '../../components/ui/SheetModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

const todayStr = () => new Date().toISOString().split('T')[0];
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
const blank = () => ({ projectId: '', date: todayStr(), hoursSpent: '', activityDescription: '' });

/** Web: pages/teacher/ProjectTimesheetDashboard.jsx (useProjects -> /projects, /projects/timesheets) */
export default function ProjectTimesheetScreen() {
  const { colors } = useTheme();
  const { projects, timesheets, isLoading, isLogging, logHours, refetch } = useProjects();

  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalHours = timesheets.reduce((acc: number, t: any) => acc + (Number(t.hoursSpent) || 0), 0);
  const active = projects.filter((p: any) => p.status === 'active').length;
  const completed = projects.filter((p: any) => p.status === 'completed').length;

  const set = (k: keyof ReturnType<typeof blank>) => (v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  const closeModal = () => {
    setOpen(false);
    setErrors({});
  };

  const submit = async () => {
    const e: Record<string, string> = {};
    const hours = Number(form.hoursSpent);
    if (!form.projectId) e.projectId = 'Select a project';
    if (!isDate(form.date)) e.date = 'Use YYYY-MM-DD';
    if (!form.hoursSpent) e.hoursSpent = 'Required';
    else if (!(hours >= 0.5 && hours <= 24)) e.hoursSpent = '0.5 - 24';
    if (!form.activityDescription.trim()) e.activityDescription = 'Describe what you worked on';
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error('Please fix the highlighted fields');
      return;
    }

    try {
      await logHours({ ...form, hoursSpent: hours });
      setOpen(false);
      setForm(blank());
    } catch {
      // toast shown by the hook
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
        title="Project Timesheet"
        subtitle="Allocate your worked hours to specific academic projects."
        action={
          <Button
            title="Log Project Hours"
            icon={Plus}
            onPress={() => {
              setForm(blank());
              setOpen(true);
            }}
          />
        }
      />

      <View style={styles.stats}>
        <StatCard title="Active Projects" value={active} icon={FolderKanban} tone="primary" square />
        <StatCard title="Total Logged Hours" value={totalHours} icon={Clock} tone="warning" square />
        <StatCard title="Completed Projects" value={completed} icon={CheckCircle2} tone="success" square />
      </View>

      <Text style={[styles.heading, { color: colors.text }]}>Recent Timesheets</Text>

      {isLoading ? (
        <Loader label="Loading timesheets..." />
      ) : timesheets.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title="No Hours Logged"
            message="Once you log hours to academic projects, they will appear here."
          />
        </Card>
      ) : (
        timesheets.map((t: any) => (
          <Card key={t.id} style={styles.card}>
            <View style={styles.top}>
              <Text style={[styles.project, { color: colors.text }]} numberOfLines={2}>
                {t.project?.name || 'Project'}
              </Text>
              <Text style={[styles.hours, { color: colors.primary }]}>{t.hoursSpent} h</Text>
            </View>
            <Text style={[styles.date, { color: colors.textMuted }]}>
              {t.date ? new Date(t.date).toLocaleDateString() : ''}
            </Text>
            {t.activityDescription ? (
              <Text style={[styles.desc, { color: colors.textMuted }]} numberOfLines={3}>
                {t.activityDescription}
              </Text>
            ) : null}
          </Card>
        ))
      )}

      <SheetModal
        visible={open}
        onClose={closeModal}
        title="Log Project Hours"
        tall
        footer={
          <View style={styles.footerRow}>
            <View style={styles.flex}>
              <Button title="Cancel" variant="outline" onPress={closeModal} />
            </View>
            <View style={styles.flex}>
              <Button title="Submit Hours" loading={isLogging} onPress={submit} />
            </View>
          </View>
        }>
        <Select
          label="Project"
          required
          value={form.projectId}
          options={projects.map((p: any) => ({ value: String(p.id), label: String(p.name) }))}
          onChange={set('projectId')}
          placeholder="Select a Project"
          error={errors.projectId}
        />
        <View style={styles.footerRow}>
          <View style={styles.flex}>
            <Input
              label="Date"
              required
              placeholder="2026-10-13"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              value={form.date}
              onChangeText={set('date')}
              error={errors.date}
            />
          </View>
          <View style={styles.flex}>
            <Input
              label="Hours Spent"
              required
              placeholder="e.g. 2.5"
              keyboardType="decimal-pad"
              maxLength={4}
              value={form.hoursSpent}
              onChangeText={(v) => set('hoursSpent')(v.replace(/[^0-9.]/g, ''))}
              error={errors.hoursSpent}
            />
          </View>
        </View>
        <Input
          label="Activity Description"
          required
          multiline
          placeholder="What did you work on?"
          value={form.activityDescription}
          onChangeText={set('activityDescription')}
          error={errors.activityDescription}
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
  project: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  hours: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  date: { fontSize: fontSize.sm, marginTop: 4 },
  desc: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 8 },
  footerRow: { flexDirection: 'row', gap: 12 },
});