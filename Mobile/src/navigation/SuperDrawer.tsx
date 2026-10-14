import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Image, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Activity,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LayoutTemplate,
  LogOut,
  Mail,
  Package,
  Search,
  Settings,
  SlidersHorizontal,
  Users,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useAuth } from '../contexts/AuthContext';
import { ConfirmProvider, useConfirm } from '../contexts/ConfirmContext';
import { useTheme } from '../contexts/ThemeContext';
import { DrawerNav, DrawerNavContext } from '../components/layout/DrawerContent';
import { RoleGuard } from '../components/layout/RoleGuard';
import { MarqueeText } from '../components/ui/MarqueeText';
import { Screen, ScreenInsetContext } from '../components/ui/Screen';
import { BannerGlow, bannerDark } from '../components/ui/BannerGlow';
import { fontSize, fontWeight } from '../theme/typography';

import SuperDashboardScreen from '../screens/superadmin/SuperDashboardScreen';
import SuperCollegesScreen from '../screens/superadmin/SuperCollegesScreen';
import SuperAdminsScreen from '../screens/superadmin/SuperAdminsScreen';
import GlobalModulesScreen from '../screens/superadmin/GlobalModulesScreen';
import SuperEmailTemplatesScreen from '../screens/superadmin/SuperEmailTemplatesScreen';
import LandingPageSettingsScreen from '../screens/superadmin/LandingPageSettingsScreen';
import SuperSubscriptionsScreen from '../screens/superadmin/SuperSubscriptionsScreen';
import SuperSettingsScreen from '../screens/superadmin/SuperSettingsScreen';
import AppSettingsScreen from '../screens/shared/AppSettingsScreen';
import { UnreadBadge } from '../components/ui/UnreadBadge';
import SuperTrafficScreen from '../screens/superadmin/SuperTrafficScreen';

type Tone = 'primary' | 'info' | 'success' | 'warning' | 'danger';
type SuperLink = { key: string; name: string; icon: LucideIcon; tone: Tone };

/** Same menu + order as the web SuperAdminLayout `navLinks` (Dashboard is the home tab). */
const LINKS: SuperLink[] = [
  { key: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, tone: 'primary' },
  { key: 'colleges', name: 'Colleges', icon: Building2, tone: 'info' },
  { key: 'admins', name: 'Admins', icon: Users, tone: 'success' },
  { key: 'traffic', name: 'Traffic', icon: Activity, tone: 'danger' },
  { key: 'modules', name: 'Modules', icon: Package, tone: 'warning' },
  { key: 'email-templates', name: 'Email Templates', icon: Mail, tone: 'danger' },
  { key: 'landing-page', name: 'Landing Page', icon: LayoutTemplate, tone: 'primary' },
  { key: 'subscriptions', name: 'Subscriptions', icon: CreditCard, tone: 'success' },
  { key: 'settings', name: 'Platform Settings', icon: Settings, tone: 'info' },
  { key: 'app-settings', name: 'Settings', icon: SlidersHorizontal, tone: 'primary' },
];

/** Screens are untouched; only the shell around them changed. */
const SCREENS: Record<string, React.ComponentType> = {
  dashboard: SuperDashboardScreen,
  colleges: SuperCollegesScreen,
  admins: SuperAdminsScreen,
  traffic: SuperTrafficScreen,
  modules: GlobalModulesScreen,
  'email-templates': SuperEmailTemplatesScreen,
  'landing-page': LandingPageSettingsScreen,
  subscriptions: SuperSubscriptionsScreen,
  settings: SuperSettingsScreen,
  'app-settings': AppSettingsScreen,
};

/** `all` = the All Modules grid (the real "modules" key above is the Global Modules screen). */
const TABS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'colleges', label: 'Colleges', icon: Building2 },
  { key: 'admins', label: 'Admins', icon: Users },
  { key: 'subscriptions', label: 'Plans', icon: CreditCard },
  { key: 'all', label: 'All Modules', icon: LayoutDashboard },
];
const TAB_KEYS = TABS.map((t) => t.key);

/** Space the floating bar needs under every screen's content. */
const NAV_INSET = 96;

/** 3x3 dots icon used for "All Modules" (bottom bar + banner). */
function DotsGridIcon({ size = 24, color }: { size?: number; color: string }) {
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

function SuperModulesScreen({ onOpen }: { onOpen: (key: string) => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - 32 - 12) / 2);
  const [query, setQuery] = useState('');
  const links = LINKS.filter((l) => l.key !== 'dashboard');
  const filtered = links.filter((m) => m.name.toLowerCase().includes(query.trim().toLowerCase()));

  const tones = {
    primary: { bg: colors.primarySoft, fg: colors.primary },
    info: { bg: colors.infoSoft, fg: colors.info },
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
  } as const;

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={[mod.banner, bannerDark]}>
<BannerGlow />
        <View style={mod.bannerTop}>
          <View style={mod.bannerTitleRow}>
            <DotsGridIcon size={22} color="#ffffff" />
            <Text style={mod.bannerTitle}>All Modules</Text>
          </View>
          <View style={mod.countPill}>
            <Text style={mod.countText}>{links.length} Available</Text>
          </View>
        </View>
        <Text style={mod.bannerDesc}>Manage colleges, admins, subscriptions and platform-wide settings.</Text>
      </View>

      <View style={[mod.search, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Search size={20} color={colors.textSubtle} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search modules..."
          placeholderTextColor={colors.placeholder}
          style={[mod.searchInput, { color: colors.text }]}
        />
      </View>

      {filtered.length === 0 ? (
        <Text style={[mod.noMatch, { color: colors.textMuted }]}>No modules found matching "{query}"</Text>
      ) : (
        <View style={mod.grid}>
          {filtered.map((m) => {
            const Icon = m.icon;
            const t = tones[m.tone];
            return (
              <Pressable
                key={m.key}
                onPress={() => onOpen(m.key)}
                style={({ pressed }) => [
                  mod.card,
                  { width: cardWidth, backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                ]}>
                <View style={mod.cardTop}>
                  <View style={[mod.iconTile, { backgroundColor: t.bg }]}>
                    <Icon size={22} color={t.fg} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {m.key === 'app-settings' ? <UnreadBadge /> : null}
                    <ChevronRight size={18} color={colors.textSubtle} />
                  </View>
                </View>
                <Text style={[mod.cardName, { color: colors.text }]} numberOfLines={2}>{m.name}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}

type Entry = { key: string; params: Record<string, any> };

function SuperShell() {
  const { colors } = useTheme();
  const { logout, userData } = useAuth();
  const superName: string = [(userData as any)?.firstName, (userData as any)?.lastName].filter(Boolean).join(' ').trim() || (userData as any)?.name || 'Super Admin';
  const confirm = useConfirm();
  const insets = useSafeAreaInsets();

  const [stack, setStack] = useState<Entry[]>([{ key: 'dashboard', params: {} }]);
  const current = stack[stack.length - 1];
  const active = current.key;
  const activeTab = TAB_KEYS.includes(active) ? active : 'all';
  const showBackRow = !TAB_KEYS.includes(active);

  const titleOf = (key: string) => LINKS.find((l) => l.key === key)?.name || 'Back';

  const navigate = useCallback((key: string, params: Record<string, any> = {}) => {
    if (key !== 'all' && !SCREENS[key]) return;
    startTransition(() => {
      setStack((prev) => {
        if (key === 'dashboard') return [{ key: 'dashboard', params }];
        const top = prev[prev.length - 1];
        if (top.key === key) return [...prev.slice(0, -1), { key, params }];
        return [...prev, { key, params }];
      });
    });
  }, []);

  const selectTab = useCallback((key: string) => {
    startTransition(() => {
      setStack(key === 'dashboard' ? [{ key: 'dashboard', params: {} }] : [{ key: 'dashboard', params: {} }, { key, params: {} }]);
    });
  }, []);

  const goBack = useCallback(() => {
    startTransition(() => setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev)));
  }, []);

  // Android back: previous screen -> dashboard -> exit app
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stack.length > 1) {
        goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, goBack]);

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Log out?',
      message: 'You will need to sign in again to access the Super Admin panel.',
      confirmText: 'Log out',
      isDestructive: false,
    });
    if (ok) await logout();
  };

  const nav = useMemo<DrawerNav>(
    () => ({ active, params: current.params, navigate, openDrawer: () => {}, closeDrawer: () => {} }),
    [active, current.params, navigate],
  );

  const ScreenComponent = SCREENS[active] || SuperDashboardScreen;

  return (
    <DrawerNavContext.Provider value={nav}>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card }}>
          <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={[styles.logoBox, { backgroundColor: '#ffffff', borderColor: colors.border }]}>
              <Image source={require('../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <View style={styles.headCopy}>
              <MarqueeText style={[styles.college, { color: colors.text }]}>Zuna Global HQ</MarqueeText>
              <View style={styles.officialRow}>
                <CheckCircle2 size={15} color={colors.success} />
                <Text style={[styles.official, { color: colors.success, maxWidth: '45%' }]} numberOfLines={1}>{'Super Admin'}</Text>
                <MarqueeText containerStyle={styles.portalBox} style={[styles.portal, { color: colors.textMuted }]}>{superName}</MarqueeText>
              </View>
            </View>
            <Pressable onPress={() => navigate('settings')} style={[styles.avatar, { backgroundColor: colors.primary }]} accessibilityLabel="Settings">
              <Text style={styles.avatarText}>SA</Text>
            </Pressable>
            <Pressable onPress={handleLogout} style={[styles.logout, { backgroundColor: colors.cardAlt }]} accessibilityLabel="Log out">
              <LogOut size={20} color={colors.textMuted} />
            </Pressable>
          </View>
        </SafeAreaView>

        {showBackRow ? (
          <Pressable onPress={goBack} style={[styles.backRow, { backgroundColor: colors.bg }]} hitSlop={6}>
            <ArrowLeft size={20} color={colors.text} />
            <Text style={[styles.backTitle, { color: colors.text }]} numberOfLines={1}>{titleOf(active)}</Text>
          </Pressable>
        ) : null}

        {/* Only the active module is mounted (keeps navigation fast). */}
        <View style={styles.flex}>
          <ScreenInsetContext.Provider value={NAV_INSET}>
            <View key={active} style={styles.flex}>
              {active === 'all' ? <SuperModulesScreen onOpen={(key) => navigate(key)} /> : <ScreenComponent />}
            </View>
          </ScreenInsetContext.Provider>
        </View>

        {/* Floating bottom bar */}
        <View pointerEvents="box-none" style={[styles.navWrap, { bottom: insets.bottom + 10 }]}>
          <View style={[styles.navBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {TABS.map((tab) => {
              const isActive = tab.key === activeTab;
              const fg = isActive ? colors.primary : colors.textMuted;
              const Icon = tab.icon;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => selectTab(tab.key)}
                  style={[styles.navItem, isActive && { backgroundColor: colors.primarySoft }]}>
                  {tab.key === 'all' ? <DotsGridIcon size={22} color={fg} /> : <Icon size={23} color={fg} strokeWidth={1.8} />}
                  <Text style={[styles.navLabel, { color: fg }, isActive && { fontWeight: fontWeight.bold }]} numberOfLines={1}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </DrawerNavContext.Provider>
  );
}

/** Super Admin app shell (portal header + screens + floating bottom bar). Rendered by RootNavigator when role === 'superadmin'. */
export default function SuperDrawer() {
  return (
    <RoleGuard allow={['superadmin']}>
      <ConfirmProvider>
        <SuperShell />
      </ConfirmProvider>
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  logoBox: { width: 54, height: 54, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 4 },
  logo: { width: '100%', height: '100%', borderRadius: 10 },
  headCopy: { flex: 1 },
  college: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  officialRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  official: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  portalBox: { flex: 1 },
  portal: { flexShrink: 1, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#ffffff', fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  logout: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 12 },
  backTitle: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  navWrap: { position: 'absolute', left: 14, right: 14 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 34,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 10,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: 26 },
  navLabel: { fontSize: 11, fontWeight: fontWeight.semibold },
});

const mod = StyleSheet.create({
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