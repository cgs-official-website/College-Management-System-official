import React, { startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  LayoutGrid,
  LogOut,
  Users,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useAuth } from '../contexts/AuthContext';
import { ConfirmProvider, useConfirm } from '../contexts/ConfirmContext';
import { useTheme } from '../contexts/ThemeContext';
import { DrawerNav, DrawerNavContext } from '../components/layout/DrawerContent';
import { RoleGuard } from '../components/layout/RoleGuard';
import { ScreenInsetContext } from '../components/ui/Screen';
import { MarqueeText } from '../components/ui/MarqueeText';
import { fontSize, fontWeight } from '../theme/typography';

import TeacherDashboardScreen from '../screens/teacher/TeacherDashboardScreen';
import TeacherClassesScreen from '../screens/teacher/TeacherClassesScreen';
import TeacherScheduleScreen from '../screens/teacher/TeacherScheduleScreen';
import TeacherSettingsScreen from '../screens/teacher/TeacherSettingsScreen';
import AppSettingsScreen from '../screens/shared/AppSettingsScreen';
import TeacherAttendanceScreen from '../screens/teacher/TeacherAttendanceScreen';
import TeacherAssignmentsScreen from '../screens/teacher/TeacherAssignmentsScreen';
import TeacherGradesScreen from '../screens/teacher/TeacherGradesScreen';
import TeacherComplaintsScreen from '../screens/teacher/TeacherComplaintsScreen';
import TeacherMyLeavesScreen from '../screens/teacher/TeacherMyLeavesScreen';
import TeacherPayrollScreen from '../screens/teacher/TeacherPayrollScreen';
import TeacherPtmScreen from '../screens/teacher/TeacherPtmScreen';
import ProjectTimesheetScreen from '../screens/teacher/ProjectTimesheetScreen';
import HODFacilityRequestsScreen from '../screens/teacher/HODFacilityRequestsScreen';
import TeacherModulesScreen, { DotsGridIcon, canUseFacilities } from '../screens/teacher/TeacherModulesScreen';
import LeaveRequestsScreen from '../screens/admin/LeaveRequestsScreen';
import TimetableScreen from '../screens/admin/TimetableScreen';

/** Bottom bar: 4 quick tabs + "All Modules" (every other module opens from All Modules). */
const TABS: { key: string; label: string; icon: LucideIcon }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
  { key: 'classes', label: 'Classes', icon: Users },
  { key: 'attendance', label: 'Attendance', icon: CalendarDays },
  { key: 'schedule', label: 'Schedule', icon: CalendarClock },
  { key: 'modules', label: 'All Modules', icon: LayoutGrid },
];
const TAB_KEYS = TABS.map((t) => t.key);

/** Screen titles for the back row shown on modules opened from All Modules. */
const TITLES: Record<string, string> = {
  settings: 'Account Settings',
  'app-settings': 'Settings',
  assignments: 'Assignments',
  grades: 'Marks & Grading',
  complaints: 'Complaints',
  projects: 'Projects',
  payroll: 'Payroll',
  myleaves: 'My Leaves',
  studentleaves: 'Student Leaves',
  ptm: 'PTM Meetings',
  facility: 'Facility Requests',
  timetable: 'Manage Timetable',
};

/**
 * key -> screen (all teacher modules delivered).
 */
const SCREENS: Record<string, React.ComponentType> = {
  // ---- batch 1
  dashboard: TeacherDashboardScreen,
  modules: TeacherModulesScreen,
  classes: TeacherClassesScreen,
  schedule: TeacherScheduleScreen,
  settings: TeacherSettingsScreen,
  'app-settings': AppSettingsScreen,
  studentleaves: LeaveRequestsScreen, // web reuses admin LeaveRequestsDashboard for teachers
  timetable: TimetableScreen, // HOD only (web reuses admin Timetable)
  // ---- batch 2
  attendance: TeacherAttendanceScreen,
  assignments: TeacherAssignmentsScreen,
  grades: TeacherGradesScreen,
  // ---- batch 3
  complaints: TeacherComplaintsScreen,
  myleaves: TeacherMyLeavesScreen,
  payroll: TeacherPayrollScreen,
  // ---- batch 4
  projects: ProjectTimesheetScreen,
  ptm: TeacherPtmScreen,
  facility: HODFacilityRequestsScreen, // HOD / facility-permission only (guarded in `allowed`)
};

/** Space the floating bar needs under every screen's content. */
const NAV_INSET = 96;

type Entry = { key: string; params: Record<string, any> };

function TeacherShell() {
  const { colors } = useTheme();
  const { userData, permissions, logout } = useAuth();
  const confirm = useConfirm();
  const insets = useSafeAreaInsets();

  const [stack, setStack] = useState<Entry[]>([{ key: 'dashboard', params: {} }]);

  const current = stack[stack.length - 1];
  const active = current.key;
  const activeTab = TAB_KEYS.includes(active) ? active : 'modules';
  const showBackRow = !TAB_KEYS.includes(active);

  const ud: any = userData || {};
  const isHod = String(ud.role || '').toLowerCase() === 'hod';
  const facilities = canUseFacilities(ud, permissions);

  // Same route guards as web TeacherLayout (facility-requests / timetable are conditional routes).
  const allowed = useCallback(
    (key: string) => {
      if (!SCREENS[key]) return false;
      if (key === 'timetable') return isHod;
      if (key === 'facility') return facilities;
      return true;
    },
    [isHod, facilities],
  );

  const navigate = useCallback(
    (key: string, params: Record<string, any> = {}) => {
      if (!allowed(key)) return;
      startTransition(() => {
        setStack((prev) => {
          if (key === 'dashboard') return [{ key: 'dashboard', params }];
          const top = prev[prev.length - 1];
          if (top.key === key) return [...prev.slice(0, -1), { key, params }];
          return [...prev, { key, params }];
        });
      });
    },
    [allowed],
  );

  const selectTab = useCallback((key: string) => {
    startTransition(() => {
      setStack(key === 'dashboard' ? [{ key: 'dashboard', params: {} }] : [{ key: 'dashboard', params: {} }, { key, params: {} }]);
    });
  }, []);

  const goBack = useCallback(() => {
    startTransition(() => setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev)));
  }, []);

  // If a guarded screen becomes disallowed (role/permissions load late) -> fall back to the dashboard.
  useEffect(() => {
    if (!allowed(active)) setStack([{ key: 'dashboard', params: {} }]);
  }, [allowed, active]);

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
      message: 'You will need to sign in again to access the Teacher portal.',
      confirmText: 'Log out',
      isDestructive: false,
    });
    if (ok) await logout();
  };

  const nav = useMemo<DrawerNav>(
    () => ({ active, params: current.params, navigate, openDrawer: () => {}, closeDrawer: () => {} }),
    [active, current.params, navigate],
  );

  const fullName = ud.name || [ud.firstName, ud.lastName].filter(Boolean).join(' ').trim() || 'Teacher';
  const avatarText = String(ud.firstName?.charAt(0) || fullName.charAt(0) || 'T').toUpperCase();
  const portalLabel = isHod ? 'HOD portal' : 'Teacher portal';

  const ScreenComponent = SCREENS[active] || TeacherDashboardScreen;

  return (
    <DrawerNavContext.Provider value={nav}>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.card }}>
          <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
            <View style={[styles.logoBox, { backgroundColor: '#ffffff', borderColor: colors.border }]}>
              <Image
                source={ud.collegeLogo ? { uri: ud.collegeLogo } : require('../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <View style={styles.headCopy}>
              <MarqueeText style={[styles.college, { color: colors.text }]}>{ud.collegeName || 'My College'}</MarqueeText>
              <View style={styles.officialRow}>
                <CheckCircle2 size={15} color={colors.success} />
                <Text style={[styles.official, { color: colors.success, maxWidth: '45%' }]} numberOfLines={1}>{ud.customRole?.name || ud.roleName || (isHod ? 'HOD' : String(ud.role || '').toLowerCase() === 'faculty' ? 'Faculty' : 'Teacher')}</Text>
                <MarqueeText containerStyle={styles.portalBox} style={[styles.portal, { color: colors.textMuted }]}>{fullName}</MarqueeText>
              </View>
            </View>
            <Pressable onPress={() => navigate('settings')} style={[styles.avatar, { backgroundColor: colors.primary }]} accessibilityLabel="Account settings">
              <Text style={styles.avatarText}>{avatarText}</Text>
            </Pressable>
            <Pressable onPress={handleLogout} style={[styles.logout, { backgroundColor: colors.cardAlt }]} accessibilityLabel="Log out">
              <LogOut size={20} color={colors.textMuted} />
            </Pressable>
          </View>
        </SafeAreaView>

        {showBackRow ? (
          <Pressable onPress={goBack} style={[styles.backRow, { backgroundColor: colors.bg }]} hitSlop={6}>
            <ArrowLeft size={20} color={colors.text} />
            <Text style={[styles.backTitle, { color: colors.text }]} numberOfLines={1}>{TITLES[active] || 'Back'}</Text>
          </Pressable>
        ) : null}

        {/* Only the active module is mounted (same performance approach as AdminDrawer / StudentDrawer). */}
        <View style={styles.flex}>
          <ScreenInsetContext.Provider value={NAV_INSET}>
            <View key={active} style={styles.flex}>
              <ScreenComponent />
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
                  {tab.key === 'modules' ? <DotsGridIcon size={22} color={fg} /> : <Icon size={23} color={fg} strokeWidth={1.8} />}
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

/** Teacher app shell (portal header + screens + floating bottom bar). Rendered by RootNavigator for 'teacher' | 'hod' | 'faculty'. */
export default function TeacherDrawer() {
  return (
    <RoleGuard allow={['teacher', 'hod', 'faculty']}>
      <ConfirmProvider>
        <TeacherShell />
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