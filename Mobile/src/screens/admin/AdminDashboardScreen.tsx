import React, { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import {
  Bell,
  BookOpen,
  Briefcase,
  CheckCircle2,
  Clock,
  GraduationCap,
  Link2,
  Megaphone,
  Settings as SettingsIcon,
  User,
  Users,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { api } from '../../api/client';
import { WEB_URL } from '../../config/env';
import { Screen } from '../../components/ui/Screen';
import { SheetModal } from '../../components/ui/SheetModal';
import { useDrawerNav } from '../../components/layout/DrawerContent';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { useNotices } from '../../hooks/useNotices';
import { BannerGlow, bannerDark } from '../../components/ui/BannerGlow';
import { fontSize, fontWeight } from '../../theme/typography';
import { formatDate } from '../../utils/format';
import { toast } from '../../utils/toast';

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

/** Web: AdminLayout -> <AdminDashboardHome/>. Same data hooks as before; only the layout is new. */
export default function AdminDashboardScreen() {
  const { colors } = useTheme();
  const nav = useDrawerNav();
  const { userData } = useAuth();
  const stats = useDashboardStats(userData?.collegeId);
  const noticesApi = useNotices(userData?.collegeId);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [showAllNotices, setShowAllNotices] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([stats.refetch(), noticesApi.refetch()]);
    setRefreshing(false);
  };

  const handleGenerateLink = async (role: 'student' | 'teacher' | 'hod' | 'parent') => {
    if (!userData?.collegeId && !userData?.collegeSlug) return;
    let inviteLink = '';

    if (role === 'student') {
      // Secure token-based registration flow: fresh crypto token from the backend -> /student/register?token=...
      try {
        const response = await api.post<any>('/students/registration-link/regenerate');
        const linkData = response?.data ?? response;
        if (!linkData?.rawToken || !linkData?.path) {
          toast.error('Failed to generate student registration link. Please try again.');
          return;
        }
        inviteLink = `${WEB_URL}${linkData.path}`;
      } catch (err: any) {
        toast.error(err?.message || 'Failed to generate student registration link.');
        return;
      }
    } else {
      const slug = userData?.collegeSlug || userData?.college?.slug;
      inviteLink = slug ? `${WEB_URL}/register/${role}/${slug}` : `${WEB_URL}/register/${role}?code=${userData?.collegeId}`;
    }

    try {
      await Share.share({ message: inviteLink });
      setCopiedLink(role);
      setTimeout(() => setCopiedLink(null), 3000);
    } catch {
      toast.error(`Could not share the ${role} registration link.`);
    }
    setInviteOpen(false);
  };

  const inviteOptions = [
    { role: 'student' as const, label: 'Student Link', icon: GraduationCap },
    { role: 'teacher' as const, label: 'Teacher Link', icon: Users },
    { role: 'hod' as const, label: 'HOD Link', icon: Briefcase },
    { role: 'parent' as const, label: 'Parent Link', icon: User },
  ];

  const collegeName = (userData as any)?.collegeName || 'your college';
  const loading = stats.isLoading;
  const val = (v: number | string) => (loading ? '•••' : v);
  const notices: any[] = noticesApi.notices || [];
  const shownNotices = showAllNotices ? notices : notices.slice(0, 3);

  const statCards: {
    label: string;
    value: string | number;
    caption: string;
    icon: LucideIcon;
    tone: 'info' | 'primary' | 'success' | 'warning';
    captionColor: string;
    go: string;
  }[] = [
    { label: 'TOTAL STUDENTS', value: val(stats.totalStudents), caption: `${loading ? 0 : stats.totalStudents} active enrollments`, icon: GraduationCap, tone: 'info', captionColor: colors.success, go: 'students' },
    { label: 'TEACHING STAFF', value: val(stats.totalTeachers), caption: 'Active staff', icon: Users, tone: 'primary', captionColor: colors.success, go: 'hr' },
    { label: 'ACTIVE CLASSES', value: val(stats.activeCourses), caption: 'Across all sections', icon: BookOpen, tone: 'success', captionColor: colors.info, go: 'academic-structure' },
    { label: 'SCHOOL NOTICES', value: noticesApi.isLoading ? '•••' : notices.length, caption: 'Broadcasts active', icon: Bell, tone: 'warning', captionColor: colors.textMuted, go: 'notices' },
  ];
  const tones = {
    primary: { bg: colors.primarySoft, fg: colors.primary },
    info: { bg: colors.infoSoft, fg: colors.info },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
  } as const;

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={refreshing} onRefresh={onRefresh}>
      {/* Dashboard Overview banner */}
      <View style={[styles.banner, bannerDark]}>
<BannerGlow />
        <Text style={styles.bannerTitle}>Dashboard Overview</Text>
        <Pressable onPress={() => setInviteOpen(true)} style={({ pressed }) => [styles.whiteBtn, { opacity: pressed ? 0.85 : 1 }]}>
          <Link2 size={18} color={'#ffffff'} />
          <Text style={[styles.whiteBtnText, { color: '#ffffff' }]}>Generate Invite Links</Text>
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

        {noticesApi.isLoading ? (
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

      <SheetModal visible={inviteOpen} onClose={() => setInviteOpen(false)} title="Generate Invite Links">
        {inviteOptions.map((o) => {
          const Icon = o.icon;
          return (
            <Pressable key={o.role} onPress={() => handleGenerateLink(o.role)} style={[styles.inviteRow, { borderColor: colors.border }]}>
              <Icon size={18} color={colors.primary} />
              <Text style={[styles.inviteLabel, { color: colors.text }]}>{o.label}</Text>
              {copiedLink === o.role ? <CheckCircle2 size={18} color={colors.success} /> : null}
            </Pressable>
          );
        })}
        <View style={{ height: 8 }} />
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  notice: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  noticeIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  noticeCopy: { flex: 1 },
  noticeTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  noticeBody: { fontSize: fontSize.xs, marginTop: 2, lineHeight: 16 },
  noticeMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  noticeDate: { fontSize: 10, fontWeight: fontWeight.medium },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  inviteLabel: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.medium },
});