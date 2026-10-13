import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { pick, keepLocalCopy, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import { CalendarPlus, CheckCircle2, CheckSquare, Paperclip, XCircle } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SheetModal } from '../../components/ui/SheetModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { useStudentAttendance, useStudentLeaveRequests } from '../../hooks/useStudentPortal';
import { toast } from '../../utils/toast';
import { formatDate } from '../../utils/format';
import { fontSize, fontWeight } from '../../theme/typography';

const LEAVE_TYPES = [
  { label: 'Sick Leave', value: 'Sick Leave' },
  { label: 'Academic Event / Competition', value: 'Academic Event / Competition' },
  { label: 'Other', value: 'Other' },
];

const ALLOWED_PROOF_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const PAGE = 30;

const emptyForm = { leaveType: 'Sick Leave', fromDate: '', toDate: '', reason: '' };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const isValidDate = (s: string) => DATE_RE.test(s) && !isNaN(new Date(s).getTime());

const leaveTone = (status?: string): BadgeTone =>
  status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning';

type Proof = { name: string; mimeType: string; dataUrl: string };

/** Picks an image / PDF / Word file and returns it as a data URL (same payload the web sends). */
const pickProof = async (): Promise<Proof | null> => {
  try {
    const results = await pick({
      type: [types.images, types.pdf, types.doc, types.docx],
      allowMultiSelection: false,
      copyTo: 'cachesDirectory',
    });
    const file: any = results?.[0];
    if (!file?.uri) return null;

    const mime: string = file.type || '';
    if (mime && !ALLOWED_PROOF_TYPES.includes(mime)) {
      toast.error('Proof must be an image, PDF, or Word document');
      return null;
    }
    if (file.size && file.size > MAX_PROOF_BYTES) {
      toast.error('Proof file must be under 5 MB');
      return null;
    }

    let localUri: string = file.fileCopyUri || file.uri;
    if (localUri.startsWith('content://')) {
      const copied = await keepLocalCopy({
        files: [{ uri: file.uri, fileName: file.name || `proof_${Date.now()}` }],
        destination: 'cachesDirectory',
      });
      const r: any = copied?.[0];
      if (!r || r.status !== 'success' || !r.localUri) throw new Error('Could not read the selected file.');
      localUri = r.localUri;
    }
    const path = localUri.startsWith('file://') ? localUri.replace(/^file:\/\//, '') : localUri;
    const base64 = await RNFS.readFile(decodeURIComponent(path), 'base64');
    const mimeType = mime || 'application/octet-stream';
    return { name: file.name || 'proof', mimeType, dataUrl: `data:${mimeType};base64,${base64}` };
  } catch (err: any) {
    if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return null;
    Alert.alert('File Picker Error', err?.message || 'Could not choose or read the file.');
    return null;
  }
};

/** Web: pages/student/StudentAttendanceDashboard.jsx */
export default function StudentAttendanceScreen() {
  const { colors } = useTheme();
  const att = useStudentAttendance();
  const leaves = useStudentLeaveRequests();

  const attendance = att.data || { percentage: 100, totalDays: 0, presentDays: 0, absentDays: 0, records: [] };
  const records: any[] = attendance.records || [];
  const leaveRequests: any[] = Array.isArray(leaves.data) ? leaves.data : [];

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [proof, setProof] = useState<Proof | null>(null);
  const [shown, setShown] = useState(PAGE);

  const good = attendance.percentage >= 75;

  const closeModal = () => {
    setModalOpen(false);
    setForm(emptyForm);
    setProof(null);
  };

  const handleApply = async () => {
    if (!form.fromDate || !form.toDate || !form.reason.trim()) {
      toast.error('Please complete all leave fields');
      return;
    }
    if (!isValidDate(form.fromDate) || !isValidDate(form.toDate)) {
      toast.error('Use the date format YYYY-MM-DD (e.g. 2026-10-15)');
      return;
    }
    if (form.toDate < form.fromDate) {
      toast.error('To date cannot be before from date');
      return;
    }
    try {
      await leaves.createLeaveRequest({
        ...form,
        reason: form.reason.trim(),
        proofFileName: proof?.name,
        proofMimeType: proof?.mimeType,
        proofDataUrl: proof?.dataUrl,
      });
      closeModal();
    } catch {
      // toast already shown by the hook
    }
  };

  const refetchAll = async () => {
    await Promise.all([att.refetch(), leaves.refetch()]);
  };

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={att.isRefreshing || leaves.isRefreshing} onRefresh={refetchAll}>
      <Text style={[styles.title, { color: colors.text }]}>Attendance & Leaves</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Track your academic presence percentage and apply for student leaves.
      </Text>
      <Button title="Apply for Leave" icon={CalendarPlus} size="sm" fullWidth={false} onPress={() => setModalOpen(true)} />
      <View style={{ height: 16 }} />

      {att.isLoading ? (
        <Loader label="Loading attendance..." />
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard compact title="Attendance Rate" value={`${attendance.percentage}%`} icon={CheckSquare} tone={good ? 'success' : 'danger'} />
            <StatCard compact title="Total Sessions" value={attendance.totalDays} icon={CheckSquare} tone="info" />
          </View>
          <View style={styles.statsRow}>
            <StatCard compact title="Present" value={attendance.presentDays} icon={CheckCircle2} tone="success" />
            <StatCard compact title="Absent" value={attendance.absentDays} icon={XCircle} tone="danger" />
          </View>

          {!good && attendance.totalDays > 0 ? (
            <View style={[styles.warn, { backgroundColor: colors.dangerSoft, borderColor: colors.dangerBorder }]}>
              <Text style={[styles.warnText, { color: colors.danger }]}>
                Your attendance is below the 75% requirement. Please attend upcoming sessions regularly.
              </Text>
            </View>
          ) : null}

          {/* Attendance log */}
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Attendance Log</Text>
            <Badge label={`${records.length} Recorded`} tone="primary" />
          </View>

          {records.length === 0 ? (
            <EmptyState icon={CheckSquare} title="No Attendance Recorded" message="Your daily attendance records will appear here once marked by faculty." />
          ) : (
            <>
              {records.slice(0, shown).map((rec) => {
                const tone: BadgeTone = rec.status === 'present' ? 'success' : rec.status === 'late' ? 'warning' : 'danger';
                const present = rec.status === 'present' || rec.status === 'late';
                return (
                  <Card key={rec.id} style={styles.recCard}>
                    <View style={[styles.recIcon, { backgroundColor: present ? colors.successSoft : colors.dangerSoft }]}>
                      {present ? <CheckCircle2 size={18} color={colors.success} /> : <XCircle size={18} color={colors.danger} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.recDate, { color: colors.text }]}>
                        {new Date(rec.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                      <Text style={[styles.recCourse, { color: colors.textMuted }]} numberOfLines={1}>
                        {rec.course?.name || 'Daily Attendance'}
                      </Text>
                    </View>
                    <Badge label={String(rec.status || '').toUpperCase()} tone={tone} small />
                  </Card>
                );
              })}
              {records.length > shown ? (
                <Button title={`Show more (${records.length - shown} left)`} variant="outline" size="sm" onPress={() => setShown((s) => s + PAGE)} />
              ) : null}
            </>
          )}

          {/* Leave applications */}
          <View style={[styles.sectionHeader, { marginTop: 22 }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Leave Applications</Text>
            <Badge label={String(leaveRequests.length)} tone="neutral" />
          </View>

          {leaveRequests.length === 0 ? (
            <EmptyState icon={CalendarPlus} title="No Leave History" message="Submit a leave request when required." />
          ) : (
            leaveRequests.map((leave) => (
              <Card key={leave.id} style={styles.leaveCard}>
                <View style={styles.leaveTop}>
                  <Text style={[styles.leaveReason, { color: colors.text }]} numberOfLines={2}>
                    {leave.reason}
                  </Text>
                  <Badge label={String(leave.status || 'pending').toUpperCase()} tone={leaveTone(leave.status)} small />
                </View>
                <Text style={[styles.leaveDates, { color: colors.textMuted }]}>
                  {formatDate(leave.fromDate)} - {formatDate(leave.toDate)}
                </Text>
                {leave.proofFileName ? (
                  <View style={styles.proofRow}>
                    <Paperclip size={12} color={colors.textSubtle} />
                    <Text style={[styles.proofText, { color: colors.textSubtle }]} numberOfLines={1}>
                      {leave.proofFileName}
                    </Text>
                  </View>
                ) : null}
              </Card>
            ))
          )}
        </>
      )}

      {/* Apply for leave sheet */}
      <SheetModal
        visible={modalOpen}
        onClose={closeModal}
        title="Apply for Leave"
        footer={
          <View style={styles.footerButtons}>
            <View style={{ flex: 1 }}>
              <Button title="Cancel" variant="outline" onPress={closeModal} />
            </View>
            <View style={{ flex: 1.3 }}>
              <Button title="Submit Application" loading={leaves.isCreating} onPress={handleApply} />
            </View>
          </View>
        }>
        <Select label="Leave Category" value={form.leaveType} options={LEAVE_TYPES} onChange={(v) => setForm((f) => ({ ...f, leaveType: v }))} />
        <Input
          label="From Date"
          required
          value={form.fromDate}
          onChangeText={(v) => setForm((f) => ({ ...f, fromDate: v, toDate: f.toDate && f.toDate < v ? '' : f.toDate }))}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
        <Input label="To Date" required value={form.toDate} onChangeText={(v) => setForm((f) => ({ ...f, toDate: v }))} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" maxLength={10} />
        <Input
          label="Reason"
          required
          multiline
          value={form.reason}
          onChangeText={(v) => setForm((f) => ({ ...f, reason: v }))}
          placeholder="Provide details regarding your leave..."
        />

        <Text style={[styles.proofLabel, { color: colors.text }]}>Proof (optional)</Text>
        <Pressable
          onPress={async () => {
            const picked = await pickProof();
            if (picked) setProof(picked);
          }}
          style={[styles.proofBox, { borderColor: colors.border, backgroundColor: colors.inputBg }]}>
          <Paperclip size={16} color={colors.textSubtle} />
          <Text style={[styles.proofBoxText, { color: proof ? colors.text : colors.textMuted }]} numberOfLines={1}>
            {proof ? proof.name : 'Attach image, PDF, or Word doc (max 5 MB)'}
          </Text>
        </Pressable>
        {proof ? (
          <Pressable onPress={() => setProof(null)} hitSlop={8}>
            <Text style={[styles.removeProof, { color: colors.danger }]}>Remove file</Text>
          </Pressable>
        ) : null}
        <View style={{ height: 8 }} />
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  subtitle: { fontSize: fontSize.sm, marginTop: 4, marginBottom: 14, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  warn: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 14 },
  warnText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, lineHeight: 17 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 6 },
  sectionTitle: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginRight: 8 },
  recCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, paddingVertical: 12 },
  recIcon: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  recDate: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  recCourse: { fontSize: fontSize.xs, marginTop: 2 },
  leaveCard: { marginBottom: 10 },
  leaveTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  leaveReason: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.bold, lineHeight: 19 },
  leaveDates: { fontSize: fontSize.xs, marginTop: 6 },
  proofRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  proofText: { flex: 1, fontSize: 11 },
  footerButtons: { flexDirection: 'row', gap: 10 },
  proofLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 8 },
  proofBox: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 50, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed' },
  proofBoxText: { flex: 1, fontSize: fontSize.sm },
  removeProof: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginTop: 8 },
});