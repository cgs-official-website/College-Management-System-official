import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BookOpen, Calendar, Clock, MapPin, User } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { useStudentTimetable } from '../../hooks/useStudentPortal';
import { fontSize, fontWeight } from '../../theme/typography';

const DAYS = [
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
];

/** "09:30" -> minutes since midnight (NaN when the format is unexpected) */
const toMinutes = (t?: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(t || '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : NaN;
};

/** Web: pages/student/StudentTimetableDashboard.jsx */
export default function StudentTimetableScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isRefreshing, refetch } = useStudentTimetable();
  const slots: any[] = Array.isArray(data) ? data : [];

  const today = new Date().getDay() || 1; // Sunday -> Monday (same as web)
  const [activeDay, setActiveDay] = useState<number>(today > 6 ? 1 : today);

  const countByDay = useMemo(() => {
    const map: Record<number, number> = {};
    slots.forEach((s) => {
      const d = Number(s.dayOfWeek);
      map[d] = (map[d] || 0) + 1;
    });
    return map;
  }, [slots]);

  const daySlots = useMemo(
    () =>
      slots
        .filter((s) => Number(s.dayOfWeek) === activeDay)
        .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime)),
    [slots, activeDay],
  );

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isOngoing = (s: any) =>
    activeDay === new Date().getDay() && nowMin >= toMinutes(s.startTime) && nowMin < toMinutes(s.endTime);

  const dayName = DAYS.find((d) => d.id === activeDay)?.name;

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefreshing} onRefresh={refetch}>
      <Text style={[styles.title, { color: colors.text }]}>Weekly Timetable</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Class schedule, lecture halls, and instructor allocations for your section.
      </Text>

      {isLoading ? (
        <Loader label="Loading timetable..." />
      ) : (
        <>
          <Tabs
            tabs={DAYS.map((d) => ({ key: String(d.id), label: d.short, count: countByDay[d.id] || 0 }))}
            active={String(activeDay)}
            onChange={(k) => setActiveDay(Number(k))}
          />

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{dayName} Schedule</Text>
            <Badge label={`${daySlots.length} ${daySlots.length === 1 ? 'Class' : 'Classes'}`} tone="primary" />
          </View>

          {daySlots.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No Classes Scheduled"
              message={`No lecture sessions are scheduled for ${dayName}.`}
            />
          ) : (
            daySlots.map((slot) => {
              const ongoing = isOngoing(slot);
              return (
                <Card
                  key={slot.id}
                  style={[styles.slotCard, ongoing && { borderColor: colors.primary, borderWidth: 1.5 }]}>
                  <View style={styles.slotTop}>
                    <View style={[styles.iconBox, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
                      <Clock size={20} color={colors.primary} />
                    </View>
                    <View style={styles.slotBody}>
                      <Text style={[styles.courseName, { color: colors.text }]} numberOfLines={2}>
                        {slot.course?.name || 'Lecture Session'}
                      </Text>
                      <View style={[styles.timePill, { backgroundColor: colors.cardAlt }]}>
                        <Text style={[styles.timeText, { color: colors.text }]}>
                          {slot.startTime} - {slot.endTime}
                        </Text>
                      </View>
                    </View>
                    {ongoing ? <Badge label="Ongoing" tone="success" small /> : null}
                  </View>

                  <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
                    <View style={styles.metaItem}>
                      <BookOpen size={14} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>{slot.course?.code || 'CRS'}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MapPin size={14} color={colors.danger} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>Room {slot.room || 'TBA'}</Text>
                    </View>
                    <View style={[styles.metaItem, styles.metaGrow]}>
                      <User size={14} color={colors.info} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>
                        {slot.teacher?.user?.name || 'Faculty'}
                      </Text>
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  subtitle: { fontSize: fontSize.sm, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 12 },
  sectionTitle: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginRight: 8 },
  slotCard: { marginBottom: 12 },
  slotTop: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  slotBody: { flex: 1, marginRight: 8 },
  courseName: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  timePill: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 6 },
  timeText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaGrow: { flex: 1 },
  metaText: { fontSize: fontSize.xs },
});