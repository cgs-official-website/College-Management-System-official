import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, Clock, Edit2, Layers, MapPin, Plus, Trash2, User } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTimetable } from '../../hooks/useTimetable';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { useConfirm } from '../../contexts/ConfirmContext';
import TimetableFormModal from '../../features/timetable/TimetableFormModal';
import { fontSize, fontWeight } from '../../theme/typography';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetableScreen() {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { schedules, isLoading, addSchedule, updateSchedule, deleteSchedule, isAdding, isUpdating, refetch } = useTimetable(collegeId);
  const confirm = useConfirm();
  const [day, setDay] = useState('Monday');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const dayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const schedule of schedules) counts[schedule.dayOfWeek] = (counts[schedule.dayOfWeek] || 0) + 1;
    return counts;
  }, [schedules]);
  const filtered = useMemo(() => schedules.filter((s) => s.dayOfWeek === day), [schedules, day]);

  const submit = async (data: any) => {
    try {
      if (editing) await updateSchedule({ id: editing.id, data });
      else await addSchedule(data);
      setOpen(false);
      setEditing(null);
    } catch {
      // Hook handles and displays API errors.
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefreshing} onRefresh={async () => { setIsRefreshing(true); try { await refetch(); } finally { setIsRefreshing(false); } }}>
      <View style={styles.banner}>
        <View style={styles.bannerGlow} />
        <View style={styles.bannerCopy}>
          <Text style={styles.bannerTitle}>Timetable & Scheduling</Text>
          <Text style={styles.bannerText}>Coordinate weekly class periods, faculty allocations, and lab/room assignments seamlessly.</Text>
        </View>
        <Button title="Schedule Class" size="sm" fullWidth={false} icon={Plus} onPress={() => { setEditing(null); setOpen(true); }} />
      </View>

      <View style={[styles.daysBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {days.map((d) => {
          const count = dayCounts[d] || 0;
          const active = day === d;
          return (
            <Pressable key={d} onPress={() => setDay(d)} style={[styles.day, { backgroundColor: active ? colors.primary : 'transparent' }]}>
              <Text style={[styles.dayText, { color: active ? colors.onPrimary : colors.textMuted }]}>{d.slice(0, 3)}</Text>
              <View style={[styles.count, { backgroundColor: active ? 'rgba(255,255,255,0.22)' : colors.cardAlt }]}><Text style={{ color: active ? colors.onPrimary : colors.textMuted, fontSize: 10, fontWeight: fontWeight.extrabold }}>{count}</Text></View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.sessionHint}><Layers size={14} color={colors.primary} /><Text style={[styles.sessionText, { color: colors.textMuted }]}>{filtered.length} Sessions on {day}</Text></View>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><Calendar size={30} color={colors.primary} /></View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No sessions scheduled for {day}</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Keep your curriculum organized by allocating lectures, lab sessions, and teachers for this day.</Text>
          <View style={styles.emptyAction}>
            <Button title="Add First Session" size="sm" fullWidth={false} style={styles.centerBtn} icon={Plus} onPress={() => { setEditing(null); setOpen(true); }} />
          </View>
        </View>
      ) : (
        filtered.map((schedule) => (
          <Card key={schedule.id} style={styles.card}>
            <View style={[styles.timePill, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
              <Clock size={14} color={colors.primary} />
              <Text style={[styles.timeText, { color: colors.primary }]}>{schedule.startTime} – {schedule.endTime}</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={[styles.subject, { color: colors.text }]} numberOfLines={2}>{schedule.subject || schedule.courseName || 'Class Session'}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}><User size={12} color={colors.textMuted} />  {schedule.teacherName || 'Faculty Member'}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}><MapPin size={12} color={colors.textMuted} />  {schedule.room || 'Room / Lab not assigned'}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable hitSlop={10} onPress={() => { setEditing(schedule); setOpen(true); }}><Edit2 size={18} color={colors.primary} /></Pressable>
              <Pressable hitSlop={10} onPress={async () => { if (await confirm({ title: 'Delete Schedule', message: 'Delete this timetable entry?', confirmText: 'Delete', isDestructive: true })) await deleteSchedule(schedule.id); }}><Trash2 size={18} color={colors.danger} /></Pressable>
            </View>
          </Card>
        ))
      )}

      <TimetableFormModal isOpen={open} onClose={() => setOpen(false)} onSubmit={submit} initialData={editing} isLoading={isAdding || isUpdating} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { minHeight: 150, backgroundColor: '#0f172a', borderRadius: 24, padding: 18, marginBottom: 12, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' },
  bannerGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -65, top: -55, backgroundColor: 'rgba(16,185,129,0.20)' },
  bannerCopy: { flex: 1, paddingRight: 10 },
  bannerTitle: { color: '#fff', fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  bannerText: { color: '#cbd5e1', fontSize: fontSize.xs, lineHeight: 17, marginTop: 5 },
  daysBar: { borderWidth: 1, borderRadius: 18, padding: 6, flexDirection: 'row', marginBottom: 5 },
  day: { flex: 1, minHeight: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dayText: { fontSize: 10, fontWeight: fontWeight.extrabold },
  count: { minWidth: 18, height: 17, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  sessionHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 8 },
  sessionText: { fontSize: 10, fontWeight: fontWeight.bold, marginLeft: 5 },
  loader: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  empty: { width: '100%', alignSelf: 'center', minHeight: 300, borderWidth: 1, borderRadius: 24, paddingHorizontal: 22, paddingVertical: 26, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  emptyIcon: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, textAlign: 'center' },
  emptyText: { width: '100%', maxWidth: 330, fontSize: fontSize.sm, lineHeight: 19, textAlign: 'center', marginVertical: 8 },
  centerBtn: { alignSelf: 'center' },
  emptyAction: { width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  card: { marginBottom: 10, padding: 14 },
  timePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, marginBottom: 10 },
  timeText: { fontSize: fontSize.xs, fontWeight: fontWeight.extrabold, marginLeft: 6 },
  cardBody: { paddingRight: 40 },
  subject: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, marginBottom: 6 },
  meta: { fontSize: fontSize.xs, marginTop: 5 },
  actions: { position: 'absolute', right: 14, top: 14, flexDirection: 'row', gap: 14 },
});