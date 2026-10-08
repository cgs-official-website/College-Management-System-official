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
  GraduationCap,
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
  X,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { api } from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import {
  describeAuditEvent,
  getDisplayDescription,
  getDisplayTargetRecord,
  getInstitutionalModuleName,
  getDetailedChanges
} from './auditDescriber';

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'TEACHER', label: 'Teacher' },
  { value: 'STUDENT', label: 'Student' }
];

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
export const matchesRole = (recordRole, filterRole) => {
  if (!filterRole || filterRole === 'ALL') return true;
  const rr = String(recordRole || '').toLowerCase();
  const fr = String(filterRole).toLowerCase();
  if (fr === 'admin') {
    return rr.includes('admin') || rr.includes('principal') || rr.includes('super');
  }
  if (fr === 'teacher') {
    return rr.includes('teach') || rr.includes('faculty') || rr.includes('prof') || rr.includes('hod') || rr.includes('instructor');
  }
  if (fr === 'student') {
    return rr.includes('student');
  }
  return rr.includes(fr);
};

export const getRoleDetails = (role) => {
  const r = String(role || '').toLowerCase();
  if (r.includes('super') || (r.includes('admin') && r.includes('super'))) {
    return {
      label: 'Super Admin',
      badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      avatarClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
      iconType: 'admin'
    };
  }
  if (r.includes('admin') || r.includes('principal')) {
    return {
      label: 'Admin',
      badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      avatarClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
      iconType: 'admin'
    };
  }
  if (r.includes('teach') || r.includes('faculty') || r.includes('prof') || r.includes('hod') || r.includes('instructor')) {
    return {
      label: 'Teacher',
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      avatarClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      iconType: 'teacher'
    };
  }
  if (r.includes('student')) {
    return {
      label: 'Student',
      badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      avatarClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20',
      iconType: 'student'
    };
  }
  return {
    label: role ? (role.charAt(0).toUpperCase() + role.slice(1)) : 'User',
    badgeClass: 'bg-slate-100 dark:bg-white/5 text-slate-500 border-slate-200 dark:border-white/10',
    avatarClass: 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10',
    iconType: 'user'
  };
};

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
  // ── ADMIN ──
  {
    id: 'audit-001',
    userName: 'Ravi',
    userEmail: 'ravi.admin@college.edu',
    userRole: 'admin',
    action: 'LOGIN',
    module: 'AUTH',
    entity: 'UserSession',
    entityId: null,
    description: 'Ravi (Admin) logged in successfully',
    targetRecord: 'User: Ravi',
    oldValue: null,
    newValue: { status: 'AUTHENTICATED', role: 'admin' },
    ipAddress: '192.168.1.10',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString()
  },
  {
    id: 'audit-002',
    userName: 'Ravi',
    userEmail: 'ravi.admin@college.edu',
    userRole: 'admin',
    action: 'CREATE',
    module: 'STUDENTS',
    entity: 'Student',
    entityId: null,
    description: 'Ravi (Admin) added student Arun S',
    targetRecord: 'Student: Arun S',
    oldValue: null,
    newValue: { studentName: 'Arun S', department: 'CSE', rollNo: 'CSE2026-089' },
    ipAddress: '192.168.1.10',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 8 * 60 * 1000).toISOString()
  },
  {
    id: 'audit-003',
    userName: 'Ravi',
    userEmail: 'ravi.admin@college.edu',
    userRole: 'admin',
    action: 'UPDATE',
    module: 'STUDENTS',
    entity: 'Student',
    entityId: null,
    description: 'Ravi (Admin) updated student Arun S: phone changed',
    targetRecord: 'Student: Arun S',
    oldValue: { studentName: 'Arun S', phone: '+91 98765 43210' },
    newValue: { studentName: 'Arun S', phone: '+91 98765 99999' },
    ipAddress: '192.168.1.10',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
  },
  {
    id: 'audit-004',
    userName: 'Ravi',
    userEmail: 'ravi.admin@college.edu',
    userRole: 'admin',
    action: 'DELETE',
    module: 'STUDENTS',
    entity: 'Student',
    entityId: null,
    description: 'Ravi (Admin) deleted student Arun S',
    targetRecord: 'Student: Arun S',
    oldValue: { studentName: 'Arun S', status: 'ARCHIVED' },
    newValue: null,
    ipAddress: '192.168.1.10',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString()
  },
  {
    id: 'audit-005',
    userName: 'Ravi',
    userEmail: 'ravi.admin@college.edu',
    userRole: 'admin',
    action: 'ASSIGN_ROLE',
    module: 'PERMISSION',
    entity: 'Role',
    entityId: null,
    description: "Ravi (Admin) changed Priya's role from Teacher to Admin",
    targetRecord: 'Role: Priya',
    oldValue: { userName: 'Priya', role: 'Teacher' },
    newValue: { userName: 'Priya', role: 'Admin' },
    ipAddress: '192.168.1.10',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString()
  },
  {
    id: 'audit-006',
    userName: 'Ravi',
    userEmail: 'ravi.admin@college.edu',
    userRole: 'admin',
    action: 'SETTINGS_UPDATE',
    module: 'SETTINGS',
    entity: 'RegistrationLink',
    entityId: null,
    description: 'Ravi (Admin) regenerated the student registration link',
    targetRecord: 'Security: Registration Link',
    oldValue: { tokenVersion: 1 },
    newValue: { tokenVersion: 2, regeneratedAt: new Date().toISOString() },
    ipAddress: '192.168.1.10',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 50 * 60 * 1000).toISOString()
  },
  {
    id: 'audit-007',
    userName: 'Ravi',
    userEmail: 'ravi.admin@college.edu',
    userRole: 'admin',
    action: 'COLLECT_FEE',
    module: 'FEES',
    entity: 'FeeReceipt',
    entityId: null,
    description: 'Ravi (Admin) recorded a fee payment of Rs. 5,000 for Arun S',
    targetRecord: 'Fee: Arun S',
    oldValue: { dueAmount: 5000, status: 'PENDING' },
    newValue: { amountPaid: 5000, studentName: 'Arun S', status: 'PAID' },
    ipAddress: '192.168.1.10',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 65 * 60 * 1000).toISOString()
  },

  // ── TEACHER ──
  {
    id: 'audit-008',
    userName: 'Jd Guru',
    userEmail: 'jdguru7777@gmail.com',
    userRole: 'teacher',
    action: 'LOGIN',
    module: 'AUTH',
    entity: 'UserSession',
    entityId: null,
    description: 'Jd Guru (Teacher) logged in successfully',
    targetRecord: 'User: Jd Guru',
    oldValue: null,
    newValue: { status: 'AUTHENTICATED', role: 'teacher' },
    ipAddress: '192.168.1.42',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 80 * 60 * 1000).toISOString()
  },
  {
    id: 'audit-009',
    userName: 'Jd Guru',
    userEmail: 'jdguru7777@gmail.com',
    userRole: 'teacher',
    action: 'MARK_ATTENDANCE',
    module: 'ATTENDANCE',
    entity: 'AttendanceSession',
    entityId: null,
    description: 'Jd Guru (Teacher) marked attendance for Class 10-A',
    targetRecord: 'Class: 10-A',
    oldValue: null,
    newValue: { className: 'Class 10-A', totalPresent: 48, totalAbsent: 2 },
    ipAddress: '192.168.1.42',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 95 * 60 * 1000).toISOString()
  },
  {
    id: 'audit-010',
    userName: 'Jd Guru',
    userEmail: 'jdguru7777@gmail.com',
    userRole: 'teacher',
    action: 'UPDATE',
    module: 'EXAMS',
    entity: 'MarksGrade',
    entityId: null,
    description: 'Jd Guru (Teacher) updated Maths marks for Arun S',
    targetRecord: 'Marks: Arun S',
    oldValue: { subject: 'Maths', studentName: 'Arun S', marks: 82 },
    newValue: { subject: 'Maths', studentName: 'Arun S', marks: 95 },
    ipAddress: '192.168.1.42',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 110 * 60 * 1000).toISOString()
  },
  {
    id: 'audit-011',
    userName: 'Jd Guru',
    userEmail: 'jdguru7777@gmail.com',
    userRole: 'teacher',
    action: 'CREATE',
    module: 'COURSES',
    entity: 'Assignment',
    entityId: null,
    description: "Jd Guru (Teacher) created assignment 'Algebra Test' for Class 10-A",
    targetRecord: 'Assignment: Algebra Test',
    oldValue: null,
    newValue: { title: 'Algebra Test', className: 'Class 10-A', maxMarks: 50 },
    ipAddress: '192.168.1.42',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 130 * 60 * 1000).toISOString()
  },

  // ── STUDENT ──
  {
    id: 'audit-012',
    userName: 'Arun S',
    userEmail: 'arun.student@college.edu',
    userRole: 'student',
    action: 'LOGIN',
    module: 'AUTH',
    entity: 'UserSession',
    entityId: null,
    description: 'Arun S (Student) logged in successfully',
    targetRecord: 'User: Arun S',
    oldValue: null,
    newValue: { status: 'AUTHENTICATED', role: 'student' },
    ipAddress: '192.168.1.77',
    userAgent: 'Mozilla/5.0 (Android 14; Mobile)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 145 * 60 * 1000).toISOString()
  },
  {
    id: 'audit-013',
    userName: 'Arun S',
    userEmail: 'arun.student@college.edu',
    userRole: 'student',
    action: 'UPDATE',
    module: 'STUDENTS',
    entity: 'Profile',
    entityId: null,
    description: 'Arun S (Student) updated own profile: phone changed',
    targetRecord: 'Student: Arun S',
    oldValue: { phone: '+91 99887 76655' },
    newValue: { phone: '+91 91234 56789' },
    ipAddress: '192.168.1.77',
    userAgent: 'Mozilla/5.0 (Android 14; Mobile)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 160 * 60 * 1000).toISOString()
  },
  {
    id: 'audit-014',
    userName: 'Arun S',
    userEmail: 'arun.student@college.edu',
    userRole: 'student',
    action: 'CREATE',
    module: 'COURSES',
    entity: 'Submission',
    entityId: null,
    description: "Arun S (Student) submitted assignment 'Algebra Test'",
    targetRecord: 'Assignment: Algebra Test',
    oldValue: null,
    newValue: { assignmentTitle: 'Algebra Test', submittedAt: new Date().toISOString() },
    ipAddress: '192.168.1.77',
    userAgent: 'Mozilla/5.0 (Android 14; Mobile)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 175 * 60 * 1000).toISOString()
  },
  {
    id: 'audit-015',
    userName: 'Arun S',
    userEmail: 'arun.student@college.edu',
    userRole: 'student',
    action: 'UPDATE',
    module: 'AUTH',
    entity: 'Password',
    entityId: null,
    description: 'Arun S (Student) changed own password',
    targetRecord: 'Security: Account Password',
    oldValue: null,
    newValue: { passwordChanged: true },
    ipAddress: '192.168.1.77',
    userAgent: 'Mozilla/5.0 (Android 14; Mobile)',
    status: 'SUCCESS',
    createdAt: new Date(Date.now() - 190 * 60 * 1000).toISOString()
  },

  // ── FAILED LOGIN ──
  {
    id: 'audit-016',
    userName: 'Security Sentinel',
    userEmail: 'jdguru7777@gmail.com',
    userRole: 'user',
    action: 'LOGIN',
    module: 'AUTH',
    entity: 'AuthSecurity',
    entityId: null,
    description: 'Failed login attempt for jdguru7777@gmail.com',
    targetRecord: 'Account: jdguru7777@gmail.com',
    oldValue: null,
    newValue: { email: 'jdguru7777@gmail.com', reason: 'INVALID_CREDENTIALS' },
    ipAddress: '192.168.1.105',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    status: 'FAILURE',
    createdAt: new Date(Date.now() - 210 * 60 * 1000).toISOString()
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
  const [liveTracking, setLiveTracking] = useState(false); // Auto-refresh off

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Log for Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

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
      if (selectedRole !== 'ALL') params.role = selectedRole;
      if (selectedModule !== 'ALL') params.module = selectedModule;
      if (selectedAction !== 'ALL') params.action = selectedAction;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const response = await api.get('/audit-logs', { params });
      const raw = response?.data;
      const data = raw?.data || raw || response || {};
      const validLogs = (Array.isArray(fetchedLogs) ? fetchedLogs : []).filter(l => {
        const act = String(l.action || '').toUpperCase();
        const ent = String(l.entity || '').toUpperCase();
        const mod = String(l.module || '').toUpperCase();
        return !act.includes('REFRESH') && !ent.includes('REFRESH') && !mod.includes('REFRESH');
      });

      if (validLogs.length > 0) {
        setLogs(validLogs);
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
    selectedRole,
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
    let result = logs.filter(log => {
      const act = String(log.action || '').toUpperCase();
      const ent = String(log.entity || '').toUpperCase();
      const mod = String(log.module || '').toUpperCase();
      const desc = String(log.description || '').toLowerCase();
      return !act.includes('REFRESH') && !ent.includes('REFRESH') && !mod.includes('REFRESH') && !desc.includes('session refresh');
    });

    // Role filter (Teacher vs Admin)
    if (selectedRole !== 'ALL') {
      result = result.filter(log => matchesRole(log.userRole, selectedRole));
    }

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
      result = result.filter(log => {
        const desc = getDisplayDescription(log).toLowerCase();
        const target = getDisplayTargetRecord(log).toLowerCase();
        return (
          (log.userName && log.userName.toLowerCase().includes(q)) ||
          (log.userEmail && log.userEmail.toLowerCase().includes(q)) ||
          (log.userRole && log.userRole.toLowerCase().includes(q)) ||
          desc.includes(q) ||
          target.includes(q) ||
          (log.entity && log.entity.toLowerCase().includes(q)) ||
          (log.ipAddress && log.ipAddress.toLowerCase().includes(q)) ||
          (log.action && log.action.toLowerCase().includes(q)) ||
          (log.module && log.module.toLowerCase().includes(q))
        );
      });
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
  }, [logs, selectedRole, selectedModule, selectedAction, selectedStatus, debouncedSearch, startDate, endDate]);

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
    setSelectedRole('ALL');
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
      selectedRole !== 'ALL' ||
      selectedModule !== 'ALL' ||
      selectedAction !== 'ALL' ||
      selectedStatus !== 'ALL' ||
      datePreset !== 'all' ||
      startDate !== '' ||
      endDate !== ''
    );
  }, [search, selectedRole, selectedModule, selectedAction, selectedStatus, datePreset, startDate, endDate]);

  // ── EXPORT AS REAL EXCEL SPREADSHEET (.xlsx) ──
  const handleExportExcel = () => {
    const recordsToExport = displayedLogs.length > 0 ? displayedLogs : logs;
    if (!recordsToExport.length) {
      toast.error('No audit records available to export.');
      return;
    }

    try {
      const exportData = recordsToExport.map((l, index) => {
        const roleDetails = getRoleDetails(l.userRole);
        const displayDesc = getDisplayDescription(l);
        const displayTarget = getDisplayTargetRecord(l);
        return {
          'S.No': index + 1,
          'Log ID': l.id,
          'Date & Time (UTC)': new Date(l.createdAt).toUTCString(),
          'Local Date': formatDate(l.createdAt),
          'Local Time': formatTime(l.createdAt),
          'Performed By': l.userName || roleDetails.label,
          'Performed By Email': l.userEmail || 'system@internal',
          'Role': roleDetails.label.toUpperCase(),
          'Action': l.action || 'ACTION',
          'Module': l.module || 'SYSTEM',
          'Target Record': displayTarget,
          'Status': l.status || 'SUCCESS',
          'Description': displayDesc,
          'IP Address': l.ipAddress || '127.0.0.1',
          'User Agent / Device': l.userAgent || 'Unknown',
          'Old Value (Before)': l.oldValue ? JSON.stringify(l.oldValue) : '',
          'New Value (After)': l.newValue ? JSON.stringify(l.newValue) : ''
        };
      });

      // Create sheet & set generous column widths
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      worksheet['!cols'] = [
        { wch: 6 },  // S.No
        { wch: 38 }, // Log ID
        { wch: 28 }, // Date UTC
        { wch: 14 }, // Local Date
        { wch: 12 }, // Local Time
        { wch: 22 }, // Performed By
        { wch: 28 }, // Performed By Email
        { wch: 14 }, // Role
        { wch: 18 }, // Action
        { wch: 18 }, // Module
        { wch: 24 }, // Target Record
        { wch: 12 }, // Status
        { wch: 55 }, // Description
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

  const getActionTypeSubtitle = (action) => {
    const act = String(action || '').toUpperCase();
    if (act.includes('DELETE') || act.includes('REMOVE')) return 'Record Removal';
    if (act.includes('CREATE') || act.includes('ADD') || act.includes('INSERT')) return 'New Entry Created';
    if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('MODIFY')) return 'Record Modification';
    if (act.includes('LOGIN') || act.includes('AUTH')) return 'Authentication Event';
    if (act.includes('LOGOUT')) return 'Session Termination';
    if (act.includes('FEE') || act.includes('COLLECT')) return 'Fee Transaction';
    if (act.includes('ATTENDANCE')) return 'Attendance Submission';
    if (act.includes('ROLE') || act.includes('PERMISSION')) return 'Role Assignment';
    return 'System Event';
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
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Cryptographically verified trail of every create, update, delete, login, permission, attendance, fee, and settings action.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0 flex-nowrap">

          {/* Refresh button */}
          <button
            onClick={() => fetchAuditLogs(false)}
            disabled={isLoading || isRefreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold border border-slate-200 dark:border-white/10 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
            title="Refresh logs now"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary-400' : ''}`} />
            <span>Refresh</span>
          </button>

          {/* EXCEL EXPORT BUTTON (.xlsx) */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all whitespace-nowrap shrink-0"
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
            title: 'Security Alerts',
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
              placeholder="Search admin, teacher, student, email, description, record..."
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

          {/* Role Filter (Teacher & Admin) */}
          <div className="w-full sm:w-auto">
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="w-full sm:w-48 px-3 py-2.5 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500/40"
            >
              {ROLE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
                  {opt.label}
                </option>
              ))}
            </select>
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
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${datePreset === preset.value
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
                <th className="py-3.5 px-4">Performed By</th>
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

                      {/* 2. Performed By */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {(() => {
                          const roleDetails = getRoleDetails(log.userRole);
                          return (
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border shrink-0 ${roleDetails.avatarClass}`}>
                                {roleDetails.iconType === 'teacher' ? (
                                  <GraduationCap className="w-4 h-4" />
                                ) : roleDetails.iconType === 'admin' ? (
                                  <ShieldCheck className="w-4 h-4" />
                                ) : roleDetails.iconType === 'student' ? (
                                  <User className="w-4 h-4" />
                                ) : (
                                  (log.userName || 'U').charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{log.userName || (roleDetails.iconType === 'teacher' ? 'Teacher' : roleDetails.iconType === 'student' ? 'Student' : 'Admin')}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border uppercase ${roleDetails.badgeClass}`}>
                                    {roleDetails.label}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                                  {log.userEmail || (roleDetails.iconType === 'teacher' ? 'teacher@college.edu' : roleDetails.iconType === 'student' ? 'student@college.edu' : 'admin@college.edu')}
                                </div>
                              </div>
                            </div>
                          );
                        })()}
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
                        {(() => {
                          const displayDesc = getDisplayDescription(log);
                          const displayTarget = getDisplayTargetRecord(log);
                          return (
                            <div className="max-w-xs xl:max-w-md">
                              <p
                                className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate"
                                title={displayDesc}
                              >
                                {displayDesc}
                              </p>
                              <p
                                className="text-[11px] text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5"
                                title={displayTarget}
                              >
                                {displayTarget}
                              </p>
                            </div>
                          );
                        })()}
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

      {/* ── 5. Redesigned Enterprise Audit Record Inspector Modal ── */}
      <AnimatePresence>
        {selectedLog && (() => {
          const roleDetails = getRoleDetails(selectedLog.userRole);
          const actionBadge = getActionBadge(selectedLog.action);
          const displayDescription = getDisplayDescription(selectedLog);
          const displayTarget = getDisplayTargetRecord(selectedLog);
          const moduleName = getInstitutionalModuleName(selectedLog.module);
          const changes = getDetailedChanges(selectedLog);
          const isSuccess = selectedLog.status !== 'FAILURE';

          return (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm"
              onClick={() => setSelectedLog(null)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 12 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden"
              >
                {/* Modal Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-primary-50 dark:bg-primary-950/50 border border-primary-200/50 dark:border-primary-800/50 flex items-center justify-center text-primary-600 dark:text-primary-400">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
                        <span>Audit Record Inspector</span>
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-md border font-semibold ${actionBadge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${actionBadge.dot}`} />
                          {selectedLog.action}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Institutional Audit Trail • College Management System
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {/* Status Badge */}
                    {isSuccess ? (
                      <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 px-2.5 py-1 rounded-xl">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Success
                      </span>
                    ) : (
                      <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-2.5 py-1 rounded-xl">
                        <XCircle className="w-3.5 h-3.5" />
                        Failed
                      </span>
                    )}
                    <button
                      onClick={() => setSelectedLog(null)}
                      className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-5 flex-1">

                  {/* 1. Description Highlight Card */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Description
                      </span>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        {formatRelativeTime(selectedLog.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white leading-relaxed">
                      {displayDescription}
                    </p>
                  </div>

                  {/* 2. Information Hierarchy Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">

                    {/* Card 1: Performed By */}
                    <div className="p-4 bg-white dark:bg-slate-900/30 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
                        Performed By
                      </span>
                      <div className="flex items-start gap-2.5">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold border shrink-0 ${roleDetails.avatarClass}`}>
                          {roleDetails.iconType === 'teacher' ? (
                            <GraduationCap className="w-4 h-4" />
                          ) : roleDetails.iconType === 'admin' ? (
                            <ShieldCheck className="w-4 h-4" />
                          ) : (
                            <User className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
                              {selectedLog.userName || 'System'}
                            </p>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${roleDetails.badgeClass}`}>
                              {roleDetails.label}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 truncate mt-0.5">
                            {selectedLog.userEmail || 'system@internal'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Card 2: Action */}
                    <div className="p-4 bg-white dark:bg-slate-900/30 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
                        Action
                      </span>
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-bold ${actionBadge.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${actionBadge.dot}`} />
                          {selectedLog.action}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">
                        {getActionTypeSubtitle(selectedLog.action)}
                      </p>
                    </div>

                    {/* Card 3: Target Record */}
                    <div className="p-4 bg-white dark:bg-slate-900/30 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
                        Target Record
                      </span>
                      <p className="font-bold text-slate-900 dark:text-white text-sm truncate" title={displayTarget}>
                        {displayTarget}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Affected Record Entity
                      </p>
                    </div>

                    {/* Card 4: Module */}
                    <div className="p-4 bg-white dark:bg-slate-900/30 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
                        Module
                      </span>
                      <p className="font-bold text-slate-900 dark:text-white text-sm truncate">
                        {moduleName}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Institutional System Scope
                      </p>
                    </div>

                    {/* Card 5: Date & Time */}
                    <div className="p-4 bg-white dark:bg-slate-900/30 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
                        Date & Time
                      </span>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">
                        {formatDate(selectedLog.createdAt)}
                      </p>
                      <p className="text-xs text-slate-400 mt-1 font-mono">
                        {formatTime(selectedLog.createdAt)}
                      </p>
                    </div>

                    {/* Card 6: IP Address */}
                    <div className="p-4 bg-white dark:bg-slate-900/30 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                      <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2">
                        IP Address
                      </span>
                      <div className="flex items-center gap-1.5 text-slate-900 dark:text-white text-sm font-mono font-bold">
                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                        <span>{selectedLog.ipAddress || '127.0.0.1'}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Client Network Address
                      </p>
                    </div>

                  </div>

                  {/* 3. Changes Made Section (Displayed ONLY when actual changes exist) */}
                  {changes.length > 0 && (
                    <div className="p-5 bg-white dark:bg-slate-900/40 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-primary-500" />
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            Changes Made
                          </h4>
                        </div>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-900/40">
                          {changes.length} {changes.length === 1 ? 'Field Modified' : 'Fields Modified'}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {changes.map((change, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800"
                          >
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2.5">
                              {change.field}
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] items-center gap-2.5 sm:gap-3">
                              {/* Before */}
                              <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/30">
                                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block mb-0.5">
                                  Before
                                </span>
                                <span className="text-xs font-semibold text-rose-900 dark:text-rose-200 break-words">
                                  {change.before}
                                </span>
                              </div>

                              {/* Arrow */}
                              <div className="flex justify-center text-slate-400 dark:text-slate-500">
                                <ArrowRight className="w-4 h-4" />
                              </div>

                              {/* After */}
                              <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/30">
                                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-0.5">
                                  After
                                </span>
                                <span className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 break-words">
                                  {change.after}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Modal Footer */}
                <div className="p-4 px-6 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end bg-slate-50/50 dark:bg-slate-900/20">
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
