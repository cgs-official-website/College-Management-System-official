import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import {
  Banknote,
  BookOpen,
  Building,
  CalendarClock,
  CalendarDays,
  CalendarOff,
  CheckSquare,
  ChevronRight,
  FileBarChart,
  FolderKanban,
  MessageSquareWarning,
  Search,
  Settings as SettingsIcon,
  SlidersHorizontal,
  Users,
  Video,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDrawerNav } from '../../components/layout/DrawerContent';
import { Screen } from '../../components/ui/Screen';
import { BannerGlow, bannerDark } from '../../components/ui/BannerGlow';
import { fontSize, fontWeight } from '../../theme/typography';
import { UnreadBadge } from '../../components/ui/UnreadBadge';

type Tone = 'primary' | 'info' | 'success' | 'warning' | 'danger';
export type TeacherModule = { key: string; name: string; icon: LucideIcon; tone: Tone };

/** 3x3 dots icon used for "All Modules" (bottom bar + banner). */
export function DotsGridIcon({ size = 24, color }: { size?: number; color: string }) {
  const dot = Math.max(3, Math.round(size / 6));
  return (
    <View style={{ width: size, height: size, justifyContent: 'space-between' }}>
      {[0, 1, 2].map((r) => (
        <View key={r} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {[0, 1, 2].map((c) => (
            <View key={c} style={{ width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color }} />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Web TeacherLayout: Facility Requests need infrastructure read permission (or a plain HOD). */
export const canUseFacilities = (userData: any, permissions: any): boolean =>
  permissions?.infrastructure?.canRead === true ||
  (String(userData?.role || '').toLowerCase() === 'hod' && !userData?.customRoleId);

/** Same module list as the web TeacherLayout `navLinks` (Dashboard excluded: it is the home tab). */
export const buildTeacherModules = (isHod: boolean, facilities: boolean): TeacherModule[] => {
  const list: TeacherModule[] = [
    { key: 'classes', name: 'My Classes', icon: Users, tone: 'primary' },
    { key: 'attendance', name: 'Attendance', icon: CalendarDays, tone: 'success' },
    { key: 'schedule', name: 'Schedule', icon: CalendarClock, tone: 'warning' },
    { key: 'assignments', name: 'Assignments', icon: BookOpen, tone: 'info' },
    { key: 'grades', name: 'Marks & Grading', icon: FileBarChart, tone: 'success' },
    { key: 'complaints', name: 'Complaints', icon: MessageSquareWarning, tone: 'danger' },
    { key: 'ptm', name: 'PTM Meetings', icon: Video, tone: 'info' },
    { key: 'studentleaves', name: 'Student Leaves', icon: CalendarOff, tone: 'warning' },
    { key: 'projects', name: 'Projects', icon: FolderKanban, tone: 'primary' },
    { key: 'payroll', name: 'Payroll', icon: Banknote, tone: 'success' },
    { key: 'myleaves', name: 'My Leaves', icon: CheckSquare, tone: 'danger' },
  ];
  if (isHod) list.push({ key: 'timetable', name: 'Manage Timetable', icon: CalendarClock, tone: 'info' });
  if (facilities) list.push({ key: 'facility', name: 'Facility Requests', icon: Building, tone: 'warning' });
  list.push({ key: 'settings', name: 'Account Settings', icon: SettingsIcon, tone: 'success' });
  list.push({ key: 'app-settings', name: 'Settings', icon: SlidersHorizontal, tone: 'primary' });
  return list;
};

/** All Teacher modules as box cards (replaces the web sidebar menu). */
export default function TeacherModulesScreen() {
  const { colors } = useTheme();
  const { userData, permissions } = useAuth();
  const nav = useDrawerNav();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - 32 - 12) / 2);
  const [query, setQuery] = useState('');

  const ud: any = userData || {};
  const isHod = String(ud.role || '').toLowerCase() === 'hod';
  const modules = useMemo(
    () => buildTeacherModules(isHod, canUseFacilities(ud, permissions)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isHod, ud.role, ud.customRoleId, permissions],
  );
  const filtered = modules.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase()));

  const tones = {
    primary: { bg: colors.primarySoft, fg: colors.primary },
    info: { bg: colors.infoSoft, fg: colors.info },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  } as const;

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={[styles.banner, bannerDark]}>
<BannerGlow />
        <View style={styles.bannerTop}>
          <View style={styles.bannerTitleRow}>
            <DotsGridIcon size={22} color="#ffffff" />
            <Text style={styles.bannerTitle}>All Modules</Text>
          </View>
          <View style={styles.countPill}>
            <Text style={styles.countText}>{modules.length} Available</Text>
          </View>
        </View>
        <Text style={styles.bannerDesc}>Browse and access all teaching, student and staff modules.</Text>
      </View>

      <View style={[styles.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSubtle} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search modules..."
          placeholderTextColor={colors.placeholder}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      {filtered.length === 0 ? (
        <Text style={[styles.noMatch, { color: colors.textMuted }]}>No modules found matching "{query}"</Text>
      ) : (
        <View style={styles.grid}>
          {filtered.map((m) => {
            const Icon = m.icon;
            const t = tones[m.tone];
            return (
              <Pressable
                key={m.key}
                onPress={() => nav.navigate(m.key)}
                style={({ pressed }) => [
                  styles.card,
                  { width: cardWidth, backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}>
                <View style={styles.cardTop}>
                  <View style={[styles.iconTile, { backgroundColor: t.bg }]}>
                    <Icon size={22} color={t.fg} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {m.key === 'app-settings' ? <UnreadBadge /> : null}
                    <ChevronRight size={18} color={colors.textSubtle} />
                  </View>
                </View>
                <Text style={[styles.cardName, { color: colors.text }]} numberOfLines={2}>{m.name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 22, padding: 20 },
  bannerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bannerTitle: { color: '#ffffff', fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  countPill: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  countText: { color: '#ffffff', fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  bannerDesc: { color: 'rgba(255,255,255,0.88)', fontSize: fontSize.sm, lineHeight: 21, marginTop: 14 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 12, height: 54, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, marginTop: 16, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: fontSize.md, paddingVertical: 0 },
  noMatch: { textAlign: 'center', paddingVertical: 24, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { borderWidth: 1, borderRadius: 18, padding: 14, minHeight: 104, justifyContent: 'space-between', gap: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  iconTile: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
});