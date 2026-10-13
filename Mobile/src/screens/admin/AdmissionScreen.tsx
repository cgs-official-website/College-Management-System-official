import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Clock3, Edit2, Plus, Trash2, UserPlus, XCircle } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAdmissions } from '../../hooks/useAdmissions';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SearchBar } from '../../components/ui/SearchBar';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { useConfirm } from '../../contexts/ConfirmContext';
import AdmissionFormModal from '../../features/admission/AdmissionFormModal';
import { fontSize, fontWeight } from '../../theme/typography';

export default function AdmissionScreen() {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { admissions, isLoading, addAdmission, updateAdmission, deleteAdmission, allotSeat, isAdding, isUpdating, isAllotting, refetch } = useAdmissions(collegeId);
  const confirm = useConfirm();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return admissions.filter((a) => `${a.firstName || ''} ${a.lastName || ''} ${a.applicantName || ''} ${a.courseName || ''}`.toLowerCase().includes(q));
  }, [admissions, query]);

  const pending = admissions.filter((a) => String(a.status).toLowerCase() === 'pending').length;
  const approved = admissions.filter((a) => String(a.status).toLowerCase() === 'approved').length;

  const submit = async (data: any) => {
    try {
      if (editing) {
        if (data.status === 'Approved' && editing.status !== 'Approved') {
          const ok = await confirm({ title: 'Approve & Enroll', message: 'Approve this application and allot the seat?', confirmText: 'Approve', isDestructive: false });
          if (!ok) return;
        }
        await updateAdmission({ id: editing.id, data });
        if (data.status === 'Approved' && editing.status !== 'Approved') await allotSeat(editing.id);
      } else {
        await addAdmission(data);
      }
      setOpen(false);
      setEditing(null);
    } catch {
      // Hook already surfaces the API error; keep the modal open on failure.
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isLoading} onRefresh={refetch}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.text }]}>Admissions Dashboard</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Review applications and manage the prospective student pipeline.</Text>
        </View>
        <Button title="Add Inquiry" size="sm" fullWidth={false} icon={Plus} onPress={() => { setEditing(null); setOpen(true); }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={styles.statsRow}>
        <View style={styles.statCard}><StatCard title="Total Applications" value={isLoading ? '...' : admissions.length} icon={UserPlus} tone="primary" compact /></View>
        <View style={styles.statGap} />
        <View style={styles.statCard}><StatCard title="Pending Review" value={isLoading ? '...' : pending} icon={Clock3} tone="info" compact /></View>
        <View style={styles.statGap} />
        <View style={styles.statCard}><StatCard title="Approved & Enrolled" value={isLoading ? '...' : approved} icon={CheckCircle2} tone="success" compact /></View>
      </ScrollView>

      <View style={[styles.toolbar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search applicants by name or program..." />
      </View>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserPlus} title="No applications found" message="There are no prospective students matching your search." />
      ) : (
        filtered.map((a) => {
          const status = String(a.status || 'Pending').toLowerCase();
          const approvedStatus = status === 'approved';
          const rejectedStatus = status === 'rejected';
          const StatusIcon = approvedStatus ? CheckCircle2 : rejectedStatus ? XCircle : Clock3;
          const statusColor = approvedStatus ? colors.success : rejectedStatus ? colors.danger : colors.warning;
          const statusSoft = approvedStatus ? colors.successSoft : rejectedStatus ? colors.dangerSoft : colors.warningSoft;
          const name = a.applicantName || `${a.firstName || ''} ${a.lastName || ''}`.trim() || 'Applicant';

          return (
            <Card key={a.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={[styles.statusIcon, { backgroundColor: statusSoft }]}><StatusIcon size={20} color={statusColor} /></View>
                <View style={styles.cardCopy}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{name}</Text>
                  <Text style={[styles.program, { color: colors.textMuted }]} numberOfLines={1}>{a.courseName || 'General Program'}</Text>
                  <Text style={[styles.contact, { color: colors.textSubtle }]} numberOfLines={1}>{a.email || a.phone || 'No contact details'}</Text>
                </View>
                <View style={styles.actions}>
                  <Pressable hitSlop={10} onPress={() => { setEditing(a); setOpen(true); }}><Edit2 size={18} color={colors.primary} /></Pressable>
                  <Pressable hitSlop={10} onPress={async () => { if (await confirm({ title: 'Delete Application', message: 'Delete this admission application?', confirmText: 'Delete', isDestructive: true })) await deleteAdmission(a.id); }}><Trash2 size={18} color={colors.danger} /></Pressable>
                </View>
              </View>
              <View style={styles.footerRow}>
                <View style={[styles.badge, { backgroundColor: statusSoft }]}><StatusIcon size={13} color={statusColor} /><Text style={[styles.badgeText, { color: statusColor }]}>{a.status || 'Pending'}</Text></View>
                {!approvedStatus ? <Button title="Approve" size="sm" fullWidth={false} loading={isAllotting} onPress={async () => { const ok = await confirm({ title: 'Approve Application', message: 'Approve this application and allot a seat?', confirmText: 'Approve', isDestructive: false }); if (ok) await allotSeat(a.id); }} /> : null}
              </View>
            </Card>
          );
        })
      )}

      <AdmissionFormModal isOpen={open} onClose={() => setOpen(false)} onSubmit={submit} initialData={editing} isLoading={isAdding || isUpdating} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  headerCopy: { flex: 1, paddingRight: 12 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, lineHeight: 19, marginTop: 4 },
  statsScroll: { flexGrow: 0, marginBottom: 12 },
  statsRow: { flexDirection: 'row', alignItems: 'flex-start', paddingBottom: 2 },
  statCard: { width: 132 },
  statGap: { width: 8 },
  toolbar: { borderWidth: 1, borderRadius: 16, padding: 10, marginBottom: 12 },
  loader: { minHeight: 190, alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: 10, padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  statusIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardCopy: { flex: 1 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  program: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, marginTop: 3 },
  contact: { fontSize: fontSize.xs, marginTop: 3 },
  actions: { flexDirection: 'row', gap: 15, marginLeft: 8 },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#eef2f7' },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9 },
  badgeText: { fontSize: 10, fontWeight: fontWeight.extrabold, marginLeft: 5, textTransform: 'uppercase', letterSpacing: 0.5 },
});