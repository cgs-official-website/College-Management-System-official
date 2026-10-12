import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Award, Calendar, Edit2, GraduationCap, Plus, Trash2 } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useExams } from '../../hooks/useExams';
import { useCourses } from '../../hooks/useCourses';
import { useDepartments } from '../../hooks/useDepartments';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { SearchBar } from '../../components/ui/SearchBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Card } from '../../components/ui/Card';
import { useConfirm } from '../../contexts/ConfirmContext';
import ExamFormModal from '../../features/exams/ExamFormModal';
import { fontSize, fontWeight } from '../../theme/typography';

export default function ExamsScreen() {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { courses } = useCourses();
  const { departments } = useDepartments();
  const [courseId, setCourseId] = useState('ALL');
  const [deptId, setDeptId] = useState('ALL');
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'schedules' | 'results'>('schedules');
  const { exams, isLoading, addExam, updateExam, deleteExam, isAdding, isUpdating, refetch } = useExams(collegeId, { courseId });
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const filtered = useMemo(() => exams.filter((e) => {
    const q = query.trim().toLowerCase();
    const text = `${e.title || e.name || ''} ${e.subject || ''} ${e.courseName || ''} ${e.departmentName || ''}`.toLowerCase();
    return (!q || text.includes(q)) && (deptId === 'ALL' || e.departmentId === deptId);
  }), [exams, query, deptId]);

  const submit = async (data: any) => {
    try {
      if (editing) await updateExam({ id: editing.id, data });
      else await addExam(data);
      setOpen(false);
      setEditing(null);
    } catch {
      // Hook surfaces API errors.
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isLoading} onRefresh={refetch}>
      <View style={styles.banner}>
        <View style={styles.bannerGlow} />
        <View style={styles.bannerCopy}>
          <Text style={styles.bannerTitle}>Examination Center</Text>
          <Text style={styles.bannerText}>Schedule mid-terms, semester assessments, and track grading across institutional departments.</Text>
        </View>
        <Button title="Schedule Exam" size="sm" fullWidth={false} icon={Plus} onPress={() => { setEditing(null); setOpen(true); }} />
      </View>

      <View style={[styles.toolbar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.segment, { backgroundColor: colors.cardAlt }]}>
          <Pressable onPress={() => setActiveTab('schedules')} style={[styles.segmentButton, activeTab === 'schedules' && { backgroundColor: colors.primary }]}>
            <Text style={[styles.segmentText, { color: activeTab === 'schedules' ? colors.onPrimary : colors.textMuted }]}>Exam Schedules</Text>
          </Pressable>
          <Pressable onPress={() => setActiveTab('results')} style={[styles.segmentButton, activeTab === 'results' && { backgroundColor: colors.primary }]}>
            <Text style={[styles.segmentText, { color: activeTab === 'results' ? colors.onPrimary : colors.textMuted }]}>Exam Performance</Text>
          </Pressable>
        </View>
        <Select value={deptId} onChange={setDeptId} options={[{ value: 'ALL', label: `All Departments (${departments.length})` }, ...departments.map((d) => ({ value: d.id, label: `${d.name} (${d.code})` }))]} />
        <Select value={courseId} onChange={setCourseId} options={[{ value: 'ALL', label: 'All Courses' }, ...courses.map((c) => ({ value: c.id, label: c.name }))]} />
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search exam or subject..." />
      </View>

      {activeTab === 'results' ? (
        <View style={[styles.resultBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>Exam Marks & Results Overview</Text>
          <Text style={[styles.resultText, { color: colors.textMuted }]}>Summary of scores recorded across institutional examinations.</Text>
          <EmptyState icon={Award} title="No performance data" message="Marks will appear here after examination results are recorded." />
        </View>
      ) : isLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><Calendar size={30} color={colors.primary} /></View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No exams scheduled</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Schedule your next examination by selecting one of your created departments.</Text>
          <Button title="Schedule Exam" size="sm" style={styles.centerBtn} fullWidth={false} icon={Plus} onPress={() => { setEditing(null); setOpen(true); }} />
        </View>
      ) : (
        filtered.map((exam) => {
          const date = String(exam.date || '').split('-');
          const dateLabel = date.length === 3 ? `${date[2]} ${new Date(Number(date[0]), Number(date[1]) - 1).toLocaleString('default', { month: 'short' })}` : 'TBA';
          return (
            <Card key={exam.id} style={styles.card}>
              <View style={[styles.dateBlock, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
                <Text style={[styles.dateMonth, { color: colors.primary }]}>{date.length === 3 ? new Date(Number(date[0]), Number(date[1]) - 1).toLocaleString('default', { month: 'short' }) : 'TBA'}</Text>
                <Text style={[styles.dateDay, { color: colors.primary }]}>{date.length === 3 ? date[2] : '--'}</Text>
              </View>
              <View style={styles.cardCopy}>
                <View style={[styles.deptPill, { backgroundColor: colors.primarySoft }]}><GraduationCap size={12} color={colors.primary} /><Text style={[styles.deptText, { color: colors.primary }]}>{exam.departmentCode || exam.departmentName || 'General'}</Text></View>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{exam.subject || exam.name}</Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>{exam.type || 'Midterm'} · {exam.courseName || 'General Program'}</Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}><Award size={12} color={colors.warning} />  Max Marks: {exam.maxMarks || 100}</Text>
              </View>
              <View style={styles.actions}>
                <Pressable hitSlop={10} onPress={() => { setEditing(exam); setOpen(true); }}><Edit2 size={18} color={colors.primary} /></Pressable>
                <Pressable hitSlop={10} onPress={async () => { if (await confirm({ title: 'Delete Exam', message: 'Delete this examination schedule?', confirmText: 'Delete', isDestructive: true })) await deleteExam(exam.id); }}><Trash2 size={18} color={colors.danger} /></Pressable>
              </View>
            </Card>
          );
        })
      )}

      <ExamFormModal isOpen={open} onClose={() => setOpen(false)} onSubmit={submit} initialData={editing} isLoading={isAdding || isUpdating} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: { minHeight: 150, backgroundColor: '#0f172a', borderRadius: 24, padding: 18, marginBottom: 12, overflow: 'hidden', flexDirection: 'row', alignItems: 'center' },
  bannerGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, right: -65, top: -55, backgroundColor: 'rgba(16,185,129,0.20)' },
  bannerCopy: { flex: 1, paddingRight: 10 },
  bannerTitle: { color: '#fff', fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  bannerText: { color: '#cbd5e1', fontSize: fontSize.xs, lineHeight: 17, marginTop: 5 },
  toolbar: { borderWidth: 1, borderRadius: 18, padding: 10, marginBottom: 12 },
  segment: { flexDirection: 'row', alignSelf: 'flex-start', padding: 4, borderRadius: 12, marginBottom: 10 },
  centerBtn: { alignSelf: 'center' },
  segmentButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9 },
  segmentText: { fontSize: fontSize.xs, fontWeight: fontWeight.extrabold },
  resultBox: { borderWidth: 1, borderRadius: 20, padding: 16 },
  resultTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  resultText: { fontSize: fontSize.xs, marginTop: 3 },
  loader: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  empty: { minHeight: 300, borderWidth: 1, borderRadius: 24, padding: 26, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, textAlign: 'center' },
  emptyText: { fontSize: fontSize.sm, lineHeight: 19, textAlign: 'center', marginVertical: 8 },
  card: { marginBottom: 10, padding: 14, flexDirection: 'row', alignItems: 'flex-start' },
  dateBlock: { width: 58, height: 68, borderWidth: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dateMonth: { fontSize: 10, fontWeight: fontWeight.extrabold, textTransform: 'uppercase' },
  dateDay: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, lineHeight: 28 },
  cardCopy: { flex: 1, paddingRight: 46 },
  deptPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 7, marginBottom: 6 },
  deptText: { fontSize: 10, fontWeight: fontWeight.extrabold, marginLeft: 4 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold, lineHeight: 20 },
  meta: { fontSize: fontSize.xs, marginTop: 5 },
  actions: { position: 'absolute', right: 14, top: 14, flexDirection: 'row', gap: 14 },
});
