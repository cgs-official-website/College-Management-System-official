import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check, CheckCircle2, CreditCard, Edit2 } from 'lucide-react-native';

import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SheetModal } from '../../components/ui/SheetModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { PageHeader } from '../../components/layout/ScreenHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { fontSize, fontWeight } from '../../theme/typography';
import { titleCase } from '../../utils/format';
import { toast } from '../../utils/toast';
import type { ModuleItem, SubscriptionPlan } from '../../types/models';

/** Only the fields the backend `updatePlan` accepts. */
const planPayload = (plan: SubscriptionPlan, overrides: Partial<SubscriptionPlan> = {}) => {
  const p = { ...plan, ...overrides };
  return {
    name: p.name,
    price: p.price,
    duration: p.duration,
    storage: p.storage,
    studentCount: p.studentCount,
    status: p.status,
    order: p.order,
    modules: p.modules || [],
  };
};

/**
 * Web: SuperSubscriptions.jsx
 *  GET /subscriptions -> { status: 'success', data }     GET /modules -> { success, data }
 *  PUT /subscriptions/:id
 */
export default function SuperSubscriptionsScreen() {
  const { colors } = useTheme();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [availableModules, setAvailableModules] = useState<ModuleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setIsLoading(true);
    try {
      const [plansRes, modulesRes] = await Promise.all([api.get<any>('/subscriptions'), api.get<any>('/modules').catch(() => null)]);
      if (plansRes?.status === 'success') setPlans(plansRes.data || []);
      else toast.error('Failed to load subscription plans');
      if (modulesRes?.success) setAvailableModules(modulesRes.data || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const labelOf = useMemo(() => {
    const map = new Map(availableModules.map((m) => [m.key, m.label]));
    return (key: string) => map.get(key) || titleCase(key);
  }, [availableModules]);

  const openEdit = (plan: SubscriptionPlan) => {
    setEditing(plan);
    setName(plan.name);
    setPrice(plan.price);
    setSelectedModules(plan.modules || []);
  };

  const toggleModule = (key: string) =>
    setSelectedModules((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const handleToggleStatus = async (plan: SubscriptionPlan) => {
    const newStatus = plan.status === 'active' ? 'inactive' : 'active';
    setTogglingId(plan.id);
    try {
      const res = await api.put<any>(`/subscriptions/${plan.id}`, planPayload(plan, { status: newStatus }));
      if (res?.status === 'success') {
        setPlans((prev) => prev.map((p) => (p.id === plan.id ? res.data : p)));
        toast.success(`Plan marked as ${newStatus}`);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update status');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    if (!name.trim() || !price.trim()) {
      toast.error('Plan name and price are required');
      return;
    }
    setSaving(true);
    try {
      const res = await api.put<any>(
        `/subscriptions/${editing.id}`,
        planPayload(editing, { name: name.trim(), price: price.trim(), modules: selectedModules }),
      );
      if (res?.status === 'success') {
        setPlans((prev) => prev.map((p) => (p.id === editing.id ? res.data : p)));
        setEditing(null);
        toast.success('Plan updated successfully');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update plan');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={refreshing} onRefresh={() => load(true)}>
      <PageHeader
        title="Subscription Plans"
        subtitle="Manage the platform subscription offerings that appear on the landing page."
      />

      {isLoading ? (
        <Loader label="Loading subscription plans..." />
      ) : plans.length === 0 ? (
        <EmptyState icon={CreditCard} title="No subscription plans" message="Plans will appear here once they are created." />
      ) : (
        plans.map((plan) => {
          const active = plan.status === 'active';
          return (
            <Card key={plan.id} style={styles.card}>
              <View style={styles.top}>
                <Badge label={(plan.status || '').toUpperCase()} tone={active ? 'success' : 'danger'} />
                <Pressable onPress={() => openEdit(plan)} hitSlop={8} style={[styles.editBtn, { backgroundColor: colors.cardAlt }]}>
                  <Edit2 size={16} color={colors.textMuted} />
                </Pressable>
              </View>

              <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.price, { color: colors.text }]}>{plan.price}</Text>
                {plan.duration ? <Text style={[styles.per, { color: colors.textMuted }]}> / {plan.duration}</Text> : null}
              </View>

              {plan.storage || plan.studentCount ? (
                <Text style={[styles.limits, { color: colors.textMuted }]}>
                  {[plan.storage && `${plan.storage} storage`, plan.studentCount && `${plan.studentCount} students`].filter(Boolean).join('  •  ')}
                </Text>
              ) : null}

              <View style={styles.features}>
                {(plan.modules || []).map((mod) => (
                  <View key={mod} style={styles.featureRow}>
                    <CheckCircle2 size={16} color={colors.primary} />
                    <Text style={[styles.featureText, { color: colors.text }]}>{labelOf(mod)}</Text>
                  </View>
                ))}
              </View>

              <Button
                title={`Mark as ${active ? 'Inactive' : 'Active'}`}
                variant={active ? 'danger' : 'secondary'}
                loading={togglingId === plan.id}
                onPress={() => handleToggleStatus(plan)}
              />
            </Card>
          );
        })
      )}

      <SheetModal
        visible={!!editing}
        tall
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${editing.name}` : ''}
        footer={
          <View style={{ flexDirection: 'row' }}>
            <Button title="Cancel" variant="outline" onPress={() => setEditing(null)} style={{ flex: 1 }} disabled={saving} />
            <View style={{ width: 12 }} />
            <Button title="Save Changes" onPress={handleSaveEdit} loading={saving} style={{ flex: 1.4 }} />
          </View>
        }>
        <Input label="Plan Name" required value={name} onChangeText={setName} />
        <Input label="Price Text" required value={price} onChangeText={setPrice} placeholder="e.g. ₹999 or Custom" />

        <Text style={[styles.modulesLabel, { color: colors.text }]}>Included Modules</Text>
        <View style={[styles.modulesBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          {availableModules.length === 0 ? (
            <Text style={{ color: colors.textMuted, fontSize: fontSize.sm, padding: 8 }}>No modules available.</Text>
          ) : (
            availableModules.map((mod) => {
              const checked = selectedModules.includes(mod.key);
              return (
                <Pressable key={mod.key} onPress={() => toggleModule(mod.key)} style={styles.checkRow}>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: checked ? colors.primary : colors.border, backgroundColor: checked ? colors.primary : 'transparent' },
                    ]}>
                    {checked ? <Check size={14} color="#fff" /> : null}
                  </View>
                  <Text style={{ color: colors.text, fontSize: fontSize.md, flex: 1 }}>{mod.label}</Text>
                </Pressable>
              );
            })
          )}
        </View>
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 14 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  editBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  planName: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  price: { fontSize: 32, fontWeight: fontWeight.extrabold },
  per: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  limits: { fontSize: fontSize.xs, marginTop: 6 },
  features: { marginTop: 16, marginBottom: 18 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  featureText: { marginLeft: 8, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  modulesLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 8 },
  modulesBox: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12 },
  checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
});
