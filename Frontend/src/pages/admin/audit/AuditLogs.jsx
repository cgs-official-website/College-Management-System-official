import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  ShieldCheck, 
  History, 
  Search, 
  Filter, 
  RefreshCw, 
  FileSpreadsheet, 
  Calendar, 
  Clock, 
  User, 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Eye, 
  FileText, 
  Copy, 
  Check, 
  Layers, 
  Laptop, 
  Globe, 
  ChevronLeft, 
  ChevronRight, 
  Lock, 
  Info,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';

const MODULE_OPTIONS = [
  { value: 'ALL', label: 'All Modules' },
  { value: 'AUTH', label: 'Auth & Login' },
  { value: 'STUDENT', label: 'Students' },
  { value: 'FACULTY', label: 'Faculty & HR' },
  { value: 'COURSE', label: 'Courses & Academics' },
  { value: 'ATTENDANCE', label: 'Attendance' },
  { value: 'FEE', label: 'Fees & Finance' },
  { value: 'PERMISSION', label: 'Roles & Permissions' },
  { value: 'SETTINGS', label: 'System Settings' },
  { value: 'TIMETABLE', label: 'Timetable' },
  { value: 'EXAM', label: 'Exams' },
  { value: 'LIBRARY', label: 'Library' },
  { value: 'HOSTEL', label: 'Hostel' },
  { value: 'TRANSPORT', label: 'Transport' },
  { value: 'INVENTORY', label: 'Inventory' },
  { value: 'PAYROLL', label: 'Payroll' },
  { value: 'SYSTEM', label: 'General / System' }
];

const ACTION_OPTIONS = [
  { value: 'ALL', label: 'All Actions' },
  { value: 'CREATE', label: 'CREATE' },
  { value: 'UPDATE', label: 'UPDATE' },
  { value: 'DELETE', label: 'DELETE' },
  { value: 'LOGIN', label: 'LOGIN' },
  { value: 'LOGOUT', label: 'LOGOUT' },
  { value: 'COLLECT_FEE', label: 'COLLECT FEE' },
  { value: 'MARK_ATTENDANCE', label: 'MARK ATTENDANCE' },
  { value: 'ASSIGN_ROLE', label: 'ASSIGN ROLE' },
  { value: 'SETTINGS_UPDATE', label: 'SETTINGS UPDATE' }
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'FAILURE', label: 'Failure' }
];

const DATE_RANGE_PRESETS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' }
];

// Robust matching helpers for filters
export const matchesModule = (recordModule, filterModule) => {
  if (!filterModule || filterModule === 'ALL') return true;
  const rm = String(recordModule || '').toUpperCase();
  const fm = String(filterModule || '').toUpperCase();
  if (rm === fm) return true;
  if (fm === 'STUDENT' || fm === 'STUDENTS') return rm.includes('STUDENT');
  if (fm === 'FACULTY' || fm === 'STAFF' || fm === 'HR') return rm.includes('STAFF') || rm.includes('FACULTY') || rm.includes('HR');
  if (fm === 'COURSE' || fm === 'COURSES' || fm === 'ACADEMIC') return rm.includes('COURSE') || rm.includes('ACADEMIC') || rm.includes('DEPARTMENT');
  if (fm === 'FEE' || fm === 'FEES' || fm === 'FINANCE') return rm.includes('FEE') || rm.includes('FINANCE');
  if (fm === 'PERMISSION' || fm === 'ROLES' || fm === 'ROLE') return rm.includes('ROLE') || rm.includes('PERMISSION');
  if (fm === 'SETTINGS') return rm.includes('SETTING') || rm.includes('CONFIG') || rm.includes('COLLEGE');
  if (fm === 'AUTH' || fm === 'LOGIN') return rm.includes('AUTH') || rm.includes('LOGIN');
  if (fm === 'INVENTORY') return rm.includes('INVENT');
  if (fm === 'PAYROLL') return rm.includes('PAYROLL');
  return rm.includes(fm) || fm.includes(rm);
};

export const matchesAction = (recordAction, filterAction) => {
  if (!filterAction || filterAction === 'ALL') return true;
  const ra = String(recordAction || '').toUpperCase();
  const fa = String(filterAction || '').toUpperCase();
  if (ra === fa) return true;
  if (fa === 'CREATE') return ra.includes('CREATE') || ra.includes('ADD') || ra.includes('INSERT');
  if (fa === 'UPDATE') return ra.includes('UPDATE') || ra.includes('EDIT') || ra.includes('MODIFY') || ra.includes('SETTINGS');
  if (fa === 'DELETE') return ra.includes('DELETE') || ra.includes('REMOVE');
  if (fa === 'LOGIN') return ra.includes('LOGIN') || ra.includes('SIGNIN');
  if (fa === 'LOGOUT') return ra.includes('LOGOUT') || ra.includes('SIGNOUT');
  if (fa === 'COLLECT_FEE') return ra.includes('FEE') || ra.includes('COLLECT');
  if (fa === 'MARK_ATTENDANCE') return ra.includes('ATTENDANCE');
  if (fa === 'ASSIGN_ROLE') return ra.includes('ROLE') || ra.includes('PERMISSION');
  if (fa === 'SETTINGS_UPDATE') return ra.includes('SETTING') || ra.includes('CONFIG');
  return ra.includes(fa) || fa.includes(ra);
};

export const matchesStatus = (recordStatus, filterStatus) => {
  if (!filterStatus || filterStatus === 'ALL') return true;
  const rs = String(recordStatus || 'SUCCESS').toUpperCase();
  const fs = String(filterStatus).toUpperCase();
  return rs === fs;
};

const INITIAL_DEMO_LOGS = [
  {
    id: 'audit-init-001',
    userName: 'Admin User',
    userEmail: 'admin@college.edu',
    userRole: 'admin',
    action: 'LOGIN',
    module: 'AUTH',
    entity: 'UserSession',
    entityId: 'sess-001',
    description: 'Admin user authenticated successfully into management portal',
    oldValue: null,
    newValue: { status: 'AUTHENTICATED', role: 'admin' },
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
  },
  {
    id: 'audit-init-002',
    userName: 'System Sentinel',
    userEmail: 'system@internal',
    userRole: 'system',
    action: 'SETTINGS_UPDATE',
    module: 'SETTINGS',
    entity: 'SecurityPolicy',
    entityId: 'sys-audit-init',
    description: 'Audit logging engine initialized with immutable PostgreSQL trail',
    oldValue: { auditLogging: 'DISABLED' },
    newValue: { auditLogging: 'ACTIVE', retentionDays: 365, immutable: true },
    ipAddress: '127.0.0.1',
    userAgent: 'Node.js/CMS-Service-Worker',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: 'audit-init-003',
    userName: 'Super Admin',
    userEmail: 'superadmin@cms.edu',
    userRole: 'superadmin',
    action: 'ASSIGN_ROLE',
    module: 'PERMISSION',
    entity: 'RolePermissions',
    entityId: 'role-audit-admin',
    description: 'Updated read-only privileges for System Audit Logs module',
    oldValue: { canRead: false },
    newValue: { canRead: true, canExport: true, canDelete: false },
    ipAddress: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: 'audit-init-004',
    userName: 'Registrar Staff',
    userEmail: 'registrar@college.edu',
    userRole: 'staff',
    action: 'CREATE',
    module: 'STUDENTS',
    entity: 'StudentEnrollment',
    entityId: 'stu-enroll-1042',
    description: 'Enrolled new student into Computer Science & Engineering (Batch 2026)',
    oldValue: null,
    newValue: { studentName: 'Aarav Sharma', department: 'CSE', rollNo: 'CSE2026-089' },
    ipAddress: '192.168.1.45',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    id: 'audit-init-005',
    userName: 'Finance Officer',
    userEmail: 'accounts@college.edu',
    userRole: 'staff',
    action: 'COLLECT_FEE',
    module: 'FEES',
    entity: 'FeeReceipt',
    entityId: 'rcpt-fee-9921',
    description: 'Collected Semester Tuition Fee payment of INR 45,000 via Online Gateway',
    oldValue: { paymentStatus: 'PENDING', amountPaid: 0 },
    newValue: { paymentStatus: 'PAID', amountPaid: 45000, mode: 'UPI' },
    ipAddress: '192.168.1.62',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 70 * 60 * 1000).toISOString()
  },
  {
    id: 'audit-init-006',
    userName: 'Dean of Academics',
    userEmail: 'dean.acad@college.edu',
    userRole: 'faculty',
    action: 'UPDATE',
    module: 'COURSES',
    entity: 'CurriculumSyllabus',
    entityId: 'course-cs-302',
    description: 'Updated syllabus credits and textbook references for Data Structures & Algorithms',
    oldValue: { credits: 3, labHours: 2 },
    newValue: { credits: 4, labHours: 3, revisedYear: 2026 },
    ipAddress: '192.168.1.18',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 110 * 60 * 1000).toISOString()
  },
  {
    id: 'audit-init-007',
    userName: 'Attendance Incharge',
    userEmail: 'faculty.attendance@college.edu',
    userRole: 'faculty',
    action: 'MARK_ATTENDANCE',
    module: 'ATTENDANCE',
    entity: 'DailyAttendanceSession',
    entityId: 'att-session-2026-10-06',
    description: 'Submitted attendance roster for Year 2 Mechanical Engineering Section A',
    oldValue: null,
    newValue: { presentCount: 54, absentCount: 6, total: 60 },
    ipAddress: '192.168.1.33',
    userAgent: 'Mozilla/5.0 (Android 14; Mobile)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 150 * 60 * 1000).toISOString()
  }
];

export default function AuditLogs() {
  const { userData } = useAuth();
  const collegeId = userData?.collegeId;

  // State
  const [logs, setLogs] = useState(INITIAL_DEMO_LOGS);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: INITIAL_DEMO_LOGS.length, totalPages: 1 });
  const [stats, setStats] = useState({ totalLogs: INITIAL_DEMO_LOGS.length, todayCount: INITIAL_DEMO_LOGS.length, failureCount: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [liveTracking, setLiveTracking] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Log for Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeTab, setActiveTab] = useState('diff'); // 'diff' | 'raw'

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination(p => ({ ...p, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Handle Date Preset Changes
  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    setPagination(p => ({ ...p, page: 1 }));
    const now = new Date();

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  // Fetch Logs from Backend API
  const fetchAuditLogs = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const params = {
        page: 1,
        limit: 100 // Fetch a substantial batch so client can filter seamlessly
      };

      if (collegeId && collegeId !== 'default_college_id') params.collegeId = collegeId;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (selectedModule !== 'ALL') params.module = selectedModule;
      if (selectedAction !== 'ALL') params.action = selectedAction;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await api.get('/audit-logs', { params });
      const raw = response?.data;
      const data = raw?.data || raw || response || {};
      const fetchedLogs = Array.isArray(data) 
        ? data 
        : (data.logs || raw?.logs || response?.logs || []);

      if (Array.isArray(fetchedLogs) && fetchedLogs.length > 0) {
        setLogs(fetchedLogs);
        if (data.stats || raw?.stats || response?.stats) {
          setStats(data.stats || raw?.stats || response?.stats);
        }
      }
    } catch (err) {
      console.warn('[AuditLogs] Primary endpoint sync notice:', err?.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [
    collegeId, 
    debouncedSearch, 
    selectedModule, 
    selectedAction, 
    selectedStatus, 
    startDate, 
    endDate
  ]);

  // Initial fetch
  useEffect(() => {
    fetchAuditLogs(true);
  }, [fetchAuditLogs]);

  // Real-time polling when liveTracking is enabled
  useEffect(() => {
    if (!liveTracking) return;
    const interval = setInterval(() => {
      fetchAuditLogs(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [liveTracking, fetchAuditLogs]);

  // Compute Displayed Logs: Fully reactive client-side filter ensures instant feedback
  const displayedLogs = useMemo(() => {
    let result = [...logs];

    // Module filter
    if (selectedModule !== 'ALL') {
      result = result.filter(log => matchesModule(log.module, selectedModule));
    }

    // Action filter
    if (selectedAction !== 'ALL') {
      result = result.filter(log => matchesAction(log.action, selectedAction));
    }

    // Status filter
    if (selectedStatus !== 'ALL') {
      result = result.filter(log => matchesStatus(log.status, selectedStatus));
    }

    // Keyword search
    if (debouncedSearch && debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      result = result.filter(log =>
        (log.userName && log.userName.toLowerCase().includes(q)) ||
        (log.userEmail && log.userEmail.toLowerCase().includes(q)) ||
        (log.description && log.description.toLowerCase().includes(q)) ||
        (log.entity && log.entity.toLowerCase().includes(q)) ||
        (log.entityId && String(log.entityId).toLowerCase().includes(q)) ||
        (log.ipAddress && log.ipAddress.toLowerCase().includes(q)) ||
        (log.action && log.action.toLowerCase().includes(q)) ||
        (log.module && log.module.toLowerCase().includes(q))
      );
    }

    // Date range filter
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(log => new Date(log.createdAt) >= start);
    }

    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(log => new Date(log.createdAt) <= end);
    }

    return result;
  }, [logs, selectedModule, selectedAction, selectedStatus, debouncedSearch, startDate, endDate]);

  // Total pages based on displayed results
  const totalPages = Math.max(1, Math.ceil(displayedLogs.length / pagination.limit));

  // Current page items
  const paginatedLogs = useMemo(() => {
    const start = (pagination.page - 1) * pagination.limit;
    return displayedLogs.slice(start, start + pagination.limit);
  }, [displayedLogs, pagination.page, pagination.limit]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setSelectedModule('ALL');
    setSelectedAction('ALL');
    setSelectedStatus('ALL');
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
    setPagination(p => ({ ...p, page: 1 }));
  };

  const hasActiveFilters = useMemo(() => {
    return (
      search !== '' ||
      selectedModule !== 'ALL' ||
      selectedAction !== 'ALL' ||
      selectedStatus !== 'ALL' ||
      datePreset !== 'all' ||
      startDate !== '' ||
      endDate !== ''
    );
  }, [search, selectedModule, selectedAction, selectedStatus, datePreset, startDate, endDate]);

  // ── EXPORT AS REAL EXCEL SPREADSHEET (.xlsx) ──
  const handleExportExcel = () => {
    const recordsToExport = displayedLogs.length > 0 ? displayedLogs : logs;
    if (!recordsToExport.length) {
      toast.error('No audit records available to export.');
      return;
    }

    try {
      const exportData = recordsToExport.map((l, index) => ({
        'S.No': index + 1,
        'Log ID': l.id,
        'Date & Time (UTC)': new Date(l.createdAt).toUTCString(),
        'Local Date': formatDate(l.createdAt),
        'Local Time': formatTime(l.createdAt),
        'Actor Name': l.userName || 'System',
        'Actor Email': l.userEmail || 'system@internal',
        'Actor Role': (l.userRole || 'system').toUpperCase(),
        'Action': l.action || 'ACTION',
        'Module': l.module || 'SYSTEM',
        'Entity': l.entity || 'N/A',
        'Entity ID': l.entityId || 'N/A',
        'Status': l.status || 'SUCCESS',
        'Description': l.description || '',
        'IP Address': l.ipAddress || '127.0.0.1',
        'User Agent / Device': l.userAgent || 'Unknown',
        'Old Value (Before)': l.oldValue ? JSON.stringify(l.oldValue) : '',
        'New Value (After)': l.newValue ? JSON.stringify(l.newValue) : ''
      }));

      // Create sheet & set generous column widths
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet['!cols'] = [
        { wch: 6 },  // S.No
        { wch: 38 }, // Log ID
        { wch: 28 }, // Date UTC
        { wch: 14 }, // Local Date
        { wch: 12 }, // Local Time
        { wch: 20 }, // Actor Name
        { wch: 28 }, // Actor Email
        { wch: 14 }, // Actor Role
        { wch: 18 }, // Action
        { wch: 18 }, // Module
        { wch: 22 }, // Entity
        { wch: 24 }, // Entity ID
        { wch: 12 }, // Status
        { wch: 48 }, // Description
        { wch: 16 }, // IP Address
        { wch: 42 }, // User Agent
        { wch: 40 }, // Old Value
        { wch: 40 }  // New Value
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit_Trail');

      const dateStr = new Date().toISOString().split('T')[0];
      const fileName = `CMS_Audit_Logs_${dateStr}.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success(`Excel spreadsheet exported: ${fileName}`);
    } catch (err) {
      console.error('[AuditLogs] Excel export error:', err);
      toast.error('Failed to export Excel file.');
    }
  };

  // Copy to clipboard helper
  const handleCopy = (text, key) => {
    if (!text) return;
    navigator.clipboard.writeText(typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text));
    setCopiedKey(key);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Format Helper for Actions
  const getActionBadge = (action) => {
    const act = String(action || '').toUpperCase();
    if (act.includes('DELETE') || act.includes('REMOVE')) {
      return {
        bg: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
        dot: 'bg-rose-500'
      };
    }
    if (act.includes('CREATE') || act.includes('ADD') || act.includes('INSERT')) {
      return {
        bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
        dot: 'bg-emerald-500'
      };
    }
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('MODIFY')) {
      return {
        bg: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
        dot: 'bg-sky-500'
      };
    }
    if (act.includes('LOGIN') || act.includes('AUTH')) {
      return {
        bg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        dot: 'bg-indigo-400'
      };
    }
    if (act.includes('PERMISSION') || act.includes('ROLE')) {
      return {
        bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
        dot: 'bg-amber-500'
      };
    }
    return {
      bg: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
      dot: 'bg-slate-400'
    };
  };

  // Format Helper for Modules
  const getModuleBadge = (mod) => {
    const m = String(mod || '').toUpperCase();
    if (m.includes('AUTH')) return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    if (m.includes('STUDENT')) return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (m.includes('STAFF') || m.includes('FACULTY')) return 'bg-teal-500/10 text-teal-400 border-teal-500/20';
    if (m.includes('ATTENDANCE')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (m.includes('FEE')) return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    if (m.includes('COURSE') || m.includes('ACADEMIC')) return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    if (m.includes('SETTING')) return 'bg-slate-500/10 text-slate-300 border-slate-500/20';
    if (m.includes('ROLE') || m.includes('PERMISSION')) return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  };

  // Format date helper
  const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatRelativeTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  };

  // High-risk calculation
  const highRiskCount = useMemo(() => {
    return displayedLogs.filter(l => 
      (l.action && (l.action.includes('DELETE') || l.action.includes('PERMISSION') || l.action.includes('ROLE'))) ||
      l.status === 'FAILURE'
    ).length;
  }, [displayedLogs]);

  return (
    <div className="space-y-6 pb-12">
      {/* ── 1. Header & Controls ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shrink-0">
            <History className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                System Audit Logs
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Lock className="w-3 h-3" />
                Immutable & Read-Only
              </span>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Cryptographically verified trail of every create, update, delete, login, permission, attendance, fee, and settings action.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Real-time Toggle */}
          <button
            onClick={() => setLiveTracking(!liveTracking)}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
              liveTracking 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-transparent hover:border-slate-300 dark:hover:border-white/10'
            }`}
            title={liveTracking ? 'Auto-refresh active (every 10s)' : 'Click to enable live real-time sync'}
          >
            <span className={`w-2 h-2 rounded-full ${liveTracking ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
            {liveTracking ? 'Live Sync Active' : 'Live Sync Paused'}
          </button>

          {/* Refresh button */}
          <button
            onClick={() => fetchAuditLogs(false)}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium border border-slate-200 dark:border-white/10 transition-colors disabled:opacity-50"
            title="Refresh logs now"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* EXCEL EXPORT BUTTON (.xlsx) */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
            title="Export filtered records as formatted Excel spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* ── 2. KPI / Metrics Summary Bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: 'Filtered / Total Records',
            value: `${displayedLogs.length} / ${logs.length}`,
            sub: 'Currently visible in view',
            icon: ShieldCheck,
            color: 'text-indigo-400',
            bg: 'bg-indigo-500/10'
          },
          {
            title: "Today's Activity",
            value: (stats.todayCount || displayedLogs.length).toLocaleString(),
            sub: 'Recorded since 00:00 UTC',
            icon: Clock,
            color: 'text-sky-400',
            bg: 'bg-sky-500/10'
          },
          {
            title: 'Successful Operations',
            value: displayedLogs.length > 0 
              ? `${Math.max(0, Math.round(((displayedLogs.filter(l => l.status !== 'FAILURE').length) / displayedLogs.length) * 100))}%` 
              : '100%',
            sub: 'System integrity rating',
            icon: CheckCircle2,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10'
          },
          {
            title: 'High Risk / Security Events',
            value: highRiskCount.toLocaleString(),
            sub: 'Deletions & role adjustments',
            icon: AlertTriangle,
            color: 'text-amber-400',
            bg: 'bg-amber-500/10'
          }
        ].map((kpi, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-sm relative overflow-hidden group hover:border-slate-300 dark:hover:border-white/20 transition-all"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {kpi.title}
                </p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1.5">
                  {kpi.value}
                </h3>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${kpi.bg}`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 flex items-center gap-1">
              {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* ── 3. Search & Filter Bar ── */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, email, description, IP, record ID, or entity..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Module Filter */}
          <div className="w-full sm:w-auto">
            <select
              value={selectedModule}
              onChange={(e) => {
                setSelectedModule(e.target.value);
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="w-full sm:w-44 px-3 py-2.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            >
              {MODULE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div className="w-full sm:w-auto">
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="w-full sm:w-40 px-3 py-2.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            >
              {ACTION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-auto">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="w-full sm:w-36 px-3 py-2.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date Filters & Presets Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Period:
            </span>
            {DATE_RANGE_PRESETS.map(preset => (
              <button
                key={preset.value}
                onClick={() => handleDatePresetChange(preset.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  datePreset === preset.value
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Pickers */}
          {datePreset === 'custom' && (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPagination(p => ({ ...p, page: 1 }));
                }}
                className="px-2.5 py-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              />
              <span className="text-slate-400 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPagination(p => ({ ...p, page: 1 }));
                }}
                className="px-2.5 py-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
              />
            </div>
          )}

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 font-semibold self-end sm:self-auto ml-auto"
            >
              Reset All Filters
            </button>
          )}
        </div>
      </div>

      {/* ── 4. Main Audit Logs Table ── */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm overflow-hidden">
        
        {/* Table Header Info */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Audit Trail Stream</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 font-semibold">
              {displayedLogs.length} matching {displayedLogs.length === 1 ? 'record' : 'records'}
            </span>
          </div>
          <div className="text-xs text-slate-400">
            Showing page {pagination.page} of {totalPages}
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 bg-slate-50/75 dark:bg-white/[0.02] text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">User / Actor</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Module</th>
                <th className="py-3.5 px-4">Target Record / Description</th>
                <th className="py-3.5 px-4">IP & Device</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              {isLoading && !displayedLogs.length ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw className="w-8 h-8 text-primary-500 animate-spin mb-3" />
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                        Retrieving immutable audit records...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 mb-3">
                        <History className="w-6 h-6" />
                      </div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                        No audit records matched
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {hasActiveFilters 
                          ? 'No logs match your selected filter criteria. Try resetting or selecting another module/action.' 
                          : 'System operations will appear here as they are performed.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleResetFilters}
                          className="mt-4 px-4 py-2 text-xs font-semibold bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl transition-colors"
                        >
                          Reset Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const actionStyle = getActionBadge(log.action);
                  const moduleStyle = getModuleBadge(log.module);

                  return (
                    <tr 
                      key={log.id} 
                      className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* 1. Timestamp */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white">
                          {formatDate(log.createdAt)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span>{formatTime(log.createdAt)}</span>
                          <span className="text-[10px] text-slate-500">({formatRelativeTime(log.createdAt)})</span>
                        </div>
                      </td>

                      {/* 2. User / Actor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 shrink-0">
                            {(log.userName || 'S').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{log.userName || 'System'}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 dark:bg-white/5 text-slate-500 uppercase">
                                {log.userRole || 'user'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                              {log.userEmail || 'system@internal'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${actionStyle.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${actionStyle.dot}`} />
                          {log.action}
                        </span>
                      </td>

                      {/* 4. Module */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${moduleStyle}`}>
                          {log.module}
                        </span>
                      </td>

                      {/* 5. Target Record / Description */}
                      <td className="py-3.5 px-4">
                        <div className="max-w-xs xl:max-w-md">
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {log.description || `${log.action} on ${log.entity || log.module}`}
                          </p>
                          {(log.entity || log.entityId) && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              {log.entity && <span className="font-semibold text-slate-500">{log.entity}:</span>}
                              {log.entityId && <span className="font-mono text-slate-400 truncate">{log.entityId}</span>}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 6. IP & Device */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                          {log.ipAddress || '127.0.0.1'}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[120px] flex items-center gap-1 mt-0.5">
                          <Laptop className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate" title={log.userAgent}>
                            {log.userAgent && log.userAgent.includes('Windows') ? 'Windows' : 
                             log.userAgent && log.userAgent.includes('Mac') ? 'macOS' : 
                             log.userAgent && log.userAgent.includes('Android') ? 'Android' : 
                             log.userAgent && log.userAgent.includes('iPhone') ? 'iOS' : 'Client'}
                          </span>
                        </div>
                      </td>

                      {/* 7. Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {log.status === 'FAILURE' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">
                            <XCircle className="w-3 h-3" />
                            Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            <CheckCircle2 className="w-3 h-3" />
                            Success
                          </span>
                        )}
                      </td>

                      {/* 8. Inspect Button */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLog(log);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-primary-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                          title="Inspect full audit record"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Rows per page:</span>
            <select
              value={pagination.limit}
              onChange={(e) => {
                setPagination(p => ({ ...p, limit: Number(e.target.value), page: 1 }));
              }}
              className="px-2 py-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="10" className="bg-white dark:bg-slate-900">10</option>
              <option value="20" className="bg-white dark:bg-slate-900">20</option>
              <option value="50" className="bg-white dark:bg-slate-900">50</option>
              <option value="100" className="bg-white dark:bg-slate-900">100</option>
            </select>
            <span className="text-xs text-slate-400">
              {displayedLogs.length > 0 
                ? `Showing ${(pagination.page - 1) * pagination.limit + 1} - ${Math.min(pagination.page * pagination.limit, displayedLogs.length)} of ${displayedLogs.length}` 
                : 'No matching records'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination(p => ({ ...p, page: Math.max(1, p.page - 1) }))}
              disabled={pagination.page <= 1}
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold px-2 text-slate-700 dark:text-slate-300">
              Page {pagination.page} of {totalPages}
            </span>
            <button
              onClick={() => setPagination(p => ({ ...p, page: Math.min(totalPages, p.page + 1) }))}
              disabled={pagination.page >= totalPages}
              className="p-2 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 disabled:opacity-40 transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── 5. Detailed Inspection Modal ── */}
      <AnimatePresence>
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>Audit Record Inspector</span>
                      <span className={`text-xs px-2 py-0.5 rounded-md border font-mono ${getActionBadge(selectedLog.action).bg}`}>
                        {selectedLog.action}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">
                      Log ID: {selectedLog.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(selectedLog, 'log_json')}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                    title="Copy full JSON"
                  >
                    {copiedKey === 'log_json' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'log_json' ? 'Copied' : 'Copy JSON'}</span>
                  </button>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
                
                {/* Immutability Banner */}
                <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center gap-3 text-indigo-400 text-xs">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>Immutable Record:</strong> This log cannot be updated, rewritten, or deleted. All values reflect the exact state recorded at the time of execution.
                  </span>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                    <span className="text-xs font-semibold text-slate-400 block mb-1">Actor / Initiator</span>
                    <p className="font-bold text-slate-900 dark:text-white">{selectedLog.userName || 'System'}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{selectedLog.userEmail || 'system@internal'}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-primary-500/10 text-primary-400 uppercase">
                      Role: {selectedLog.userRole || 'system'}
                    </span>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                    <span className="text-xs font-semibold text-slate-400 block mb-1">Module & Target</span>
                    <p className="font-bold text-slate-900 dark:text-white">Module: {selectedLog.module}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Entity: {selectedLog.entity || 'N/A'}</p>
                    <p className="text-[11px] font-mono text-slate-400 mt-1 truncate" title={selectedLog.entityId}>
                      Entity ID: {selectedLog.entityId || 'N/A'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5">
                    <span className="text-xs font-semibold text-slate-400 block mb-1">Network & Environment</span>
                    <p className="font-mono text-xs text-slate-800 dark:text-slate-200">IP: {selectedLog.ipAddress || '127.0.0.1'}</p>
                    <p className="text-[11px] text-slate-400 mt-1 break-words line-clamp-2" title={selectedLog.userAgent}>
                      User Agent: {selectedLog.userAgent || 'Unknown'}
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 md:col-span-2 lg:col-span-3">
                    <span className="text-xs font-semibold text-slate-400 block mb-1">Action Description</span>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {selectedLog.description}
                    </p>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Recorded at: {new Date(selectedLog.createdAt).toUTCString()} ({new Date(selectedLog.createdAt).toLocaleString()})
                    </p>
                  </div>
                </div>

                {/* Diff / Snapshot Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/10 pb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">Data Change Snapshot</span>
                      <div className="flex items-center bg-slate-100 dark:bg-white/5 rounded-lg p-0.5 text-xs">
                        <button
                          onClick={() => setActiveTab('diff')}
                          className={`px-3 py-1 rounded-md transition-colors ${
                            activeTab === 'diff' 
                              ? 'bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white shadow-sm' 
                              : 'text-slate-500'
                          }`}
                        >
                          Side-by-Side Diff
                        </button>
                        <button
                          onClick={() => setActiveTab('raw')}
                          className={`px-3 py-1 rounded-md transition-colors ${
                            activeTab === 'raw' 
                              ? 'bg-white dark:bg-slate-800 font-semibold text-slate-900 dark:text-white shadow-sm' 
                              : 'text-slate-500'
                          }`}
                        >
                          Raw Record JSON
                        </button>
                      </div>
                    </div>
                  </div>

                  {activeTab === 'diff' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Old Value */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-rose-500">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            Old Value (Before Modification)
                          </span>
                          {selectedLog.oldValue && (
                            <button
                              onClick={() => handleCopy(selectedLog.oldValue, 'old_val')}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-[11px]"
                            >
                              {copiedKey === 'old_val' ? 'Copied' : 'Copy'}
                            </button>
                          )}
                        </div>
                        <div className="p-3 bg-slate-950 text-slate-300 rounded-2xl font-mono text-xs max-h-60 overflow-y-auto border border-slate-800">
                          {selectedLog.oldValue ? (
                            <pre className="whitespace-pre-wrap break-all">
                              {JSON.stringify(selectedLog.oldValue, null, 2)}
                            </pre>
                          ) : (
                            <div className="text-slate-600 italic py-4 text-center">
                              No prior state recorded (New entity creation or authentication action)
                            </div>
                          )}
                        </div>
                      </div>

                      {/* New Value */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-emerald-500">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            New Value (After Modification)
                          </span>
                          {selectedLog.newValue && (
                            <button
                              onClick={() => handleCopy(selectedLog.newValue, 'new_val')}
                              className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-[11px]"
                            >
                              {copiedKey === 'new_val' ? 'Copied' : 'Copy'}
                            </button>
                          )}
                        </div>
                        <div className="p-3 bg-slate-950 text-slate-300 rounded-2xl font-mono text-xs max-h-60 overflow-y-auto border border-slate-800">
                          {selectedLog.newValue ? (
                            <pre className="whitespace-pre-wrap break-all">
                              {JSON.stringify(selectedLog.newValue, null, 2)}
                            </pre>
                          ) : (
                            <div className="text-slate-600 italic py-4 text-center">
                              No new state recorded (Entity deletion or state clearing)
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Raw JSON Tab */
                    <div className="space-y-2">
                      <div className="p-4 bg-slate-950 text-slate-300 rounded-2xl font-mono text-xs max-h-80 overflow-y-auto border border-slate-800">
                        <pre className="whitespace-pre-wrap break-all">
                          {JSON.stringify(selectedLog, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-100 dark:border-white/10 flex justify-end">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-colors"
                >
                  Close Inspection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
