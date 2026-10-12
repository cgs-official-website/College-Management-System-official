import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, Edit2, GraduationCap, Plus, Trash2 } from 'lucide-react-native';
import { useCourses } from '../../hooks/useCourses';
import { useDepartments } from '../../hooks/useDepartments';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SearchBar } from '../../components/ui/SearchBar';
import { Pagination } from '../../components/ui/Pagination';
import { SheetModal } from '../../components/ui/SheetModal';
import { useConfirm } from '../../contexts/ConfirmContext';
import { fontSize, fontWeight } from '../../theme/typography';

type Props = { departmentId?: string | null; departmentName?: string; onSelect?: (course: any) => void; onClearFilter?: () => void };

export default function CoursesTab({ departmentId, departmentName, onSelect, onClearFilter }: Props) {
  const { colors } = useTheme();
  const { courses, isLoading, createCourse, updateCourse, deleteCourse } = useCourses(departmentId || null);
  const { departments } = useDepartments();
  const confirm = useConfirm();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [values, setValues] = useState({ name: '', code: '', semester: '8', credits: '160', departmentId: departmentId || '' });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return courses.filter((c) => `${c.name || ''} ${c.code || ''}`.toLowerCase().includes(q));
  }, [courses, query]);
  const rows = filtered.slice((page - 1) * size, page * size);

  const openForm = (course: any = null) => {
    setEditing(course);
    setValues({
      name: course?.name || '',
      code: course?.code || '',
      semester: String(course?.semester || 8),
      credits: String(course?.credits ?? 160),
      departmentId: course?.departmentId || departmentId || '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!values.name.trim() || !values.code.trim() || !values.departmentId) return;
    const data = { ...values, name: values.name.trim(), code: values.code.trim().toUpperCase(), semester: Number(values.semester) || 1, credits: Number(values.credits) || 0 };
    if (editing) await updateCourse.mutateAsync({ id: editing.id, data });
    else await createCourse.mutateAsync(data);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      {departmentName ? (
        <View style={styles.breadcrumb}>
          <Pressable onPress={onClearFilter} style={styles.backRow}><ChevronLeft size={16} color={colors.primary} /><Text style={[styles.backText, { color: colors.primary }]}>Back to Departments</Text></Pressable>
          <Text style={[styles.separator, { color: colors.textSubtle }]}>/</Text>
          <Text style={[styles.breadcrumbText, { color: colors.text }]} numberOfLines={1}>{departmentName}</Text>
        </View>
      ) : null}

      <View style={styles.headingRow}>
        <View style={styles.copy}>
          <Text style={[styles.heading, { color: colors.text }]}>Programs / Courses</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>{departmentName ? `Programs under ${departmentName}` : 'Manage institutional programs and courses.'}</Text>
        </View>
        {departmentName ? <Button title="Clear" variant="outline" size="sm" fullWidth={false} onPress={onClearFilter} /> : null}
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchFlex}><SearchBar value={query} onChangeText={(v) => { setQuery(v); setPage(1); }} placeholder="Search courses..." /></View>
        <Button title="Add Course" size="sm" fullWidth={false} icon={Plus} onPress={() => openForm()} />
      </View>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : rows.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><GraduationCap size={28} color={colors.primary} /></View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No courses found</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Add a program or course to continue.</Text>
        </View>
      ) : (
        rows.map((course) => (
          <Pressable key={course.id} onPress={() => onSelect?.(course)} style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border }, pressed && { opacity: 0.88 }]}>
            <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}><GraduationCap size={19} color={colors.primary} /></View>
            <View style={styles.copy}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{course.name}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>{course.code} · {course.semester || 1} semesters · {course.credits || 0} credits</Text>
            </View>
            <View style={styles.actions}>
              <Pressable hitSlop={10} onPress={(e) => { e.stopPropagation(); openForm(course); }}><Edit2 size={18} color={colors.primary} /></Pressable>
              <Pressable hitSlop={10} onPress={async (e) => {
                e.stopPropagation();
                if (await confirm({ title: 'Delete Course', message: 'Delete this course?', confirmText: 'Delete', isDestructive: true })) await deleteCourse.mutateAsync(course.id);
              }}><Trash2 size={18} color={colors.danger} /></Pressable>
            </View>
          </Pressable>
        ))
      )}

      <Pagination totalItems={filtered.length} currentPage={page} pageSize={size} onPageChange={setPage} onPageSizeChange={setSize} />

      <SheetModal visible={open} onClose={() => setOpen(false)} title={editing ? 'Edit Course' : 'Add Course'} footer={
        <View style={styles.footer}><Button title="Cancel" variant="outline" onPress={() => setOpen(false)} style={{ flex: 1 }} /><View style={{ width: 10 }} /><Button title={editing ? 'Save Changes' : 'Create Course'} loading={createCourse.isPending || updateCourse.isPending} onPress={save} style={{ flex: 1 }} /></View>
      }>
        <Input label="Program Name" required placeholder="e.g. B.Tech Computer Science" value={values.name} onChangeText={(v) => setValues((p) => ({ ...p, name: v }))} />
        <Input label="Program Code" required placeholder="e.g. BTECH-CSE" value={values.code} onChangeText={(v) => setValues((p) => ({ ...p, code: v }))} autoCapitalize="characters" />
        <Input label="Total Semesters / Years" required keyboardType="number-pad" value={values.semester} onChangeText={(v) => setValues((p) => ({ ...p, semester: v.replace(/\D/g, '') }))} />
        <Select label="Department" required value={values.departmentId} placeholder="Select a Department" onChange={(v) => setValues((p) => ({ ...p, departmentId: v }))} options={departments.map((d) => ({ value: d.id, label: d.name }))} />
      </SheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  breadcrumb: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  backRow: { flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  separator: { marginHorizontal: 7 },
  breadcrumbText: { flex: 1, fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  copy: { flex: 1 },
  heading: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  sub: { fontSize: fontSize.xs, marginTop: 3 },
  toolbar: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  searchFlex: { flex: 1, marginRight: 10 },
  loader: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  card: { minHeight: 82, borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  meta: { fontSize: fontSize.xs, marginTop: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginLeft: 10 },
  empty: { minHeight: 190, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center', marginTop: 5 },
  footer: { flexDirection: 'row' },
});