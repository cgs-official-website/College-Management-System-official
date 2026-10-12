import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertTriangle, CheckCircle2, Clock, Eye, MessageSquareWarning, Plus } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useComplaints } from '../../hooks/useComplaints';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatCard } from '../../components/ui/StatCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { Tabs } from '../../components/ui/Tabs';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { SheetModal } from '../../components/ui/SheetModal';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

const PAGE_SIZE = 8;

const FILTERS = [
  { key: 'all', label: 'All Tickets' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
];
const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];
const CATEGORY_OPTIONS = [
  { value: 'Academics', label: 'Academics' },
  { value: 'Hostel', label: 'Hostel & Mess' },
  { value: 'Infrastructure', label: 'Infrastructure & Labs' },
  { value: 'IT & WiFi', label: 'IT & WiFi' },
  { value: 'Transport', label: 'Transport' },
  { value: 'Fees', label: 'Fees & Accounts' },
  { value: 'General', label: 'General Administration' },
];

const blank = () => ({ subject: '', description: '', category: 'Academics', priority: 'medium' });

/** Web: pages/admin/complaints/ComplaintsDashboard.jsx */
export default function ComplaintsScreen() {
  const { colors } = useTheme();
  const { items: complaints, isLoading, isCreating, createItem, updateItem, refetch } = useComplaints();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<any>(null);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [form, setForm] = useState<any>(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return complaints.filter((c: any) => {
      const matches =
        (c.subject || '').toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.studentName || '').toLowerCase().includes(q) ||
        (c.admissionNumber || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q);
      if (statusFilter !== 'all') return matches && (c.status || '').toLowerCase() === statusFilter;
      return matches;
    });
  }, [complaints, searchTerm, statusFilter]);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const lower = (c: any) => (c.status || '').toLowerCase();
  const openCount = complaints.filter((c: any) => lower(c) === 'open').length;
  const inProgressCount = complaints.filter((c: any) => lower(c) === 'in_progress').length;
  const resolvedCount = complaints.filter((c: any) => ['resolved', 'closed'].includes(lower(c))).length;

  const handleStatusChange = async (complaint: any, status: string) => {
    if (status === (complaint.status || 'open').toLowerCase()) return;
    try {
      await updateItem({ id: complaint.id, status });
    } catch {
      // toast shown by the hook
    }
  };

  const handleLogSubmit = async () => {
    const e: Record<string, string> = {};
    if (!form.subject.trim()) e.subject = 'Subject is required';
    if (!form.description.trim()) e.description = 'Description is required';
    setErrors(e);
    if (Object.keys(e).length) { toast.error('Please enter subject and description'); return; }
    try {
      await createItem({ ...form, subject: form.subject.trim(), description: form.description.trim() });
      setIsLogOpen(false);
      setForm(blank());
    } catch {
      // toast shown by the hook
    }
  };

  const statusColors = (s: string) =>
    s === 'open' ? { fg: colors.danger, bg: colors.dangerSoft } : s === 'in_progress' ? { fg: colors.warning, bg: colors.warningSoft } : { fg: colors.success, bg: colors.successSoft };

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => { setIsRefreshing(true); await refetch(); setIsRefreshing(false); }}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Complaints & Grievance Desk</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Review student grievances, support tickets, campus maintenance requests, and track resolutions.</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button title="Log Complaint" size="sm" fullWidth={false} icon={Plus} onPress={() => { setForm(blank()); setErrors({}); setIsLogOpen(true); }} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCell}><StatCard compact title="Total Grievances" value={isLoading ? '...' : complaints.length} icon={MessageSquareWarning} tone="primary" /></View>
        <View style={{ width: 8 }} />
        <View style={styles.statCell}><StatCard compact title="Open Tickets" value={isLoading ? '...' : openCount} icon={AlertTriangle} tone="danger" /></View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCell}><StatCard compact title="Under Investigation" value={isLoading ? '...' : inProgressCount} icon={Clock} tone="warning" /></View>
        <View style={{ width: 8 }} />
        <View style={styles.statCell}><StatCard compact title="Resolved Tickets" value={isLoading ? '...' : resolvedCount} icon={CheckCircle2} tone="success" /></View>
      </View>

      <SearchBar value={searchTerm} onChangeText={(t) => { setSearchTerm(t); setCurrentPage(1); }} placeholder="Search student, issue, category..." style={styles.search} />
      <Tabs tabs={FILTERS} active={statusFilter} onChange={(k) => { setStatusFilter(k); setCurrentPage(1); }} />

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : paginated.length === 0 ? (
        <EmptyState icon={MessageSquareWarning} title="No grievance records found" message="No grievance records found matching criteria." />
      ) : (
        <>
          {paginated.map((c: any) => {
            const status = (c.status || 'open').toLowerCase();
            const sc = statusColors(status);
            return (
              <Card key={c.id} style={styles.card}>
                <View style={styles.top}>
                  <View style={[styles.avatar, { backgroundColor: colors.warningSoft }]}>
                    <Text style={{ color: colors.warning, fontWeight: fontWeight.extrabold, fontSize: fontSize.sm }}>{c.studentName?.charAt(0) || 'S'}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{c.studentName}</Text>
                    <Text style={[styles.meta, { color: colors.textSubtle }]} numberOfLines={1}>{c.studentId || c.admissionNumber || 'N/A'}  •  {c.department}</Text>
                  </View>
                  <Pressable onPress={() => setSelected(c)} hitSlop={10} style={[styles.eyeBtn, { backgroundColor: colors.primarySoft }]}>
                    <Eye size={16} color={colors.primary} />
                  </Pressable>
                </View>

                <Text style={[styles.subject, { color: colors.text }]} numberOfLines={1}>{c.subject}</Text>
                <Text style={[styles.desc, { color: colors.textMuted }]} numberOfLines={2}>{c.description}</Text>

                <View style={styles.chips}>
                  <View style={[styles.chip, { backgroundColor: colors.cardAlt }]}><Text style={[styles.chipText, { color: colors.textMuted }]}>{c.category || 'General'}</Text></View>
                  <View style={[styles.chip, { backgroundColor: sc.bg }]}><Text style={[styles.chipText, { color: sc.fg }]}>{(STATUS_OPTIONS.find((o) => o.value === status)?.label) || status}</Text></View>
                  <Text style={[styles.date, { color: colors.textSubtle }]}>{c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}</Text>
                </View>

                <View style={{ marginTop: 12 }}>
                  <Select label="Update Status" value={status} onChange={(v) => handleStatusChange(c, v)} options={STATUS_OPTIONS} />
                </View>
              </Card>
            );
          })}
          {filtered.length > PAGE_SIZE ? <Pagination totalItems={filtered.length} currentPage={currentPage} pageSize={PAGE_SIZE} pageSizeOptions={[PAGE_SIZE]} onPageChange={setCurrentPage} /> : null}
        </>
      )}

      {/* Details */}
      <SheetModal
        visible={!!selected} onClose={() => setSelected(null)} title="Grievance Details"
        footer={<Button title="Close" variant="outline" onPress={() => setSelected(null)} />}>
        {selected ? (
          <View>
            <Text style={[styles.detailSubject, { color: colors.text }]}>{selected.subject}</Text>
            <View style={[styles.grid, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <View style={styles.gridCell}><Text style={[styles.label, { color: colors.textMuted }]}>Student Name</Text><Text style={[styles.value, { color: colors.text }]}>{selected.studentName}</Text></View>
              <View style={styles.gridCell}><Text style={[styles.label, { color: colors.textMuted }]}>Admission ID</Text><Text style={[styles.value, { color: colors.text }]}>{selected.studentId || selected.admissionNumber}</Text></View>
              <View style={styles.gridCell}><Text style={[styles.label, { color: colors.textMuted }]}>Department</Text><Text style={[styles.value, { color: colors.text }]}>{selected.department}</Text></View>
              <View style={styles.gridCell}><Text style={[styles.label, { color: colors.textMuted }]}>Category</Text><Text style={[styles.value, { color: colors.text }]}>{selected.category}</Text></View>
            </View>
            <Text style={[styles.label, { color: colors.textMuted, marginTop: 14, marginBottom: 6 }]}>ISSUE DESCRIPTION</Text>
            <Text style={[styles.descBox, { color: colors.text, backgroundColor: colors.cardAlt, borderColor: colors.border }]}>{selected.description}</Text>
            <Text style={[styles.meta, { color: colors.textSubtle, marginTop: 12 }]}>Logged on: {selected.createdAt ? new Date(selected.createdAt).toLocaleString() : '-'}</Text>
          </View>
        ) : null}
      </SheetModal>

      {/* Log complaint */}
      <SheetModal
        visible={isLogOpen} onClose={() => setIsLogOpen(false)} title="Log Institutional Complaint" tall
        footer={
          <View style={styles.footer}>
            <Button title="Cancel" variant="outline" onPress={() => setIsLogOpen(false)} style={styles.flex} />
            <View style={{ width: 10 }} />
            <Button title="Submit Ticket" loading={isCreating} onPress={handleLogSubmit} style={styles.flex} />
          </View>
        }>
        <Text style={[styles.meta, { color: colors.textMuted, marginBottom: 14 }]}>Record a new support ticket or administrative grievance.</Text>
        <Select label="Category" required value={form.category} onChange={(v) => setForm((p: any) => ({ ...p, category: v }))} options={CATEGORY_OPTIONS} />
        <Input label="Subject" required placeholder="Brief description of the problem" value={form.subject} onChangeText={(x) => setForm((p: any) => ({ ...p, subject: x }))} error={errors.subject} />
        <Input label="Detailed Description" required multiline placeholder="Describe the complaint with full context..." value={form.description} onChangeText={(x) => setForm((p: any) => ({ ...p, description: x }))} error={errors.description} style={{ minHeight: 110 }} />
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, marginTop: 3, lineHeight: 19 },
  actions: { flexDirection: 'row', marginBottom: 12 },
  statsRow: { flexDirection: 'row', marginBottom: 8 },
  statCell: { flex: 1 },
  search: { marginTop: 4, marginBottom: 10 },
  loader: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: 10, marginTop: 4, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  meta: { fontSize: 11, marginTop: 2 },
  eyeBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  subject: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold, marginTop: 12 },
  desc: { fontSize: fontSize.sm, lineHeight: 19, marginTop: 4 },
  chips: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  chipText: { fontSize: 11, fontWeight: fontWeight.bold },
  date: { fontSize: 11, marginLeft: 'auto' },
  detailSubject: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderWidth: 1, borderRadius: 12, padding: 12 },
  gridCell: { width: '50%', marginBottom: 10 },
  label: { fontSize: 11, fontWeight: fontWeight.bold },
  value: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: 2 },
  descBox: { fontSize: fontSize.sm, lineHeight: 21, borderWidth: 1, borderRadius: 12, padding: 14 },
  flex: { flex: 1 },
  footer: { flexDirection: 'row', marginTop: 6 },
});