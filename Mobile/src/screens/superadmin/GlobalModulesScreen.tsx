import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Building2, CheckCircle2, Package } from 'lucide-react-native';

import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { PageHeader } from '../../components/layout/ScreenHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { api } from '../../api/client';
import { fontSize, fontWeight } from '../../theme/typography';
import { formatNumber } from '../../utils/format';
import { toast } from '../../utils/toast';
import type { ApiEnvelope } from '../../types/api';
import type { ModuleItem, SubscriptionPlan } from '../../types/models';

/**
 * Web: GlobalModulesDashboard.jsx
 * The web page has no backend wiring yet. On mobile the list comes from the existing
 * GET /modules and the adoption count from GET /subscriptions (how many plans include the module).
 */
export default function GlobalModulesScreen() {
  const { colors } = useTheme();
  const stats = useDashboardStats(null, true);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setIsLoading(true);
    try {
      const [modulesRes, plansRes] = await Promise.all([
        api.get<ApiEnvelope<ModuleItem[]>>('/modules'),
        api.get<any>('/subscriptions').catch(() => ({ data: [] })),
      ]);
      setModules(Array.isArray(modulesRes?.data) ? modulesRes.data : []);
      setPlans(Array.isArray(plansRes?.data) ? plansRes.data : []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load modules');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const activePlans = useMemo(() => plans.filter((p) => p.status === 'active'), [plans]);
  const inActivePlans = useMemo(() => {
    const keys = new Set<string>();
    activePlans.forEach((p) => (p.modules || []).forEach((k) => keys.add(k)));
    return keys;
  }, [activePlans]);

  const planCount = (key: string) => activePlans.filter((p) => (p.modules || []).includes(key)).length;

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={refreshing} onRefresh={() => load(true)}>
      <PageHeader
        title="Global Modules"
        subtitle="Manage the availability of Core and Pro modules across all tenant colleges."
      />

      <View style={styles.row}>
        <StatCard title="Total Modules" value={isLoading ? '...' : formatNumber(modules.length)} icon={Package} tone="primary" />
        <View style={styles.gap} />
        <StatCard title="In Active Plans" value={isLoading ? '...' : formatNumber(inActivePlans.size)} icon={CheckCircle2} tone="success" />
      </View>
      <View style={{ height: 12 }} />
      <StatCard
        title="Registered Colleges"
        value={stats.isLoading ? '...' : formatNumber(stats.totalColleges)}
        icon={Building2}
        tone="warning"
      />

      <Text style={[styles.heading, { color: colors.text }]}>Module Configuration</Text>

      {isLoading ? (
        <Loader label="Loading modules..." />
      ) : modules.length === 0 ? (
        <EmptyState icon={Package} title="No Modules Configured" message="There are no global modules configured in the system yet." />
      ) : (
        modules.map((module) => {
          const count = planCount(module.key);
          const pct = activePlans.length ? Math.round((count / activePlans.length) * 100) : 0;
          return (
            <Card key={module.id || module.key} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
                  <Package size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                    {module.label}
                  </Text>
                  <Text style={[styles.key, { color: colors.textSubtle }]} numberOfLines={1}>
                    {module.key}
                  </Text>
                </View>
                <Badge label={count > 0 ? 'Available' : 'Not in plans'} tone={count > 0 ? 'success' : 'neutral'} />
              </View>
              <View style={styles.usageRow}>
                <View style={[styles.track, { backgroundColor: colors.cardAlt }]}>
                  <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                </View>
                <Text style={[styles.pct, { color: colors.textMuted }]}>
                  {count}/{activePlans.length} plans
                </Text>
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  gap: { width: 12 },
  heading: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, marginTop: 24, marginBottom: 12 },
  card: { marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  key: { fontSize: fontSize.xs, marginTop: 2 },
  usageRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  track: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  pct: { marginLeft: 10, fontSize: fontSize.xs, fontWeight: fontWeight.bold },
});
