import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Briefcase,
  Bus,
  Calculator,
  Calendar,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  Files,
  Home,
  LayoutDashboard,
  Library as LibraryIcon,
  Megaphone,
  MessageSquareWarning,
  BookOpen,
  Settings as SettingsIcon,
  Video,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useAuth } from '../contexts/AuthContext';
import { ConfirmProvider, useConfirm } from '../contexts/ConfirmContext';
import { useTheme } from '../contexts/ThemeContext';
import { DrawerContent, DrawerLink, DrawerNav, DrawerNavContext } from '../components/layout/DrawerContent';
import { RoleGuard } from '../components/layout/RoleGuard';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { NotificationSheet, useNotifications } from '../components/ui/NotificationSheet';
import { PlaceholderModule } from '../components/ui/PlaceholderModule';
import { SearchBar } from '../components/ui/SearchBar';
import { SheetModal } from '../components/ui/SheetModal';
import { clearStudentPortalCache, useStudentProfile } from '../hooks/useStudentPortal';
import { fontSize, fontWeight } from '../theme/typography';

import StudentDashboardScreen from '../screens/student/StudentDashboardScreen';
import StudentCoursesScreen from '../screens/student/StudentCoursesScreen';
import StudentAssignmentsScreen from '../screens/student/StudentAssignmentsScreen';
import StudentAttendanceScreen from '../screens/student/StudentAttendanceScreen';
import StudentTimetableScreen from '../screens/student/StudentTimetableScreen';
import StudentExamsScreen from '../screens/student/StudentExamsScreen';
import StudentFeesScreen from '../screens/student/StudentFeesScreen';
import StudentNoticesScreen from '../screens/student/StudentNoticesScreen';
import StudentLibraryScreen from '../screens/student/StudentLibraryScreen';
import StudentHostelScreen from '../screens/student/StudentHostelScreen';
import StudentTransportScreen from '../screens/student/StudentTransportScreen';
import StudentPlacementsScreen from '../screens/student/StudentPlacementsScreen';
import StudentPtmScreen from '../screens/student/StudentPtmScreen';
import StudentComplaintsScreen from '../screens/student/StudentComplaintsScreen';
import StudentDocumentsScreen from '../screens/student/StudentDocumentsScreen';
import StudentSettingsScreen from '../screens/student/StudentSettingsScreen';

/** Modules whose real screen arrives in a later batch -> same PlaceholderModule the web uses. */
const pending = (title: string, icon: LucideIcon) => () => (
  <PlaceholderModule title={title} icon={icon} description={`${title} will be available in the next update.`} />
);

type StudentLink = DrawerLink & { show?: boolean };

/** Same menu + order as the web StudentLayout `allNavLinks` (Hostel only for hostellers, Transport only for day scholars). */
const buildLinks = (isHosteller: boolean): StudentLink[] =>
  (
    [
      { key: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
      { key: 'courses', name: 'My Courses', icon: BookOpen },
      { key: 'assignments', name: 'Assignments', icon: FileBarChart },
      { key: 'attendance', name: 'Attendance', icon: CheckSquare },
      { key: 'timetable', name: 'Timetable', icon: Calendar },
      { key: 'exams', name: 'Exams & Results', icon: ClipboardList },
      { key: 'fees', name: 'Fees & Finance', icon: Calculator },
      { key: 'notices', name: 'Notice Board', icon: Megaphone },
      { key: 'ptm', name: 'PTM Meetings', icon: Video },
      { key: 'library', name: 'Library', icon: LibraryIcon },
      { key: 'hostel', name: 'Hostel', icon: Home, show: isHosteller },
      { key: 'transport', name: 'Transport', icon: Bus, show: !isHosteller },
      { key: 'placement', name: 'Placements', icon: Briefcase },
      { key: 'complaints', name: 'Complaints', icon: MessageSquareWarning },
      { key: 'documents', name: 'Documents', icon: Files },
      { key: 'settings', name: 'Settings', icon: SettingsIcon },
    ] as StudentLink[]
  ).filter((l) => l.show === undefined || l.show === true);

/**
 * key -> screen. Delivered screens are real; the rest are placeholders that get swapped
 * for the real component in the next batches (only this map + the imports change).
 */
const SCREENS: Record<string, React.ComponentType> = {
  dashboard: StudentDashboardScreen,
  courses: StudentCoursesScreen,
  assignments: StudentAssignmentsScreen,
  attendance: StudentAttendanceScreen,
  // ---- batch 2
  timetable: StudentTimetableScreen,
  exams: StudentExamsScreen,
  fees: StudentFeesScreen,
  notices: StudentNoticesScreen,
  // ---- batch 3
  library: StudentLibraryScreen,
  hostel: StudentHostelScreen,
  transport: StudentTransportScreen,
  placement: StudentPlacementsScreen,
  // ---- batch 4
  ptm: StudentPtmScreen,
  complaints: StudentComplaintsScreen,
  documents: StudentDocumentsScreen,
  settings: StudentSettingsScreen,
};

function StudentShell() {
  const { colors } = useTheme();
  const { logout, userData } = useAuth();
  const confirm = useConfirm();
  const notifications = useNotifications(true);
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const SHEET_H = Math.min(Math.round(winH * 0.8), 640);

  const { data: profile } = useStudentProfile();

  const [active, setActive] = useState('dashboard');
  const [params, setParams] = useState<Record<string, any>>({});
  const [refreshKey, setRefreshKey] = useState<Record<string, number>>({});
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;

  // Same logic as web StudentLayout: residence type decides Hostel vs Transport.
  const residenceType = String(profile?.residenceType || (userData as any)?.residenceType || 'Day Scholar').toLowerCase();
  const isHosteller = residenceType.includes('hostel');

  const links = useMemo<StudentLink[]>(() => buildLinks(isHosteller), [isHosteller]);

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
      // route guard (web: isHosteller ? <StudentHostel/> : <Navigate to="/student"/>)
      if (key !== 'dashboard' && !links.some((l) => l.key === key)) return;
      closeDrawer();
      setTimeout(() => {
        startTransition(() => {
          setParams(nextParams);
          setActive(key);
        });
      }, 190);
    },
    [closeDrawer, links],
  );

  // If residence type changes while on Hostel/Transport (profile loads late) -> fall back to dashboard.
  useEffect(() => {
    if (active !== 'dashboard' && !links.some((l) => l.key === active)) setActive('dashboard');
  }, [links, active]);

  // Android back: close drawer -> go back to dashboard -> exit app
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (drawerOpen) {
        closeDrawer();
        return true;
      }
      if (active !== 'dashboard') {
        setParams({});
        setActive('dashboard');
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [active, drawerOpen, closeDrawer]);

  const handleLogout = async () => {
    const ok = await confirm({
      title: 'Log out?',
      message: 'You will need to sign in again to access the Student portal.',
      confirmText: 'Log out',
      isDestructive: false,
    });
    if (ok) {
      clearStudentPortalCache();
      await logout();
    }
  };

  const nav = useMemo<DrawerNav>(
    () => ({ active, params, navigate, openDrawer, closeDrawer }),
    [active, params, navigate, openDrawer, closeDrawer],
  );

  const filteredLinks = links.filter((l) => l.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));
  const selectFromSearch = (key: string) => {
    setSearchOpen(false);
    setSearchQuery('');
    navigate(key);
  };

  const fullName =
    profile?.name ||
    [userData?.firstName, userData?.lastName].filter(Boolean).join(' ').trim() ||
    userData?.name ||
    'Student';
  const avatarText = `${userData?.firstName?.charAt(0) || fullName.charAt(0) || 'S'}${userData?.lastName?.charAt(0) || ''}`.toUpperCase();

  return (
    <DrawerNavContext.Provider value={nav}>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card }}>
          <ScreenHeader
            onMenuPress={openDrawer}
            onSearchPress={() => setSearchOpen(true)}
            onRefresh={() => setRefreshKey((current) => ({ ...current, [active]: (current[active] || 0) + 1 }))}
            onNotificationsPress={() => {
              notifications.refresh();
              setNotifOpen(true);
            }}
            onProfilePress={() => navigate('settings')}
            unreadCount={notifications.unreadCount}
            avatarText={avatarText}
          />
        </SafeAreaView>

        {/* Only the active module is mounted (same performance approach as AdminDrawer). */}
        <View style={styles.flex}>
          {(() => {
            const ScreenComponent = SCREENS[active] || StudentDashboardScreen;
            const version = refreshKey[active] || 0;
            return (
              <View key={`${active}-${version}`} style={styles.flex}>
                <ScreenComponent />
              </View>
            );
          })()}
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
                items={links}
                activeKey={active}
                onSelect={(key) => navigate(key)}
                onClose={closeDrawer}
                orgName={userData?.collegeName || profile?.collegeName || 'College Name'}
                orgRole={`STUDENT • ${isHosteller ? 'HOSTELLER' : 'DAY SCHOLAR'}`}
                userName={fullName}
                userRole="STUDENT PORTAL"
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

/** Student app shell (drawer + header + screens). Rendered by RootNavigator when role === 'student'. */
export default function StudentDrawer() {
  return (
    <RoleGuard allow={['student']}>
      <ConfirmProvider>
        <StudentShell />
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