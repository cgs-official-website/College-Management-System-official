import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BookOpen, Edit2, Plus, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useCourses } from '../../hooks/useCourses';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { SearchBar } from '../../components/ui/SearchBar';
import { Pagination } from '../../components/ui/Pagination';
import { useConfirm } from '../../contexts/ConfirmContext';
import CourseFormModal from '../../features/courses/CourseFormModal';
import { fontSize, fontWeight } from '../../theme/typography';

export default function CoursesListScreen() {
  const { colors } = useTheme();
  const { courses, isLoading, createCourse, updateCourse, deleteCourse, refetch } = useCourses();
  const confirm = useConfirm();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const filtered = useMemo(() => courses.filter((c) => `${c.name || ''} ${c.code || ''}`.toLowerCase().includes(query.trim().toLowerCase())), [courses]);
  const rows = filtered.slice((page - 1) * size, page * size);

  const submit = async (data: any) => {
    if (editing) await updateCourse.mutateAsync({ id: editing.id, data }); else await createCourse.mutateAsync(data);
    setOpen(false); setEditing(null);
  };

  return (
    <Screen refreshing={isLoading} onRefresh={refetch}>
      <View style={styles.header}><View><Text style={[styles.title, { color: colors.text }]}>Classes & Sections</Text><Text style={[styles.subtitle, { color: colors.textMuted }]}>Manage academic courses used across the college.</Text></View><Button title="Add" size="sm" fullWidth={false} icon={Plus} onPress={() => { setEditing(null); setOpen(true); }} /></View>
      <SearchBar value={query} onChangeText={(v) => { setQuery(v); setPage(1); }} placeholder="Search courses..." />
      {rows.map((c) => <Card key={c.id} style={styles.card}>
        <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}><BookOpen size={18} color={colors.primary}/></View>
        <View style={{ flex: 1 }}><Text style={[styles.name, { color: colors.text }]}>{c.name}</Text><Text style={[styles.meta, { color: colors.textMuted }]}>{c.code} · {c.semester || 1} semesters · {c.credits || 0} credits</Text></View>
        <Pressable hitSlop={10} onPress={() => { setEditing(c); setOpen(true); }}><Edit2 size={17} color={colors.primary}/></Pressable>
        <Pressable hitSlop={10} onPress={async () => { if (await confirm({ title: 'Delete Course', message: 'Delete this course?', confirmText: 'Delete', isDestructive: true })) await deleteCourse.mutateAsync(c.id); }}><Trash2 size={17} color={colors.danger}/></Pressable>
      </Card>)}
      {!isLoading && rows.length === 0 ? <Text style={[styles.center, { color: colors.textMuted }]}>No courses found.</Text> : null}
      <Pagination totalItems={filtered.length} currentPage={page} pageSize={size} onPageChange={setPage} onPageSizeChange={setSize}/>
      <CourseFormModal isOpen={open} onClose={() => setOpen(false)} onSubmit={submit} initialData={editing} isLoading={createCourse.isPending || updateCourse.isPending} />
    </Screen>
  );
}
const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  subtitle: { fontSize: fontSize.sm, marginTop: 3 },
  card: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  meta: { fontSize: fontSize.xs, marginTop: 3 },
  center: { textAlign: 'center', paddingVertical: 28 },
});
