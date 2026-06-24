import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Info, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

export function NotificationDropdown() {
  const { userData, userRole } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const dropdownRef = useRef(null);

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

  // Fetch real-time notifications
  useEffect(() => {
    if (!userData) return;

    let unsubscribes = [];

    if (userRole === 'superadmin') {
      const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
      unsubscribes.push(onSnapshot(q, (snapshot) => {
        const allNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNotifications(allNotifs);
      }));
    } else {
      // Query 1: College specific
      const qCollege = query(
        collection(db, 'notifications'), 
        where('collegeId', '==', userData.collegeId)
      );
      
      // Query 2: Global announcements
      const qAll = query(
        collection(db, 'notifications'), 
        where('collegeId', '==', 'all')
      );

      let collegeNotifs = [];
      let globalNotifs = [];

      const updateMergedNotifications = () => {
        const merged = [...collegeNotifs, ...globalNotifs]
          .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis())
          .slice(0, 50); // Keep top 50
        
        // Filter by role manually
        const filtered = merged.filter(n => n.role === 'all' || n.role === userRole);
        setNotifications(filtered);
      };

      unsubscribes.push(onSnapshot(qCollege, (snapshot) => {
        collegeNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateMergedNotifications();
      }));

      unsubscribes.push(onSnapshot(qAll, (snapshot) => {
        globalNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateMergedNotifications();
      }));
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [userData, userRole]);

  const unreadCount = notifications.filter(n => !n.readBy?.includes(userData?.uid)).length;

  const getIcon = (type) => {
    switch(type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'error': return <X className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-primary-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 relative text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-[#0A0F1C]"></span>
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
              <div className="flex items-center gap-3">
                <h3 className="font-bold text-slate-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400 text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} New
                  </span>
                )}
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                  <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p className="text-sm font-medium">No new notifications</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {notifications.map(notification => (
                    <div 
                      key={notification.id} 
                      className={`p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer flex gap-3 items-start ${
                        !notification.readBy?.includes(userData?.uid) ? 'bg-primary-50/50 dark:bg-primary-500/5' : ''
                      }`}
                    >
                      <div className="shrink-0 mt-0.5">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                          {notification.createdAt?.toDate ? new Date(notification.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                        </p>
                      </div>
                      {!notification.readBy?.includes(userData?.uid) && (
                        <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1.5" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
