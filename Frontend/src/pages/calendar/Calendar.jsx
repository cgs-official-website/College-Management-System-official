import { useState, useMemo, useEffect } from 'react';
import { api } from '../../services/apiClient';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  Filter,
  Clock,
  MapPin,
  Users,
  Award,
  Sparkles,
  Edit2,
  Trash2,
  X,
  Check,
  Shield,
  Eye,
  AlertCircle,
  FileText,
  List,
  Grid,
  Sun as SunIcon
} from 'lucide-react';
import { useCalendar } from '../../hooks/useCalendar';

const TYPE_CONFIG = {
  exam: {
    label: 'Exam',
    color: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/40',
    dot: 'bg-rose-500',
    badge: 'bg-rose-500 text-white'
  },
  event: {
    label: 'Campus Event',
    color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/40',
    dot: 'bg-blue-500',
    badge: 'bg-blue-500 text-white'
  },
  holiday: {
    label: 'Holiday',
    color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40',
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-500 text-white'
  },
  academic: {
    label: 'Academic',
    color: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/40',
    dot: 'bg-indigo-500',
    badge: 'bg-indigo-500 text-white'
  },
  meeting: {
    label: 'Meeting',
    color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/40',
    dot: 'bg-amber-500',
    badge: 'bg-amber-500 text-white'
  }
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Standard system roles shown in the Target Audience dropdown
const SYSTEM_AUDIENCE_ROLES = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'students', label: 'Students' },
  { value: 'teachers', label: 'Teachers' },
  { value: 'hod', label: 'HOD' },
  { value: 'admin', label: 'Admin' },
  { value: 'staff', label: 'Staff' },
];

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTypeFilter, setActiveTypeFilter] = useState('all');
  const [activeAudienceFilter, setActiveAudienceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);

  // Form fields
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('event');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formAllDay, setFormAllDay] = useState(false);
  const [formLocation, setFormLocation] = useState('');
  const [formTargetAudience, setFormTargetAudience] = useState('everyone');
  const [formDescription, setFormDescription] = useState('');

  // Target audience roles (merged standard + dynamic college roles & departments)
  const [availableRoles, setAvailableRoles] = useState(SYSTEM_AUDIENCE_ROLES);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const {
    events,
    summary,
    isLoading,
    isSubmitting,
    canManage,
    userRole,
    addEvent,
    updateEvent,
    deleteEvent,
    applySaturdayRule
  } = useCalendar({
    type: activeTypeFilter,
    search: searchQuery,
    targetAudience: activeAudienceFilter
  });

  useEffect(() => {
    if (!canManage) return;
    let isMounted = true;

    // Load dynamic custom roles and departments for Target Audience dropdown
    Promise.allSettled([
      api.get('/roles'),
      api.get('/departments')
    ]).then(([rolesRes, deptsRes]) => {
      if (!isMounted) return;

      const dynamicRoles = [];
      const existingValues = new Set(SYSTEM_AUDIENCE_ROLES.map((r) => r.value.toLowerCase()));

      if (rolesRes.status === 'fulfilled') {
        const fetchedRoles = rolesRes.value.data?.data || rolesRes.value.data || [];
        if (Array.isArray(fetchedRoles) && fetchedRoles.length > 0) {
          fetchedRoles.forEach((r) => {
            const roleName = typeof r === 'string' ? r : (r.name || '');
            if (!roleName) return;
            const slug = roleName.toLowerCase().trim();
            // Parents role excluded per requirement
            if (slug === 'parents' || slug === 'parent') return;
            if (!existingValues.has(slug)) {
              existingValues.add(slug);
              dynamicRoles.push({
                value: slug,
                label: roleName.charAt(0).toUpperCase() + roleName.slice(1)
              });
            }
          });
        }
      }

      if (deptsRes.status === 'fulfilled') {
        const fetchedDepts = deptsRes.value.data?.data || deptsRes.value.data || [];
        if (Array.isArray(fetchedDepts) && fetchedDepts.length > 0) {
          fetchedDepts.forEach((d) => {
            if (!d?.id || !d?.name) return;
            const val = `dept:${d.id}`;
            if (!existingValues.has(val)) {
              existingValues.add(val);
              dynamicRoles.push({
                value: val,
                label: `Department: ${d.name}`,
                type: 'department',
                departmentId: d.id,
                name: d.name
              });
            }
          });
        }
      }

      if (dynamicRoles.length > 0) {
        setAvailableRoles([...SYSTEM_AUDIENCE_ROLES, ...dynamicRoles]);
      }
    }).catch(() => {
      // Fall back silently
    });

    return () => {
      isMounted = false;
    };
  }, [canManage]);

  const formatAudienceLabel = (aud) => {
    if (!aud || aud === 'all' || aud === 'everyone') return 'Everyone';
    const match = availableRoles.find((r) => r.value.toLowerCase() === aud.toLowerCase());
    if (match) return match.label;
    if (aud.startsWith('dept:') || aud.startsWith('department:')) return 'Department';
    if (aud.toLowerCase() === 'teacher' || aud.toLowerCase() === 'teachers') return 'Teachers';
    if (aud.toLowerCase() === 'student' || aud.toLowerCase() === 'students') return 'Students';
    if (aud.toLowerCase() === 'admin' || aud.toLowerCase() === 'admins' || aud.toLowerCase() === 'superadmin') return 'Admin';
    if (aud.toLowerCase() === 'staff') return 'Staff';
    if (aud.toLowerCase() === 'hod') return 'HOD';
    return aud.charAt(0).toUpperCase() + aud.slice(1);
  };

  // Calendar grid calculations
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Previous month padding
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        date: new Date(currentYear, currentMonth - 1, daysInPrevMonth - i),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= daysInCurrentMonth; i++) {
      days.push({
        date: new Date(currentYear, currentMonth, i),
        isCurrentMonth: true
      });
    }

    // Next month padding to complete 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(currentYear, currentMonth + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  }, [currentYear, currentMonth]);

  // Filter events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchType = activeTypeFilter === 'all' || ev.type?.toLowerCase() === activeTypeFilter.toLowerCase();
      const aud = String(ev.targetAudience || 'everyone').toLowerCase();
      let matchAudience = true;
      if (activeAudienceFilter !== 'all') {
        if (activeAudienceFilter === 'everyone') {
          matchAudience = aud === 'everyone' || aud === 'all';
        } else if (activeAudienceFilter === 'teachers' || activeAudienceFilter === 'teacher') {
          matchAudience =
            aud === 'teachers' ||
            aud === 'teacher' ||
            aud === 'faculty' ||
            aud === 'everyone' ||
            aud === 'all';
        } else if (activeAudienceFilter === 'students' || activeAudienceFilter === 'student') {
          matchAudience =
            aud === 'students' ||
            aud === 'student' ||
            aud === 'everyone' ||
            aud === 'all';
        } else if (activeAudienceFilter === 'admin' || activeAudienceFilter === 'admins') {
          matchAudience =
            aud === 'admin' ||
            aud === 'admins' ||
            aud === 'superadmin' ||
            aud === 'everyone' ||
            aud === 'all';
        } else {
          matchAudience =
            aud === activeAudienceFilter.toLowerCase() ||
            aud === 'everyone' ||
            aud === 'all';
        }
      }

      const matchSearch =
        !searchQuery ||
        ev.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ev.location?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchType && matchAudience && matchSearch;
    });
  }, [events, activeTypeFilter, activeAudienceFilter, searchQuery]);

  // Group events by YYYY-MM-DD
  const eventsByDate = useMemo(() => {
    const map = {};
    filteredEvents.forEach((ev) => {
      if (!ev.startDate) return;
      const d = new Date(ev.startDate);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(ev);
    });
    return map;
  }, [filteredEvents]);

  const selectedDateKey = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const selectedDateEvents = eventsByDate[selectedDateKey] || [];

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  // Open modal for Create
  const handleOpenCreateModal = (presetDate = null) => {
    if (!canManage) return;
    const target = presetDate || selectedDate || new Date();
    const dateStr = target.toISOString().split('T')[0];
    setEditingItem(null);
    setFormTitle('');
    setFormType('event');
    setFormStartDate(dateStr);
    setFormEndDate(dateStr);
    setFormStartTime('09:00');
    setFormEndTime('10:00');
    setFormAllDay(false);
    setFormLocation('');
    setFormTargetAudience('everyone');
    setFormDescription('');
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (item) => {
    if (!canManage) return;
    setEditingItem(item);
    setFormTitle(item.title ? item.title.replace(/^Exam:\s*/, '') : '');
    setFormType(item.type || 'event');
    const sDate = item.startDate ? new Date(item.startDate).toISOString().split('T')[0] : '';
    const eDate = item.endDate ? new Date(item.endDate).toISOString().split('T')[0] : sDate;
    setFormStartDate(sDate);
    setFormEndDate(eDate);
    setFormStartTime('09:00');
    setFormEndTime('10:00');
    setFormAllDay(Boolean(item.allDay));
    setFormLocation(item.location || '');
    const initialAudience = item.departmentId
      ? `dept:${item.departmentId}`
      : (item.targetAudience === 'all' ? 'everyone' : (item.targetAudience || 'everyone'));
    setFormTargetAudience(initialAudience);
    setFormDescription(item.description || '');
    setIsModalOpen(true);
  };

  // Save (Create or Update)
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const startDateTime = formAllDay
      ? `${formStartDate}T00:00:00.000Z`
      : `${formStartDate}T${formStartTime}:00.000Z`;

    const endDateTime = formAllDay
      ? `${formEndDate || formStartDate}T23:59:59.999Z`
      : `${formEndDate || formStartDate}T${formEndTime}:00.000Z`;

    let departmentId = null;
    if (formTargetAudience.startsWith('dept:') || formTargetAudience.startsWith('department:')) {
      departmentId = formTargetAudience.split(':')[1];
    }

    const payload = {
      title: formTitle.trim(),
      type: formType,
      startDate: startDateTime,
      endDate: endDateTime,
      allDay: formAllDay,
      location: formLocation.trim(),
      targetAudience: formTargetAudience,
      departmentId,
      description: formDescription.trim()
    };

    try {
      if (editingItem) {
        await updateEvent(editingItem.id, payload);
      } else {
        await addEvent(payload);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (_) {
      // Error is handled via toast inside useCalendar
    }
  };

  // Delete
  const handleConfirmDelete = async () => {
    if (!deletingItem || !canManage) return;
    try {
      await deleteEvent(deletingItem.id);
      setDeletingItem(null);
    } catch (_) {}
  };

  const isToday = (d) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (d) => {
    return (
      d.getDate() === selectedDate.getDate() &&
      d.getMonth() === selectedDate.getMonth() &&
      d.getFullYear() === selectedDate.getFullYear()
    );
  };

  const isSunday = (d) => d.getDay() === 0;
  const isSaturday = (d) => d.getDay() === 6;

  const getSaturdayHolidayEvent = (dKey) => {
    const dayEvs = eventsByDate[dKey] || [];
    return dayEvs.find(
      (ev) => ev.type === 'holiday' && (
        ev.title?.toLowerCase().includes('saturday') ||
        ev.description?.toLowerCase().includes('saturday') ||
        ev.allDay
      )
    ) || dayEvs.find((ev) => ev.type === 'holiday');
  };

  const handleToggleSaturdayHoliday = async (dayDate) => {
    if (!canManage) return;
    const y = dayDate.getFullYear();
    const m = dayDate.getMonth();
    const dateNum = dayDate.getDate();
    const dKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
    const existingHoliday = getSaturdayHolidayEvent(dKey);

    if (existingHoliday) {
      try {
        await deleteEvent(existingHoliday.id);
      } catch (_) {}
    } else {
      let count = 0;
      for (let i = 1; i <= dateNum; i++) {
        if (new Date(y, m, i).getDay() === 6) count++;
      }
      const ord = count === 1 ? '1st' : count === 2 ? '2nd' : count === 3 ? '3rd' : count === 4 ? '4th' : '5th';
      const title = `${ord} Saturday Holiday`;

      const startIso = new Date(Date.UTC(y, m, dateNum, 0, 0, 0)).toISOString();
      const endIso = new Date(Date.UTC(y, m, dateNum, 23, 59, 59, 999)).toISOString();

      try {
        await addEvent({
          title,
          type: 'holiday',
          startDate: startIso,
          endDate: endIso,
          allDay: true,
          location: 'Campus-wide',
          description: `Official Saturday holiday (${title}) configured by Admin/HOD.`
        });
      } catch (_) {}
    }
  };

  // KPI holiday calculations
  const sundaysInCurrentMonth = useMemo(() => {
    let count = 0;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      if (new Date(currentYear, currentMonth, d).getDay() === 0) count++;
    }
    return count;
  }, [currentYear, currentMonth]);

  const monthHolidayEvents = useMemo(() => {
    return events.filter((e) => {
      if (e.type !== 'holiday' || !e.startDate) return false;
      const d = new Date(e.startDate);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
  }, [events, currentYear, currentMonth]);

  const saturdayHolidaysInCurrentMonth = useMemo(() => {
    return monthHolidayEvents.filter((e) => {
      const d = new Date(e.startDate);
      return d.getDay() === 6;
    }).length;
  }, [monthHolidayEvents]);

  const totalHolidaysThisMonth = sundaysInCurrentMonth + monthHolidayEvents.length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Permissions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 p-6 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
              <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Academic &amp; Events Calendar
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Official schedule for exams, academic milestones, holidays, and campus events.
              </p>
            </div>
          </div>
        </div>

        {/* Role Rule Indicator & Actions */}
        <div className="flex items-center gap-3">
          {canManage ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Shield className="w-3.5 h-3.5" />
                Admin &amp; HOD Access
              </span>
              <button
                type="button"
                onClick={() => handleOpenCreateModal()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 shadow-md shadow-primary-500/20 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                Add Event / Exam
              </button>
            </>
          ) : (
            <span
              title="You have read-only access. Only Admin and HOD roles can create or modify calendar entries."
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10"
            >
              <Eye className="w-4 h-4 text-slate-400" />
              Read-Only Mode ({userRole || 'Viewer'})
            </span>
          )}
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Scheduled</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {events.length}
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-[#0A0F1C] border border-rose-200 dark:border-rose-900/30 rounded-2xl bg-rose-50/30 dark:bg-rose-950/10">
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400">Scheduled Exams</p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {events.filter((e) => e.type === 'exam').length}
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-[#0A0F1C] border border-emerald-200 dark:border-emerald-900/30 rounded-2xl bg-emerald-50/30 dark:bg-emerald-950/10">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Holidays ({MONTH_NAMES[currentMonth]?.slice(0, 3)})</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold">
              {sundaysInCurrentMonth} Sun + {saturdayHolidaysInCurrentMonth} Sat
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {totalHolidaysThisMonth}
          </p>
        </div>
        <div className="p-4 bg-white dark:bg-[#0A0F1C] border border-blue-200 dark:border-blue-900/30 rounded-2xl bg-blue-50/30 dark:bg-blue-950/10">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Campus Events</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {events.filter((e) => e.type === 'event').length}
          </p>
        </div>
      </div>

      {/* Filter and Navigation Toolbar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 p-4 rounded-2xl shadow-sm">
        {/* Month Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-bold text-slate-900 dark:text-white min-w-[170px] text-center">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
          >
            Today
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {['all', 'exam', 'event', 'holiday', 'academic', 'meeting'].map((typeKey) => {
            const isActive = activeTypeFilter === typeKey;
            return (
              <button
                key={typeKey}
                onClick={() => setActiveTypeFilter(typeKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {typeKey === 'all' ? 'All Types' : TYPE_CONFIG[typeKey]?.label || typeKey}
              </button>
            );
          })}
        </div>

        {/* Search, Target Audience Filter & View Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Target Audience Dropdown Menu Filter */}
          <div className="relative">
            <select
              value={activeAudienceFilter}
              onChange={(e) => setActiveAudienceFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-700 dark:text-slate-300 cursor-pointer"
              title="Filter by Target Audience"
            >
              <option value="all">All Roles</option>
              {availableRoles.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search events/exams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center p-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-[#0A0F1C] text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-[#0A0F1C] text-primary-600 dark:text-primary-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Grid + Day Details Sidebar */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Calendar Grid (Col 1 & 2) */}
          <div className="xl:col-span-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-4 md:p-6 overflow-hidden">
            <div className="overflow-x-auto pb-1 scrollbar-none">
              <div className="min-w-[560px] sm:min-w-0">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 gap-2 mb-2.5">
                  {WEEKDAY_NAMES.map((w, idx) => (
                    <div
                      key={w}
                      className={`text-center py-2 text-xs font-bold uppercase tracking-wider ${
                        idx === 0
                          ? 'text-rose-500 dark:text-rose-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {w}
                    </div>
                  ))}
                </div>

                {/* Days grid */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {calendarDays.map((dayObj, idx) => {
                    const dayDate = dayObj.date;
                    const dKey = `${dayDate.getFullYear()}-${String(dayDate.getMonth() + 1).padStart(2, '0')}-${String(dayDate.getDate()).padStart(2, '0')}`;
                    const dayEvents = eventsByDate[dKey] || [];
                    const isCurMonth = dayObj.isCurrentMonth;
                    const activeToday = isToday(dayDate);
                    const activeSelected = isSelected(dayDate);
                    const isSun = isSunday(dayDate);
                    const isSat = isSaturday(dayDate);
                    const satHoliday = isSat ? getSaturdayHolidayEvent(dKey) : null;
                    const isSatHoliday = Boolean(satHoliday);

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDate(dayDate)}
                        onDoubleClick={() => {
                          if (canManage && isCurMonth) {
                            handleOpenCreateModal(dayDate);
                          }
                        }}
                        title={
                          canManage && isCurMonth
                            ? `${dayDate.toDateString()} (Click to select, double-click to add event)`
                            : dayDate.toDateString()
                        }
                        className={`min-h-[95px] sm:min-h-[110px] p-2 rounded-xl flex flex-col justify-between cursor-pointer border transition-all select-none ${
                          activeSelected
                            ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/25 ring-2 ring-primary-500/30 shadow-sm'
                            : isSun && isCurMonth
                            ? 'border-slate-100 dark:border-white/5 bg-rose-50/20 dark:bg-rose-950/10 hover:border-slate-300 dark:hover:border-white/20'
                            : isSatHoliday && isCurMonth
                            ? 'border-slate-100 dark:border-white/5 bg-emerald-50/20 dark:bg-emerald-950/10 hover:border-slate-300 dark:hover:border-white/20'
                            : isCurMonth
                            ? 'border-slate-100 dark:border-white/5 bg-white dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20'
                            : 'border-transparent opacity-30 bg-transparent cursor-default'
                        }`}
                      >
                        {/* Day number header - Clean, no plus, no suitcase, no cup, no clutter */}
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${
                              activeToday
                                ? 'bg-primary-600 text-white shadow-sm'
                                : activeSelected
                                ? 'text-primary-600 dark:text-primary-400 font-extrabold scale-110'
                                : isSun && isCurMonth
                                ? 'text-rose-600 dark:text-rose-400'
                                : isCurMonth
                                ? 'text-slate-700 dark:text-slate-300'
                                : 'text-slate-400 dark:text-slate-600'
                            }`}
                          >
                            {dayDate.getDate()}
                          </span>

                          {/* Subtle status indicator dot */}
                          {isCurMonth && (
                            <div className="flex items-center gap-1">
                              {isSun && (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500/70" title="Sunday Holiday" />
                              )}
                              {isSatHoliday && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Saturday Holiday" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Event chips - Clean typography, no cluttered icons */}
                        <div className="space-y-1 mt-1.5 overflow-hidden">
                          {/* Automatic Sunday Holiday Chip */}
                          {isSun && isCurMonth && (
                            <div
                              title="Sunday Holiday (Official Weekly Off)"
                              className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40"
                            >
                              Sunday Holiday
                            </div>
                          )}

                          {/* Saturday Holiday Chip (Only shown if marked as holiday) */}
                          {isSat && isCurMonth && isSatHoliday && (
                            <div
                              title={satHoliday?.title || 'Saturday Holiday'}
                              className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40"
                            >
                              {satHoliday?.title || 'Saturday Holiday'}
                            </div>
                          )}

                          {/* Scheduled events/exams */}
                          {dayEvents
                            .filter((ev) => !(isSat && ev.id === satHoliday?.id))
                            .slice(0, isSun || (isSat && isSatHoliday) ? 1 : 2)
                            .map((ev) => {
                              const cfg = TYPE_CONFIG[ev.type] || TYPE_CONFIG.event;
                              return (
                                <div
                                  key={ev.id}
                                  title={`${ev.title} (${cfg.label})`}
                                  className={`text-[10px] px-1.5 py-0.5 rounded truncate font-medium border ${cfg.color}`}
                                >
                                  {ev.title}
                                </div>
                              );
                            })}
                          {dayEvents.filter((ev) => !(isSat && ev.id === satHoliday?.id)).length > (isSun || (isSat && isSatHoliday) ? 1 : 2) && (
                            <div className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 pl-0.5">
                              +{dayEvents.filter((ev) => !(isSat && ev.id === satHoliday?.id)).length - (isSun || (isSat && isSatHoliday) ? 1 : 2)} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Selected Date Details Sidebar (Col 3) - Clean, clear options on date click */}
          <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6 flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedDate.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {selectedDateEvents.length} scheduled item{selectedDateEvents.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-3 max-h-[520px]">
              {/* Dedicated Sunday Weekly Holiday Notice */}
              {isSunday(selectedDate) && (
                <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/70 dark:bg-emerald-950/20 mb-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold text-xs uppercase tracking-wider">
                      Sunday Weekly Holiday
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                      Weekly Off
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Every Sunday is an official campus holiday. Standard academic classes remain suspended.
                  </p>
                </div>
              )}

              {/* Dedicated Saturday Schedule Control Card - Clean text, no symbols */}
              {isSaturday(selectedDate) && (() => {
                const satHoliday = getSaturdayHolidayEvent(selectedDateKey);
                const isHoliday = Boolean(satHoliday);
                return (
                  <div className={`p-3.5 rounded-xl border mb-3 transition-all ${
                    isHoliday
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                      : 'bg-slate-50 dark:bg-white/[0.03] border-slate-200 dark:border-white/10'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                        {isHoliday ? (satHoliday?.title || 'Saturday Holiday') : 'Working Saturday'}
                      </span>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        isHoliday ? 'bg-emerald-500 text-white' : 'bg-slate-600 text-white'
                      }`}>
                        {isHoliday ? 'Official Off' : 'Working Day'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1.5">
                      {isHoliday
                        ? 'This Saturday is marked as an official campus holiday.'
                        : 'This Saturday is scheduled as a regular working/instructional day.'}
                    </p>

                    {/* Admin and HOD Saturday Holiday Toggle */}
                    {canManage && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-white/10">
                        <button
                          type="button"
                          onClick={() => handleToggleSaturdayHoliday(selectedDate)}
                          disabled={isSubmitting}
                          className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                            isHoliday
                              ? 'bg-white dark:bg-slate-900 text-rose-600 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 shadow-sm'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                          }`}
                        >
                          {isHoliday ? 'Change to Working Day' : 'Mark as Leave (Holiday)'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}

              {selectedDateEvents.length === 0 ? (
                <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                  <CalendarIcon className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-medium">No scheduled events on this date</p>
                </div>
              ) : (
                selectedDateEvents.map((item) => {
                  const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.event;
                  return (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/20 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${cfg.badge}`}
                        >
                          {cfg.label}
                        </span>

                        {canManage && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1 text-slate-400 hover:text-primary-600 rounded transition-colors"
                              title="Edit item"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingItem(item)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        {item.title}
                      </h3>

                      {item.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 whitespace-pre-line">
                          {item.description}
                        </p>
                      )}

                      <div className="pt-2 border-t border-slate-200/60 dark:border-white/5 flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                        {item.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {item.location}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {item.allDay ? 'All Day' : 'Scheduled'}
                        </span>
                        {item.targetAudience && (
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            {formatAudienceLabel(item.targetAudience)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : (
        /* List View Mode */
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              All Scheduled Items ({filteredEvents.length})
            </h2>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-slate-500">
              <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">No events found matching your filter criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-white/10">
              {filteredEvents.map((item) => {
                const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.event;
                const d = new Date(item.startDate);
                return (
                  <div
                    key={item.id}
                    className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      {/* Date Badge */}
                      <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 flex flex-col items-center justify-center shrink-0 border border-slate-200 dark:border-white/10">
                        <span className="text-[10px] font-bold uppercase text-slate-400">
                          {MONTH_NAMES[d.getMonth()]?.slice(0, 3)}
                        </span>
                        <span className="text-base font-extrabold text-slate-900 dark:text-white leading-none">
                          {d.getDate()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${cfg.badge}`}
                          >
                            {cfg.label}
                          </span>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {item.title}
                          </h3>
                        </div>

                        {item.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line line-clamp-2">
                            {item.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                          {item.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {item.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {item.allDay ? 'All Day' : 'Scheduled'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {formatAudienceLabel(item.targetAudience)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingItem(item)}
                          className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary-500" />
                {editingItem ? 'Edit Calendar Item' : 'Add Event / Exam'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Mathematics Exam, Science Fair 2026"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                    Category *
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
                  >
                    <option value="exam">Exam</option>
                    <option value="event">Campus Event</option>
                    <option value="holiday">Holiday</option>
                    <option value="academic">Academic</option>
                    <option value="meeting">Meeting</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                    Target Audience
                  </label>
                  <select
                    value={formTargetAudience}
                    onChange={(e) => setFormTargetAudience(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
                  >
                    {availableRoles.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                    {!availableRoles.some(
                      (r) => r.value.toLowerCase() === formTargetAudience.toLowerCase()
                    ) && (
                      <option value={formTargetAudience}>
                        {formTargetAudience.charAt(0).toUpperCase() + formTargetAudience.slice(1)}
                      </option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="allDayCheckbox"
                  checked={formAllDay}
                  onChange={(e) => setFormAllDay(e.target.checked)}
                  className="rounded text-primary-600 focus:ring-primary-500 w-4 h-4 cursor-pointer"
                />
                <label
                  htmlFor="allDayCheckbox"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  All-Day Event / Full Day
                </label>
              </div>

              {!formAllDay && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={formStartTime}
                      onChange={(e) => setFormStartTime(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                  Location / Venue / Room
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Auditorium, Examination Hall 2, Online"
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5">
                  Description / Remarks
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional notes, instructions, syllabus, or rules..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 dark:text-white"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Schedule Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Delete Calendar Item?
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Are you sure you want to delete{' '}
                <strong className="text-slate-700 dark:text-slate-200">"{deletingItem.title}"</strong>?
                This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
