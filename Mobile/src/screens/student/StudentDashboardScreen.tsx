import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ArrowUpRight,
  BookOpen,
  Bus,
  Calculator,
  Calendar,
  CheckSquare,
  Clock,
  FileBarChart,
  Home,
  Megaphone,
  Settings as SettingsIcon,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDrawerNav } from '../../components/layout/DrawerContent';
import { Screen } from '../../components/ui/Screen';
import { Badge } from '../../components/ui/Badge';
import { useStudentDashboard, useStudentProfile } from '../../hooks/useStudentPortal';
import { formatDate } from '../../utils/format';
import { BannerGlow, bannerDark } from '../../components/ui/BannerGlow';
import { fontSize, fontWeight } from '../../theme/typography';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');
const greeting = (hour: number) => (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');

/** Own component so only the clock re-renders every second. */
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const text = `${DAY_NAMES[now.getDay()]}, ${now.getDate()} ${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()} • ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return (
    <View style={styles.glassPill}>
      <Clock size={16} color="#ffffff" />
      <Text style={styles.glassText} numberOfLines={1}>{text}</Text>
    </View>
  );
}

/** Web: pages/student/StudentLayout.jsx -> StudentDashboardHome. Same data hooks as before; only the layout is new. */
export default function StudentDashboardScreen() {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const nav = useDrawerNav();

  const { data: dashboard, isLoading, isRefreshing, refetch } = useStudentDashboard();
  const { data: profile } = useStudentProfile();

  const metrics = dashboard?.metrics;
  const notices: any[] = dashboard?.recentNotices || [];
  const loading = isLoading && !dashboard;

  const studentFullName =
    profile?.name ||
    `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() ||
    dashboard?.student?.name ||
    userData?.name ||
    'Student';

  const residence = String(profile?.residenceType || (userData as any)?.residenceType || 'Day Scholar');
  const isHosteller = residence.toLowerCase().includes('hostel');

  const stats: {
    label: string;
    value: string;
    caption: string;
    icon: LucideIcon;
    tone: 'success' | 'info' | 'warning' | 'primary';
    captionColor: string;
    go: string;
  }[] = [
    {
      label: 'ATTENDANCE RATE',
      value: loading ? '•••' : metrics ? `${metrics.attendancePercentage}%` : '100%',
      caption: `${metrics?.presentDays || 0} / ${metrics?.totalDays || 0} sessions present`,
      icon: CheckSquare,
      tone: 'success',
      captionColor: colors.success,
      go: 'attendance',
    },
    {
      label: 'ENROLLED COURSES',
      value: loading ? '•••' : metrics ? String(metrics.coursesCount) : '0',
      caption: 'Current Semester',
      icon: BookOpen,
      tone: 'info',
      captionColor: colors.info,
      go: 'courses',
    },
    {
      label: 'PENDING WORK',
      value: loading ? '•••' : metrics ? String(metrics.pendingAssignments) : '0',
      caption: metrics?.pendingAssignments > 0 ? 'Requires attention' : 'All caught up!',
      icon: FileBarChart,
      tone: 'warning',
      captionColor: metrics?.pendingAssignments > 0 ? colors.danger : colors.success,
      go: 'assignments',
    },
    {
      label: 'UPCOMING EXAMS',
      value: loading ? '•••' : metrics ? String(metrics.upcomingExams) : '0',
      caption: 'Scheduled ahead',
      icon: Calendar,
      tone: 'primary',
      captionColor: colors.textMuted,
      go: 'exams',
    },
  ];
  const tones = {
    primary: { bg: colors.primarySoft, fg: colors.primary },
    info: { bg: colors.infoSoft, fg: colors.info },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
  } as const;

  const quick: { key: string; title: string; desc: string; icon: LucideIcon; color: string; bg: string }[] = [
    { key: 'timetable', title: 'Class Timetable', desc: 'View weekly lecture rooms, faculty, and timings.', icon: Calendar, color: colors.primary, bg: colors.primarySoft },
    { key: 'fees', title: 'Fees & Statements', desc: 'Check tuition fee invoices and payment status.', icon: Calculator, color: colors.success, bg: colors.successSoft },
    isHosteller
      ? { key: 'hostel', title: 'Hostel Residence', desc: 'View your assigned room and hostel block allocation.', icon: Home, color: colors.warning, bg: colors.warningSoft }
      : { key: 'transport', title: 'Campus Transport', desc: 'View daily bus route and pickup stop pass.', icon: Bus, color: colors.info, bg: colors.infoSoft },
  ];

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefreshing} onRefresh={refetch}>
      {/* Dashboard Overview banner */}
      <View style={[styles.banner, bannerDark]}>
<BannerGlow />
        <Text style={styles.bannerTitle}>Dashboard Overview</Text>
        <Pressable onPress={() => nav.navigate('timetable')} style={({ pressed }) => [styles.whiteBtn, { opacity: pressed ? 0.85 : 1 }]}>
          <Calendar size={18} color={'#ffffff'} />
          <Text style={[styles.whiteBtnText, { color: '#ffffff' }]}>View Timetable</Text>
        </Pressable>
        <Text style={styles.greeting} numberOfLines={2}>{greeting(new Date().getHours())}, {studentFullName}!</Text>
        <Text style={styles.meta}>
          {isHosteller ? 'HOSTELLER' : 'DAY SCHOLAR'} • {profile?.department || 'Academic'} • Adm No: {profile?.admissionNumber || '-'}
          {isHosteller && profile?.hostelRoom ? ` • Room ${profile.hostelRoom}` : ''}
        </Text>
        <View style={styles.pillRow}>
          <Pressable onPress={() => nav.navigate('settings')} style={styles.glassPill}>
            <SettingsIcon size={16} color="#ffffff" />
            <Text style={styles.glassText}>Customize</Text>
          </Pressable>
          <LiveClock />
        </View>
      </View>

      {/* Stat cards */}
      <View style={styles.statGrid}>
        {stats.map((s) => {
          const Icon = s.icon;
          const t = tones[s.tone];
          return (
            <Pressable
              key={s.label}
              onPress={() => nav.navigate(s.go)}
              style={({ pressed }) => [styles.statCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.9 : 1 }]}>
              <View style={[styles.statIcon, { backgroundColor: t.bg }]}>
                <Icon size={22} color={t.fg} />
              </View>
              <Text style={[styles.statLabel, { color: colors.textMuted }]} numberOfLines={1}>{s.label}</Text>
              <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{s.value}</Text>
              <Text style={[styles.statCaption, { color: s.captionColor }]} numberOfLines={1}>{s.caption}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* Quick navigation */}
      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.panelTitle, { color: colors.text, marginBottom: 12 }]}>Quick Access</Text>
        {quick.map((q) => {
          const Icon = q.icon;
          return (
            <Pressable
              key={q.key}
              onPress={() => nav.navigate(q.key)}
              style={({ pressed }) => [styles.quick, { borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}>
              <View style={[styles.quickIcon, { backgroundColor: q.bg }]}>
                <Icon size={20} color={q.color} />
              </View>
              <View style={styles.quickBody}>
                <Text style={[styles.quickTitle, { color: colors.text }]}>{q.title}</Text>
                <Text style={[styles.quickDesc, { color: colors.textMuted }]}>{q.desc}</Text>
              </View>
              <ArrowUpRight size={18} color={colors.textSubtle} />
            </Pressable>
          );
        })}
      </View>

      {/* Latest notices */}
      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.panelHead}>
          <View style={styles.panelTitleRow}>
            <Megaphone size={20} color={colors.primary} />
            <Text style={[styles.panelTitle, { color: colors.text }]}>Latest Campus Notices</Text>
          </View>
          <Pressable onPress={() => nav.navigate('notices')} hitSlop={8}>
            <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
          </Pressable>
        </View>
        {notices.length > 0 ? (
          notices.map((n, i) => (
            <View
              key={n.id}
              style={[styles.noticeRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.noticeTitle, { color: colors.text }]} numberOfLines={1}>{n.title}</Text>
                <Text style={[styles.noticeContent, { color: colors.textMuted }]} numberOfLines={2}>{n.content}</Text>
              </View>
              <View style={styles.noticeRight}>
                {n.priority === 'high' ? <Badge label="HIGH" tone="danger" small /> : null}
                <Text style={[styles.noticeDate, { color: colors.textSubtle }]}>{formatDate(n.date)}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.empty, { color: colors.textMuted }]}>{loading ? 'Loading notices...' : 'No notices yet'}</Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 22, padding: 20 },
  bannerTitle: { color: '#ffffff', fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  whiteBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#059669', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginTop: 14 },
  whiteBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  greeting: { color: 'rgba(255,255,255,0.95)', fontSize: fontSize.md, fontWeight: fontWeight.bold, marginTop: 16 },
  meta: { color: 'rgba(255,255,255,0.8)', fontSize: fontSize.xs, marginTop: 6, lineHeight: 18 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  glassPill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  glassText: { color: '#ffffff', fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  statCard: { width: '48%', flexGrow: 1, borderWidth: 1, borderRadius: 20, padding: 16 },
  statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  statLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, letterSpacing: 0.3 },
  statValue: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, marginTop: 8 },
  statCaption: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginTop: 6 },
  panel: { borderWidth: 1, borderRadius: 20, padding: 16, marginTop: 16 },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  panelTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  viewAll: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  empty: { textAlign: 'center', paddingVertical: 16, fontSize: fontSize.sm },
  quick: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 10 },
  quickIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  quickBody: { flex: 1, marginRight: 8 },
  quickTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  quickDesc: { fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },
  noticeRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  noticeTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  noticeContent: { fontSize: fontSize.xs, marginTop: 2 },
  noticeRight: { alignItems: 'flex-end', marginLeft: 10, gap: 4 },
  noticeDate: { fontSize: 11, fontWeight: fontWeight.medium },
});