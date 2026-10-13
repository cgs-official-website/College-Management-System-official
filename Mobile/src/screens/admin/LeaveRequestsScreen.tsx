import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Briefcase, Calendar, CheckCircle2, Clock, GraduationCap, XCircle } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { api } from '../../api/client';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { Badge, toneForStatus } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { SheetModal } from '../../components/ui/SheetModal';
import { Button } from '../../components/ui/Button';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

const TYPE_TABS = [
  { value: 'employee', label: 'Employee Leaves', icon: Briefcase },
  { value: 'student', label: 'Student Leaves', icon: GraduationCap },
];
const STATUS_TABS = [
  { value: 'all', label: 'All' }, { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' },
];
const typeOf = (l: any) => l.applicantType || (l.requesterRole === 'student' ? 'student' : 'employee');
const fmt = (d: any, year = true) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(year ? { year: 'numeric' } : {}) } as any);
const daysOf = (l: any) => Math.max(1, Math.round((new Date(l.toDate).getTime() - new Date(l.fromDate).getTime()) / 86400000) + 1);

/** Web: pages/admin/leaves/LeaveRequestsDashboard.jsx */
export default function LeaveRequestsScreen() {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin' || userRole === 'superadmin';

  const [leaves, setLeaves] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState(isAdmin ? 'employee' : 'student');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<any>(null);
  const pageSize = 8;
  const effectiveType = isAdmin ? typeFilter : 'student';

  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/leaves');
      const raw = res?.data ?? res;
      setLeaves(Array.isArray(raw) ? raw : []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load leave requests');
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const handleAction = async (id: string, name: string, status: 'approved' | 'rejected') => {
    const ok = await confirm({
      title: status === 'approved' ? 'Approve Leave Request' : 'Reject Leave Request',
      message: `Are you sure you want to ${status === 'approved' ? 'approve' : 'reject'} the leave request submitted by ${name}?`,
      confirmText: status === 'approved' ? 'Approve' : 'Reject',
      isDestructive: status !== 'approved',
    });
    if (!ok) return;
    setIsUpdating(true);
    try {
      await api.patch(`/leaves/${id}/status`, { status });
      toast.success(`Leave request marked as ${status}!`);
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const byType = useMemo(() => leaves.filter((l) => typeOf(l) === effectiveType), [leaves, effectiveType]);
  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return byType.filter((l) => {
      const s = [l.applicantName, l.applicantEmail, l.admissionNumber, l.department, l.roleName, l.designation, l.reason].some((v) => (v || '').toLowerCase().includes(q));
      return s && (statusFilter === 'all' || (l.status || '').toLowerCase() === statusFilter);
    });
  }, [byType, searchTerm, statusFilter]);
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const count = (s: string) => byType.filter((l) => (l.status || '').toLowerCase() === s).length;

  const Pill = ({ active, label, onPress, icon: Icon }: any) => (
    <Pressable onPress={onPress} style={[styles.pill, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}>
      {Icon ? <Icon size={14} color={active ? colors.onPrimary : colors.textMuted} /> : null}
      <Text style={{ color: active ? colors.onPrimary : colors.textMuted, fontSize: 12, fontWeight: fontWeight.bold, marginLeft: Icon ? 6 : 0 }}>{label}</Text>
    </Pressable>
  );

  const detailField = (label: string, value: any) => (
    <View style={styles.detailCell}>
      <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value || '—'}</Text>
    </View>
  );

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => { setIsRefreshing(true); await load(); setIsRefreshing(false); }}>
      <Text style={[styles.title, { color: colors.text }]}>Leave Requests</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {isAdmin ? 'Review leave applications from employees and students.' : 'Review leave applications from students.'}
      </Text>

      {isAdmin ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll} contentContainerStyle={styles.rowContent}>
          {TYPE_TABS.map((t) => (
            <Pill key={t.value} active={typeFilter === t.value} label={t.label} icon={t.icon} onPress={() => { setTypeFilter(t.value); setStatusFilter('all'); setPage(1); }} />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.statCell}><StatCard compact title="Total" value={isLoading ? '...' : byType.length} icon={Calendar} tone="primary" /></View>
        <View style={{ width: 8 }} />
        <View style={styles.statCell}><StatCard compact title="Pending" value={isLoading ? '...' : count('pending')} icon={Clock} tone="warning" /></View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCell}><StatCard compact title="Approved" value={isLoading ? '...' : count('approved')} icon={CheckCircle2} tone="success" /></View>
        <View style={{ width: 8 }} />
        <View style={styles.statCell}><StatCard compact title="Rejected" value={isLoading ? '...' : count('rejected')} icon={XCircle} tone="danger" /></View>
      </View>

      <SearchBar
        value={searchTerm} onChangeText={(t) => { setSearchTerm(t); setPage(1); }} style={styles.search}
        placeholder={effectiveType === 'student' ? 'Search name, admission no, department...' : 'Search name, role, department...'}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll} contentContainerStyle={styles.rowContent}>
        {STATUS_TABS.map((s) => (
          <Pill key={s.value} active={statusFilter === s.value} label={s.label} onPress={() => { setStatusFilter(s.value); setPage(1); }} />
        ))}
      </ScrollView>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Calendar} title="No leave requests" message="No leave requests found matching your filter." />
      ) : (
        <>
          {rows.map((item) => {
            const status = (item.status || 'pending').toLowerCase();
            const isStudent = typeOf(item) === 'student';
            const name = item.applicantName || item.studentName || 'Applicant';
            const email = item.applicantEmail || item.studentEmail;
            const days = daysOf(item);
            return (
              <Pressable key={item.id} onPress={() => setSelected(item)}>
                <Card style={styles.card}>
                  <View style={styles.top}>
                    <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}><Text style={{ color: colors.primary, fontWeight: fontWeight.extrabold }}>{name.charAt(0).toUpperCase()}</Text></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{name}</Text>
                      {email ? <Text style={[styles.meta, { color: colors.textSubtle }]} numberOfLines={1}>{email}</Text> : null}
                    </View>
                    <Badge label={status.toUpperCase()} tone={toneForStatus(status)} small />
                  </View>
                  <View style={styles.badgeRow}>
                    <Badge label={isStudent ? 'STUDENT' : 'EMPLOYEE'} tone={isStudent ? 'info' : 'primary'} small />
                    <Text style={[styles.meta, { color: colors.textMuted, marginLeft: 8, flexShrink: 1 }]} numberOfLines={1}>
                      {isStudent ? `${item.admissionNumber || 'N/A'} • ${item.department || ''}${item.section ? ` • Sec ${item.section}` : ''}` : [item.roleName || 'Staff', item.department].filter(Boolean).join(' • ')}
                    </Text>
                  </View>
                  <Text style={[styles.dates, { color: colors.primary }]}>{fmt(item.fromDate, false)} - {fmt(item.toDate)}  ({days} {days === 1 ? 'day' : 'days'})</Text>
                  {item.leaveType ? <Text style={[styles.meta, { color: colors.text, fontWeight: fontWeight.bold, marginTop: 4 }]}>{item.leaveType}</Text> : null}
                  <Text style={[styles.reason, { color: colors.textMuted }]} numberOfLines={2}>{item.reason}</Text>
                  {status === 'pending' ? (
                    <View style={styles.actions}>
                      <Pressable disabled={isUpdating} onPress={() => handleAction(item.id, name, 'approved')} style={[styles.actionBtn, { backgroundColor: colors.successSoft }]}>
                        <CheckCircle2 size={15} color={colors.success} /><Text style={[styles.actionText, { color: colors.success }]}>Approve</Text>
                      </Pressable>
                      <Pressable disabled={isUpdating} onPress={() => handleAction(item.id, name, 'rejected')} style={[styles.actionBtn, { backgroundColor: colors.dangerSoft }]}>
                        <XCircle size={15} color={colors.danger} /><Text style={[styles.actionText, { color: colors.danger }]}>Reject</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </Card>
              </Pressable>
            );
          })}
          <Pagination totalItems={filtered.length} currentPage={page} pageSize={pageSize} pageSizeOptions={[8]} onPageChange={setPage} />
        </>
      )}

      <SheetModal
        visible={!!selected} onClose={() => setSelected(null)} title="Leave Details"
        footer={
          selected && (selected.status || 'pending').toLowerCase() === 'pending' ? (
            <View style={styles.actions}>
              <Button title="Reject" variant="danger" style={{ flex: 1 }} onPress={() => { const s = selected; setSelected(null); handleAction(s.id, s.applicantName || s.studentName || 'Applicant', 'rejected'); }} />
              <Button title="Approve" style={{ flex: 1 }} onPress={() => { const s = selected; setSelected(null); handleAction(s.id, s.applicantName || s.studentName || 'Applicant', 'approved'); }} />
            </View>
          ) : (
            <Button title="Close" variant="outline" onPress={() => setSelected(null)} />
          )
        }>
        {selected ? (
          <>
            <Text style={[styles.name, { color: colors.text, fontSize: fontSize.lg }]}>{selected.applicantName || selected.studentName || 'Applicant'}</Text>
            <Text style={[styles.meta, { color: colors.textSubtle, marginBottom: 10 }]}>{selected.applicantEmail || selected.studentEmail}</Text>
            <View style={styles.detailGrid}>
              {typeOf(selected) === 'student' ? (
                <>
                  {detailField('Admission No', selected.admissionNumber)}
                  {detailField('Roll No', selected.rollNumber)}
                  {detailField('Department', selected.department)}
                  {detailField('Section', selected.section)}
                </>
              ) : (
                <>
                  {detailField('Role', selected.roleName)}
                  {detailField('Designation', selected.designation)}
                  {detailField('Department', selected.department)}
                </>
              )}
              {detailField('Leave Type', selected.leaveType)}
              {detailField('Duration', `${daysOf(selected)} ${daysOf(selected) === 1 ? 'day' : 'days'}`)}
              {detailField('From', fmt(selected.fromDate))}
              {detailField('To', fmt(selected.toDate))}
              {detailField('Applied On', fmt(selected.createdAt))}
              {detailField('Status', String(selected.status || 'pending').toUpperCase())}
            </View>
            <Text style={[styles.label, { color: colors.textMuted, marginTop: 8 }]}>Reason</Text>
            <Text style={[styles.reason, { color: colors.text }]}>{selected.reason || '—'}</Text>
            {selected.proofFileName ? <Text style={[styles.meta, { color: colors.primary, marginTop: 10 }]}>Proof attached: {selected.proofFileName} (view it on the web portal)</Text> : null}
          </>
        ) : null}
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, marginTop: 3, marginBottom: 12, lineHeight: 19 },
  rowScroll: { flexGrow: 0, marginBottom: 10 },
  rowContent: { gap: 8, paddingVertical: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, height: 38 },
  statsRow: { flexDirection: 'row', marginBottom: 8 },
  statCell: { flex: 1 },
  search: { marginTop: 4, marginBottom: 10 },
  loader: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: 10, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  meta: { fontSize: 11 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  dates: { fontSize: 12, fontWeight: fontWeight.bold, marginTop: 10 },
  reason: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 38, borderRadius: 10, gap: 6 },
  actionText: { fontSize: 12, fontWeight: fontWeight.extrabold },
  label: { fontSize: 11, fontWeight: fontWeight.bold },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  detailCell: { width: '50%', paddingVertical: 6, paddingRight: 8 },
  detailValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, marginTop: 2 },
});