import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, ChevronRight, CreditCard, LayoutDashboard, LayoutTemplate, Mail, Package, Settings, Users } from 'lucide-react-native';

import { useAuth } from '../contexts/AuthContext';
import { ConfirmProvider, useConfirm } from '../contexts/ConfirmContext';
import { useTheme } from '../contexts/ThemeContext';
import { DrawerContent, DrawerLink, DrawerNav, DrawerNavContext } from '../components/layout/DrawerContent';
import { RoleGuard } from '../components/layout/RoleGuard';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { NotificationSheet, useNotifications } from '../components/ui/NotificationSheet';
import { SearchBar } from '../components/ui/SearchBar';
import { SheetModal } from '../components/ui/SheetModal';
import { fontSize, fontWeight } from '../theme/typography';

import SuperDashboardScreen from '../screens/superadmin/SuperDashboardScreen';
import SuperCollegesScreen from '../screens/superadmin/SuperCollegesScreen';
import SuperAdminsScreen from '../screens/superadmin/SuperAdminsScreen';
import GlobalModulesScreen from '../screens/superadmin/GlobalModulesScreen';
import SuperEmailTemplatesScreen from '../screens/superadmin/SuperEmailTemplatesScreen';
import LandingPageSettingsScreen from '../screens/superadmin/LandingPageSettingsScreen';
import SuperSubscriptionsScreen from '../screens/superadmin/SuperSubscriptionsScreen';
import SuperSettingsScreen from '../screens/superadmin/SuperSettingsScreen';

/** Same menu + order as the web SuperAdminLayout `navLinks`. */
const LINKS: DrawerLink[] = [
  { key: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
  { key: 'colleges', name: 'Colleges', icon: Building2 },
  { key: 'admins', name: 'Admins', icon: Users },
  { key: 'modules', name: 'Modules', icon: Package },
  { key: 'email-templates', name: 'Email Templates', icon: Mail },
  { key: 'landing-page', name: 'Landing Page', icon: LayoutTemplate },
  { key: 'subscriptions', name: 'Subscriptions', icon: CreditCard },
  { key: 'settings', name: 'Settings', icon: Settings },
];

const SCREENS: Record<string, React.ComponentType> = {
  dashboard: SuperDashboardScreen,
  colleges: SuperCollegesScreen,
  admins: SuperAdminsScreen,
  modules: GlobalModulesScreen,
  'email-templates': SuperEmailTemplatesScreen,
  'landing-page': LandingPageSettingsScreen,
  subscriptions: SuperSubscriptionsScreen,
  settings: SuperSettingsScreen,
};

function SuperShell() {
  const { colors } = useTheme();
  const { logout } = useAuth();
  const confirm = useConfirm();
  const notifications = useNotifications(true);
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  // Menu opens as a bottom sheet (slides up from the bottom)
  const SHEET_H = Math.min(Math.round(winH * 0.8), 640);

  const [active, setActive] = useState('dashboard');
  const [params, setParams] = useState<Record<string, any>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;

  const openDrawer = useCallback(() => {
    setDrawerMounted(true);
    setDrawerOpen(true);
    Animated.timing(progress, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [progress]);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    Animated.timing(progress, { toValue: 0, duration: 180, useNativeDriver: true }).start(({ finished }) => {
      if (finished) setDrawerMounted(false);
    });
  }, [progress]);

  const navigate = useCallback(
    (key: string, nextParams: Record<string, any> = {}) => {
      if (!SCREENS[key]) return;
      setActive(key);
      setParams(nextParams);
      closeDrawer();
    },
    [closeDrawer],
  );

  // Android back: close drawer -> go back to dashboard -> exit app
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (drawerOpen) {
        closeDrawer();
        return true;
      }
      if (active !== 'dashboard') {
        setActive('dashboard');
        setParams({});
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [active, drawerOpen, closeDrawer]);

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
    () => ({ active, params, navigate, openDrawer, closeDrawer }),
    [active, params, navigate, openDrawer, closeDrawer],
  );

  const filteredLinks = LINKS.filter((l) => l.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const selectFromSearch = (key: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    navigate(key);
  };

  const ActiveScreen = SCREENS[active] || SuperDashboardScreen;

  return (
    <DrawerNavContext.Provider value={nav}>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card }}>
          <ScreenHeader
            onMenuPress={openDrawer}
            onSearchPress={() => setSearchOpen(true)}
            onRefresh={() => setRefreshKey((k) => k + 1)}
            onNotificationsPress={() => {
              notifications.refresh();
              setNotifOpen(true);
            }}
            onProfilePress={() => navigate('settings')}
            unreadCount={notifications.unreadCount}
            avatarText="SA"
          />
        </SafeAreaView>

        {/* key changes on refresh -> screen remounts and re-fetches (same as web window.location.reload) */}
        <View style={styles.flex}>
          <ActiveScreen key={`${active}-${refreshKey}`} />
        </View>

        {drawerMounted ? (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay, opacity: progress }]}>
              <Pressable style={styles.flex} onPress={closeDrawer} />
            </Animated.View>
            <Animated.View
              style={[
                styles.sheet,
                {
                  maxHeight: SHEET_H + insets.bottom,
                  paddingBottom: insets.bottom,
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [SHEET_H + insets.bottom, 0] }) }],
                },
              ]}>
              <View style={[styles.grabber, { backgroundColor: colors.border }]} />
              <DrawerContent
                sheet
                links={LINKS}
                activeKey={active}
                onSelect={(key) => navigate(key)}
                onClose={closeDrawer}
                orgName="Zuna Global HQ"
                orgRole="SUPER ADMIN"
                userName="Super Admin"
                userRole="SUPER ADMIN"
                onLogout={handleLogout}
              />
            </Animated.View>
          </View>
        ) : null}

        <SheetModal visible={searchOpen} onClose={() => { setSearchOpen(false); setSearchQuery(''); }} title="Search modules">
          <SearchBar value={searchQuery} onChangeText={setSearchQuery} placeholder="Search modules..." />
          <View style={{ height: 10 }} />
          {filteredLinks.length === 0 ? (
            <Text style={[styles.noMatch, { color: colors.textMuted }]}>No modules found matching "{searchQuery}"</Text>
          ) : (
            filteredLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Pressable key={link.key} onPress={() => selectFromSearch(link.key)} style={styles.searchRow}>
                  <View style={[styles.searchIcon, { backgroundColor: colors.cardAlt }]}>
                    <Icon size={16} color={colors.textMuted} />
                  </View>
                  <Text style={[styles.searchLabel, { color: colors.text }]}>{link.name}</Text>
                  <ChevronRight size={16} color={colors.textSubtle} />
                </Pressable>
              );
            })
          )}
        </SheetModal>

        <NotificationSheet visible={notifOpen} onClose={() => setNotifOpen(false)} controller={notifications} />
      </View>
    </DrawerNavContext.Provider>
  );
}

/** Super Admin app shell (drawer + header + screens). Rendered by RootNavigator when role === 'superadmin'. */
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
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, overflow: 'hidden' },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginTop: 10, marginBottom: 2 },
  noMatch: { textAlign: 'center', paddingVertical: 20, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  searchIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  searchLabel: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold },
});