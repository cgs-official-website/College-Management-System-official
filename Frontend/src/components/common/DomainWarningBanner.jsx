import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function DomainWarningBanner() {
  const { domainWarning, dismissDomainWarning, userData } = useAuth();
  const navigate = useNavigate();

  if (!domainWarning) return null;

  const getSettingsPath = () => {
    const role = (userData?.role || '').toLowerCase();
    if (role === 'student') return '/student/settings';
    if (role === 'teacher' || role === 'hod' || role === 'faculty') return '/teacher/settings';
    if (role === 'admin') return '/admin/settings';
    return null;
  };

  const settingsPath = getSettingsPath();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40 border-b border-amber-500/30 text-amber-950 dark:text-amber-200"
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8 flex items-center justify-between gap-3 text-xs sm:text-sm font-medium">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="p-1 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <p className="truncate">
              <strong className="font-bold">Email Domain Mismatch:</strong>{' '}
              {domainWarning.message || 'Your login email does not match your college\'s authorized domain. Please align your email in Settings.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {settingsPath && (
              <button
                type="button"
                onClick={() => navigate(settingsPath)}
                className="inline-flex items-center gap-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
              >
                Settings <ArrowRight className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={dismissDomainWarning}
              className="p-1 text-amber-700 hover:text-amber-950 dark:text-amber-400 dark:hover:text-amber-200 rounded-lg hover:bg-amber-500/10 transition-colors"
              title="Dismiss notice"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export default DomainWarningBanner;
