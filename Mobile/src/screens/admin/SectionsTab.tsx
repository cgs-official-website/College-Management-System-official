import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, Edit2, Plus, Trash2, Users } from 'lucide-react-native';
import { useSections } from '../../hooks/useSections';
import { useCourses } from '../../hooks/useCourses';
import { useStaff } from '../../hooks/useStaff';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SearchBar } from '../../components/ui/SearchBar';
import { Pagination } from '../../components/ui/Pagination';
import { SheetModal } from '../../components/ui/SheetModal';
import { useConfirm } from '../../contexts/ConfirmContext';
import { fontSize, fontWeight } from '../../theme/typography';

type Props = { courseId?: string | null; courseName?: string; onClearFilter?: () => void };

export default function SectionsTab({ courseId, courseName, onClearFilter }: Props) {
  const { colors } = useTheme();
  const { sections, isLoading, createSection, updateSection, deleteSection } = useSections(courseId || null);
  const { courses } = useCourses();
  const { userData } = useAuth();
  const { staff } = useStaff(userData?.collegeId);
  const confirm = useConfirm();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [values, setValues] = useState({ name: '', capacity: '60', courseId: courseId || '' });
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const teacherName = (t: any) => t?.name || t?.user?.name || t?.user?.email || t?.email || 'Teacher';
  const toggleTeacher = (id: string) => setSelectedTeachers((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sections.filter((s) => `${s.name || ''} ${s.course?.name || ''}`.toLowerCase().includes(q));
  }, [sections, query]);
  const rows = filtered.slice((page - 1) * size, page * size);

  const openForm = (section: any = null) => {
    setEditing(section);
    setValues({ name: section?.name || '', capacity: String(section?.capacity || 60), courseId: section?.courseId || courseId || '' });
    setSelectedTeachers(section?.teachers?.map((t: any) => t.id) || []);
    setOpen(true);
  };

  const save = async () => {
    if (!values.name.trim() || !values.courseId) return;
    const data = { name: values.name.trim(), capacity: Math.max(1, Number(values.capacity) || 60), courseId: values.courseId, teacherIds: selectedTeachers };
    if (editing) await updateSection.mutateAsync({ id: editing.id, data });
    else await createSection.mutateAsync(data);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      {courseName ? (
        <View style={styles.breadcrumb}>
          <Pressable onPress={onClearFilter} style={styles.backRow}><ChevronLeft size={16} color={colors.primary} /><Text style={[styles.backText, { color: colors.primary }]}>Back to Programs</Text></Pressable>
          <Text style={[styles.separator, { color: colors.textSubtle }]}>/</Text>
          <Text style={[styles.breadcrumbText, { color: colors.text }]} numberOfLines={1}>{courseName}</Text>
        </View>
      ) : null}

      <View style={styles.headingRow}>
        <View style={styles.copy}>
          <Text style={[styles.heading, { color: colors.text }]}>Classes / Sections</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>{courseName ? `Classes under ${courseName}` : 'Manage class sections and capacities.'}</Text>
        </View>
        {courseName ? <Button title="Clear" variant="outline" size="sm" fullWidth={false} onPress={onClearFilter} /> : null}
      </View>

      <View style={styles.toolbar}>
        <View style={styles.searchFlex}><SearchBar value={query} onChangeText={(v) => { setQuery(v); setPage(1); }} placeholder="Search classes..." /></View>
        <Button title="Add Class" size="sm" fullWidth={false} icon={Plus} onPress={() => openForm()} />
      </View>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : rows.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><Users size={28} color={colors.primary} /></View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No classes found</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Add a class section to this program.</Text>
        </View>
      ) : (
        rows.map((section) => (
          <View key={section.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}><Users size={19} color={colors.primary} /></View>
            <View style={styles.copy}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{section.name}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>{section.course?.name || courseName || 'Program'} · Capacity {section.capacity || 0}</Text>
              <Text style={[styles.meta, { color: colors.textSubtle }]} numberOfLines={2}>Staff: {section.teachers?.length ? section.teachers.map((t: any) => teacherName(t)).join(', ') : 'None'}</Text>
              <View style={[styles.capacity, { backgroundColor: colors.cardAlt }]}><Users size={13} color={colors.textMuted} /><Text style={[styles.capacityText, { color: colors.textMuted }]}>{section.capacity || 0} seats</Text></View>
            </View>
            <View style={styles.actions}>
              <Pressable hitSlop={10} onPress={() => openForm(section)}><Edit2 size={18} color={colors.primary} /></Pressable>
              <Pressable hitSlop={10} onPress={async () => { if (await confirm({ title: 'Delete Section', message: 'Delete this class / section?', confirmText: 'Delete', isDestructive: true })) await deleteSection.mutateAsync(section.id); }}><Trash2 size={18} color={colors.danger} /></Pressable>
            </View>
          </View>
        ))
      )}

      <Pagination totalItems={filtered.length} currentPage={page} pageSize={size} pageSizeOptions={[10, 20, 50, 100]} onPageChange={setPage} onPageSizeChange={setSize} />

      <SheetModal visible={open} onClose={() => setOpen(false)} title={editing ? 'Edit Class' : 'Add Class'} footer={
        <View style={styles.footer}><Button title="Cancel" variant="outline" onPress={() => setOpen(false)} style={{ flex: 1 }} /><View style={{ width: 10 }} /><Button title={editing ? 'Save Changes' : 'Create Class'} loading={createSection.isPending || updateSection.isPending} onPress={save} style={{ flex: 1 }} /></View>
      }>
        <Input label="Class Name" required value={values.name} onChangeText={(v) => setValues((p) => ({ ...p, name: v }))} placeholder="e.g. Year 1 - Section A" />
        <Input label="Student Capacity" required keyboardType="number-pad" value={values.capacity} onChangeText={(v) => setValues((p) => ({ ...p, capacity: v.replace(/\D/g, '') }))} />
        <Select label="Program" required value={values.courseId} placeholder="Select a Program" onChange={(v) => setValues((p) => ({ ...p, courseId: v }))} options={courses.map((c) => ({ value: c.id, label: c.name }))} />
        <Text style={[styles.fieldLabel, { color: colors.text }]}>Assigned Staff / Class Teachers</Text>
        <View style={[styles.teacherBox, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <ScrollView nestedScrollEnabled style={{ maxHeight: 190 }}>
            {(staff || []).map((t: any) => {
              const on = selectedTeachers.includes(t.id);
              return (
                <Pressable key={t.id} onPress={() => toggleTeacher(t.id)} style={[styles.teacherRow, { borderColor: colors.border, backgroundColor: on ? colors.primarySoft : 'transparent' }]}>
                  <View style={[styles.check, { borderColor: on ? colors.primary : colors.border, backgroundColor: on ? colors.primary : 'transparent' }]}>
                    {on ? <Text style={{ color: '#fff', fontSize: 11, fontWeight: fontWeight.extrabold }}>✓</Text> : null}
                  </View>
                  <Text style={{ color: colors.text, fontSize: fontSize.sm, flex: 1 }} numberOfLines={1}>{teacherName(t)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        <Text style={[styles.hint, { color: colors.textSubtle }]}>Tap to select one or more staff members.</Text>
      </SheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 6 },
  teacherBox: { borderWidth: 1, borderRadius: 12, overflow: 'hidden' },
  teacherRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  check: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  hint: { fontSize: 11, marginTop: 6 },
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
  card: { minHeight: 86, borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  icon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  meta: { fontSize: fontSize.xs, marginTop: 3 },
  capacity: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, marginTop: 7 },
  capacityText: { fontSize: 10, fontWeight: fontWeight.bold, marginLeft: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginLeft: 10 },
  empty: { minHeight: 190, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center', marginTop: 5 },
  footer: { flexDirection: 'row' },
});