import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ArrowUpRight,
  BookOpen,
  Bus,
  Calculator,
  Calendar,
  CheckSquare,
  FileBarChart,
  Home,
  Megaphone,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDrawerNav } from '../../components/layout/DrawerContent';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Loader } from '../../components/ui/Loader';
import { useStudentDashboard, useStudentProfile } from '../../hooks/useStudentPortal';
import { formatDate } from '../../utils/format';
import { fontSize, fontWeight } from '../../theme/typography';

/** Web: pages/student/StudentLayout.jsx -> StudentDashboardHome */
export default function StudentDashboardScreen() {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const nav = useDrawerNav();

  const { data: dashboard, isLoading, isRefreshing, refetch } = useStudentDashboard();
  const { data: profile } = useStudentProfile();

  const metrics = dashboard?.metrics;
  const notices: any[] = dashboard?.recentNotices || [];

  const studentFullName =
    profile?.name ||
    `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() ||
    dashboard?.student?.name ||
    userData?.name ||
    'Student';

  const residence = String(profile?.residenceType || (userData as any)?.residenceType || 'Day Scholar');
  const isHosteller = residence.toLowerCase().includes('hostel');

  const stats: { title: string; value: string; sub: string; icon: LucideIcon; tone: 'success' | 'info' | 'danger' | 'primary'; go: string }[] = [
    {
      title: 'Attendance Rate',
      value: metrics ? `${metrics.attendancePercentage}%` : '100%',
      sub: `${metrics?.presentDays || 0} / ${metrics?.totalDays || 0} sessions present`,
      icon: CheckSquare,
      tone: 'success',
      go: 'attendance',
    },
    {
      title: 'Enrolled Courses',
      value: metrics ? String(metrics.coursesCount) : '0',
      sub: 'Current Semester',
      icon: BookOpen,
      tone: 'info',
      go: 'courses',
    },
    {
      title: 'Pending Assignments',
      value: metrics ? String(metrics.pendingAssignments) : '0',
      sub: metrics?.pendingAssignments > 0 ? 'Requires attention' : 'All caught up!',
      icon: FileBarChart,
      tone: 'danger',
      go: 'assignments',
    },
    {
      title: 'Upcoming Exams',
      value: metrics ? String(metrics.upcomingExams) : '0',
      sub: 'Scheduled ahead',
      icon: Calendar,
      tone: 'primary',
      go: 'exams',
    },
  ];

  const quick: { key: string; title: string; desc: string; icon: LucideIcon; color: string; bg: string }[] = [
    { key: 'timetable', title: 'Class Timetable', desc: 'View weekly lecture rooms, faculty, and timings.', icon: Calendar, color: colors.primary, bg: colors.primarySoft },
    { key: 'fees', title: 'Fees & Statements', desc: 'Check tuition fee invoices and payment status.', icon: Calculator, color: colors.success, bg: colors.successSoft },
    isHosteller
      ? { key: 'hostel', title: 'Hostel Residence', desc: 'View your assigned room and hostel block allocation.', icon: Home, color: colors.warning, bg: colors.warningSoft }
      : { key: 'transport', title: 'Campus Transport', desc: 'View daily bus route and pickup stop pass.', icon: Bus, color: colors.info, bg: colors.infoSoft },
  ];

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefreshing} onRefresh={refetch}>
      {/* Welcome card */}
      <Card style={styles.welcome}>
        <Text style={[styles.hello, { color: colors.text }]} numberOfLines={2}>
          Welcome, {studentFullName}
        </Text>
        <View style={styles.badgeRow}>
          <View style={[styles.residence, { backgroundColor: isHosteller ? colors.warningSoft : colors.infoSoft }]}>
            {isHosteller ? <Home size={13} color={colors.warning} /> : <Bus size={13} color={colors.info} />}
            <Text style={[styles.residenceText, { color: isHosteller ? colors.warning : colors.info }]}>
              {isHosteller ? 'HOSTELLER' : 'DAY SCHOLAR'}
            </Text>
          </View>
        </View>
        <Text style={[styles.metaLine, { color: colors.textMuted }]}>
          Department: <Text style={[styles.metaStrong, { color: colors.text }]}>{profile?.department || 'Academic'}</Text>
        </Text>
        <Text style={[styles.metaLine, { color: colors.textMuted }]}>
          Admission No: <Text style={[styles.metaStrong, { color: colors.text }]}>{profile?.admissionNumber || '-'}</Text>
          {isHosteller && profile?.hostelRoom ? (
            <Text>
              {'   '}Room: <Text style={[styles.metaStrong, { color: colors.text }]}>{profile.hostelRoom}</Text>
            </Text>
          ) : null}
        </Text>
      </Card>

      {isLoading && !dashboard ? <Loader label="Loading your dashboard..." /> : null}

      {/* Metrics 2 x 2 */}
      <View style={styles.grid}>
        {stats.slice(0, 2).map((s) => (
          <StatCard key={s.title} title={s.title} value={isLoading && !dashboard ? '...' : s.value} subtitle={s.sub} icon={s.icon} tone={s.tone} onPress={() => nav.navigate(s.go)} />
        ))}
      </View>
      <View style={styles.grid}>
        {stats.slice(2).map((s) => (
          <StatCard key={s.title} title={s.title} value={isLoading && !dashboard ? '...' : s.value} subtitle={s.sub} icon={s.icon} tone={s.tone} onPress={() => nav.navigate(s.go)} />
        ))}
      </View>

      {/* Quick navigation */}
      {quick.map((q) => {
        const Icon = q.icon;
        return (
          <Card key={q.key} onPress={() => nav.navigate(q.key)} style={styles.quick}>
            <View style={[styles.quickIcon, { backgroundColor: q.bg }]}>
              <Icon size={20} color={q.color} />
            </View>
            <View style={styles.quickBody}>
              <Text style={[styles.quickTitle, { color: colors.text }]}>{q.title}</Text>
              <Text style={[styles.quickDesc, { color: colors.textMuted }]}>{q.desc}</Text>
            </View>
            <ArrowUpRight size={18} color={colors.textSubtle} />
          </Card>
        );
      })}

      {/* Recent notices */}
      {notices.length > 0 ? (
        <Card style={styles.noticeCard}>
          <View style={styles.noticeHeader}>
            <View style={styles.noticeTitleRow}>
              <Megaphone size={18} color={colors.warning} />
              <Text style={[styles.noticeHeading, { color: colors.text }]}>Latest Campus Notices</Text>
            </View>
            <Pressable onPress={() => nav.navigate('notices')} hitSlop={8}>
              <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
            </Pressable>
          </View>
          {notices.map((n, i) => (
            <View
              key={n.id}
              style={[styles.noticeRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.noticeTitle, { color: colors.text }]} numberOfLines={1}>
                  {n.title}
                </Text>
                <Text style={[styles.noticeContent, { color: colors.textMuted }]} numberOfLines={2}>
                  {n.content}
                </Text>
              </View>
              <View style={styles.noticeRight}>
                {n.priority === 'high' ? <Badge label="HIGH" tone="danger" small /> : null}
                <Text style={[styles.noticeDate, { color: colors.textSubtle }]}>{formatDate(n.date)}</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  welcome: { marginBottom: 14 },
  hello: { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  badgeRow: { flexDirection: 'row', marginTop: 10, marginBottom: 8 },
  residence: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  residenceText: { fontSize: 11, fontWeight: fontWeight.extrabold, marginLeft: 5, letterSpacing: 0.4 },
  metaLine: { fontSize: fontSize.sm, marginTop: 3 },
  metaStrong: { fontWeight: fontWeight.bold },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  quick: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  quickIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  quickBody: { flex: 1, marginRight: 8 },
  quickTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  quickDesc: { fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },
  noticeCard: { marginTop: 4 },
  noticeHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  noticeTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  noticeHeading: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginLeft: 8 },
  viewAll: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  noticeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  noticeTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  noticeContent: { fontSize: fontSize.xs, marginTop: 2 },
  noticeRight: { alignItems: 'flex-end', marginLeft: 10, gap: 4 },
  noticeDate: { fontSize: 11, fontWeight: fontWeight.medium },
});