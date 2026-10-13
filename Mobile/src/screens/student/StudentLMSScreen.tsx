import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Award, Film, MonitorPlay, Video } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { fontSize, fontWeight } from '../../theme/typography';

const TABS = [
  {
    key: 'materials',
    label: 'Course Materials',
    heading: 'Course Materials',
    icon: MonitorPlay,
    title: 'No Course Materials Yet',
    message: 'Study materials uploaded by your teachers will appear here. Check back after your courses begin.',
  },
  {
    key: 'live',
    label: 'Live Classes',
    heading: 'Upcoming Live Classes',
    icon: Video,
    title: 'No Live Classes Scheduled',
    message: 'When your teachers schedule a live class, you\'ll see a "Join Meeting" button here.',
  },
  {
    key: 'videos',
    label: 'Video Library',
    heading: 'Recorded Lectures',
    icon: Film,
    title: 'No Recordings Available',
    message: 'Recorded lectures and video resources from your teachers will appear here.',
  },
  {
    key: 'certificates',
    label: 'My Certificates',
    heading: 'My Certificates',
    icon: Award,
    title: 'No Certificates Earned',
    message: 'Complete courses and assessments to earn certificates that will appear here.',
  },
];

/** Web: pages/student/StudentLMS.jsx  (the web page is a static "coming soon" shell - same here) */
export default function StudentLMSScreen() {
  const { colors } = useTheme();
  const [tab, setTab] = useState('materials');
  const active = TABS.find((t) => t.key === tab) || TABS[0];

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Text style={[styles.title, { color: colors.text }]}>Learning Portal</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Access course materials, join live classes, and watch recordings.
      </Text>

      <View style={styles.statsRow}>
        <StatCard compact title="Enrolled Courses" value="0" icon={MonitorPlay} tone="primary" />
        <StatCard compact title="Live Today" value="0" icon={Video} tone="success" />
      </View>
      <View style={styles.statsRow}>
        <StatCard compact title="Videos Watched" value="0" icon={Film} tone="warning" />
        <StatCard compact title="Certificates" value="0" icon={Award} tone="info" />
      </View>

      <Tabs tabs={TABS.map(({ key, label }) => ({ key, label }))} active={tab} onChange={setTab} />

      <Card style={{ marginTop: 14 }}>
        <Text style={[styles.heading, { color: colors.text }]}>{active.heading}</Text>
        <EmptyState icon={active.icon} title={active.title} message={active.message} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  subtitle: { fontSize: fontSize.sm, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  heading: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
});