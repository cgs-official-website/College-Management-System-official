import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Info, AlertTriangle, CheckCircle2, X, Check, Building, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export function NotificationDropdown() {
  const { userData, userRole } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!userData) return;
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [userData]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const userId = userData?.id || userData?.uid;
  const unreadCount = notifications.filter(n => !n.isRead && !n.readBy?.includes(userId)).length;

  const handleMarkAsRead = async (id, link) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true, readBy: [...(n.readBy || []), userId] } : n));
      if (link) {
        setIsOpen(false);
        navigate(link);
      }
    } catch (error) {
      console.error("Error marking notification read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readBy: [...(n.readBy || []), userId] })));
    } catch (error) {
      console.error("Error marking all read:", error);
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'booking_approval':
      case 'success': 
        return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'booking_rejection':
      case 'error': 
        return <X className="w-5 h-5 text-rose-500" />;
      case 'booking_request':
        return <Building className="w-5 h-5 text-amber-500" />;
      case 'warning': 
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default: 
        return <Info className="w-5 h-5 text-primary-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="p-2.5 relative text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 min-w-[18px] h-[18px] flex items-center justify-center bg-rose-500 text-white text-[10px] font-black rounded-full px-1 border-2 border-white dark:border-[#0A0F1C] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
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
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/5">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 text-xs font-bold px-2 py-0.5 rounded-full border border-primary-200/60 dark:border-primary-500/20">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllAsRead}
                    className="text-[11px] font-bold text-primary-600 hover:text-primary-700 dark:text-primary-400 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No new notifications</p>
                </div>
              ) : (
                notifications.map(notification => {
                  const isUnread = !notification.isRead && !notification.readBy?.includes(userId);

                  return (
                    <div 
                      key={notification.id} 
                      onClick={() => handleMarkAsRead(notification.id, notification.link)}
                      className={`p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer flex gap-3 items-start ${
                        isUnread ? 'bg-primary-50/50 dark:bg-primary-500/5' : ''
                      }`}
                    >
                      <div className="shrink-0 mt-0.5 p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                          {notification.createdAt ? new Date(notification.createdAt).toLocaleDateString() : 'Just now'}
                        </p>
                      </div>
                      {isUnread && (
                        <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />
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
