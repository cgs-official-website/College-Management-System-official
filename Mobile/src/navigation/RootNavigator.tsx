import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DarkTheme, DefaultTheme, NavigationContainer, Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LogOut, Moon, Sun } from 'lucide-react-native';

import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import AuthStack from './AuthStack';
import { linking } from './linking';
import PendingApprovalScreen from '../screens/auth/PendingApprovalScreen';
import RejectedScreen from '../screens/auth/RejectedScreen';
import SuperDrawer from './SuperDrawer';
import AdminDrawer from './AdminDrawer';
import StudentDrawer from './StudentDrawer';
import { Screen } from '../components/ui/Screen';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { fontSize, fontWeight } from '../theme/typography';
import { fullName } from '../utils/format';
import { getRoleLabel, normalizeRole } from '../utils/permissions';
import type { AppStackParamList, StatusStackParamList } from '../types/navigation';

const StatusNav = createNativeStackNavigator<StatusStackParamList>();
const AppNav = createNativeStackNavigator<AppStackParamList>();

function StatusStack({ initial }: { initial: keyof StatusStackParamList }) {
  return (
    <StatusNav.Navigator initialRouteName={initial} screenOptions={{ headerShown: false }}>
      <StatusNav.Screen name="PendingApproval" component={PendingApprovalScreen} />
      <StatusNav.Screen name="Rejected" component={RejectedScreen} />
    </StatusNav.Navigator>
  );
}

/**
 * TEMPORARY home screen for roles that are not built yet. Each next batch replaces this with the real
 * role navigator: ParentDrawer, TeacherDrawer.  (SuperDrawer, AdminDrawer done; StudentDrawer in progress.)
 */
function RoleHomePlaceholder() {
  const { userData, userRole, logout } = useAuth();
  const { colors, isDark, toggleTheme } = useTheme();
  const role = normalizeRole(userRole);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={[styles.hello, { color: colors.textMuted }]}>Logged in successfully</Text>
        <Text style={[styles.name, { color: colors.text }]}>{fullName(userData) || 'Welcome'}</Text>
        <View style={{ marginTop: 10 }}>
          <Badge label={getRoleLabel(role)} tone="primary" />
        </View>
        {userData?.collegeName ? <Text style={[styles.college, { color: colors.textMuted }]}>{userData.collegeName}</Text> : null}
      </View>

      <Card>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Setup complete</Text>
        <Text style={[styles.cardBody, { color: colors.textMuted }]}>
          Authentication, API client, theme and UI components are working. The {getRoleLabel(role)} screens arrive in the next batches.
        </Text>
      </Card>

      <View style={{ height: 16 }} />
      <Button title={isDark ? 'Switch to light mode' : 'Switch to dark mode'} variant="outline" icon={isDark ? Sun : Moon} onPress={toggleTheme} />
      <View style={{ height: 12 }} />
      <Button title="Log out" variant="danger" icon={LogOut} onPress={logout} />
    </Screen>
  );
}

function AppStack({ role }: { role: string }) {
  return (
    <AppNav.Navigator screenOptions={{ headerShown: false }}>
      <AppNav.Screen
        name="Home"
        component={role === 'superadmin' ? SuperDrawer : role === 'admin' ? AdminDrawer : role === 'student' ? StudentDrawer : RoleHomePlaceholder}
      />
    </AppNav.Navigator>
  );
}

export default function RootNavigator() {
  const { currentUser, userRole, userData } = useAuth();
  const { colors, isDark } = useTheme();

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.bg,
      card: colors.card,
      text: colors.text,
      border: colors.border,
    },
  };

  const role = normalizeRole(userRole);
  const collegeStatus = userData?.collegeStatus || userData?.college?.status;

  let content: React.ReactNode;
  if (!currentUser) {
    content = <AuthStack />;
  } else if (role !== 'superadmin' && (collegeStatus === 'pending' || collegeStatus === 'suspended')) {
    content = <StatusStack initial="PendingApproval" />;
  } else if (role !== 'superadmin' && collegeStatus === 'rejected') {
    content = <StatusStack initial="Rejected" />;
  } else {
    content = <AppStack role={role} />;
  }

  return (
    <NavigationContainer theme={navTheme} linking={linking}>
      {content}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginVertical: 32 },
  hello: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  name: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, marginTop: 6, textAlign: 'center' },
  college: { fontSize: fontSize.sm, marginTop: 10 },
  cardTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginBottom: 6 },
  cardBody: { fontSize: fontSize.sm, lineHeight: 21 },
});