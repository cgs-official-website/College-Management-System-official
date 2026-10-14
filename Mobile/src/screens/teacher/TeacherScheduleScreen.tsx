import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Calendar as CalendarIcon, Clock, MapPin, Users } from 'lucide-react-native';

import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import type { BadgeTone } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const typeTone = (type?: string): BadgeTone => (type === 'Lecture' ? 'info' : type === 'Practical' ? 'success' : 'warning');

/** Web: pages/teacher/TeacherSchedule.jsx (GET /timetable) */
export default function TeacherScheduleScreen() {
  const { colors } = useTheme();
  const { userData } = useAuth();

  // Web opens on Monday; here we open on today's weekday (Sunday falls back to Monday).
  const initialDay = DAYS.includes(new Date().toLocaleDateString('en-US', { weekday: 'long' }))
    ? new Date().toLocaleDateString('en-US', { weekday: 'long' })
    : 'Monday';

  const [selectedDay, setSelectedDay] = useState(initialDay);
  const [scheduleData, setScheduleData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const role = String((userData as any)?.role || '').toLowerCase();

  const load = useCallback(async () => {
    if (!userData?.collegeId) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<any>('/timetable');
      const items: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];

      const data: Record<string, any[]> = {};
      DAYS.forEach((d) => (data[d] = []));

      items.forEach((item) => {
        // Only show approved schedules for regular teachers
        if (item.status === 'pending' && role !== 'hod' && role !== 'admin') return;
        const day = item.dayOfWeek || item.day;
        if (data[day]) data[day].push({ ...item, time: `${item.startTime} - ${item.endTime}` });
      });

      setScheduleData(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load schedule');
    } finally {
      setLoading(false);
    }
  }, [userData?.collegeId, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const tabs = useMemo(
    () => DAYS.map((d) => ({ key: d, label: d.slice(0, 3), count: scheduleData[d]?.length || 0 })),
    [scheduleData],
  );

  const dayClasses = scheduleData[selectedDay] || [];

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}>
      <Text style={[styles.title, { color: colors.text }]}>My Schedule</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>View your weekly timetable and class assignments.</Text>

      <Tabs tabs={tabs} active={selectedDay} onChange={setSelectedDay} />

      {loading ? (
        <Loader label="Loading schedule..." />
      ) : (
        <>
          <View style={styles.dayHead}>
            <Text style={[styles.dayTitle, { color: colors.text }]}>{selectedDay}'s Classes</Text>
            {dayClasses.length > 0 ? <Badge label={`${dayClasses.length} sessions`} tone="neutral" small /> : null}
          </View>

          {dayClasses.length === 0 ? (
            <Card>
              <EmptyState icon={CalendarIcon} title="No Classes Scheduled" message="You have a free day. Enjoy your break!" />
            </Card>
          ) : (
            dayClasses.map((cls: any, idx: number) => {
              const [start, end] = String(cls.time).split(' - ');
              return (
                <Card key={cls.id || idx} style={styles.card}>
                  <View style={styles.timeRow}>
                    <Clock size={15} color={colors.primary} />
                    <Text style={[styles.timeStart, { color: colors.primary }]}>{start}</Text>
                    <Text style={[styles.timeEnd, { color: colors.textMuted }]}>to {end}</Text>
                  </View>

                  <View style={styles.subjectRow}>
                    <Text style={[styles.subject, { color: colors.text }]} numberOfLines={2}>{cls.subject}</Text>
                    {cls.type ? <Badge label={String(cls.type)} tone={typeTone(cls.type)} small /> : null}
                  </View>

                  <View style={styles.metaRow}>
                    <View style={styles.meta}>
                      <Users size={14} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>{cls.class}</Text>
                    </View>
                    <View style={styles.meta}>
                      <MapPin size={14} color={colors.textMuted} />
                      <Text style={[styles.metaText, { color: colors.textMuted }]}>{cls.room}</Text>
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
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 4, marginBottom: 12 },
  dayHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, marginBottom: 12 },
  dayTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  card: { marginBottom: 12 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  timeStart: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  timeEnd: { fontSize: fontSize.xs },
  subjectRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  subject: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 10 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: fontSize.sm },
});