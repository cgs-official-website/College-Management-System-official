import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, CheckCircle, Clock, Edit, IndianRupee, Plus, Trash2 } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useFees } from '../../hooks/useFees';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { Badge, toneForStatus } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { FeeFormModal } from '../../features/fees/FeeFormModal';
import { fontSize, fontWeight } from '../../theme/typography';

const inr = (n: number) => `₹${(n || 0).toLocaleString()}`;

/** Web: pages/admin/fees/Fees.jsx */
export default function FeesScreen() {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { fees, isLoading, addFee, updateFee, deleteFee, isAdding, isUpdating, refetch } = useFees(collegeId);

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return fees;
    return fees.filter((f: any) => f.studentName?.toLowerCase().includes(q) || f.feeType?.toLowerCase().includes(q));
  }, [fees, searchTerm]);
  const rows = filtered.slice((page - 1) * size, page * size);

  const totals = useMemo(() => {
    const sum = (s: string) => fees.filter((f: any) => f.status === s).reduce((a: number, f: any) => a + (f.amount || 0), 0);
    return { collected: sum('paid'), pending: sum('pending'), overdue: sum('overdue') };
  }, [fees]);

  const handleDelete = async (id: string) => {
    if (await confirm({ title: 'Delete Fee Record', message: 'Are you sure you want to delete this fee record?', confirmText: 'Delete', isDestructive: true })) {
      await deleteFee(id).catch(() => {});
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editingFee) await updateFee({ id: editingFee.id, data });
      else await addFee(data);
      setIsFormOpen(false);
    } catch {
      // toast already shown by the hook
    }
  };

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => { setIsRefreshing(true); await refetch(); setIsRefreshing(false); }}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Fee Management</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Track tuition, manage payments, and monitor dues.</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button title="Create Fee Record" size="sm" fullWidth={false} icon={Plus} onPress={() => { setEditingFee(null); setIsFormOpen(true); }} />
      </View>

      <View style={styles.statsRow}>
        <StatCard compact title="Total Collected" value={isLoading ? '...' : inr(totals.collected)} icon={IndianRupee} tone="success" />
        <View style={{ width: 8 }} />
        <StatCard compact title="Pending Dues" value={isLoading ? '...' : inr(totals.pending)} icon={Clock} tone="warning" />
        <View style={{ width: 8 }} />
        <StatCard compact title="Overdue Amount" value={isLoading ? '...' : inr(totals.overdue)} icon={AlertCircle} tone="danger" />
      </View>

      <SearchBar value={searchTerm} onChangeText={(t) => { setSearchTerm(t); setPage(1); }} placeholder="Search by student name or fee type..." style={styles.search} />

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <EmptyState icon={IndianRupee} title="No fee records found" message="No fee records found matching your search." />
      ) : (
        <>
          {rows.map((fee: any) => (
            <Card key={fee.id} style={styles.card}>
              <View style={styles.top}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{fee.studentName}</Text>
                  <Text style={[styles.meta, { color: colors.textSubtle }]}>Class {fee.studentClass || '-'}</Text>
                </View>
                <Badge label={String(fee.status || '').replace(/^./, (c: string) => c.toUpperCase())} tone={toneForStatus(fee.status)} />
              </View>
              <View style={styles.infoRow}>
                <View>
                  <Text style={[styles.label, { color: colors.textMuted }]}>{fee.feeType}</Text>
                  <Text style={[styles.amount, { color: colors.text }]}>{inr(fee.amount)}</Text>
                  {fee.paymentMethod ? <Text style={[styles.meta, { color: colors.textSubtle }]}>via {fee.paymentMethod}</Text> : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.label, { color: colors.textMuted }]}>Due Date</Text>
                  <Text style={[styles.due, { color: colors.text }]}>{String(fee.dueDate || '').slice(0, 10) || '-'}</Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <Pressable onPress={() => { setEditingFee(fee); setIsFormOpen(true); }} style={[styles.actionBtn, { borderColor: colors.border }]}><Edit size={15} color={colors.primary} /><Text style={[styles.actionText, { color: colors.text }]}>Edit</Text></Pressable>
                <Pressable onPress={() => handleDelete(fee.id)} style={[styles.actionBtn, { borderColor: colors.border }]}><Trash2 size={15} color={colors.danger} /><Text style={[styles.actionText, { color: colors.text }]}>Delete</Text></Pressable>
              </View>
            </Card>
          ))}
          <Pagination totalItems={filtered.length} currentPage={page} pageSize={size} onPageChange={setPage} onPageSizeChange={(s) => { setSize(s); setPage(1); }} />
        </>
      )}

      <FeeFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleSubmit} initialData={editingFee} isLoading={isAdding || isUpdating} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, marginTop: 3, lineHeight: 19 },
  actions: { flexDirection: 'row', marginBottom: 12 },
  statsRow: { flexDirection: 'row', marginBottom: 12 },
  search: { marginBottom: 12 },
  loader: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: 10, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  meta: { fontSize: 11, marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  label: { fontSize: 11, fontWeight: fontWeight.bold },
  amount: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, marginTop: 2 },
  due: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, minHeight: 36, gap: 5 },
  actionText: { fontSize: 11, fontWeight: fontWeight.bold },
});