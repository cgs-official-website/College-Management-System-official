import React, { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import {
  Briefcase,
  BookOpen,
  Calendar,
  CheckCircle2,
  GraduationCap,
  Megaphone,
  User,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react-native';

import { api } from '../../api/client';
import { WEB_URL } from '../../config/env';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { SheetModal } from '../../components/ui/SheetModal';
import { PageHeader } from '../../components/layout/ScreenHeader';
import { useDrawerNav } from '../../components/layout/DrawerContent';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { fontSize, fontWeight } from '../../theme/typography';
import { toast } from '../../utils/toast';

const timeAgo = (time: any): string => {
  const date = new Date(time);
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffMins < 60) return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString();
};

/** Web: AdminLayout -> <AdminDashboardHome/> ("College Dashboard"). */
export default function AdminDashboardScreen() {
  const { colors } = useTheme();
  const nav = useDrawerNav();
  const { userData } = useAuth();
  const stats = useDashboardStats(userData?.collegeId);
  const [refreshing, setRefreshing] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await stats.refetch();
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

  const val = (v: number | string) => (stats.isLoading ? '...' : v);

  const quickActions = [
    { label: 'Add Student', icon: UserPlus, tone: colors.success, bg: colors.successSoft, go: () => nav.navigate('students', { openAdd: true }) },
    { label: 'Mark Attendance', icon: CheckCircle2, tone: colors.primary, bg: colors.primarySoft, go: () => nav.navigate('attendance') },
    { label: 'Collect Fees', icon: Wallet, tone: colors.warning, bg: colors.warningSoft, go: () => nav.navigate('fees') },
    { label: 'Post Notice', icon: Megaphone, tone: colors.danger, bg: colors.dangerSoft, go: () => nav.navigate('notices') },
  ];

  const inviteOptions = [
    { role: 'student' as const, label: 'Student Link', icon: GraduationCap },
    { role: 'teacher' as const, label: 'Teacher Link', icon: Users },
    { role: 'hod' as const, label: 'HOD Link', icon: Briefcase },
    { role: 'parent' as const, label: 'Parent Link', icon: User },
  ];

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        title="College Dashboard"
        subtitle="Manage your institution's daily operations."
        action={<Button title="Invite Links" icon={Zap} size="sm" onPress={() => setInviteOpen(true)} />}
      />

      <View style={styles.row}>
        <StatCard title="Total Students" value={val(stats.totalStudents)} subtitle="Current enrollment" icon={GraduationCap} tone="primary" />
        <View style={styles.gap} />
        <StatCard title="Total Teachers" value={val(stats.totalTeachers)} subtitle="Active staff" icon={Users} tone="success" />
      </View>
      <View style={[styles.row, styles.rowGap]}>
        <StatCard title="Active Courses" value={val(stats.activeCourses)} subtitle="Departments" icon={BookOpen} tone="warning" />
        <View style={styles.gap} />
        <StatCard title="Avg Attendance" value={val(`${stats.attendanceRate}%`)} subtitle="Last 30 days" icon={Calendar} tone="info" />
      </View>

      <Card style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Actions</Text>
          <Zap size={18} color={colors.primary} />
        </View>
        <View style={styles.grid}>
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Pressable
                key={a.label}
                onPress={a.go}
                style={({ pressed }) => [styles.action, { borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}>
                <View style={[styles.actionIcon, { backgroundColor: a.bg }]}>
                  <Icon size={22} color={a.tone} />
                </View>
                <Text style={[styles.actionLabel, { color: colors.text }]}>{a.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 14 }]}>Recent Activity</Text>
        {stats.isLoading ? (
          <Text style={[styles.empty, { color: colors.textMuted }]}>Loading activity...</Text>
        ) : stats.recentActivity.length > 0 ? (
          stats.recentActivity.map((item: any) => {
            const isStudent = item.type === 'student';
            const Icon = isStudent ? UserPlus : Users;
            return (
              <View key={item.id} style={styles.activity}>
                <View style={[styles.actIcon, { backgroundColor: isStudent ? colors.successSoft : colors.warningSoft }]}>
                  <Icon size={16} color={isStudent ? colors.success : colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.actTop}>
                    <Text style={[styles.actTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                    <Text style={[styles.actTime, { color: colors.textMuted }]}>{timeAgo(item.time)}</Text>
                  </View>
                  <Text style={[styles.actDesc, { color: colors.textMuted }]}>{item.desc}</Text>
                </View>
              </View>
            );
          })
        ) : (
          <Text style={[styles.empty, { color: colors.textMuted }]}>No recent activity found.</Text>
        )}
      </Card>

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
  row: { flexDirection: 'row' },
  rowGap: { marginTop: 12 },
  gap: { width: 12 },
  section: { marginTop: 16 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  action: { width: '47%', alignItems: 'center', paddingVertical: 16, borderWidth: 1, borderRadius: 16 },
  actionIcon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  actionLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, textAlign: 'center' },
  activity: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  actIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  actTitle: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  actTime: { fontSize: fontSize.xs },
  actDesc: { fontSize: fontSize.sm, marginTop: 2 },
  empty: { textAlign: 'center', fontSize: fontSize.sm, paddingVertical: 12 },
  inviteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  inviteLabel: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.medium },
});