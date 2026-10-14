import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowUpRight, Banknote, Download, FileText } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { usePayroll } from '../../hooks/usePayroll';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { formatCurrency } from '../../utils/format';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

const statusTone = (s?: string) => (s === 'paid' ? 'success' : 'warning');

/** Web: pages/teacher/PayrollDashboard.jsx (usePayroll -> GET /payroll/my-payslips) */
export default function TeacherPayrollScreen() {
  const { colors } = useTheme();
  const { records, isLoading, refetch } = usePayroll();
  const [refreshing, setRefreshing] = useState(false);

  const current = records.length > 0 ? records[0] : null;
  const ytdEarnings = records.reduce((acc: number, r: any) => acc + (r.basicSalary || 0) + (r.allowances || 0), 0);
  const ytdDeductions = records.reduce((acc: number, r: any) => acc + (r.deductions || 0), 0);

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
      }}>
      <Text style={[styles.title, { color: colors.text }]}>Payroll & Salary</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        View your earnings, deductions, and download payslips.
      </Text>

      <View style={styles.stats}>
        <StatCard
          title="Net Salary (Current)"
          value={current ? formatCurrency(current.netSalary) : 'N/A'}
          icon={Banknote}
          tone="primary"
        />
        <StatCard title="YTD Earnings" value={formatCurrency(ytdEarnings)} icon={ArrowUpRight} tone="success" />
        <StatCard title="Tax Deductions YTD" value={formatCurrency(ytdDeductions)} icon={FileText} tone="warning" />
      </View>

      {/* Salary breakdown */}
      <Card padded={false} style={styles.block}>
        <View style={[styles.head, { backgroundColor: colors.cardAlt, borderBottomColor: colors.border }]}>
          <Text style={[styles.heading, { color: colors.text }]}>Salary Breakdown</Text>
          <Text style={[styles.headSub, { color: colors.textMuted }]}>For {current?.month || 'Current Month'}</Text>
        </View>

        {isLoading ? (
          <Loader label="Loading..." />
        ) : current ? (
          <View style={styles.body}>
            <View style={styles.line}>
              <Text style={[styles.lineLabel, { color: colors.textMuted }]}>Basic Salary</Text>
              <Text style={[styles.lineValue, { color: colors.text }]}>{formatCurrency(current.basicSalary)}</Text>
            </View>
            <View style={styles.line}>
              <Text style={[styles.lineLabel, { color: colors.textMuted }]}>Allowances</Text>
              <Text style={[styles.lineValue, { color: colors.success }]}>+{formatCurrency(current.allowances)}</Text>
            </View>
            <View style={styles.line}>
              <Text style={[styles.lineLabel, { color: colors.textMuted }]}>Deductions</Text>
              <Text style={[styles.lineValue, { color: colors.danger }]}>-{formatCurrency(current.deductions)}</Text>
            </View>
            <View style={[styles.line, styles.netLine, { borderTopColor: colors.border }]}>
              <Text style={[styles.netLabel, { color: colors.text }]}>Net Salary</Text>
              <Text style={[styles.netValue, { color: colors.primary }]}>{formatCurrency(current.netSalary)}</Text>
            </View>
            <Badge label={String(current.status || '').toUpperCase()} tone={statusTone(current.status)} />
          </View>
        ) : (
          <EmptyState
            icon={Banknote}
            title="Not Available"
            message="Your salary breakdown will appear here once payroll is processed by the HR department."
          />
        )}
      </Card>

      {/* Payslip history */}
      <Card padded={false} style={styles.block}>
        <View style={[styles.head, { borderBottomColor: colors.border }]}>
          <Text style={[styles.heading, { color: colors.text }]}>Payslip History</Text>
        </View>

        {isLoading ? (
          <Loader label="Loading..." />
        ) : records.length > 0 ? (
          records.map((r: any, idx: number) => (
            <View
              key={r.id ?? idx}
              style={[styles.slip, idx > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
              <View style={styles.flex}>
                <Text style={[styles.slipMonth, { color: colors.text }]}>{r.month}</Text>
                <Text style={[styles.slipNet, { color: colors.textMuted }]}>{formatCurrency(r.netSalary)}</Text>
              </View>
              <Badge label={String(r.status || '').toUpperCase()} tone={statusTone(r.status)} small />
              <Pressable
                onPress={() => toast.info('Payslip download is not available yet')}
                hitSlop={8}
                style={[styles.dl, { backgroundColor: colors.primarySoft }]}
                accessibilityLabel="Download payslip">
                <Download size={18} color={colors.primary} />
              </Pressable>
            </View>
          ))
        ) : (
          <EmptyState
            icon={FileText}
            title="No Payslips Available"
            message="Your monthly payslips with download links will appear here after payroll processing."
          />
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 4, marginBottom: 16 },
  stats: { gap: 12, marginBottom: 20 },
  block: { marginBottom: 16 },
  head: { padding: 16, borderBottomWidth: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  heading: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  headSub: { fontSize: fontSize.xs, marginTop: 4 },
  body: { padding: 16, gap: 14 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lineLabel: { fontSize: fontSize.sm },
  lineValue: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  netLine: { paddingTop: 14, borderTopWidth: 1 },
  netLabel: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  netValue: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  slip: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14, paddingHorizontal: 16 },
  slipMonth: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  slipNet: { fontSize: fontSize.sm, marginTop: 2 },
  dl: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});