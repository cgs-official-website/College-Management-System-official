import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LogOut, Mail, XCircle } from 'lucide-react-native';

import { AuthShell } from '../../components/layout/AuthShell';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { StatusStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<StatusStackParamList, 'Rejected'>;

export default function RejectedScreen(_props: Props) {
  const { logout } = useAuth();
  const { colors } = useTheme();

  return (
    <AuthShell
      title="Registration Rejected"
      subtitle="Unfortunately your college registration was not approved. Please contact support for more details.">
      <View style={[styles.iconWrap, { backgroundColor: colors.dangerSoft }]}>
        <XCircle size={36} color={colors.danger} />
      </View>
      <Button title="Contact Support" icon={Mail} onPress={() => Linking.openURL('mailto:support@zuna.com')} />
      <View style={{ height: 12 }} />
      <Button title="Log Out" variant="outline" icon={LogOut} onPress={logout} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignSelf: 'center', width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
});
