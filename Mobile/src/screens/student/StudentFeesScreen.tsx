import React, { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import {
  AlertCircle,
  Calculator,
  CheckCircle2,
  CreditCard,
  Download,
  FileText,
  Share2,
  ShieldCheck,
  Wallet,
} from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge, toneForStatus } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SheetModal } from '../../components/ui/SheetModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { useStudentFees, usePayStudentFee, useStudentProfile } from '../../hooks/useStudentPortal';
import { toast } from '../../utils/toast';
import { formatCurrency, formatDate } from '../../utils/format';
import { fontSize, fontWeight } from '../../theme/typography';

const METHODS = ['UPI', 'Card', 'NetBanking'];

interface Receipt {
  receiptNumber: string;
  date: string;
  studentName: string;
  admissionNumber: string;
  department: string;
  invoiceName: string;
  amount: number;
}

/** Same maths as the web page: a "paid" invoice with no amountPaid counts as fully paid. */
const effectivePaidOf = (inv: any) =>
  inv.status === 'paid' && (!inv.amountPaid || Number(inv.amountPaid) === 0)
    ? Number(inv.amountDue || 0)
    : Number(inv.amountPaid || 0);

const feeNameOf = (inv: any) =>
  inv.feeType || inv.feeStructure?.name || inv.transactions?.[0]?.gatewayRef || 'Academic Fee';

/** Web: pages/student/StudentFeesDashboard.jsx */
export default function StudentFeesScreen() {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const { data: profile } = useStudentProfile();
  const { data, isLoading, isRefreshing, refetch } = useStudentFees();
  const { payFee, isPaying } = usePayStudentFee();

  const fee =
    data && typeof data === 'object' && 'totalAmount' in data
      ? data
      : { totalAmount: 0, paidAmount: 0, pendingAmount: 0, invoices: [] };
  const invoices: any[] = fee.invoices || [];

  const [selected, setSelected] = useState<any | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('UPI');
  const [receipt, setReceipt] = useState<Receipt | null>(null);

  const student = {
    studentName: profile?.name || userData?.name || 'Student',
    admissionNumber: profile?.admissionNumber || profile?.rollNumber || (userData as any)?.admissionNumber || 'N/A',
    department: profile?.department || 'Academic',
  };
  const collegeName = profile?.collegeName || (userData as any)?.collegeName || 'College';

  const pendingOf = (inv: any) => Math.max(0, Number(inv.amountDue || 0) - effectivePaidOf(inv));

  const openPay = (inv: any) => {
    setSelected(inv);
    const due = pendingOf(inv);
    setAmount(String(due > 0 ? due : Number(inv.amountDue || 0)));
    setMethod('UPI');
  };

  const handlePay = async () => {
    const value = Number(amount);
    if (!selected || !amount || isNaN(value) || value <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    const due = pendingOf(selected);
    if (due > 0 && value > due) {
      toast.error(`Amount cannot be more than the pending ${formatCurrency(due)}`);
      return;
    }
    try {
      const res: any = await payFee({ feeId: selected.id, amount: value, paymentMethod: method });
      toast.success('Fee payment completed successfully!');
      const invoiceName = feeNameOf(selected);
      setSelected(null);
      setReceipt({
        ...student,
        invoiceName,
        amount: value,
        date: formatDate(new Date()),
        receiptNumber: res?.receiptNumber || `REC-STU-${Date.now()}`,
      });
    } catch {
      // toast already shown by the hook
    }
  };

  const openReceiptFor = (inv: any) => {
    const tx = inv.transactions?.[0];
    setReceipt({
      ...student,
      invoiceName: feeNameOf(inv),
      amount: effectivePaidOf(inv),
      date: formatDate(tx?.paidAt || inv.dueDate || new Date()),
      receiptNumber: tx?.gatewayRef || `REC-${String(inv.id).substring(0, 8)}`,
    });
  };

  const shareReceipt = async () => {
    if (!receipt) return;
    const text = [
      `${collegeName} - Official Student Fee Receipt`,
      '------------------------------',
      `Receipt No : ${receipt.receiptNumber}`,
      `Date       : ${receipt.date}`,
      `Student    : ${receipt.studentName}`,
      `Admission  : ${receipt.admissionNumber}`,
      `Department : ${receipt.department}`,
      `Fee Head   : ${receipt.invoiceName}`,
      `Amount Paid: ${formatCurrency(receipt.amount)}`,
      'Status     : CLEARED',
    ].join('\n');
    try {
      await Share.share({ title: 'Fee Receipt', message: text });
    } catch {
      toast.error('Could not share the receipt');
    }
  };

  const pending = Number(fee.pendingAmount || 0);

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefreshing} onRefresh={refetch}>
      <Text style={[styles.title, { color: colors.text }]}>Fees & Finance</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Review your tuition fee breakdown, payment installments, and official receipts.
      </Text>

      {isLoading ? (
        <Loader label="Loading fees..." />
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard compact title="Total Fees" value={formatCurrency(fee.totalAmount)} icon={Calculator} tone="primary" />
            <StatCard compact title="Amount Paid" value={formatCurrency(fee.paidAmount)} icon={CheckCircle2} tone="success" />
            <StatCard
              compact
              title="Pending"
              value={formatCurrency(pending)}
              icon={pending > 0 ? AlertCircle : Wallet}
              tone={pending > 0 ? 'danger' : 'success'}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Fee Invoices & Statements</Text>
            <Badge label={`${invoices.length} Invoices`} tone="neutral" />
          </View>

          {invoices.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No Fee Invoices"
              message="Assigned fee structures and tuition payment schedules will be listed here."
            />
          ) : (
            invoices.map((inv) => {
              const isPaid = inv.status === 'paid';
              const isPartial = inv.status === 'partial';
              const paid = effectivePaidOf(inv);
              const due = pendingOf(inv);
              const tint = isPaid ? colors.success : isPartial ? colors.warning : colors.danger;
              const tintBg = isPaid ? colors.successSoft : isPartial ? colors.warningSoft : colors.dangerSoft;

              return (
                <Card key={inv.id} style={styles.card}>
                  <View style={styles.row}>
                    <View style={[styles.iconBox, { backgroundColor: tintBg, borderColor: colors.border }]}>
                      <FileText size={22} color={tint} />
                    </View>
                    <View style={styles.body}>
                      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                        {feeNameOf(inv)}
                      </Text>
                      <View style={{ marginTop: 4 }}>
                        <Badge label={String(inv.status || 'pending').toUpperCase()} tone={toneForStatus(inv.status)} small />
                      </View>
                    </View>
                    <Text style={[styles.amount, { color: colors.text }]}>{formatCurrency(inv.amountDue)}</Text>
                  </View>

                  <View style={[styles.detailRow, { borderTopColor: colors.border }]}>
                    <View style={styles.detailCell}>
                      <Text style={[styles.detailLabel, { color: colors.textSubtle }]}>Paid</Text>
                      <Text style={[styles.detailValue, { color: colors.success }]}>{formatCurrency(paid)}</Text>
                    </View>
                    <View style={styles.detailCell}>
                      <Text style={[styles.detailLabel, { color: colors.textSubtle }]}>Balance</Text>
                      <Text style={[styles.detailValue, { color: due > 0 ? colors.danger : colors.text }]}>
                        {formatCurrency(due)}
                      </Text>
                    </View>
                    <View style={styles.detailCell}>
                      <Text style={[styles.detailLabel, { color: colors.textSubtle }]}>Due Date</Text>
                      <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(inv.dueDate)}</Text>
                    </View>
                  </View>

                  {isPaid ? (
                    <Button
                      title="View Receipt"
                      icon={Download}
                      variant="secondary"
                      size="sm"
                      onPress={() => openReceiptFor(inv)}
                      style={styles.actionBtn}
                    />
                  ) : (
                    <Button
                      title={`Pay ${formatCurrency(due)}`}
                      icon={CreditCard}
                      size="sm"
                      onPress={() => openPay(inv)}
                      style={styles.actionBtn}
                    />
                  )}
                </Card>
              );
            })
          )}
        </>
      )}

      {/* Online payment sheet */}
      <SheetModal
        visible={!!selected}
        onClose={() => !isPaying && setSelected(null)}
        title="Pay Student Fee"
        footer={
          <View>
            <Button
              title={`Pay ${formatCurrency(Number(amount || 0))}`}
              icon={CreditCard}
              loading={isPaying}
              onPress={handlePay}
            />
            <View style={styles.secureRow}>
              <ShieldCheck size={13} color={colors.textSubtle} />
              <Text style={[styles.secureText, { color: colors.textSubtle }]}>
                Secured 256-bit institutional encrypted payment gateway
              </Text>
            </View>
          </View>
        }>
        {selected ? (
          <>
            <View style={[styles.summary, { backgroundColor: colors.cardAlt }]}>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Invoice</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{feeNameOf(selected)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total Fee Amount</Text>
                <Text style={[styles.summaryValue, { color: colors.text }]}>{formatCurrency(selected.amountDue)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Pending</Text>
                <Text style={[styles.summaryValue, { color: colors.danger }]}>{formatCurrency(pendingOf(selected))}</Text>
              </View>
            </View>

            <Input
              label="Amount to Pay (INR)"
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ''))}
              keyboardType="numeric"
              placeholder="0"
            />

            <Text style={[styles.methodLabel, { color: colors.text }]}>Payment Method</Text>
            <View style={styles.methodRow}>
              {METHODS.map((m) => {
                const active = method === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMethod(m)}
                    style={[
                      styles.methodBtn,
                      {
                        borderColor: active ? colors.primary : colors.border,
                        backgroundColor: active ? colors.primarySoft : 'transparent',
                      },
                    ]}>
                    <Text style={{ color: active ? colors.primary : colors.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>
                      {m}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}
      </SheetModal>

      {/* Official receipt sheet */}
      <SheetModal
        visible={!!receipt}
        onClose={() => setReceipt(null)}
        title="Fee Settlement Receipt"
        footer={
          <View style={styles.receiptActions}>
            <Button title="Share / Save" icon={Share2} onPress={shareReceipt} style={{ flex: 1 }} />
            <Button title="Close" variant="outline" fullWidth={false} onPress={() => setReceipt(null)} />
          </View>
        }>
        {receipt ? (
          <View style={[styles.receipt, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}>
            <View style={[styles.receiptHead, { borderBottomColor: colors.border }]}>
              <Text style={[styles.receiptCollege, { color: colors.text }]}>{collegeName.toUpperCase()}</Text>
              <Text style={[styles.receiptSub, { color: colors.textMuted }]}>OFFICIAL STUDENT FEE RECEIPT</Text>
            </View>

            {[
              ['Receipt No', receipt.receiptNumber],
              ['Date', receipt.date],
              ['Student Name', receipt.studentName],
              ['Admission No', receipt.admissionNumber],
              ['Department', receipt.department],
              ['Fee Head', receipt.invoiceName],
            ].map(([label, value]) => (
              <View key={label} style={styles.receiptRow}>
                <Text style={[styles.receiptLabel, { color: colors.textMuted }]}>{label}</Text>
                <Text style={[styles.receiptValue, { color: colors.text }]}>{value}</Text>
              </View>
            ))}
            <View style={styles.receiptRow}>
              <Text style={[styles.receiptLabel, { color: colors.textMuted }]}>Payment Status</Text>
              <Text style={[styles.receiptValue, { color: colors.success }]}>CLEARED</Text>
            </View>

            <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.totalLabel, { color: colors.text }]}>Total Amount Paid</Text>
              <Text style={[styles.totalValue, { color: colors.success }]}>{formatCurrency(receipt.amount)}</Text>
            </View>
          </View>
        ) : null}
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  subtitle: { fontSize: fontSize.sm, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginRight: 8 },
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  body: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  amount: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  detailRow: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  detailCell: { flex: 1 },
  detailLabel: { fontSize: 11, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.4 },
  detailValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: 3 },
  actionBtn: { marginTop: 14 },
  summary: { borderRadius: 12, padding: 12, marginBottom: 16, gap: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: fontSize.xs },
  summaryValue: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginLeft: 12, flexShrink: 1, textAlign: 'right' },
  methodLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 8 },
  methodRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  methodBtn: { flex: 1, height: 44, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secureRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 10 },
  secureText: { fontSize: 10 },
  receipt: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 14, padding: 16, marginBottom: 8 },
  receiptHead: { alignItems: 'center', paddingBottom: 12, marginBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  receiptCollege: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, textAlign: 'center' },
  receiptSub: { fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 1, marginTop: 4 },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  receiptLabel: { fontSize: fontSize.xs },
  receiptValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginLeft: 12, flexShrink: 1, textAlign: 'right' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  totalLabel: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  totalValue: { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  receiptActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});