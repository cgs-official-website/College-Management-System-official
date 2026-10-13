import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Edit2, Mail, Save } from 'lucide-react-native';

import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Badge, toneForStatus } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SearchBar } from '../../components/ui/SearchBar';
import { SheetModal } from '../../components/ui/SheetModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { PageHeader } from '../../components/layout/ScreenHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { useEmailTemplates } from '../../hooks/useEmailTemplates';
import { fontSize, fontWeight } from '../../theme/typography';
import { formatDate } from '../../utils/format';
import { toast } from '../../utils/toast';
import type { EmailTemplate } from '../../types/models';

/** Web: SuperEmailTemplates.jsx  ->  GET /email-templates, PUT /email-templates/:id */
export default function SuperEmailTemplatesScreen() {
  const { colors } = useTheme();
  const { templates, isLoading, isRefetching, refetch, updateTemplate } = useEmailTemplates();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<EmailTemplate | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => t.name?.toLowerCase().includes(q) || t.subject?.toLowerCase().includes(q));
  }, [templates, search]);

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    try {
      await updateTemplate.mutateAsync({
        id: editing.id,
        name: editing.name,
        subject: editing.subject.trim(),
        status: editing.status ?? undefined,
        contentHtml: editing.contentHtml || '',
      });
      toast.success('Template updated');
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to update template');
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefetching} onRefresh={() => refetch(true)}>
      <PageHeader title="Email Templates" subtitle="Manage global email templates across the system." />

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search templates..." />
      <View style={{ height: 14 }} />

      {isLoading ? (
        <Loader label="Loading templates..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Mail} title="No email templates found." />
      ) : (
        filtered.map((template) => (
          <Card key={template.id} onPress={() => setEditing({ ...template })} style={styles.card}>
            <View style={styles.top}>
              <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
                <Mail size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {template.name}
                </Text>
                <Text style={[styles.subject, { color: colors.textMuted }]} numberOfLines={2}>
                  {template.subject}
                </Text>
              </View>
              <Edit2 size={18} color={colors.textSubtle} />
            </View>
            <View style={styles.meta}>
              <Badge label={template.status || 'Active'} tone={toneForStatus(template.status)} />
              <Text style={[styles.date, { color: colors.textSubtle }]}>Modified {formatDate(template.updatedAt)}</Text>
            </View>
          </Card>
        ))
      )}

      <SheetModal
        visible={!!editing}
        tall
        onClose={() => setEditing(null)}
        title={editing ? `Edit Template: ${editing.name}` : ''}
        footer={
          <View style={{ flexDirection: 'row' }}>
            <Button title="Cancel" variant="outline" onPress={() => setEditing(null)} style={{ flex: 1 }} disabled={updateTemplate.isPending} />
            <View style={{ width: 12 }} />
            <Button title="Save Changes" icon={Save} onPress={handleSave} loading={updateTemplate.isPending} style={{ flex: 1.4 }} />
          </View>
        }>
        {editing ? (
          <View>
            <Input
              label="Subject"
              value={editing.subject}
              onChangeText={(v) => setEditing({ ...editing, subject: v })}
              placeholder="Email subject"
            />
            <Input
              label="HTML Content (Inner Body)"
              hint="You can use variables like {{name}}, {{email}}, etc. based on the template type. This content is injected into the standard Zuna ERP wrapper."
              value={editing.contentHtml || ''}
              onChangeText={(v) => setEditing({ ...editing, contentHtml: v })}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
              style={{ minHeight: 280, fontFamily: 'Courier', fontSize: fontSize.sm }}
            />
          </View>
        ) : null}
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  top: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  subject: { fontSize: fontSize.sm, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  date: { fontSize: fontSize.xs },
});
