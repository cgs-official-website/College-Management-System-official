import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { BookOpen, Calendar, CheckCircle2, Clock, ExternalLink, Eye, Plus, Trash2, Users } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useCourses } from '../../hooks/useCourses';
import { api } from '../../api/client';
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
  { key: 'all', label: 'All Assignments' },
  { key: 'active', label: 'Active' },
  { key: 'closed', label: 'Closed' },
];
const blank = () => ({ courseId: '', title: '', description: '', dueDate: '', maxScore: '100' });

const asList = (res: any): any[] => {
  const raw = res?.data ?? res;
  return Array.isArray(raw) ? raw : [];
};
/** backend sometimes returns { error: 'text' } (string) instead of { error: { message } } */
const apiMessage = (err: any, fallback: string) => (typeof err?.data?.error === 'string' ? err.data.error : err?.message || fallback);

/** Web: pages/admin/assignments/AssignmentsDashboard.jsx  (GET/POST/DELETE /assignments, GET /assignments/:id/submissions) */
export default function AssignmentsScreen() {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const { courses } = useCourses();

  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<any>(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

  const [subAssignment, setSubAssignment] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/assignments');
      setAssignments(asList(res));
    } catch (err: any) {
      toast.error(apiMessage(err, 'Failed to load assignments'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!subAssignment?.id) { setSubmissions([]); return; }
    let cancelled = false;
    setIsLoadingSubs(true);
    api.get<any>(`/assignments/${subAssignment.id}/submissions`)
      .then((res) => { if (!cancelled) setSubmissions(asList(res)); })
      .catch((err) => { if (!cancelled) { setSubmissions([]); toast.error(apiMessage(err, 'Failed to load submissions')); } })
      .finally(() => { if (!cancelled) setIsLoadingSubs(false); });
    return () => { cancelled = true; };
  }, [subAssignment?.id]);

  const handleDelete = async (id: string, title: string) => {
    if (await confirm({ title: 'Delete Assignment', message: `Are you sure you want to delete "${title}"? This cannot be undone.`, confirmText: 'Delete', isDestructive: true })) {
      try {
        await api.delete(`/assignments/${id}`);
        toast.success('Assignment deleted successfully');
        await load();
      } catch (err: any) {
        toast.error(apiMessage(err, 'Failed to delete assignment'));
      }
    }
  };

  const handleCreateSubmit = async () => {
    const e: Record<string, string> = {};
    if (!form.courseId) e.courseId = 'Please select a course/subject';
    if (!form.title.trim()) e.title = 'Please enter a title';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!form.dueDate.trim() || isNaN(new Date(form.dueDate.trim()).getTime())) e.dueDate = 'Please enter a due date (YYYY-MM-DD)';
    setErrors(e);
    if (Object.keys(e).length) { toast.error(Object.values(e)[0]); return; }
    setIsCreating(true);
    try {
      await api.post('/assignments', { ...form, title: form.title.trim(), description: form.description.trim(), dueDate: form.dueDate.trim(), maxScore: Number(form.maxScore) || 100 });
      toast.success('Assignment created successfully!');
      setIsCreateOpen(false);
      setForm(blank());
      await load();
    } catch (err: any) {
      toast.error(apiMessage(err, 'Failed to create assignment'));
    } finally {
      setIsCreating(false);
    }
  };

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return assignments.filter((a) => {
      const matches = (a.title || '').toLowerCase().includes(q) || (a.subject || '').toLowerCase().includes(q) || (a.teacherName || '').toLowerCase().includes(q);
      if (statusFilter === 'active') return matches && a.status === 'active';
      if (statusFilter === 'closed') return matches && a.status === 'closed';
      return matches;
    });
  }, [assignments, searchTerm, statusFilter]);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const activeCount = assignments.filter((a) => a.status === 'active').length;
  const closedCount = assignments.filter((a) => a.status === 'closed').length;
  const totalSubmissions = assignments.reduce((acc, a) => acc + (a.submissionsCount || 0), 0);

  const courseOptions = (courses || []).map((c: any) => ({ value: c.id, label: `${c.name} (${c.code || 'Course'})` }));
  const fmtDue = (d: any) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => { setIsRefreshing(true); await load(); setIsRefreshing(false); }}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Assignments Management</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Create, monitor, and manage coursework assignments and student submissions across classes.</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button title="Create Assignment" size="sm" fullWidth={false} icon={Plus} onPress={() => { setForm(blank()); setErrors({}); setIsCreateOpen(true); }} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCell}><StatCard compact title="Total Assignments" value={isLoading ? '...' : assignments.length} icon={BookOpen} tone="primary" /></View>
        <View style={{ width: 8 }} />
        <View style={styles.statCell}><StatCard compact title="Active Due Dates" value={isLoading ? '...' : activeCount} icon={Clock} tone="success" /></View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCell}><StatCard compact title="Closed / Expired" value={isLoading ? '...' : closedCount} icon={CheckCircle2} tone="warning" /></View>
        <View style={{ width: 8 }} />
        <View style={styles.statCell}><StatCard compact title="Student Submissions" value={isLoading ? '...' : totalSubmissions} icon={Users} tone="info" /></View>
      </View>

      <SearchBar value={searchTerm} onChangeText={(t) => { setSearchTerm(t); setCurrentPage(1); }} placeholder="Search assignments, courses, faculty..." style={styles.search} />
      <Tabs tabs={FILTERS} active={statusFilter} onChange={(k) => { setStatusFilter(k); setCurrentPage(1); }} />

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : paginated.length === 0 ? (
        <EmptyState icon={BookOpen} title="No assignments found" message="No assignments found matching your criteria." />
      ) : (
        <>
          {paginated.map((a) => {
            const isClosed = a.status === 'closed';
            return (
              <Card key={a.id} style={styles.card}>
                <View style={styles.top}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{a.title}</Text>
                    <Text style={[styles.meta, { color: colors.textSubtle }]} numberOfLines={1}>{a.description}</Text>
                  </View>
                  <View style={[styles.statusChip, { backgroundColor: isClosed ? colors.cardAlt : colors.successSoft }]}>
                    <Text style={[styles.statusText, { color: isClosed ? colors.textMuted : colors.success }]}>{isClosed ? 'Closed' : 'Active'}</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Course / Subject</Text>
                    <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>{a.subject}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.label, { color: colors.textMuted }]}>Assigned By</Text>
                    <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>{a.teacherName}</Text>
                  </View>
                </View>

                <View style={styles.dueRow}>
                  <Calendar size={14} color={colors.textSubtle} />
                  <Text style={[styles.due, { color: colors.text }]}>{fmtDue(a.dueDate)}</Text>
                </View>

                <View style={styles.cardActions}>
                  <Pressable onPress={() => setSubAssignment(a)} style={[styles.actionBtn, { borderColor: colors.border }]}>
                    <Users size={15} color={colors.info} /><Text style={[styles.actionText, { color: colors.text }]}>Submissions ({a.submissionsCount || 0})</Text>
                  </Pressable>
                  <Pressable onPress={() => setSubAssignment(a)} style={[styles.iconAction, { borderColor: colors.border }]}><Eye size={15} color={colors.primary} /></Pressable>
                  <Pressable onPress={() => handleDelete(a.id, a.title)} style={[styles.iconAction, { borderColor: colors.border }]}><Trash2 size={15} color={colors.danger} /></Pressable>
                </View>
              </Card>
            );
          })}
          {filtered.length > PAGE_SIZE ? <Pagination totalItems={filtered.length} currentPage={currentPage} pageSize={PAGE_SIZE} pageSizeOptions={[PAGE_SIZE]} onPageChange={setCurrentPage} /> : null}
        </>
      )}

      {/* Create */}
      <SheetModal
        visible={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Assignment" tall
        footer={
          <View style={styles.footer}>
            <Button title="Cancel" variant="outline" onPress={() => setIsCreateOpen(false)} style={styles.flex} />
            <View style={{ width: 10 }} />
            <Button title="Publish Assignment" loading={isCreating} onPress={handleCreateSubmit} style={styles.flex} />
          </View>
        }>
        <Text style={[styles.meta, { color: colors.textMuted, marginBottom: 14 }]}>Publish a new coursework task or homework for enrolled students.</Text>
        <Select label="Course / Class" required value={form.courseId} onChange={(v) => setForm((p: any) => ({ ...p, courseId: v }))} options={courseOptions} placeholder="Select a Course / Subject" searchable error={errors.courseId} />
        <Input label="Assignment Title" required placeholder="e.g. Midterm Project Report" value={form.title} onChangeText={(x) => setForm((p: any) => ({ ...p, title: x }))} error={errors.title} />
        <Input label="Description & Instructions" required multiline placeholder="Provide assignment goals, guidelines, and submission requirements..." value={form.description} onChangeText={(x) => setForm((p: any) => ({ ...p, description: x }))} error={errors.description} />
        <Input label="Due Date (YYYY-MM-DD)" required placeholder="2026-01-31" value={form.dueDate} onChangeText={(x) => setForm((p: any) => ({ ...p, dueDate: x }))} error={errors.dueDate} />
        <Input label="Maximum Score" keyboardType="number-pad" value={String(form.maxScore)} onChangeText={(x) => setForm((p: any) => ({ ...p, maxScore: x.replace(/[^0-9]/g, '') }))} />
      </SheetModal>

      {/* Submissions */}
      <SheetModal
        visible={!!subAssignment} onClose={() => setSubAssignment(null)} title="Student Submissions" tall
        footer={<Button title="Close" variant="outline" onPress={() => setSubAssignment(null)} />}>
        {subAssignment ? (
          <View>
            <Text style={[styles.subTitle, { color: colors.text }]}>{subAssignment.title}</Text>
            <Text style={[styles.meta, { color: colors.textMuted, marginBottom: 12 }]}>Course: {subAssignment.subject} • Total Submissions: {submissions.length}</Text>
            {isLoadingSubs ? (
              <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
            ) : submissions.length === 0 ? (
              <EmptyState icon={Users} title="No submissions yet" message="No submissions uploaded by students yet." />
            ) : (
              submissions.map((sub) => (
                <View key={sub.id} style={[styles.subCard, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{sub.studentName}</Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>Adm No: {sub.admissionNumber} • {sub.department}</Text>
                    <Text style={[styles.meta, { color: colors.textSubtle }]}>Submitted: {sub.submittedAt ? new Date(sub.submittedAt).toLocaleString() : '-'}</Text>
                    <View style={[styles.statusChip, { backgroundColor: colors.successSoft, marginTop: 8 }]}>
                      <Text style={[styles.statusText, { color: colors.success }]}>{sub.status || 'Submitted'}</Text>
                    </View>
                  </View>
                  {sub.fileUrl ? (
                    <Pressable onPress={() => Linking.openURL(sub.fileUrl).catch(() => toast.error('Could not open the file'))} style={[styles.viewBtn, { backgroundColor: colors.primary }]}>
                      <ExternalLink size={14} color={colors.onPrimary} /><Text style={{ color: colors.onPrimary, fontSize: 11, fontWeight: fontWeight.bold, marginLeft: 5 }}>View Work</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))
            )}
          </View>
        ) : null}
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
  loader: { minHeight: 160, alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: 10, marginTop: 4, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  meta: { fontSize: 11, marginTop: 2 },
  statusChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start', marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: fontWeight.bold },
  infoRow: { flexDirection: 'row', marginTop: 12, gap: 12 },
  label: { fontSize: 11, fontWeight: fontWeight.bold },
  value: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: 2 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  due: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, minHeight: 36, gap: 6 },
  actionText: { fontSize: 11, fontWeight: fontWeight.bold },
  iconAction: { width: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, minHeight: 36 },
  subTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  subCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, marginLeft: 8 },
  flex: { flex: 1 },
  footer: { flexDirection: 'row', marginTop: 6 },
});