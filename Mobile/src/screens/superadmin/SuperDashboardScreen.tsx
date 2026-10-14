import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Building2, Clock, Settings as SettingsIcon, Users } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Screen } from '../../components/ui/Screen';
import { useDrawerNav } from '../../components/layout/DrawerContent';
import { useTheme } from '../../contexts/ThemeContext';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { formatNumber } from '../../utils/format';
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

/** Web: SuperAdminLayout -> <SuperDashboardHome/> ("Global Overview"). Same data hook; only the layout is new. */
export default function SuperDashboardScreen() {
  const { colors } = useTheme();
  const nav = useDrawerNav();
  const stats = useDashboardStats(null, true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await stats.refetch();
    setRefreshing(false);
  };

  const val = (n: number) => (stats.isLoading ? '•••' : formatNumber(n));

  const statCards: {
    label: string;
    value: string;
    caption: string;
    icon: LucideIcon;
    tone: 'info' | 'primary' | 'success' | 'warning';
    captionColor: string;
    go: string;
  }[] = [
    { label: 'TOTAL COLLEGES', value: val(stats.totalColleges), caption: 'Registered institutions', icon: Building2, tone: 'info', captionColor: colors.success, go: 'colleges' },
    { label: 'ACTIVE STUDENTS', value: val(stats.totalStudents), caption: 'Global enrollment', icon: Users, tone: 'success', captionColor: colors.success, go: 'colleges' },
    { label: 'TOTAL TEACHERS', value: val(stats.totalTeachers), caption: 'Global staff', icon: Users, tone: 'warning', captionColor: colors.info, go: 'colleges' },
    { label: 'SYSTEM HEALTH', value: '100%', caption: 'All systems operational', icon: SettingsIcon, tone: 'primary', captionColor: colors.success, go: 'settings' },
  ];
  const tones = {
    primary: { bg: colors.primarySoft, fg: colors.primary },
    info: { bg: colors.infoSoft, fg: colors.info },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
  } as const;

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={refreshing} onRefresh={onRefresh}>
      <View style={[styles.banner, bannerDark]}>
<BannerGlow />
        <Text style={styles.bannerTitle}>Global Overview</Text>
        <Pressable
          onPress={() => nav.navigate('colleges', { openOnboard: true })}
          style={({ pressed }) => [styles.whiteBtn, { opacity: pressed ? 0.85 : 1 }]}>
          <Building2 size={18} color={'#ffffff'} />
          <Text style={[styles.whiteBtnText, { color: '#ffffff' }]}>Onboard New College</Text>
        </Pressable>
        <Text style={styles.greeting}>{greeting(new Date().getHours())}! Monitor all institutions across the Zuna ecosystem.</Text>
        <View style={styles.pillRow}>
          <Pressable onPress={() => nav.navigate('settings')} style={styles.glassPill}>
            <SettingsIcon size={16} color="#ffffff" />
            <Text style={styles.glassText}>Customize</Text>
          </Pressable>
          <LiveClock />
        </View>
      </View>

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
});