import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { CheckCircle, IndianRupee, Plus } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useBulkImportPayrolls, useCreatePayslip, usePayrolls, useUpdatePayrollStatus } from '../../hooks/usePayroll';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge, toneForStatus } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { ExcelUploadButton } from '../../components/ui/ExcelUploadButton';
import { PayslipFormModal } from '../../features/payroll/PayslipFormModal';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

const IMPORT_FIELDS = [
  { name: 'staffId', required: true, example: 'user id / teacher id' },
  { name: 'month', required: true, example: '8' },
  { name: 'year', required: true, example: '2026' },
  { name: 'basicPay', required: true, example: '30000' },
  { name: 'hra', example: '5000' }, { name: 'da', example: '2000' }, { name: 'specialAllowance', example: '1000' },
  { name: 'pf', example: '3600' }, { name: 'esi', example: '250' }, { name: 'pt', example: '200' },
  { name: 'tds', example: '0' }, { name: 'otherDeductions', example: '0' },
];
const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));
const money = (n: number) => `₹${(n || 0).toFixed(2)}`;

/** Web: pages/admin/payroll/PayrollDashboard.jsx */
export default function PayrollScreen() {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const { userRole, permissions } = useAuth();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const isAdmin = userRole === 'superadmin' || userRole === 'admin';
  const canRead = isAdmin || !!(permissions as any)?.payroll?.canRead;
  const canCreate = isAdmin || !!(permissions as any)?.payroll?.canCreate;
  const canUpdate = isAdmin || !!(permissions as any)?.payroll?.canUpdate;

  const filters = useMemo(() => ({ month, year, status: statusFilter }), [month, year, statusFilter]);
  const { data: payrolls, isLoading, isError, refetch } = usePayrolls(filters);
  const createPayslip = useCreatePayslip();
  const bulk = useBulkImportPayrolls();
  const updateStatus = useUpdatePayrollStatus();

  if (!canRead) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <EmptyState icon={IndianRupee} title="No access" message="You do not have permission to view Payroll." />
      </Screen>
    );
  }

  const handleCreate = async (data: any) => {
    try {
      await createPayslip.mutateAsync(data);
      toast.success('Payslip created successfully!');
      if (data.month) setMonth(Number(data.month));
      if (data.year) setYear(Number(data.year));
      setIsModalOpen(false);
      await refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create payslip');
    }
  };

  const handleBulk = async (rows: any[]) => {
    try {
      const res = await bulk.mutateAsync(rows);
      toast.success(res?.message || 'Bulk imported payslips successfully!');
      await refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to bulk import payslips');
      throw err;
    }
  };

  const markPaid = async (id: string) => {
    if (!(await confirm({ title: 'Mark as Paid', message: 'Mark this payroll record as paid via Bank Transfer?', confirmText: 'Mark Paid', isDestructive: false }))) return;
    try {
      await updateStatus.mutateAsync({ id, data: { status: 'Paid', paymentMethod: 'Bank Transfer' } });
      toast.success('Payroll marked as paid!');
      await refetch();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update status');
    }
  };

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => { setIsRefreshing(true); await refetch(); setIsRefreshing(false); }}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Payroll Management</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Create payslips and track salary payments.</Text>
        </View>
        <View style={[styles.headingIcon, { backgroundColor: colors.primarySoft }]}><IndianRupee size={22} color={colors.primary} /></View>
      </View>

      {canCreate ? (
        <View style={styles.actions}>
          <Button title="Create Payslip" size="sm" fullWidth={false} icon={Plus} onPress={() => setIsModalOpen(true)} />
          <ExcelUploadButton label="Bulk Import" title="Bulk Import Payslips" fields={IMPORT_FIELDS} sampleFileName="payroll_import_template.xlsx" onUpload={handleBulk} isLoading={bulk.isPending} />
        </View>
      ) : null}

      <Card style={styles.filters}>
        <Select label="Month" value={String(month)} onChange={(v) => { setMonth(parseInt(v, 10)); setPage(1); }} options={monthOptions} />
        <Input label="Year" value={String(year)} keyboardType="number-pad" onChangeText={(x) => { const n = parseInt(x.replace(/\D/g, '').slice(0, 4), 10); setYear(Number.isNaN(n) ? now.getFullYear() : n); }} />
        <Select
          label="Status" value={statusFilter} onChange={(v) => { setStatusFilter(v); setPage(1); }} placeholder="All"
          options={[{ value: '', label: 'All' }, { value: 'Pending', label: 'Pending' }, { value: 'Paid', label: 'Paid' }, { value: 'Cancelled', label: 'Cancelled' }]}
        />
      </Card>

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : isError ? (
        <EmptyState icon={IndianRupee} title="Something went wrong" message="Failed to load payroll records." />
      ) : payrolls.length === 0 ? (
        <EmptyState icon={IndianRupee} title="No payroll records" message="No payroll records found for this period." />
      ) : (
        payrolls.slice((page - 1) * pageSize, page * pageSize).map((p: any) => (
          <Card key={p.id} style={styles.card}>
            <View style={styles.top}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{p.staff?.name || 'Unnamed Staff'}</Text>
                <Text style={[styles.meta, { color: colors.textSubtle }]} numberOfLines={1}>{p.staff?.email || ''}</Text>
              </View>
              <Badge label={p.status || 'Pending'} tone={toneForStatus(p.status)} />
            </View>
            <View style={styles.grid}>
              <View style={styles.cell}><Text style={[styles.label, { color: colors.textMuted }]}>Basic Pay</Text><Text style={[styles.value, { color: colors.text }]}>{money(p.basicPay)}</Text></View>
              <View style={styles.cell}><Text style={[styles.label, { color: colors.textMuted }]}>Gross Pay</Text><Text style={[styles.value, { color: colors.text }]}>{money(p.grossPay)}</Text></View>
              <View style={styles.cell}><Text style={[styles.label, { color: colors.textMuted }]}>PF / ESI</Text><Text style={[styles.value, { color: colors.text }]}>{money(p.pf)} / {money(p.esi)}</Text></View>
              <View style={styles.cell}><Text style={[styles.label, { color: colors.textMuted }]}>Net Pay</Text><Text style={[styles.value, { color: colors.primary }]}>{money(p.netPay)}</Text></View>
            </View>
            {canUpdate && p.status === 'Pending' ? (
              <Pressable disabled={updateStatus.isPending} onPress={() => markPaid(p.id)} style={[styles.paidBtn, { backgroundColor: colors.successSoft }]}>
                <CheckCircle size={16} color={colors.success} /><Text style={{ color: colors.success, fontWeight: fontWeight.extrabold, fontSize: 12, marginLeft: 6 }}>Mark Paid</Text>
              </Pressable>
            ) : null}
          </Card>
        ))
      )}
      {!isLoading && !isError ? (
        <Pagination totalItems={payrolls.length} currentPage={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(n) => { setPageSize(n); setPage(1); }} />
      ) : null}

      <PayslipFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreate} isLoading={createPayslip.isPending} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, marginTop: 3, lineHeight: 19 },
  headingIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' },
  filters: { padding: 14, marginBottom: 12 },
  loader: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: 10, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  meta: { fontSize: 11, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  cell: { width: '50%', paddingVertical: 6 },
  label: { fontSize: 11, fontWeight: fontWeight.bold },
  value: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold, marginTop: 2 },
  paidBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 38, borderRadius: 10, marginTop: 10 },
});