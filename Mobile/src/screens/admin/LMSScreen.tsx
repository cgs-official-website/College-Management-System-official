import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Award, BookOpen, Film, PlayCircle, Video } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { SheetModal } from '../../components/ui/SheetModal';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

const BATCH_OPTIONS = ['B.Tech Computer Science - Year 3', 'BBA Marketing - Year 2', 'MCA - Year 1'].map((x) => ({ value: x, label: x }));
const blank = () => ({ title: '', datetime: '', duration: '60', batch: BATCH_OPTIONS[0].value });

/** Web: pages/admin/lms/LMSDashboard.jsx  (client-side only on web too - no backend endpoints) */
export default function LMSScreen() {
  const { colors } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [upcomingClasses, setUpcomingClasses] = useState<any[]>([]);
  const [form, setForm] = useState<any>(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: string) => (x: string) => { setForm((p: any) => ({ ...p, [k]: x })); setErrors((p) => ({ ...p, [k]: '' })); };

  const handleScheduleClass = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Class title is required';
    const parsed = new Date(form.datetime.trim().replace(' ', 'T'));
    if (!form.datetime.trim() || isNaN(parsed.getTime())) e.datetime = 'Use format YYYY-MM-DD HH:mm';
    if (!form.duration) e.duration = 'Duration is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    setUpcomingClasses([{ title: form.title.trim(), datetime: parsed.toISOString(), duration: form.duration, batch: form.batch }, ...upcomingClasses]);
    toast.success('Live class scheduled successfully!');
    setIsModalOpen(false);
    setForm(blank());
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Learning Management</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Manage digital learning, live classes, and resources.</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button title="Schedule Live Class" size="sm" fullWidth={false} icon={Video} onPress={() => { setForm(blank()); setErrors({}); setIsModalOpen(true); }} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCell}><StatCard compact title="Active Modules" value="0" icon={BookOpen} tone="primary" /></View>
        <View style={{ width: 8 }} />
        <View style={styles.statCell}><StatCard compact title="Live Sessions Today" value="0" icon={Video} tone="primary" /></View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCell}><StatCard compact title="Video Hours Viewed" value="0" icon={Film} tone="primary" /></View>
        <View style={{ width: 8 }} />
        <View style={styles.statCell}><StatCard compact title="Certificates Issued" value="0" icon={Award} tone="primary" /></View>
      </View>

      <Card style={styles.card}>
        <Text style={[styles.section, { color: colors.text }]}>Upcoming Live Classes</Text>
        {upcomingClasses.length === 0 ? (
          <EmptyState icon={Video} title="No Upcoming Classes" message='There are no live classes scheduled for today. Tap "Schedule Live Class" to create one.' />
        ) : (
          upcomingClasses.map((cls, i) => (
            <View key={i} style={[styles.classRow, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <View style={[styles.playIcon, { backgroundColor: colors.primarySoft }]}><PlayCircle size={20} color={colors.primary} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.className, { color: colors.text }]} numberOfLines={1}>{cls.title}</Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>{cls.datetime ? new Date(cls.datetime).toLocaleString() : 'No date'} • {cls.duration} mins • {cls.batch}</Text>
              </View>
            </View>
          ))
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={[styles.section, { color: colors.text }]}>Recent Videos</Text>
        <EmptyState icon={Film} title="No videos uploaded yet" />
      </Card>

      <SheetModal
        visible={isModalOpen} onClose={() => setIsModalOpen(false)} title="Schedule Live Class" tall
        footer={
          <View style={styles.footer}>
            <Button title="Cancel" variant="outline" onPress={() => setIsModalOpen(false)} style={styles.flex} />
            <View style={{ width: 10 }} />
            <Button title="Schedule Class" onPress={handleScheduleClass} style={styles.flex} />
          </View>
        }>
        <Input label="Class Topic / Title" required placeholder="e.g. Introduction to React Hooks" value={form.title} onChangeText={set('title')} error={errors.title} />
        <Input label="Date & Time (YYYY-MM-DD HH:mm)" required placeholder="2026-01-31 10:30" value={form.datetime} onChangeText={set('datetime')} error={errors.datetime} />
        <Input label="Duration (Mins)" required keyboardType="number-pad" value={String(form.duration)} onChangeText={(x) => set('duration')(x.replace(/[^0-9]/g, ''))} error={errors.duration} />
        <Select label="Assigned Batch" value={form.batch} onChange={set('batch')} options={BATCH_OPTIONS} />
        <Input label="Meeting Link (Auto-generated)" value="https://meet.google.com/mock-link-123" editable={false} />
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, marginTop: 3, lineHeight: 19 },
  actions: { flexDirection: 'row', marginBottom: 12 },
  statsRow: { flexDirection: 'row', marginBottom: 8 },
  statCell: { flex: 1 },
  card: { marginTop: 8, padding: 14 },
  section: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, marginBottom: 6 },
  classRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 10 },
  playIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  className: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  meta: { fontSize: 11, marginTop: 3, lineHeight: 16 },
  flex: { flex: 1 },
  footer: { flexDirection: 'row', marginTop: 6 },
});