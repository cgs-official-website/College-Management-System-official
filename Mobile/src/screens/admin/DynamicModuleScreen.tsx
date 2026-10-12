import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Layers, Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { api } from '../../api/client';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { SheetModal } from '../../components/ui/SheetModal';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

const prettify = (slug?: string) => (slug || '').replace(/-/g, ' ');

/**
 * Web: modules/dynamic/DynamicDashboard.jsx  (route /admin/dynamic/:entitySlug)
 * Endpoints: GET /builder/fields/:slug, GET/POST/DELETE /dynamic/:slug
 * The slug comes from `entitySlug` prop or `route.params.entitySlug`; when neither is given the screen
 * lists the college's custom entities (GET /builder/entities) so the user can pick one.
 */
export default function DynamicModuleScreen(props: any) {
  const { colors } = useTheme();
  const confirm = useConfirm();

  const initialSlug: string | undefined = props?.entitySlug || props?.route?.params?.entitySlug;
  const [entitySlug, setEntitySlug] = useState<string | undefined>(initialSlug);
  const [entities, setEntities] = useState<any[]>([]);
  const [isLoadingEntities, setIsLoadingEntities] = useState(!initialSlug);

  const [fields, setFields] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(!!initialSlug);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => { if (initialSlug) setEntitySlug(initialSlug); }, [initialSlug]);

  useEffect(() => {
    if (initialSlug) return;
    let cancelled = false;
    api.get<any>('/builder/entities')
      .then((res) => { if (!cancelled) setEntities(Array.isArray(res?.data) ? res.data : []); })
      .catch((err) => { if (!cancelled) toast.error(err?.message || 'Failed to load custom modules'); })
      .finally(() => { if (!cancelled) setIsLoadingEntities(false); });
    return () => { cancelled = true; };
  }, [initialSlug]);

  const load = useCallback(async () => {
    if (!entitySlug) { setIsLoading(false); return; }
    try {
      const [fieldsRes, recordsRes] = await Promise.all([
        api.get<any>(`/builder/fields/${entitySlug}`),
        api.get<any>(`/dynamic/${entitySlug}`),
      ]);
      setFields(fieldsRes?.data?.fields || []);
      setSections(fieldsRes?.data?.sections || []);
      setRecords(Array.isArray(recordsRes?.data) ? recordsRes.data : []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load module');
    } finally {
      setIsLoading(false);
    }
  }, [entitySlug]);

  useEffect(() => { setIsLoading(!!entitySlug); setFields([]); setSections([]); setRecords([]); void load(); }, [entitySlug, load]);

  const setValue = (key: string, value: any) => { setFormData((p) => ({ ...p, [key]: value })); setErrors((p) => ({ ...p, [key]: '' })); };

  const handleSubmit = async () => {
    const e: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.isRequired && f.type !== 'boolean' && !String(formData[f.key] ?? '').trim()) e[f.key] = `${f.name} is required`;
    });
    setErrors(e);
    if (Object.keys(e).length) return;
    setIsSaving(true);
    try {
      await api.post(`/dynamic/${entitySlug}`, formData);
      toast.success('Record saved!');
      setFormData({});
      setIsFormOpen(false);
      await load();
    } catch {
      toast.error('Failed to save record');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!(await confirm({ title: 'Delete Record', message: 'Are you sure you want to delete this record? This action cannot be undone.', confirmText: 'Delete Record', isDestructive: true }))) return;
    try {
      await api.delete(`/dynamic/${entitySlug}/${id}`);
      toast.success('Record deleted!');
      await load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const renderField = (field: any) => {
    if (field.type === 'boolean') {
      return (
        <View key={field.id} style={styles.boolRow}>
          <Text style={[styles.boolLabel, { color: colors.text }]}>{field.name}</Text>
          <Switch value={!!formData[field.key]} onValueChange={(v) => setValue(field.key, v)} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
        </View>
      );
    }
    return (
      <Input
        key={field.id}
        label={field.name}
        required={!!field.isRequired}
        placeholder={field.type === 'date' ? 'YYYY-MM-DD' : undefined}
        keyboardType={field.type === 'number' ? 'decimal-pad' : 'default'}
        value={String(formData[field.key] ?? '')}
        onChangeText={(x) => setValue(field.key, field.type === 'number' ? x.replace(/[^0-9.\-]/g, '') : x)}
        error={errors[field.key]}
      />
    );
  };

  // ---- no entity chosen yet: let the user pick one ----
  if (!entitySlug) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <Text style={[styles.title, { color: colors.text }]}>Custom Modules</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Manage dynamic records.</Text>
        {isLoadingEntities ? (
          <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : entities.length === 0 ? (
          <EmptyState icon={Layers} title="No custom modules yet" message="Custom modules created with the Module Builder will appear here." />
        ) : (
          <View style={{ marginTop: 16 }}>
            <Select label="Select a module" value={null} onChange={setEntitySlug} options={entities.map((en) => ({ value: en.slug, label: en.name }))} placeholder="Choose a custom module..." />
          </View>
        )}
      </Screen>
    );
  }

  if (isLoading) {
    return (
      <Screen edges={['left', 'right', 'bottom']} contentContainerStyle={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textMuted, marginTop: 12 }}>Loading module...</Text>
      </Screen>
    );
  }

  const uncategorized = fields.filter((f) => !f.sectionId);
  const shown = fields.slice(0, 5);

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => { setIsRefreshing(true); await load(); setIsRefreshing(false); }}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text, textTransform: 'capitalize' }]}>{prettify(entitySlug)}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Manage dynamic records.</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button title="Add Record" size="sm" fullWidth={false} icon={Plus} onPress={() => { setFormData({}); setErrors({}); setIsFormOpen(true); }} />
        {!initialSlug ? (
          <>
            <View style={{ width: 8 }} />
            <Button title="Change Module" size="sm" variant="outline" fullWidth={false} onPress={() => setEntitySlug(undefined)} />
          </>
        ) : null}
      </View>

      {records.length === 0 ? (
        <EmptyState icon={Layers} title="No records found." />
      ) : (
        records.map((record) => (
          <Card key={record.id} style={styles.card}>
            <View style={styles.top}>
              <View style={{ flex: 1 }}>
                {fields.length === 0 ? <Text style={{ color: colors.textMuted }}>No fields defined</Text> : null}
                {shown.map((field) => (
                  <View key={field.id} style={styles.kv}>
                    <Text style={[styles.k, { color: colors.textMuted }]}>{field.name}</Text>
                    <Text style={[styles.v, { color: colors.text }]} numberOfLines={2}>{String(record.data?.[field.key] ?? '-')}</Text>
                  </View>
                ))}
              </View>
              <Pressable onPress={() => handleDelete(record.id)} hitSlop={10} style={styles.delBtn}><Trash2 size={17} color={colors.danger} /></Pressable>
            </View>
          </Card>
        ))
      )}

      <SheetModal
        visible={isFormOpen} onClose={() => setIsFormOpen(false)} title="Add Record" tall
        footer={
          <View style={styles.footer}>
            <Button title="Cancel" variant="outline" onPress={() => setIsFormOpen(false)} style={styles.flex} />
            <View style={{ width: 10 }} />
            <Button title="Save Record" loading={isSaving} onPress={handleSubmit} style={styles.flex} />
          </View>
        }>
        {fields.length === 0 ? <Text style={{ color: colors.textMuted }}>No fields defined for this module yet.</Text> : null}
        {sections.map((section) => {
          const sectionFields = fields.filter((f) => f.sectionId === section.id);
          if (!sectionFields.length) return null;
          return (
            <View key={section.id} style={[styles.sectionBox, { borderColor: colors.border }]}>
              <View style={[styles.sectionHead, { backgroundColor: colors.cardAlt, borderBottomColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>{section.name}</Text></View>
              <View style={{ padding: 12 }}>{sectionFields.map(renderField)}</View>
            </View>
          );
        })}
        {uncategorized.length > 0 ? (
          <View style={[styles.sectionBox, { borderColor: colors.border }]}>
            {sections.length > 0 ? <View style={[styles.sectionHead, { backgroundColor: colors.cardAlt, borderBottomColor: colors.border }]}><Text style={[styles.sectionTitle, { color: colors.text }]}>Other Information</Text></View> : null}
            <View style={{ padding: 12 }}>{uncategorized.map(renderField)}</View>
          </View>
        ) : null}
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, marginTop: 3, lineHeight: 19 },
  actions: { flexDirection: 'row', marginBottom: 12 },
  loader: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: 10, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'flex-start' },
  kv: { marginBottom: 8 },
  k: { fontSize: 11, fontWeight: fontWeight.bold },
  v: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginTop: 2 },
  delBtn: { padding: 6 },
  sectionBox: { borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginBottom: 14 },
  sectionHead: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  sectionTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  boolRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  boolLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginRight: 12 },
  flex: { flex: 1 },
  footer: { flexDirection: 'row', marginTop: 6 },
});