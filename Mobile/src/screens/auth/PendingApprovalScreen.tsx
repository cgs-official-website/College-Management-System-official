import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Building2, Clock, LogOut, Mail, RefreshCw } from 'lucide-react-native';

import { AuthShell } from '../../components/layout/AuthShell';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';
import type { StatusStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<StatusStackParamList, 'PendingApproval'>;

const POLL_MS = 10_000;

export default function PendingApprovalScreen({ navigation }: Props) {
  const { userData, logout, restoreSession } = useAuth();
  const { colors } = useTheme();
  const checkingRef = useRef(false);
  const [checking, setChecking] = useState(false);
  const [info, setInfo] = useState({
    name: userData?.collegeName || 'Your Institution',
    id: userData?.collegeId || '',
    status: userData?.collegeStatus || 'pending',
    code: '',
  });

  const checkStatus = useCallback(
    async (isManual = false) => {
      if (checkingRef.current) return;
      checkingRef.current = true;
      setChecking(true);
      try {
        const response = await api.get('/colleges/me/status');
        const data = response.data?.data || response.data;
        if (data?.status) {
          setInfo((prev) => ({
            name: data.collegeName || prev.name,
            id: data.collegeId || prev.id,
            status: data.status,
            code: data.collegeCode || data.registrationNo || prev.code,
          }));

          if (data.status === 'active' || data.status === 'trial') {
            toast.success('College approved! Opening your dashboard...');
            await restoreSession(); // RootNavigator swaps to the app automatically
            return;
          }
          if (data.status === 'rejected') {
            navigation.replace('Rejected');
            return;
          }
          if (isManual) toast.info('Still waiting', 'Your college is pending Super Admin review.');
        }
      } catch {
        if (isManual) toast.error('Unable to fetch live status. Please check your connection.');
      } finally {
        checkingRef.current = false;
        setChecking(false);
      }
    },
    [navigation, restoreSession],
  );

  useEffect(() => {
    const id = setInterval(() => checkStatus(false), POLL_MS);
    return () => clearInterval(id);
  }, [checkStatus]);

  const suspended = info.status === 'suspended';

  return (
    <AuthShell
      title={suspended ? 'Account Suspended' : 'Waiting for Approval'}
      subtitle={
        suspended
          ? 'Your college account is currently suspended. Please contact support.'
          : 'Your college registration has been submitted and is waiting for Super Admin review. You will get access automatically once approved.'
      }>
      <View style={[styles.iconWrap, { backgroundColor: colors.warningSoft }]}>
        <Clock size={34} color={colors.warning} />
      </View>

      <Card padded style={{ marginBottom: 16, backgroundColor: colors.cardAlt }}>
        <View style={styles.rowBetween}>
          <Text style={[styles.cap, { color: colors.textSubtle }]}>Institution</Text>
          <Badge label={suspended ? 'Suspended' : 'Pending Review'} tone={suspended ? 'danger' : 'warning'} small />
        </View>
        <View style={styles.nameRow}>
          <Building2 size={16} color={colors.primary} />
          <Text style={[styles.name, { color: colors.text }]}>{info.name}</Text>
        </View>
        {info.code ? <Text style={[styles.meta, { color: colors.textMuted }]}>Code: {info.code}</Text> : null}
        {info.id ? <Text style={[styles.meta, { color: colors.textSubtle }]}>ID: {info.id.substring(0, 8)}</Text> : null}
      </Card>

      <Button title={checking ? 'Checking Status...' : 'Check Approval Status'} icon={RefreshCw} loading={checking} onPress={() => checkStatus(true)} />
      <View style={{ height: 12 }} />
      <Button title="Log Out" variant="outline" icon={LogOut} onPress={logout} />
      <View style={{ height: 8 }} />
      <Button title="Contact Support" variant="ghost" icon={Mail} onPress={() => Linking.openURL('mailto:support@zuna.com')} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignSelf: 'center', width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cap: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  name: { marginLeft: 8, fontSize: fontSize.md, fontWeight: fontWeight.bold, flexShrink: 1 },
  meta: { fontSize: fontSize.xs, marginTop: 6 },
});
