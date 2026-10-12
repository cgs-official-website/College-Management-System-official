import React from 'react';
import { Text, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { normalizeRole } from '../../utils/permissions';
import { useTheme } from '../../contexts/ThemeContext';

export function RoleGuard({ allow, children }: { allow: string[]; children: React.ReactNode }) {
  const { userRole } = useAuth();
  const { colors } = useTheme();
  const role = normalizeRole(userRole);
  if (!allow.map(normalizeRole).includes(role)) {
    return <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}><Text style={{ color: colors.text }}>You are not authorized to view this screen.</Text></View>;
  }
  return <>{children}</>;
}
