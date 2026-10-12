import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { CalendarClock, MapPin, Video } from 'lucide-react-native';

import { api } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

const dayOf = (d: any) => String(d).slice(0, 10);
const statusTone = (s?: string): BadgeTone => (s === 'completed' ? 'success' : s === 'cancelled' ? 'danger' : 'warning');

/** Web: pages/student/StudentPtm.jsx  (GET /ptm/meetings - the backend filters to the logged-in student) */
export default function StudentPtmScreen() {
  const { colors } = useTheme();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async (silent = false) => {
    if (silent) setIsRefreshing(true);
    try {
      const res: any = await api.get('/ptm/meetings');
      const raw = res?.data ?? res;
      if (mounted.current) setMeetings(Array.isArray(raw) ? raw : []);
    } catch (err: any) {
      if (!silent) toast.error(err?.data?.error?.message || err?.message || 'Failed to load meetings');
    } finally {
      if (mounted.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);

  const join = (link: string) => Linking.openURL(link).catch(() => toast.error('Could not open the meeting link'));

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefreshing} onRefresh={() => load(true)}>
      <Text style={[styles.title, { color: colors.text }]}>My PTM Meetings</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Meetings scheduled for you by your teachers.</Text>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Meetings</Text>
        <Badge label={String(meetings.length)} tone="primary" />
      </View>

      {isLoading ? (
        <Loader label="Loading meetings..." />
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No meetings yet"
          message="When a teacher schedules a meeting, it will appear here."
        />
      ) : (
        meetings.map((m) => (
          <Card key={m.id} style={styles.card}>
            <View style={styles.topRow}>
              <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                {m.teacher?.user?.name || 'Teacher'}
                {m.teacher?.designation ? ` • ${m.teacher.designation}` : ''}
              </Text>
              <Badge label={String(m.status || 'scheduled').toUpperCase()} tone={statusTone(m.status)} small />
            </View>

            {m.slot ? (
              <View style={styles.inline}>
                <CalendarClock size={14} color={colors.textMuted} />
                <Text style={[styles.meta, { color: colors.textMuted }]}>
                  {dayOf(m.slot.date)} • {m.slot.startTime} - {m.slot.endTime}
                </Text>
              </View>
            ) : null}

            {m.agenda ? <Text style={[styles.agenda, { color: colors.text }]}>{m.agenda}</Text> : null}

            {m.status === 'scheduled' ? (
              m.mode === 'online' && m.meetingLink ? (
                <Button
                  title="Join Meeting"
                  icon={Video}
                  size="sm"
                  fullWidth={false}
                  onPress={() => join(m.meetingLink)}
                  style={{ marginTop: 12 }}
                />
              ) : (
                <View style={[styles.inline, { marginTop: 12 }]}>
                  <MapPin size={14} color={colors.textMuted} />
                  <Text style={[styles.meta, { color: colors.text, fontWeight: fontWeight.semibold }]}>
                    {m.venue || 'Offline'}
                  </Text>
                </View>
              )
            ) : null}
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  subtitle: { fontSize: fontSize.sm, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  card: { marginBottom: 12 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  cardTitle: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  meta: { fontSize: fontSize.xs },
  agenda: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 10 },
});