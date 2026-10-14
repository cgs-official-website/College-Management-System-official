import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, BookOpen, CalendarDays, CheckSquare, Clock, GraduationCap, Megaphone, Settings as SettingsIcon, Users } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDrawerNav } from '../../components/layout/DrawerContent';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { toast } from '../../utils/toast';
import { formatDate } from '../../utils/format';
import { BannerGlow, bannerDark } from '../../components/ui/BannerGlow';
import { fontSize, fontWeight } from '../../theme/typography';

const asList = (res: any): any[] => (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);

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

/** Web: pages/teacher/TeacherDashboard.jsx (GET /notices, /dashboards/teacher-stats, /timetable/today; PUT /students/status/:id) */
export default function TeacherDashboardScreen() {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const nav = useDrawerNav();

  const [stats, setStats] = useState({ totalClasses: 0, studentsTaught: 0, attendanceRate: 0, pendingGrades: 0 });
  const [notices, setNotices] = useState<any[]>([]);
  const [showAllNotices, setShowAllNotices] = useState(false);
  const [todayClasses, setTodayClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [studentId, setStudentId] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userData?.collegeId) {
      setLoading(false);
      return;
    }
    try {
      const [noticesRes, statsRes] = await Promise.all([api.get<any>('/notices'), api.get<any>('/dashboards/teacher-stats')]);

      setNotices(
        asList(noticesRes).filter((n: any) => n.audience === 'all' || n.audience === 'teachers' || n.audience === 'staff'),
      );

      const t = statsRes?.data || {};
      setStats({
        totalClasses: t.totalClasses || 0,
        studentsTaught: t.studentsTaught || 0,
        attendanceRate: t.attendanceRate || 0,
        pendingGrades: t.pendingGrades || 0,
      });

      const scheduleRes = await api.get<any>('/timetable/today');
      setTodayClasses(asList(scheduleRes));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [userData?.collegeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleUpdateStatus = async (status: 'active' | 'inactive') => {
    if (!studentId.trim()) {
      toast.error('Please enter a Student ID');
      return;
    }
    setStatusLoading(true);
    try {
      await api.put(`/students/status/${studentId.trim()}`, { accountStatus: status });
      toast.success(`Student marked as ${status}`);
      setStudentId('');
    } catch (error) {
      console.error(error);
      toast.error('Failed to update student');
    } finally {
      setStatusLoading(false);
    }
  };

  const val = (v: number | string) => (loading ? '•••' : v);
  const collegeName = (userData as any)?.collegeName || 'your college';
  const shownNotices = showAllNotices ? notices : notices.slice(0, 3);

  const statCards: { label: string; value: string | number; caption: string; icon: LucideIcon; tone: 'info' | 'primary' | 'success' | 'warning'; captionColor: string }[] = [
    { label: 'CLASSES TODAY', value: val(stats.totalClasses), caption: 'Scheduled for today', icon: GraduationCap, tone: 'info', captionColor: colors.success },
    { label: 'STUDENTS', value: val(stats.studentsTaught), caption: 'Across your classes', icon: Users, tone: 'primary', captionColor: colors.success },
    { label: 'AVG ATTENDANCE', value: val(`${stats.attendanceRate}%`), caption: 'Overall attendance rate', icon: BookOpen, tone: 'success', captionColor: colors.info },
    { label: 'PENDING GRADES', value: val(stats.pendingGrades), caption: 'Awaiting marks entry', icon: Bell, tone: 'warning', captionColor: colors.textMuted },
  ];
  const tones = {
    primary: { bg: colors.primarySoft, fg: colors.primary },
    info: { bg: colors.infoSoft, fg: colors.info },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
  } as const;

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}>
      {/* Dashboard Overview banner */}
      <View style={[styles.banner, bannerDark]}>
<BannerGlow />
        <Text style={styles.bannerTitle}>Dashboard Overview</Text>
        <Pressable onPress={() => nav.navigate('attendance')} style={({ pressed }) => [styles.whiteBtn, { opacity: pressed ? 0.85 : 1 }]}>
          <CheckSquare size={18} color={'#ffffff'} />
          <Text style={[styles.whiteBtnText, { color: '#ffffff' }]}>Mark Attendance</Text>
        </Pressable>
        <Text style={styles.greeting}>{greeting(new Date().getHours())}! Welcome to {collegeName}.</Text>
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
        {statCards.map((s) => {
          const Icon = s.icon;
          const t = tones[s.tone];
          return (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.statIcon, { backgroundColor: t.bg }]}>
                <Icon size={22} color={t.fg} />
              </View>
              <Text style={[styles.statLabel, { color: colors.textMuted }]} numberOfLines={1}>{s.label}</Text>
              <Text style={[styles.statValue, { color: colors.text }]} numberOfLines={1}>{s.value}</Text>
              <Text style={[styles.statCaption, { color: s.captionColor }]} numberOfLines={1}>{s.caption}</Text>
            </View>
          );
        })}
      </View>

      {/* Recent Notices */}
      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.panelHead}>
          <View style={styles.panelTitleRow}>
            <Megaphone size={20} color={colors.primary} />
            <Text style={[styles.panelTitle, { color: colors.text }]}>Recent Notices</Text>
          </View>
          {notices.length > 3 ? (
            <Pressable onPress={() => setShowAllNotices((v) => !v)} hitSlop={8}>
              <Text style={[styles.viewAll, { color: colors.primary }]}>{showAllNotices ? 'Show Less' : 'View All'}</Text>
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>Loading notices...</Text>
        ) : shownNotices.length > 0 ? (
          shownNotices.map((notice: any) => (
            <View key={notice.id} style={styles.notice}>
              <View style={[styles.noticeIcon, { backgroundColor: colors.primarySoft }]}>
                <Bell size={18} color={colors.primary} />
              </View>
              <View style={styles.noticeCopy}>
                <Text style={[styles.noticeTitle, { color: colors.text }]} numberOfLines={1}>{notice.title}</Text>
                <Text style={[styles.noticeBody, { color: colors.textMuted }]} numberOfLines={2}>{notice.content}</Text>
                <View style={styles.noticeMeta}>
                  <Clock size={11} color={colors.textSubtle} />
                  <Text style={[styles.noticeDate, { color: colors.textSubtle }]}>
                    {notice.createdAt ? formatDate(notice.createdAt) : 'Recent'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyBox}>
            <Bell size={42} color={colors.textSubtle} strokeWidth={1.4} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No notices yet</Text>
          </View>
        )}
      </View>

      {/* Today's Schedule */}
      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.panelHead}>
          <View style={styles.panelTitleRow}>
            <CalendarDays size={20} color={colors.primary} />
            <Text style={[styles.panelTitle, { color: colors.text }]}>Today's Schedule</Text>
          </View>
          <Pressable onPress={() => nav.navigate('schedule')} hitSlop={8}>
            <Text style={[styles.viewAll, { color: colors.primary }]}>View All</Text>
          </Pressable>
        </View>
        {loading ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>Loading schedule...</Text>
        ) : todayClasses.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>No classes scheduled for today.</Text>
        ) : (
          todayClasses.map((cls: any, idx: number) => {
            const [start, end] = cls.time ? String(cls.time).split(' - ') : ['TBA', ''];
            return (
              <View key={cls.id || idx} style={[styles.classRow, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                <View style={styles.timeCol}>
                  <Text style={[styles.timeStart, { color: colors.text }]}>{start || 'TBA'}</Text>
                  {end ? <Text style={[styles.timeEnd, { color: colors.textSubtle }]}>{end}</Text> : null}
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.classSubject, { color: colors.text }]} numberOfLines={1}>{cls.subject}</Text>
                  <Text style={[styles.classMeta, { color: colors.textMuted }]} numberOfLines={1}>{cls.class}</Text>
                </View>
                {cls.room ? <Badge label={String(cls.room)} tone="neutral" small /> : null}
              </View>
            );
          })
        )}
      </View>

      {/* Manage Student */}
      <View style={[styles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.panelTitleRow}>
          <Users size={20} color={colors.primary} />
          <Text style={[styles.panelTitle, { color: colors.text }]}>Manage Student</Text>
        </View>
        <Text style={[styles.hint, { color: colors.textMuted }]}>Update student access status using their ID.</Text>
        <Input placeholder="Enter Student ID (e.g. STU123)" value={studentId} onChangeText={setStudentId} autoCapitalize="characters" />
        <View style={styles.statusRow}>
          <View style={styles.flex}>
            <Button title="Activate" variant="secondary" disabled={statusLoading} onPress={() => handleUpdateStatus('active')} />
          </View>
          <View style={styles.flex}>
            <Button title="Deactivate" variant="danger" disabled={statusLoading} onPress={() => handleUpdateStatus('inactive')} />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: { borderRadius: 22, padding: 20 },
  bannerTitle: { color: '#ffffff', fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  whiteBtn: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#059669', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginTop: 14 },
  whiteBtnText: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  greeting: { color: 'rgba(255,255,255,0.9)', fontSize: fontSize.md, marginTop: 16 },
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
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panelTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  viewAll: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  empty: { textAlign: 'center', paddingVertical: 16, fontSize: fontSize.sm },
  emptyBox: { alignItems: 'center', paddingVertical: 28, gap: 12 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  classRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10, gap: 12 },
  timeCol: { width: 56 },
  timeStart: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  timeEnd: { fontSize: 10, marginTop: 2 },
  classSubject: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  classMeta: { fontSize: fontSize.xs, marginTop: 2 },
  notice: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  noticeIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  noticeCopy: { flex: 1 },
  noticeTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  noticeBody: { fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },
  noticeMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  noticeDate: { fontSize: 10, fontWeight: fontWeight.medium },
  hint: { fontSize: fontSize.sm, marginTop: 8, marginBottom: 14, lineHeight: 20 },
  statusRow: { flexDirection: 'row', gap: 12 },
});