import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Clock, Paperclip, Send } from 'lucide-react-native';
import { types } from '@react-native-documents/picker';

import { api } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge, toneForStatus } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { pickAsDataUrl, PickedFile } from '../../utils/filePicker';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';
import { radius } from '../../theme/spacing';

const LEAVE_TYPES = ['Sick Leave', 'Other'];
const EMPTY_FORM = { leaveType: 'Sick Leave', fromDate: '', toDate: '', reason: '' };

// Same whitelist / limit as web (image, PDF or Word, max 5 MB)
const ALLOWED_PROOF_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_PROOF_BYTES = 5 * 1024 * 1024;

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime());
const fmt = (d: string) => (d ? new Date(d).toLocaleDateString() : '—');

/** Web: pages/teacher/TeacherMyLeaves.jsx (GET /leaves/my, POST /leaves/staff) */
export default function TeacherMyLeavesScreen() {
  const { colors } = useTheme();

  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [proof, setProof] = useState<PickedFile | null>(null);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/leaves/my');
      const raw = res?.data ?? [];
      setLeaves(Array.isArray(raw) ? raw : []);
    } catch {
      /* keep previous list */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const chooseProof = async () => {
    const file = await pickAsDataUrl({
      types: [types.images, types.pdf, types.doc, types.docx],
      allowedMimes: ALLOWED_PROOF_TYPES,
      maxBytes: MAX_PROOF_BYTES,
      typeError: 'Proof must be an image, PDF, or Word document',
    });
    if (file) setProof(file);
  };

  const submit = async () => {
    if (!form.fromDate || !form.toDate || !form.reason.trim()) {
      toast.error('Please complete all leave fields');
      return;
    }
    if (!isDate(form.fromDate) || !isDate(form.toDate)) {
      toast.error('Use date format YYYY-MM-DD');
      return;
    }
    if (form.toDate < form.fromDate) {
      toast.error('To date cannot be before from date');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/leaves/staff', {
        ...form,
        proofFileName: proof?.name || undefined,
        proofMimeType: proof?.mimeType || undefined,
        proofDataUrl: proof?.dataUrl || undefined,
      });
      toast.success('Leave application submitted to admin!');
      setForm({ ...EMPTY_FORM });
      setProof(null);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit leave application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}>
      <Text style={[styles.title, { color: colors.text }]}>My Leaves</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Apply for leave. Your request goes to the admin for approval.
      </Text>

      <Card style={styles.formCard}>
        <Text style={[styles.heading, { color: colors.text }]}>Apply for Leave</Text>

        <Select
          label="Leave Category"
          value={form.leaveType}
          onChange={(v) => setForm((p) => ({ ...p, leaveType: v }))}
          options={LEAVE_TYPES.map((t) => ({ value: t, label: t }))}
        />

        <View style={styles.row}>
          <View style={styles.flex}>
            <Input
              label="From Date"
              required
              placeholder="2026-10-15"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              value={form.fromDate}
              onChangeText={(v) =>
                setForm((p) => ({ ...p, fromDate: v, toDate: p.toDate && p.toDate < v ? '' : p.toDate }))
              }
            />
          </View>
          <View style={styles.flex}>
            <Input
              label="To Date"
              required
              placeholder="2026-10-16"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              value={form.toDate}
              onChangeText={(v) => setForm((p) => ({ ...p, toDate: v }))}
            />
          </View>
        </View>
        <Text style={[styles.dateHint, { color: colors.textSubtle }]}>Dates in YYYY-MM-DD format.</Text>

        <Input
          label="Reason Description"
          required
          multiline
          placeholder="Provide details regarding your leave..."
          value={form.reason}
          onChangeText={(v) => setForm((p) => ({ ...p, reason: v }))}
        />

        <Text style={[styles.label, { color: colors.text }]}>Proof (optional)</Text>
        <Pressable
          onPress={chooseProof}
          style={[styles.proofBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Paperclip size={16} color={colors.textSubtle} />
          <Text style={[styles.proofText, { color: proof ? colors.text : colors.textMuted }]} numberOfLines={1}>
            {proof ? proof.name : 'Attach image, PDF, or Word doc (max 5 MB)'}
          </Text>
        </Pressable>
        {proof ? (
          <Pressable onPress={() => setProof(null)} hitSlop={8}>
            <Text style={[styles.remove, { color: colors.danger }]}>Remove file</Text>
          </Pressable>
        ) : null}

        <View style={{ marginTop: 16 }}>
          <Button title="Submit Application" icon={Send} loading={submitting} onPress={submit} />
        </View>
      </Card>

      <View style={styles.histHead}>
        <Text style={[styles.heading, { color: colors.text, marginBottom: 0 }]}>Leave Applications</Text>
        <Badge label={String(leaves.length)} tone="primary" />
      </View>

      {loading ? (
        <Loader />
      ) : leaves.length === 0 ? (
        <Card>
          <EmptyState icon={Clock} title="No Leave History" message="Your submitted leaves will appear here." />
        </Card>
      ) : (
        leaves.map((l: any) => {
          const status = String(l.status || 'pending').toLowerCase();
          return (
            <Card key={l.id} style={styles.leaveCard}>
              <View style={styles.leaveTop}>
                <Text style={[styles.leaveType, { color: colors.text }]} numberOfLines={1}>
                  {l.leaveType || 'Leave'}
                  {l.roleName ? ` • ${l.roleName}` : ''}
                </Text>
                <Badge label={status.toUpperCase()} tone={toneForStatus(status)} small />
              </View>
              <Text style={[styles.dates, { color: colors.textMuted }]}>
                {fmt(l.fromDate)} - {fmt(l.toDate)}
              </Text>
              <Text style={[styles.reason, { color: colors.text }]} numberOfLines={2}>
                {l.reason}
              </Text>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 4, marginBottom: 16 },
  formCard: { marginBottom: 20 },
  heading: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, marginBottom: 14 },
  row: { flexDirection: 'row', gap: 12 },
  dateHint: { fontSize: fontSize.xs, marginTop: -8, marginBottom: 14 },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 8 },
  proofBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radius.md,
  },
  proofText: { flex: 1, fontSize: fontSize.sm },
  remove: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginTop: 6 },
  histHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  leaveCard: { marginBottom: 10 },
  leaveTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  leaveType: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  dates: { fontSize: fontSize.xs, marginTop: 6 },
  reason: { fontSize: fontSize.xs, lineHeight: 18, marginTop: 6 },
});