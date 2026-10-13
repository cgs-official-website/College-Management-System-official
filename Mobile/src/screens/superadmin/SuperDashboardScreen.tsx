import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Building2, Settings, Users } from 'lucide-react-native';

import { Screen } from '../../components/ui/Screen';
import { StatCard } from '../../components/ui/StatCard';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/layout/ScreenHeader';
import { useDrawerNav } from '../../components/layout/DrawerContent';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { formatNumber } from '../../utils/format';

/** Web: SuperAdminLayout -> <SuperDashboardHome/> ("Global Overview"). */
export default function SuperDashboardScreen() {
  const nav = useDrawerNav();
  const stats = useDashboardStats(null, true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await stats.refetch();
    setRefreshing(false);
  };

  const val = (n: number) => (stats.isLoading ? '...' : formatNumber(n));

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        title="Global Overview"
        subtitle="Monitor all institutions across the Zuna ecosystem."
        action={
          <Button
            title="Onboard New College"
            icon={Building2}
            onPress={() => nav.navigate('colleges', { openOnboard: true })}
          />
        }
      />

      <View style={styles.row}>
        <StatCard title="Total Colleges" value={val(stats.totalColleges)} subtitle="Registered institutions" icon={Building2} tone="primary" />
        <View style={styles.gap} />
        <StatCard title="Active Students" value={val(stats.totalStudents)} subtitle="Global enrollment" icon={Users} tone="success" />
      </View>
      <View style={[styles.row, styles.rowGap]}>
        <StatCard title="Total Teachers" value={val(stats.totalTeachers)} subtitle="Global staff" icon={Users} tone="warning" />
        <View style={styles.gap} />
        <StatCard title="System Health" value="100%" subtitle="All systems operational" icon={Settings} tone="info" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  rowGap: { marginTop: 12 },
  gap: { width: 12 },
});
