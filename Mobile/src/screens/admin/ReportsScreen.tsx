import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, BarChart3, Calendar, CheckCircle2, Clock, Download, FileDown, FileSpreadsheet, FileText, Filter, Printer, GraduationCap, Sparkles, TrendingUp, UserCheck, UserX, Users, Wallet } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useStudents } from '../../hooks/useStudents';
import { useStaff } from '../../hooks/useStaff';
import { useFees } from '../../hooks/useFees';
import { api } from '../../api/client';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SearchBar } from '../../components/ui/SearchBar';
import { Pagination } from '../../components/ui/Pagination';
import { SheetModal } from '../../components/ui/SheetModal';
import DemographicsChart from '../../components/charts/DemographicsChart';
import StaffOverviewChart from '../../components/charts/StaffOverviewChart';
import FinancialChart from '../../components/charts/FinancialChart';
import AttendanceChart from '../../components/charts/AttendanceChart';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

/* ------------------------------------------------------------------ helpers */
const num = (v: any) => parseFloat(String(v ?? 0)) || 0;
const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const isoDay = (d: Date) => d.toISOString().split('T')[0];
const initials = (name: string) => String(name || 'S').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || 'S';
const dayLabel = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const normGender = (g: any) => {
  const s = String(g || '').trim().toLowerCase();
  if (s === 'male' || s === 'm' || s === 'boy') return 'Male';
  if (s === 'female' || s === 'f' || s === 'girl') return 'Female';
  return 'Others';
};

/** binary string (char codes < 256) -> base64, no dependency */
const base64FromBinary = (s: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < s.length; i += 3) {
    const b1 = s.charCodeAt(i), b2 = s.charCodeAt(i + 1), b3 = s.charCodeAt(i + 2);
    out += chars[b1 >> 2];
    out += chars[((b1 & 3) << 4) | ((isNaN(b2) ? 0 : b2) >> 4)];
    out += isNaN(b2) ? '=' : chars[((b2 & 15) << 2) | ((isNaN(b3) ? 0 : b3) >> 6)];
    out += isNaN(b3) ? '=' : chars[b3 & 63];
  }
  return out;
};

const asciiSafe = (v: any) => String(v ?? '').replace(/₹/g, 'Rs.').replace(/[^\x20-\x7E]/g, '?');
const escHtml = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Real .pdf file (landscape A4, table layout) generated in plain JS - no native module needed */
const buildPdfBase64 = (title: string, subtitle: string, rows: any[]): string => {
  const W = 842, H = 595, M = 30, FS = 7.5, ROW_H = 16;
  const avail = W - 2 * M;
  const headers = Object.keys(rows[0]);
  const measure = headers.map((h) => Math.min(30, Math.max(h.length, ...rows.slice(0, 300).map((r) => String(r[h] ?? '').length))) + 2);
  const sum = measure.reduce((a, b) => a + b, 0);
  const colW = measure.map((m) => (m / sum) * avail);
  const colX = colW.map((_, i) => M + colW.slice(0, i).reduce((a, b) => a + b, 0));
  const esc = (t: string) => asciiSafe(t).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const fit = (t: any, w: number) => { const max = Math.max(3, Math.floor((w - 6) / (FS * 0.52))); const x = asciiSafe(t); return x.length > max ? `${x.slice(0, max - 2)}..` : x; };
  const tableTop = H - M - 52;
  const perPage = Math.floor((tableTop - M - 18) / ROW_H) - 1;
  const pageCount = Math.max(1, Math.ceil(rows.length / perPage));
  const streams: string[] = [];
  for (let pg = 0; pg < pageCount; pg++) {
    let c = '';
    c += `BT /F2 14 Tf ${M} ${H - M - 12} Td (${esc(title)}) Tj ET\n`;
    c += `0.4 g BT /F1 8 Tf ${M} ${H - M - 27} Td (${esc(subtitle)}) Tj ET 0 g\n`;
    c += `0.93 0.95 0.97 rg ${M} ${tableTop - 4} ${avail} ${ROW_H} re f 0 g\n`;
    headers.forEach((h, i) => { c += `BT /F2 ${FS} Tf ${colX[i] + 3} ${tableTop} Td (${esc(fit(h.toUpperCase(), colW[i]))}) Tj ET\n`; });
    rows.slice(pg * perPage, (pg + 1) * perPage).forEach((r, ri) => {
      const y = tableTop - (ri + 1) * ROW_H;
      headers.forEach((h, i) => { c += `BT /F1 ${FS} Tf ${colX[i] + 3} ${y} Td (${esc(fit(r[h], colW[i]))}) Tj ET\n`; });
      c += `0.88 G 0.5 w ${M} ${y - 4} m ${M + avail} ${y - 4} l S 0 G\n`;
    });
    c += `0.4 g BT /F1 7 Tf ${W / 2 - 25} ${M - 12} Td (Page ${pg + 1} of ${pageCount}) Tj ET 0 g\n`;
    streams.push(c);
  }
  const objs: string[] = [];
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[2] = `<< /Type /Pages /Kids [${streams.map((_, i) => `${5 + i * 2} 0 R`).join(' ')}] /Count ${pageCount} >>`;
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  streams.forEach((st, i) => {
    objs[5 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`;
    objs[6 + i * 2] = `<< /Length ${st.length} >>\nstream\n${st}endstream`;
  });
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  for (let i = 1; i < objs.length; i++) { offsets[i] = pdf.length; pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`; }
  const xref = pdf.length;
  pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objs.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return base64FromBinary(pdf);
};

/** HTML for the system print dialog (printers / Save as PDF) */
const buildHtml = (title: string, subtitle: string, rows: any[]): string => {
  const headers = Object.keys(rows[0]);
  return `<html><head><meta charset="utf-8"/><style>
    body{font-family:Arial,Helvetica,sans-serif;padding:24px;color:#0f172a}
    h1{font-size:20px;margin:0}p{color:#64748b;font-size:12px;margin:4px 0 16px}
    table{border-collapse:collapse;width:100%;font-size:11px}
    th{background:#f1f5f9;text-align:left;padding:8px;border:1px solid #e2e8f0;font-size:10px;text-transform:uppercase}
    td{padding:7px 8px;border:1px solid #e2e8f0}tr:nth-child(even) td{background:#f8fafc}
  </style></head><body><h1>${escHtml(title)}</h1><p>${escHtml(subtitle)}</p>
  <table><thead><tr>${headers.map((h) => `<th>${escHtml(h)}</th>`).join('')}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${headers.map((h) => `<td>${escHtml(r[h])}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
};

/** Saves into the phone's Downloads folder (Android) and opens it. Needs: react-native-blob-util */
const saveToDevice = async (fileName: string, mime: string, data: string, encoding: 'base64' | 'utf8') => {
  const BlobUtil = require('react-native-blob-util').default;
  const path = `${BlobUtil.fs.dirs.CacheDir}/${fileName}`;
  await BlobUtil.fs.writeFile(path, data, encoding);
  if (Platform.OS === 'android') {
    try {
      await BlobUtil.MediaCollection.copyToMediaStore({ name: fileName, parentFolder: '', mimeType: mime }, 'Download', path);
      toast.success(`Saved to Downloads: ${fileName}`);
    } catch {
      toast.success(`File ready: ${fileName}`);
    }
    try { await BlobUtil.android.actionViewIntent(path, mime); } catch { /* no viewer app installed */ }
  } else {
    await BlobUtil.ios.openDocument(path);
  }
};

/** Opens the Android print dialog (choose a connected printer, or "Save as PDF"). Needs: react-native-print */
const printHtml = async (html: string, jobName: string) => {
  const RNPrint = require('react-native-print').default;
  await RNPrint.print({ html, jobName });
};

const STATUS_STYLE = (status: string, colors: any) => {
  if (status === 'PAID') return { fg: colors.success, bg: colors.successSoft };
  if (status === 'OVERDUE') return { fg: colors.danger, bg: colors.dangerSoft };
  return { fg: colors.warning, bg: colors.warningSoft };
};

const FEE_FILTERS = ['ALL', 'PAID', 'PENDING', 'OVERDUE'];
const WINDOWS = [7, 14, 30];
const TABLE_W = 1010;
const COLS = { student: 200, status: 100, cls: 190, cat: 120, amt: 90, paid: 100, due: 100, method: 110 };

/* ------------------------------------------------------------------ small UI */
function SectionCard({ icon: Icon, tint, title, subtitle, onExport, children, colors }: any) {
  return (
    <Card style={styles.card}>
      <View style={styles.cardHead}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.titleRow}>
            {Icon ? <Icon size={20} color={tint} /> : null}
            <Text style={[styles.section, { color: colors.text }]} numberOfLines={1}>{title}</Text>
          </View>
          {subtitle ? <Text style={[styles.sectionSub, { color: colors.textMuted }]}>{subtitle}</Text> : null}
        </View>
        {onExport ? <Button title="Export" size="sm" variant="outline" fullWidth={false} icon={Download} onPress={onExport} /> : null}
      </View>
      {children}
    </Card>
  );
}

function StatBox({ title, icon: Icon, tint, tintBg, children, colors, highlight }: any) {
  return (
    <View style={[styles.statBox, { backgroundColor: highlight || colors.card, borderColor: colors.border }]}>
      <View style={styles.statTop}>
        <Text style={[styles.statTitle, { color: colors.textMuted }]} numberOfLines={1}>{title}</Text>
        {Icon ? <View style={[styles.statIcon, { backgroundColor: tintBg }]}><Icon size={14} color={tint} /></View> : null}
      </View>
      {children}
    </View>
  );
}

/** Web: pages/admin/reports/Reports.jsx (+ modules/reports/*) - latest layout */
export default function ReportsScreen() {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';

  const { students, isLoading: loadingStudents, refetch: refetchStudents } = useStudents(collegeId);
  const { staff, isLoading: loadingStaff, refetch: refetchStaff } = useStaff(collegeId);
  const { fees, isLoading: loadingFees, refetch: refetchFees } = useFees(collegeId);

  const [isRefreshing, setIsRefreshing] = useState(false);

  /* ---------- attendance ---------- */
  const [windowDays, setWindowDays] = useState<number>(30);
  const [attTab, setAttTab] = useState<'daily' | 'class'>('daily');
  const [attendance, setAttendance] = useState<any>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  const loadAttendance = useCallback(async (days: number) => {
    setLoadingAttendance(true);
    try {
      const today = new Date();
      const from = new Date();
      from.setDate(today.getDate() - (days - 1));
      const res = await api.get<any>('/reports/attendance', { params: { startDate: isoDay(from), endDate: isoDay(today), groupBy: 'class' } });
      setAttendance(res?.data || res);
    } catch (err: any) {
      setAttendance(null);
      toast.error(err?.message || 'Failed to load attendance report');
    } finally {
      setLoadingAttendance(false);
    }
  }, []);

  useEffect(() => { void loadAttendance(windowDays); }, [windowDays, loadAttendance]);

  const trendData: any[] = attendance?.trendData || [];
  const groupedResults: any[] = attendance?.groupedResults || [];
  const summary = attendance?.summary || {};
  const totals = useMemo(() => trendData.reduce((a, d) => ({
    present: a.present + (d.presentCount || 0), absent: a.absent + (d.absentCount || 0), late: a.late + (d.lateCount || 0),
  }), { present: 0, absent: 0, late: 0 }), [trendData]);
  const pct = Number(summary.overallPercentage || 0);
  const health = pct >= 75 ? { label: 'HEALTHY', c: colors.success, bg: colors.successSoft } : pct >= 60 ? { label: 'MODERATE', c: colors.warning, bg: colors.warningSoft } : { label: 'CRITICAL', c: colors.danger, bg: colors.dangerSoft };

  const absentShare = (p: number, a: number, l: number) => { const t = p + a + l; return t > 0 ? (a / t) * 100 : 0; };
  const dailyBars = trendData.map((d) => ({ label: dayLabel(d.date), present: d.attendancePercentage || 0, absent: absentShare(d.presentCount || 0, d.absentCount || 0, d.lateCount || 0) }));
  const classBars = groupedResults.map((g) => ({ label: String(g.name), present: g.attendancePercentage || 0, absent: absentShare(g.presentCount || 0, g.absentCount || 0, g.lateCount || 0) }));

  /* ---------- derived chart data ---------- */
  const { studentsByClass, studentsByGender } = useMemo(() => {
    const cMap: Record<string, number> = {};
    const gMap: Record<string, number> = {};
    (students || []).forEach((s: any) => {
      const cls = s.class || 'Unknown'; cMap[cls] = (cMap[cls] || 0) + 1;
      const g = normGender(s.gender); gMap[g] = (gMap[g] || 0) + 1;
    });
    const order = ['Female', 'Male', 'Others'];
    return {
      studentsByClass: Object.keys(cMap).map((k) => ({ name: k, count: cMap[k] })),
      studentsByGender: order.filter((k) => gMap[k]).map((k) => ({ name: k, value: gMap[k] })),
    };
  }, [students]);

  const staffByDept = useMemo(() => {
    const dMap: Record<string, number> = {};
    (staff || []).forEach((s: any) => { const d = s.department || 'Unknown'; dMap[d] = (dMap[d] || 0) + 1; });
    return Object.keys(dMap).map((k) => ({ name: k, count: dMap[k] }));
  }, [staff]);

  const feeRows = useMemo(() => (fees || []).map((f: any) => ({
    id: f.id,
    name: f.studentName || 'Student',
    email: f.student?.user?.email || '',
    cls: f.studentClass || 'General',
    type: f.feeType || 'Tuition Fee',
    amount: num(f.amount ?? f.amountDue),
    paid: num(f.amountPaid),
    due: f.dueDate ? new Date(f.dueDate).toLocaleDateString() : '-',
    method: f.paymentMethod || '-',
    status: String(f.status || 'PENDING').toUpperCase(),
  })), [fees]);

  const fin = useMemo(() => {
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let billed = 0, collected = 0, pending = 0, overdue = 0, pendingN = 0, overdueN = 0;
    feeRows.forEach((r: any) => {
      billed += r.amount; collected += r.paid;
      if (r.status === 'PENDING') { pending += r.amount - r.paid; pendingN++; }
      if (r.status === 'OVERDUE') { overdue += r.amount - r.paid; overdueN++; }
      byStatus[r.status] = (byStatus[r.status] || 0) + r.amount;
      byType[r.type] = (byType[r.type] || 0) + r.amount;
    });
    return {
      billed, collected, pending, overdue, pendingN, overdueN,
      rate: billed > 0 ? Math.round((collected / billed) * 100) : 0,
      statusData: Object.keys(byStatus).map((k) => ({ name: k, value: byStatus[k] })),
      typeData: Object.keys(byType).map((k) => ({ name: k, amount: byType[k] })),
    };
  }, [feeRows]);

  /* ---------- fee table filter ---------- */
  const [feeFilter, setFeeFilter] = useState('ALL');
  const [feeSearch, setFeeSearch] = useState('');
  const [feePage, setFeePage] = useState(1);
  const FEE_PAGE = 10;
  const filteredFees = useMemo(() => {
    const q = feeSearch.trim().toLowerCase();
    return feeRows.filter((r: any) => {
      if (feeFilter !== 'ALL' && r.status !== feeFilter) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q) || r.cls.toLowerCase().includes(q) || r.type.toLowerCase().includes(q);
    });
  }, [feeRows, feeFilter, feeSearch]);
  const pagedFees = filteredFees.slice((feePage - 1) * FEE_PAGE, feePage * FEE_PAGE);

  /* ---------- export (Excel, CSV, PDF, Print) ---------- */
  const [job, setJob] = useState<{ title: string; rows: any[]; base: string } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const openExport = (title: string, rows: any[], base: string) => {
    if (!rows || !rows.length) { toast.error('No data available to export.'); return; }
    setJob({ title, rows, base });
  };

  const runExport = async (format: 'xlsx' | 'csv' | 'pdf' | 'print') => {
    if (!job) return;
    setIsExporting(true);
    try {
      const reportTitle = job.base.replace(/_/g, ' ');
      const subtitle = `${userData?.collegeName || 'Institution'}  |  Generated on ${new Date().toLocaleString()}`;
      const fileName = `${job.base}_${isoDay(new Date())}.${format}`;
      if (format === 'print') {
        await printHtml(buildHtml(reportTitle, subtitle, job.rows), reportTitle);
      } else if (format === 'pdf') {
        await saveToDevice(fileName, 'application/pdf', buildPdfBase64(reportTitle, subtitle, job.rows), 'base64');
      } else if (format === 'xlsx') {
        let XLSX: any;
        try { XLSX = require('xlsx'); } catch { toast.error('Excel support is not installed in this build.'); return; }
        const ws = XLSX.utils.json_to_sheet(job.rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Report');
        await saveToDevice(fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', XLSX.write(wb, { type: 'base64', bookType: 'xlsx' }), 'base64');
      } else {
        const headers = Object.keys(job.rows[0]);
        const lines = [headers.join(',')];
        job.rows.forEach((row) => lines.push(headers.map((h) => `"${String(row[h] ?? 'N/A').replace(/"/g, '""')}"`).join(',')));
        await saveToDevice(fileName, 'text/csv', `\uFEFF${lines.join('\n')}`, 'utf8');
      }
      setJob(null);
    } catch (err: any) {
      Alert.alert('Export Error', err?.message || 'Could not export the report.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportStudents = () => openExport('Export Students', (students || []).map((s: any) => ({
    ID: s.id, FirstName: s.firstName, LastName: s.lastName, Email: s.email || 'N/A', Phone: s.phone || 'N/A',
    Class: s.class, Section: s.section, Gender: normGender(s.gender), JoinDate: s.createdAt ? new Date(s.createdAt).toLocaleDateString() : 'N/A',
  })), 'Student_Demographics_Report');
  const exportStaff = () => openExport('Export Staff', (staff || []).map((s: any) => ({
    ID: s.id, Name: `${s.firstName} ${s.lastName}`, Role: s.role, Department: s.department, Email: s.email, Phone: s.phone || 'N/A', Status: s.status, JoinDate: s.joinDate,
  })), 'Staff_Directory_Report');
  const feeExportRows = (rows: any[]) => rows.map((r: any) => ({ Student: r.name, Email: r.email || 'N/A', Class: r.cls, FeeCategory: r.type, Amount: r.amount, AmountPaid: r.paid, DueDate: r.due, Method: r.method, Status: r.status }));
  const exportAttendance = () => attTab === 'daily'
    ? openExport('Export Attendance', trendData.map((d) => ({ Date: d.date, Present: d.presentCount, Absent: d.absentCount, Late: d.lateCount, AttendancePercentage: `${d.attendancePercentage}%` })), 'Attendance_Trend_Report')
    : openExport('Export Attendance', groupedResults.map((g) => ({ Class: g.name, Students: g.totalStudents, Present: g.presentCount, Absent: g.absentCount, Late: g.lateCount, AttendancePercentage: `${g.attendancePercentage}%` })), 'Attendance_By_Class_Report');

  /* ------------------------------------------------------------------ render */
  const Loading = () => <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.textMuted, marginTop: 8 }}>Loading data...</Text></View>;
  const attendanceCards = [
    { key: 'students', title: 'STUDENTS TRACKED', icon: Users, tint: colors.info, bg: colors.infoSoft, value: summary.totalStudents ?? 0, valueColor: colors.text, note: 'Active student cohort' },
    { key: 'present', title: 'TOTAL PRESENT', icon: UserCheck, tint: colors.success, bg: colors.successSoft, value: totals.present, valueColor: colors.success, note: 'Marked present', noteIcon: TrendingUp },
  ];

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => {
        setIsRefreshing(true);
        await Promise.all([refetchStudents?.(), refetchStaff?.(), refetchFees?.(), loadAttendance(windowDays)]);
        setIsRefreshing(false);
      }}>
      <View style={{ marginBottom: 6 }}>
        <Text style={[styles.title, { color: colors.text }]}>Reports & Analytics</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Visual insights and multi-format data exports in Excel (.xlsx), CSV (.csv), and PDF (.pdf) formats.</Text>
      </View>

      {/* ---------------- Student Demographics ---------------- */}
      <SectionCard colors={colors} icon={GraduationCap} tint="#10b981" title="Student Demographics" onExport={exportStudents}>
        {loadingStudents ? <Loading /> : <DemographicsChart classData={studentsByClass} genderData={studentsByGender} />}
      </SectionCard>

      {/* ---------------- Staff Overview ---------------- */}
      <SectionCard colors={colors} icon={Users} tint="#10b981" title="Staff Overview" onExport={exportStaff}>
        {loadingStaff ? <Loading /> : <StaffOverviewChart deptData={staffByDept} />}
      </SectionCard>

      {/* ---------------- Financial & Fee Summary ---------------- */}
      <SectionCard colors={colors} icon={Wallet} tint="#f59e0b" title="Financial & Fee Summary" subtitle="Revenue collection, outstanding dues, and student transaction breakdown" onExport={() => openExport('Export Fee Report', feeExportRows(feeRows), 'Financial_Fee_Report')}>
        {loadingFees ? <Loading /> : (
          <>
            <View style={styles.grid}>
              <View style={styles.cell}>
                <StatBox colors={colors} title="TOTAL BILLED" icon={Wallet} tint={colors.info} tintBg={colors.infoSoft}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{inr(fin.billed)}</Text>
                  <Text style={[styles.statNote, { color: colors.textMuted }]}>{feeRows.length} Total Records</Text>
                </StatBox>
              </View>
              <View style={styles.cell}>
                <StatBox colors={colors} title="TOTAL COLLECTED" icon={CheckCircle2} tint={colors.success} tintBg={colors.successSoft}>
                  <Text style={[styles.statValue, { color: colors.success }]}>{inr(fin.collected)}</Text>
                  <View style={styles.progressRow}>
                    <View style={[styles.track, { backgroundColor: colors.cardAlt }]}><View style={{ width: `${Math.min(100, fin.rate)}%`, height: '100%', backgroundColor: colors.success, borderRadius: 4 }} /></View>
                    <Text style={[styles.progressPct, { color: colors.success }]}>{fin.rate}%</Text>
                  </View>
                </StatBox>
              </View>
              <View style={styles.cell}>
                <StatBox colors={colors} title="PENDING DUES" icon={Clock} tint={colors.warning} tintBg={colors.warningSoft}>
                  <Text style={[styles.statValue, { color: colors.warning }]}>{inr(fin.pending)}</Text>
                  <Text style={[styles.statNote, { color: colors.textMuted }]}>{fin.pendingN} Pending Invoices</Text>
                </StatBox>
              </View>
              <View style={styles.cell}>
                <StatBox colors={colors} title="OVERDUE DUES" icon={AlertCircle} tint={colors.danger} tintBg={colors.dangerSoft}>
                  <Text style={[styles.statValue, { color: colors.danger }]}>{inr(fin.overdue)}</Text>
                  <Text style={[styles.statNote, { color: colors.textMuted }]}>{fin.overdueN} Overdue Invoices</Text>
                </StatBox>
              </View>
            </View>

            <FinancialChart statusData={fin.statusData} typeData={fin.typeData} />

            {/* Fee Records Breakdown */}
            <View style={[styles.feeBox, { borderColor: colors.border }]}>
              <View style={styles.feeHead}>
                <Filter size={16} color={colors.textMuted} />
                <Text style={[styles.feeTitle, { color: colors.text }]}>Fee Records Breakdown</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                {FEE_FILTERS.map((f) => {
                  const active = feeFilter === f;
                  return (
                    <Pressable key={f} onPress={() => { setFeeFilter(f); setFeePage(1); }} style={[styles.filterChip, { backgroundColor: active ? '#10b981' : colors.card, borderColor: active ? '#10b981' : colors.border }]}>
                      <Text style={{ color: active ? '#fff' : colors.textMuted, fontSize: 12, fontWeight: fontWeight.bold }}>{f}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={styles.feeTools}>
                <View style={{ flex: 1 }}><SearchBar value={feeSearch} onChangeText={(t) => { setFeeSearch(t); setFeePage(1); }} placeholder="Search student, class, fee type..." /></View>
                <View style={{ width: 8 }} />
                <Button title="Download" size="sm" variant="outline" fullWidth={false} icon={Download} onPress={() => openExport('Download Fee Records', feeExportRows(filteredFees), 'Fee_Records')} />
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View style={{ width: TABLE_W }}>
                  <View style={[styles.tr, styles.thead, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                    <Text style={[styles.th, { width: COLS.student, color: colors.textMuted }]}>STUDENT</Text>
                    <Text style={[styles.th, { width: COLS.status, color: colors.textMuted }]}>STATUS</Text>
                    <Text style={[styles.th, { width: COLS.cls, color: colors.textMuted }]}>CLASS / SECTION</Text>
                    <Text style={[styles.th, { width: COLS.cat, color: colors.textMuted }]}>FEE CATEGORY</Text>
                    <Text style={[styles.th, { width: COLS.amt, color: colors.textMuted }]}>AMOUNT</Text>
                    <Text style={[styles.th, { width: COLS.paid, color: colors.textMuted }]}>AMOUNT PAID</Text>
                    <Text style={[styles.th, { width: COLS.due, color: colors.textMuted }]}>DUE DATE</Text>
                    <Text style={[styles.th, { width: COLS.method, color: colors.textMuted }]}>METHOD</Text>
                  </View>
                  {pagedFees.length === 0 ? (
                    <View style={styles.noRows}><Text style={{ color: colors.textMuted }}>No fee records found.</Text></View>
                  ) : pagedFees.map((r: any) => {
                    const st = STATUS_STYLE(r.status, colors);
                    return (
                      <View key={r.id} style={[styles.tr, { borderColor: colors.border }]}>
                        <View style={[styles.td, { width: COLS.student, flexDirection: 'row', alignItems: 'center' }]}>
                          <View style={[styles.avatar, { backgroundColor: colors.successSoft }]}><Text style={{ color: colors.success, fontSize: 11, fontWeight: fontWeight.extrabold }}>{initials(r.name)}</Text></View>
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={[styles.cellMain, { color: colors.text }]} numberOfLines={1}>{r.name}</Text>
                            {r.email ? <Text style={[styles.cellSub, { color: colors.textSubtle }]} numberOfLines={1}>{r.email}</Text> : null}
                          </View>
                        </View>
                        <View style={[styles.td, { width: COLS.status, alignItems: 'flex-start' }]}><View style={[styles.statusChip, { backgroundColor: st.bg }]}><Text style={{ color: st.fg, fontSize: 11, fontWeight: fontWeight.extrabold }}>{r.status}</Text></View></View>
                        <Text style={[styles.td, styles.cellTxt, { width: COLS.cls, color: colors.text }]} numberOfLines={2}>{r.cls}</Text>
                        <View style={[styles.td, { width: COLS.cat }]}><View style={[styles.catChip, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}><Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: fontWeight.medium }} numberOfLines={1}>{r.type}</Text></View></View>
                        <Text style={[styles.td, styles.cellTxt, { width: COLS.amt, color: colors.text, fontWeight: fontWeight.bold }]}>{inr(r.amount)}</Text>
                        <Text style={[styles.td, styles.cellTxt, { width: COLS.paid, color: r.paid > 0 ? colors.success : colors.textSubtle, fontWeight: fontWeight.bold }]}>{r.paid > 0 ? inr(r.paid) : '—'}</Text>
                        <View style={[styles.td, { width: COLS.due, flexDirection: 'row', alignItems: 'center', gap: 4 }]}><Calendar size={12} color={colors.textSubtle} /><Text style={[styles.cellTxt, { color: colors.textMuted }]}>{r.due}</Text></View>
                        <Text style={[styles.td, styles.cellTxt, { width: COLS.method, color: colors.textMuted }]} numberOfLines={1}>{r.method}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
              <Text style={[styles.showing, { color: colors.textMuted }]}>
                Showing {filteredFees.length === 0 ? 0 : (feePage - 1) * FEE_PAGE + 1} to {Math.min(feePage * FEE_PAGE, filteredFees.length)} of {filteredFees.length} records
              </Text>
              {filteredFees.length > FEE_PAGE ? <Pagination totalItems={filteredFees.length} currentPage={feePage} pageSize={FEE_PAGE} pageSizeOptions={[FEE_PAGE]} onPageChange={setFeePage} /> : null}
            </View>
          </>
        )}
      </SectionCard>

      {/* ---------------- Attendance Overview ---------------- */}
      <SectionCard colors={colors} icon={Calendar} tint="#10b981" title="Attendance Overview" subtitle="Institutional attendance health, daily trend tracking, and class engagement" onExport={exportAttendance}>
        {loadingAttendance ? <Loading /> : (
          <>
            <View style={styles.grid}>
              <View style={styles.cell}>
                <StatBox colors={colors} title="OVERALL ATTENDANCE" icon={Sparkles} tint={colors.success} tintBg={colors.successSoft} highlight={colors.successSoft}>
                  <View style={styles.healthRow}>
                    <Text style={[styles.bigValue, { color: colors.text }]}>{pct}%</Text>
                    <View style={[styles.healthChip, { backgroundColor: health.bg }]}><Text style={{ color: health.c, fontSize: 10, fontWeight: fontWeight.extrabold }}>{health.label}</Text></View>
                  </View>
                  <View style={[styles.track, { backgroundColor: colors.card, marginTop: 8 }]}><View style={{ width: `${Math.min(100, pct)}%`, height: '100%', backgroundColor: colors.success, borderRadius: 4 }} /></View>
                  <Text style={[styles.statNote, { color: colors.textMuted }]}>{windowDays}-day average</Text>
                </StatBox>
              </View>
              {attendanceCards.map((c) => (
                <View key={c.key} style={styles.cell}>
                  <StatBox colors={colors} title={c.title} icon={c.icon} tint={c.tint} tintBg={c.bg}>
                    <Text style={[styles.bigValue, { color: c.valueColor }]}>{c.value}</Text>
                    <Text style={[styles.statNote, { color: colors.textMuted }]}>{c.note}</Text>
                  </StatBox>
                </View>
              ))}
              <View style={styles.cell}>
                <StatBox colors={colors} title="ABSENCES & LATE" icon={UserX} tint={colors.danger} tintBg={colors.dangerSoft}>
                  <View style={styles.healthRow}>
                    <Text style={[styles.bigValue, { color: colors.danger }]}>{totals.absent}</Text>
                    <Text style={{ color: colors.warning, fontSize: 11, fontWeight: fontWeight.bold, marginLeft: 6 }}>+{totals.late} Late</Text>
                  </View>
                  <Text style={[styles.statNote, { color: colors.textMuted }]}>Requires attention</Text>
                </StatBox>
              </View>
            </View>

            <View style={styles.controls}>
              <View style={[styles.seg, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
                {([['daily', 'Daily Attendance', BarChart3], ['class', 'By Class', Users]] as any[]).map(([k, label, Icon]) => {
                  const active = attTab === k;
                  return (
                    <Pressable key={k} onPress={() => setAttTab(k)} style={[styles.segItem, active && { backgroundColor: colors.card }]}>
                      <Icon size={14} color={active ? '#10b981' : colors.textMuted} />
                      <Text style={{ color: active ? '#10b981' : colors.textMuted, fontSize: 12, fontWeight: fontWeight.bold, marginLeft: 6 }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.windowRow}>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginRight: 8 }}>Window:</Text>
                {WINDOWS.map((d) => {
                  const active = windowDays === d;
                  return (
                    <Pressable key={d} onPress={() => setWindowDays(d)} style={[styles.winChip, { backgroundColor: active ? '#10b981' : colors.cardAlt }]}>
                      <Text style={{ color: active ? '#fff' : colors.textMuted, fontSize: 12, fontWeight: fontWeight.bold }}>{d}D</Text>
                    </Pressable>
                  );
                })}
                <View style={{ flex: 1 }} />
                <Button title="Download" size="sm" variant="outline" fullWidth={false} icon={Download} onPress={exportAttendance} />
              </View>
            </View>

            <AttendanceChart data={attTab === 'daily' ? dailyBars : classBars} rotateLabels={attTab === 'class'} />

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <View style={styles.liveRow}><View style={styles.liveDot} /><Text style={{ color: colors.textMuted, fontSize: 11, flexShrink: 1 }}>Real-time Institutional Attendance Telemetry</Text></View>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>{trendData.length} Active Observation Days  •  <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>{pct}% Average Ratio</Text></Text>
            </View>
          </>
        )}
      </SectionCard>

      {/* ---------------- Export menu ---------------- */}
      <SheetModal visible={!!job} onClose={() => setJob(null)} title="Download Format">
        <Text style={[styles.fmtLabel, { color: colors.textSubtle }]}>DOWNLOAD FORMAT</Text>
        <Text style={[styles.fmtReport, { color: colors.text }]}>{(job?.base || '').replace(/_/g, ' ')}</Text>
        {([
          { k: 'xlsx', Icon: FileSpreadsheet, tint: '#10b981', bg: colors.successSoft, name: 'Excel (.xlsx)', badge: 'Spreadsheet', desc: 'Formatted workbook for Microsoft Excel' },
          { k: 'csv', Icon: FileText, tint: colors.info, bg: colors.infoSoft, name: 'CSV (.csv)', badge: 'Raw Data', desc: 'Universal comma-separated format' },
          { k: 'pdf', Icon: FileDown, tint: colors.danger, bg: colors.dangerSoft, name: 'PDF (.pdf)', badge: 'Document', desc: 'Table document saved to your Downloads' },
        ] as any[]).map((o) => (
          <Pressable key={o.k} disabled={isExporting} onPress={() => runExport(o.k)} style={[styles.exportOpt, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}>
            <View style={[styles.fmtIcon, { backgroundColor: o.bg }]}><o.Icon size={20} color={o.tint} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={styles.fmtTop}>
                <Text style={[styles.exportText, { color: colors.text }]}>{o.name}</Text>
                <View style={[styles.fmtBadge, { backgroundColor: o.bg }]}><Text style={{ color: o.tint, fontSize: 10, fontWeight: fontWeight.bold }}>{o.badge}</Text></View>
              </View>
              <Text style={[styles.fmtDesc, { color: colors.textMuted }]} numberOfLines={2}>{o.desc}</Text>
            </View>
          </Pressable>
        ))}
        <View style={[styles.fmtSep, { backgroundColor: colors.border }]} />
        <Pressable disabled={isExporting} onPress={() => runExport('print')} style={[styles.exportOpt, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}>
          <View style={[styles.fmtIcon, { backgroundColor: colors.card }]}><Printer size={20} color={colors.textMuted} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.exportText, { color: colors.text }]}>Print / Save PDF</Text>
            <Text style={[styles.fmtDesc, { color: colors.textMuted }]}>Print to a connected printer, or save as PDF from the print dialog</Text>
          </View>
        </Pressable>
        {isExporting ? <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} /> : null}
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, marginTop: 3, lineHeight: 19 },
  card: { marginTop: 12, padding: 14 },
  cardHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 8 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  section: { flexShrink: 1, fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  sectionSub: { fontSize: 11, marginTop: 4, lineHeight: 16 },
  loading: { height: 140, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cell: { width: '50%', padding: 4 },
  statBox: { borderWidth: 1, borderRadius: 16, padding: 12, minHeight: 112 },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statTitle: { flex: 1, fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.6 },
  statIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  statValue: { fontSize: 20, fontWeight: fontWeight.extrabold, marginTop: 10 },
  bigValue: { fontSize: 28, fontWeight: fontWeight.extrabold, marginTop: 8 },
  statNote: { fontSize: 11, marginTop: 4 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  track: { flex: 1, height: 6, borderRadius: 4, overflow: 'hidden' },
  progressPct: { fontSize: 11, fontWeight: fontWeight.bold },
  healthRow: { flexDirection: 'row', alignItems: 'center' },
  healthChip: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginLeft: 8, marginTop: 8 },
  feeBox: { borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 14 },
  feeHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  feeTitle: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  filterRow: { gap: 8, paddingBottom: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  feeTools: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tr: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth },
  thead: { borderTopWidth: StyleSheet.hairlineWidth, borderRadius: 8 },
  th: { paddingHorizontal: 10, paddingVertical: 10, fontSize: 10, fontWeight: fontWeight.extrabold, letterSpacing: 0.5 },
  td: { paddingHorizontal: 10, paddingVertical: 10 },
  cellTxt: { fontSize: 12 },
  cellMain: { fontSize: 12, fontWeight: fontWeight.bold },
  cellSub: { fontSize: 10, marginTop: 1 },
  avatar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  catChip: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  noRows: { height: 80, alignItems: 'center', justifyContent: 'center' },
  showing: { fontSize: 12, marginTop: 10 },
  controls: { marginTop: 14, gap: 10 },
  seg: { flexDirection: 'row', borderWidth: 1, borderRadius: 12, padding: 4, alignSelf: 'flex-start' },
  segItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 9 },
  windowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  winChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  footer: { marginTop: 14, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 6 },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10b981' },
  exportOpt: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10, gap: 12 },
  exportText: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  fmtLabel: { fontSize: 10, fontWeight: fontWeight.extrabold, letterSpacing: 0.8 },
  fmtReport: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold, marginTop: 4, marginBottom: 14, textTransform: 'capitalize' },
  fmtIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fmtTop: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  fmtBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  fmtDesc: { fontSize: 11, marginTop: 3, lineHeight: 15 },
  fmtSep: { height: 1, marginVertical: 6 },
});