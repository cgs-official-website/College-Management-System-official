import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Briefcase,
  Bus,
  Calculator,
  Calendar,
  CalendarClock,
  CalendarOff,
  ChevronRight,
  ClipboardList,
  Clock,
  FileEdit,
  FileText,
  Files,
  GraduationCap,
  Home,
  IndianRupee,
  Library as LibraryIcon,
  LayoutDashboard,
  Megaphone,
  MessageSquareWarning,
  Package,
  ShoppingCart,
  Settings as SettingsIcon,
  ShieldCheck,
  UserPlus,
  Users,
  Zap,
  Building,
  BookOpen,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useAuth } from '../contexts/AuthContext';
import { ConfirmProvider, useConfirm } from '../contexts/ConfirmContext';
import { useTheme } from '../contexts/ThemeContext';
import { DrawerContent, DrawerItem, DrawerLink, DrawerNav, DrawerNavContext } from '../components/layout/DrawerContent';
import { RoleGuard } from '../components/layout/RoleGuard';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { NotificationSheet, useNotifications } from '../components/ui/NotificationSheet';
import { RaiseTicketModal } from '../components/ui/RaiseTicketModal';
import { PlaceholderModule } from '../components/ui/PlaceholderModule';
import { SearchBar } from '../components/ui/SearchBar';
import { SheetModal } from '../components/ui/SheetModal';
import { fontSize, fontWeight } from '../theme/typography';

import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import StudentListScreen from '../screens/admin/StudentListScreen';
import AdminStudentDocumentsScreen from '../screens/admin/AdminStudentDocumentsScreen';
import AdmissionScreen from '../screens/admin/AdmissionScreen';
import AcademicStructureScreen from '../screens/admin/AcademicStructureScreen';
import AttendanceScreen from '../screens/admin/AttendanceScreen';
import TimetableScreen from '../screens/admin/TimetableScreen';
import ExamsScreen from '../screens/admin/ExamsScreen';
import HRManagementScreen from '../screens/admin/HRManagementScreen';
import PayrollScreen from '../screens/admin/PayrollScreen';
import LeaveRequestsScreen from '../screens/admin/LeaveRequestsScreen';
import MyLeavesScreen from '../screens/admin/MyLeavesScreen';
import FeesScreen from '../screens/admin/FeesScreen';
import LibraryScreen from '../screens/admin/LibraryScreen';
import InventoryScreen from '../screens/admin/InventoryScreen';
import StoreScreen from '../screens/admin/StoreScreen';
import InfrastructureScreen from '../screens/admin/InfrastructureScreen';
import AssignmentsScreen from '../screens/admin/AssignmentsScreen';
import HostelScreen from '../screens/admin/HostelScreen';
import TransportScreen from '../screens/admin/TransportScreen';
import NoticeBoardScreen from '../screens/admin/NoticeBoardScreen';
import ComplaintsScreen from '../screens/admin/ComplaintsScreen';
import PlacementsScreen from '../screens/admin/PlacementsScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import ApiIntegrationsScreen from '../screens/admin/ApiIntegrationsScreen';
import SettingsScreen from '../screens/admin/SettingsScreen';
import RolesManagementScreen from '../screens/admin/RolesManagementScreen';

/** Modules whose real screen arrives in a later batch -> shows the same PlaceholderModule the web uses. */
const pending = (title: string, icon: LucideIcon) => () => (
  <PlaceholderModule title={title} icon={icon} description={`${title} will be available in the next update.`} />
);

type AdminLink = DrawerLink & { moduleKey: string | null; staffOnly?: boolean };

/** Same menu + order + moduleKeys as the web AdminLayout `navLinks` (Students group is flattened for mobile). */
const buildLinks = (isAdmin: boolean): AdminLink[] => [
  { key: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, moduleKey: null },
  { key: 'admission', name: 'Admission', icon: UserPlus, moduleKey: 'admission' },
  { key: 'students', name: 'Student Directory', icon: GraduationCap, moduleKey: 'students' },
  { key: 'student-documents', name: 'Student Documents', icon: Files, moduleKey: 'students' },
  { key: 'hr', name: 'HR & Staff', icon: Users, moduleKey: 'staff' },
  { key: 'academic-structure', name: 'Academic Structure', icon: BookOpen, moduleKey: 'academic' },
  { key: 'assignments', name: 'Assignments', icon: FileEdit, moduleKey: 'academic' },
  { key: 'timetable', name: 'Timetable', icon: Calendar, moduleKey: 'timetable' },
  { key: 'attendance', name: 'Attendance', icon: Clock, moduleKey: 'attendance' },
  { key: 'leave-requests', name: 'Leave Requests', icon: CalendarOff, moduleKey: isAdmin ? 'attendance' : null },
  { key: 'my-leaves', name: 'MyLeaves', icon: CalendarClock, moduleKey: null, staffOnly: true },
  { key: 'exams', name: 'Exams', icon: ClipboardList, moduleKey: 'exams' },
  { key: 'fees', name: 'Fees & Finance', icon: Calculator, moduleKey: 'fees' },
  { key: 'library', name: 'Library', icon: LibraryIcon, moduleKey: 'library' },
  { key: 'hostel', name: 'Hostel', icon: Home, moduleKey: 'hostel' },
  { key: 'transport', name: 'Transport', icon: Bus, moduleKey: 'transport' },
  { key: 'infrastructure', name: 'Infrastructure', icon: Building, moduleKey: 'infrastructure' },
  { key: 'notices', name: 'Notice Board', icon: Megaphone, moduleKey: 'notices' },
  { key: 'complaints', name: 'Complaints', icon: MessageSquareWarning, moduleKey: null },
  { key: 'placements', name: 'Placements', icon: Briefcase, moduleKey: 'placements' },
  { key: 'reports', name: 'Reports', icon: FileText, moduleKey: 'reports' },
  { key: 'inventory', name: 'Inventory', icon: Package, moduleKey: 'inventory' },
  { key: 'store', name: 'Campus Store', icon: ShoppingCart, moduleKey: 'store' },
  { key: 'payroll', name: 'Payroll', icon: IndianRupee, moduleKey: 'payroll' },
  { key: 'api-integrations', name: 'API Integrations', icon: Zap, moduleKey: 'api_integration' },
  { key: 'settings', name: 'Environment Setup', icon: SettingsIcon, moduleKey: 'settings' },
  { key: 'roles', name: 'Roles & Permissions', icon: ShieldCheck, moduleKey: 'roles' },
];

/**
 * key -> screen. Screens delivered so far are real; the rest are placeholders and get swapped
 * for the real component in the following batches (only this map changes).
 */
const SCREENS: Record<string, React.ComponentType> = {
  dashboard: AdminDashboardScreen,
  students: StudentListScreen,
  'student-documents': AdminStudentDocumentsScreen,
  admission: AdmissionScreen,
  hr: HRManagementScreen,
  'academic-structure': AcademicStructureScreen,
  assignments: AssignmentsScreen,
  timetable: TimetableScreen,
  attendance: AttendanceScreen,
  'leave-requests': LeaveRequestsScreen,
  'my-leaves': MyLeavesScreen,
  exams: ExamsScreen,
  fees: FeesScreen,
  library: LibraryScreen,
  hostel: HostelScreen,
  transport: TransportScreen,
  infrastructure: InfrastructureScreen,
  notices: NoticeBoardScreen,
  complaints: ComplaintsScreen,
  placements: PlacementsScreen,
  reports: ReportsScreen,
  inventory: InventoryScreen,
  store: StoreScreen,
  payroll: PayrollScreen,
  'api-integrations': ApiIntegrationsScreen,
  settings: SettingsScreen,
  roles: RolesManagementScreen,
};

function AdminShell() {
  const { colors } = useTheme();
  const { logout, userData, userRole, permissions } = useAuth();
  const confirm = useConfirm();
  const notifications = useNotifications(true);
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const SHEET_H = Math.min(Math.round(winH * 0.8), 640);

  const [active, setActive] = useState('dashboard');
  const [params, setParams] = useState<Record<string, any>>({});
  const [refreshKey, setRefreshKey] = useState<Record<string, number>>({});
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;

  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  /** Same logic as web AdminLayout.hasAccess */
  const hasAccess = useCallback(
    (moduleKey: string | null) => {
      if (moduleKey && Array.isArray(userData?.allowedModules)) {
        if (!userData!.allowedModules.includes(moduleKey)) return false;
      }
      if (isAdmin) return true;
      if (!moduleKey) return true;
      return permissions?.[moduleKey]?.canRead === true;
    },
    [userData, isAdmin, permissions],
  );

  const links = useMemo<AdminLink[]>(
    () => buildLinks(isAdmin).filter((l) => hasAccess(l.moduleKey)).filter((l) => !l.staffOnly || !isAdmin),
    [isAdmin, hasAccess],
  );

  const drawerItems = useMemo<DrawerItem[]>(() => {
    const items: DrawerItem[] = [];
    const studentChildren = links.filter((l) => l.key === 'students' || l.key === 'student-documents');
    links.forEach((link) => {
      if (link.key === 'students' || link.key === 'student-documents') {
        if (!items.some((item) => item.key === 'students-group')) {
          items.push({ key: 'students-group', name: 'Students', icon: GraduationCap, children: studentChildren });
        }
        return;
      }
      items.push(link);
    });
    return items;
  }, [links]);

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
      // route guard (web: hasAccess ? <Screen/> : <Navigate to="/404"/>)
      if (key !== 'dashboard' && !links.some((l) => l.key === key)) return;
      // Close the drawer first; mount the heavy screen only after the close animation finishes
      // (low-priority update), so the JS thread is free and the animation never stutters.
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
      message: 'You will need to sign in again to access the Admin panel.',
      confirmText: 'Log out',
      isDestructive: false,
    });
    if (ok) await logout();
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

  const fullName = [userData?.firstName, userData?.lastName].filter(Boolean).join(' ').trim() || userData?.name || 'Admin';
  const avatarText =
    `${userData?.firstName?.charAt(0) || 'A'}${userData?.lastName?.charAt(0) || 'D'}`.toUpperCase();


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
            onSupportPress={isAdmin ? () => setSupportOpen(true) : undefined}
            onProfilePress={() => navigate('settings')}
            unreadCount={notifications.unreadCount}
            avatarText={avatarText}
          />
        </SafeAreaView>

        {/* Only mount the active module. Keeping every visited screen mounted was the main
            source of cumulative navigation lag because each screen could keep API effects,
            lists, modals, and listeners alive in the background. */}
        <View style={styles.flex}>
          {(() => {
            const ScreenComponent = SCREENS[active] || AdminDashboardScreen;
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
                items={drawerItems}
                activeKey={active}
                onSelect={(key) => navigate(key)}
                onClose={closeDrawer}
                orgName={userData?.collegeName || 'College Name'}
                orgRole="ADMIN PANEL"
                userName={fullName}
                userRole="ADMIN"
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

        <RaiseTicketModal visible={supportOpen} onClose={() => setSupportOpen(false)} collegeName={userData?.collegeName || 'College Administrator'} />
        <NotificationSheet visible={notifOpen} onClose={() => setNotifOpen(false)} controller={notifications} />
      </View>
    </DrawerNavContext.Provider>
  );
}

/** Admin app shell (drawer + header + screens). Rendered by RootNavigator when role === 'admin'. */
export default function AdminDrawer() {
  return (
    <RoleGuard allow={['admin']}>
      <ConfirmProvider>
        <AdminShell />
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