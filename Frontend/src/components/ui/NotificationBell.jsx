import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  BellRing,
  Info,
  AlertTriangle,
  AlertCircle,
  ClipboardList,
  Calendar,
  Video,
  UserPlus,
  ShieldCheck,
  MessageSquareWarning,
  CheckCheck,
  Sparkles,
  X,
  ExternalLink,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

function formatRelativeTime(dateString) {
  if (!dateString) return 'Just now';
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString();
}

export function resolveNotificationTargetRoute(notification, rawRole) {
  const role = (rawRole || '').toLowerCase().trim();
  const isAdmin = role === 'admin' || role === 'superadmin';
  const isTeacher = ['teacher', 'hod', 'faculty'].includes(role);
  const isStudent = role === 'student';
  const isParent = role === 'parent';
  const isOtherStaff = !isAdmin && !isTeacher && !isStudent && !isParent && !!role;

  const rawLink = typeof notification?.link === 'string' ? notification.link.trim() : '';
  const type = (notification?.type || '').toLowerCase();

  // 1. External URL -> open externally
  if (rawLink.startsWith('http://') || rawLink.startsWith('https://')) {
    return { isExternal: true, path: rawLink };
  }

  // 2. ADMIN / SUPERADMIN PANEL
  if (isAdmin) {
    // Leave requests
    if (type === 'leave_request' || type === 'leave_status' || rawLink.includes('leave')) {
      return { isExternal: false, path: '/admin/leave-requests' };
    }
    // Complaints
    if (type === 'complaint_new' || rawLink.includes('complaint')) {
      return { isExternal: false, path: '/admin/complaints' };
    }
    // Admissions
    if (type === 'admission_application' || rawLink.includes('admission')) {
      return { isExternal: false, path: '/admin/admission' };
    }
    // Account activation / staff setup
    if (type === 'account_activated' || rawLink === '/admin/hr') {
      return { isExternal: false, path: '/admin/hr' };
    }
    // Notices
    if (type === 'notice_new' || rawLink.includes('notice')) {
      return { isExternal: false, path: '/admin/notices' };
    }
    // If link is already valid admin path
    if (rawLink.startsWith('/admin')) {
      if (rawLink === '/admin/admissions') return { isExternal: false, path: '/admin/admission' };
      return { isExternal: false, path: rawLink };
    }
    // Cross-panel link arriving at admin panel -> safe fallback
    if (rawLink.startsWith('/teacher') || rawLink.startsWith('/student')) {
      return { isExternal: false, path: '/admin' };
    }
    return { isExternal: false, path: rawLink || '/admin' };
  }

  // 3. TEACHER / FACULTY / HOD PANEL
  if (isTeacher) {
    // Student leave review
    if (type === 'leave_request' || rawLink.includes('student-leaves')) {
      return { isExternal: false, path: '/teacher/student-leaves' };
    }
    // Teacher's own leave application / status
    if (type === 'leave_status' || rawLink.includes('my-leaves') || rawLink.includes('leave')) {
      return { isExternal: false, path: '/teacher/my-leaves' };
    }
    // Timetable / schedule
    if (type === 'timetable_change' || rawLink.includes('timetable') || rawLink.includes('schedule')) {
      return { isExternal: false, path: '/teacher/schedule' };
    }
    // PTM
    if (type.startsWith('ptm_') || rawLink.includes('ptm')) {
      return { isExternal: false, path: '/teacher/ptm' };
    }
    // Assignments
    if (type === 'assignment_new' || rawLink.includes('assignment')) {
      return { isExternal: false, path: '/teacher/assignments' };
    }
    // Notices
    if (type === 'notice_new' || rawLink.includes('notices')) {
      return { isExternal: false, path: '/teacher/notices' };
    }
    // Complaints
    if (type === 'complaint_new' || rawLink.includes('complaint')) {
      return { isExternal: false, path: '/teacher/complaints' };
    }
    // If already teacher path
    if (rawLink.startsWith('/teacher')) {
      return { isExternal: false, path: rawLink };
    }
    // Cross-panel link arriving at teacher panel -> safe fallback
    return { isExternal: false, path: '/teacher' };
  }

  // 4. STUDENT PANEL
  if (isStudent) {
    if (
      type === 'leave_request' ||
      type === 'leave_status' ||
      type === 'attendance_absent' ||
      type === 'attendance_late' ||
      rawLink.includes('attendance') ||
      rawLink.includes('leave')
    ) {
      return { isExternal: false, path: '/student/attendance' };
    }
    if (type === 'exam_scheduled' || type === 'exam_marks' || rawLink.includes('exam')) {
      return { isExternal: false, path: '/student/exams' };
    }
    if (type === 'assignment_new' || rawLink.includes('assignment')) {
      return { isExternal: false, path: '/student/assignments' };
    }
    if (type === 'timetable_change' || rawLink.includes('timetable')) {
      return { isExternal: false, path: '/student/timetable' };
    }
    if (type.startsWith('ptm_') || rawLink.includes('ptm')) {
      return { isExternal: false, path: '/student/ptm' };
    }
    if (type === 'notice_new' || rawLink.includes('notice')) {
      return { isExternal: false, path: '/student/notices' };
    }
    if (rawLink.startsWith('/student')) {
      return { isExternal: false, path: rawLink };
    }
    return { isExternal: false, path: '/student' };
  }

  // 5. OTHER STAFF (e.g. librarian, accountant using /admin/*)
  if (isOtherStaff) {
    if (type === 'leave_status' || rawLink.includes('my-leaves') || rawLink.includes('leave')) {
      return { isExternal: false, path: '/admin/my-leaves' };
    }
    if (rawLink.startsWith('/admin')) {
      return { isExternal: false, path: rawLink };
    }
    return { isExternal: false, path: '/admin' };
  }

  // 6. PARENT PANEL
  if (isParent) {
    if (rawLink.startsWith('/parent')) {
      return { isExternal: false, path: rawLink };
    }
    return { isExternal: false, path: '/parent' };
  }

  // Fallback
  return { isExternal: false, path: rawLink || '/' };
}

export function NotificationBell({ className = '' }) {
  const { userData, userRole } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const userId = userData?.id || userData?.uid;

  // Browser notification permission state
  const [browserPermission, setBrowserPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  const requestBrowserPermission = async () => {
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const res = await Notification.requestPermission();
        setBrowserPermission(res);
      }
    } catch (err) {
      console.error('[NotificationBell] Request permission error:', err);
    }
  };

  // Poll unread count every 15s + instant on focus
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count', userId],
    queryFn: async () => {
      const res = await api.get('/notifications/unread-count');
      return (
        res?.data?.count ??
        res?.data?.unreadCount ??
        res?.count ??
        res?.unreadCount ??
        res?.data?.data?.count ??
        0
      );
    },
    enabled: !!userId,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  // Query notifications list (unread only, poll every 15s)
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', 'list', userId],
    queryFn: async () => {
      const res = await api.get('/notifications?page=1&limit=20&unreadOnly=true');
      const rawList =
        (Array.isArray(res?.data) ? res.data : null) ??
        (Array.isArray(res?.data?.data) ? res.data.data : null) ??
        (Array.isArray(res) ? res : []);
      // Filter to ensure only unread notifications are kept in the bell list
      return rawList.filter((n) => !n.isRead);
    },
    enabled: !!userId,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const handleNotificationClick = async (notification) => {
    // 1. Close dropdown immediately
    setIsOpen(false);

    const notifId = notification?.id;
    if (!notifId) return;

    // 2. Synchronously and optimistically update React Query cache so the bell list
    //    removes this notification and the badge count is already reduced when landing on the target page
    queryClient.setQueryData(['notifications', 'list', userId], (prev) =>
      Array.isArray(prev) ? prev.filter((n) => n.id !== notifId) : []
    );
    queryClient.setQueryData(['notifications', 'unread-count', userId], (prev) =>
      typeof prev === 'number' && prev > 0 ? prev - 1 : 0
    );

    // 3. Mark as read in backend FIRST (await the mutation response so request is committed before navigation)
    try {
      await api.patch(`/notifications/${notifId}/read`);
    } catch (err) {
      console.error('[NotificationBell] Mark as read error:', err);
      try {
        await api.put(`/notifications/${notifId}/read`);
      } catch (putErr) {
        console.error('[NotificationBell] Legacy PUT fallback failed:', putErr);
      }
    }

    // 4. Invalidate queries so background sync keeps cache fresh with backend
    queryClient.invalidateQueries({ queryKey: ['notifications'] });

    // 5. Navigate safely per role with fallback
    const effectiveRole = userRole || userData?.role || '';
    const target = resolveNotificationTargetRoute(notification, effectiveRole);
    if (target?.isExternal) {
      window.open(target.path, '_blank', 'noopener,noreferrer');
    } else if (target?.path) {
      navigate(target.path);
    }
  };

  // Seen IDs tracking for desktop notifications
  const seenIdsRef = useRef(new Set());
  const hasInitializedRef = useRef(false);

  // Reset baseline when userId changes or on logout
  useEffect(() => {
    seenIdsRef.current = new Set();
    hasInitializedRef.current = false;
  }, [userId]);

  // Detect newly arrived notifications and trigger Web Notification API
  useEffect(() => {
    try {
      if (!Array.isArray(notifications)) return;

      // 1. Initial baseline after login: record existing notification IDs without popping alerts
      if (!hasInitializedRef.current) {
        if (!isLoading) {
          notifications.forEach((n) => {
            if (n?.id) seenIdsRef.current.add(n.id);
          });
          hasInitializedRef.current = true;
        }
        return;
      }

      // 2. Subsequent polls: find new unread notifications that were not in baseline
      const newlyArrived = notifications.filter(
        (n) => n?.id && !seenIdsRef.current.has(n.id) && !n.isRead
      );

      // Record all current IDs into seen set
      notifications.forEach((n) => {
        if (n?.id) seenIdsRef.current.add(n.id);
      });

      if (newlyArrived.length === 0) return;

      // 3. Permission check
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      // 4. Anti-spam: if > 3 notifications arrive in one poll, show single summary notification
      if (newlyArrived.length > 3) {
        const summaryNotif = new Notification('Zuna Notifications', {
          body: `You have ${newlyArrived.length} new notifications.`,
          icon: '/logo.png',
          tag: `zuna-summary-${Date.now()}`,
          requireInteraction: true,
        });

        summaryNotif.onclick = () => {
          try {
            window.focus();
            summaryNotif.close();
            setIsOpen(true);
          } catch (e) {
            console.error('[NotificationBell] Summary notification click error:', e);
          }
        };
        return;
      }

      // 5. Spawn one notification per item (always, even when tab is focused)
      newlyArrived.forEach((item) => {
        const trimmedBody = item.message
          ? item.message.length > 120
            ? `${item.message.slice(0, 117)}...`
            : item.message
          : '';

        const notif = new Notification(item.title || 'New Notification', {
          body: trimmedBody,
          icon: '/logo.png',
          tag: item.id,
          requireInteraction: true,
        });

        notif.onclick = () => {
          try {
            window.focus();
            notif.close();
            handleNotificationClick(item);
          } catch (e) {
            console.error('[NotificationBell] Notification click error:', e);
          }
        };
      });
    } catch (err) {
      console.error('[NotificationBell] Browser notification error:', err);
    }
  }, [notifications, isLoading]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const prevList = queryClient.getQueryData(['notifications', 'list', userId]);
      const prevCount = queryClient.getQueryData(['notifications', 'unread-count', userId]);

      // Clear the list immediately
      queryClient.setQueryData(['notifications', 'list', userId], []);
      queryClient.setQueryData(['notifications', 'unread-count', userId], 0);
      return { prevList, prevCount };
    },
    onError: (err, vars, context) => {
      if (context?.prevList) {
        queryClient.setQueryData(['notifications', 'list', userId], context.prevList);
      }
      if (context?.prevCount !== undefined) {
        queryClient.setQueryData(['notifications', 'unread-count', userId], context.prevCount);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const getIcon = (type) => {
    switch (type) {
      case 'attendance_absent':
        return <AlertCircle className="w-5 h-5 text-rose-500" />;
      case 'attendance_late':
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'exam_marks':
      case 'exam_scheduled':
        return <ClipboardList className="w-5 h-5 text-blue-500" />;
      case 'leave_request':
      case 'leave_status':
      case 'timetable_change':
        return <Calendar className="w-5 h-5 text-purple-500" />;
      case 'ptm_scheduled':
      case 'ptm_cancelled':
      case 'ptm_completed':
        return <Video className="w-5 h-5 text-indigo-500" />;
      case 'assignment_new':
        return <ClipboardList className="w-5 h-5 text-emerald-500" />;
      case 'notice_new':
        return <Info className="w-5 h-5 text-primary-500" />;
      case 'admission_application':
        return <UserPlus className="w-5 h-5 text-emerald-500" />;
      case 'account_activated':
        return <ShieldCheck className="w-5 h-5 text-teal-500" />;
      case 'complaint_new':
        return <MessageSquareWarning className="w-5 h-5 text-rose-500" />;
      default:
        return <Info className="w-5 h-5 text-primary-500" />;
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className="p-2.5 relative text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors focus:outline-none"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 min-w-[18px] h-[18px] flex items-center justify-center bg-rose-500 text-white text-[10px] font-black rounded-full px-1 border-2 border-white dark:border-[#0A0F1C] animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="fixed top-20 right-4 left-4 w-auto max-w-sm mx-auto sm:absolute sm:top-auto sm:left-auto sm:right-0 sm:mt-2 sm:w-96 sm:max-w-none bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 origin-top-right"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 text-xs font-bold px-2 py-0.5 rounded-full border border-primary-200/60 dark:border-primary-500/20">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsReadMutation.mutate()}
                    disabled={markAllAsReadMutation.isPending}
                    className="flex items-center gap-1 text-[11px] font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline disabled:opacity-50"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Browser Notification Permission Banner */}
            {browserPermission === 'default' && (
              <div className="px-4 py-2.5 bg-primary-50/80 dark:bg-primary-500/10 border-b border-primary-100 dark:border-primary-500/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-primary-900 dark:text-primary-200">
                  <BellRing className="w-3.5 h-3.5 shrink-0 text-primary-600 dark:text-primary-400" />
                  <span className="font-medium">Enable browser notifications</span>
                </div>
                <button
                  type="button"
                  onClick={requestBrowserPermission}
                  className="px-2.5 py-1 text-[11px] font-bold bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors shrink-0 shadow-sm"
                >
                  Enable
                </button>
              </div>
            )}
            {browserPermission === 'denied' && (
              <div className="px-4 py-2 bg-slate-50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                <span>Desktop alerts blocked. Allow in browser site settings to enable.</span>
              </div>
            )}

            {/* List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
              {isLoading && notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center mx-auto mb-3">
                    <Sparkles className="w-6 h-6 text-primary-500" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    You're all caught up!
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    No new notifications right now.
                  </p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const isUnread = !notification.isRead;

                  return (
                    <div
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer flex gap-3 items-start ${
                        isUnread ? 'bg-primary-50/40 dark:bg-primary-500/5' : ''
                      }`}
                    >
                      <div className="shrink-0 mt-0.5 p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p
                            className={`text-xs ${
                              isUnread
                                ? 'font-black text-slate-900 dark:text-white'
                                : 'font-semibold text-slate-700 dark:text-slate-300'
                            } leading-tight truncate`}
                          >
                            {notification.title}
                          </p>
                          {notification.link && (
                            <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 opacity-60" />
                          )}
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                          {formatRelativeTime(notification.createdAt)}
                        </p>
                      </div>
                      {isUnread && (
                        <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 mt-2" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default NotificationBell;
