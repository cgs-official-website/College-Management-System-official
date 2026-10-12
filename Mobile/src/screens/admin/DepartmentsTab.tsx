import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Building2, Edit2, Plus, Trash2 } from 'lucide-react-native';
import { useDepartments } from '../../hooks/useDepartments';
import { useTheme } from '../../contexts/ThemeContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SearchBar } from '../../components/ui/SearchBar';
import { Pagination } from '../../components/ui/Pagination';
import { SheetModal } from '../../components/ui/SheetModal';
import { useConfirm } from '../../contexts/ConfirmContext';
import { fontSize, fontWeight } from '../../theme/typography';

type Props = { onSelect?: (department: any) => void };

export default function DepartmentsTab({ onSelect }: Props) {
  const { colors } = useTheme();
  const { departments, isLoading, createDepartment, updateDepartment, deleteDepartment } = useDepartments();
  const confirm = useConfirm();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return departments.filter((d) => `${d.name || ''} ${d.code || ''}`.toLowerCase().includes(q));
  }, [departments, query]);
  const rows = filtered.slice((page - 1) * size, page * size);

  const openForm = (department: any = null) => {
    setEditing(department);
    setName(department?.name || '');
    setCode(department?.code || '');
    setOpen(true);
  };

  const save = async () => {
    if (!name.trim() || !code.trim()) return;
    const data = { name: name.trim(), code: code.trim().toUpperCase() };
    if (editing) await updateDepartment.mutateAsync({ id: editing.id, data });
    else await createDepartment.mutateAsync(data);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <View style={styles.searchFlex}>
          <SearchBar value={query} onChangeText={(v) => { setQuery(v); setPage(1); }} placeholder="Search departments..." />
        </View>
        <Button title="Add Department" size="sm" fullWidth={false} icon={Plus} onPress={() => openForm()} />
      </View>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : rows.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primarySoft }]}><Building2 size={28} color={colors.primary} /></View>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No departments found</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>Create a department to build your academic structure.</Text>
        </View>
      ) : (
        rows.map((department) => (
          <Pressable
            key={department.id}
            onPress={() => onSelect?.(department)}
            style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border }, pressed && { opacity: 0.88 }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}><Building2 size={19} color={colors.primary} /></View>
            <View style={styles.copy}>
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{department.name}</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>{department.code}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable hitSlop={10} onPress={(e) => { e.stopPropagation(); openForm(department); }}>
                <Edit2 size={18} color={colors.primary} />
              </Pressable>
              <Pressable hitSlop={10} onPress={async (e) => {
                e.stopPropagation();
                if (await confirm({ title: 'Delete Department', message: 'Delete this department? It will fail if courses or students are attached.', confirmText: 'Delete', isDestructive: true })) {
                  await deleteDepartment.mutateAsync(department.id);
                }
              }}>
                <Trash2 size={18} color={colors.danger} />
              </Pressable>
            </View>
          </Pressable>
        ))
      )}

      <Pagination totalItems={filtered.length} currentPage={page} pageSize={size} onPageChange={setPage} onPageSizeChange={setSize} />

      <SheetModal visible={open} onClose={() => setOpen(false)} title={editing ? 'Edit Department' : 'Add Department'} footer={
        <View style={styles.footer}>
          <Button title="Cancel" variant="outline" onPress={() => setOpen(false)} style={{ flex: 1 }} />
          <View style={{ width: 10 }} />
          <Button title={editing ? 'Save Changes' : 'Create Department'} loading={createDepartment.isPending || updateDepartment.isPending} onPress={save} style={{ flex: 1 }} />
        </View>
      }>
        <Input label="Department Name" required value={name} onChangeText={setName} />
        <Input label="Department Code" required value={code} onChangeText={setCode} autoCapitalize="characters" />
      </SheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 12 },
  toolbar: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  searchFlex: { flex: 1, marginRight: 10 },
  loader: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  card: { minHeight: 76, borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  copy: { flex: 1 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  meta: { fontSize: fontSize.xs, marginTop: 3 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginLeft: 10 },
  empty: { minHeight: 190, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  emptyText: { fontSize: fontSize.sm, textAlign: 'center', marginTop: 5 },
  footer: { flexDirection: 'row' },
});
