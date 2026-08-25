import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Copy, 
  Check, 
  RefreshCw, 
  Link as LinkIcon, 
  ShieldCheck, 
  AlertTriangle,
  Loader2,
  ExternalLink,
  Power
} from 'lucide-react';
import { api } from '../../../services/api';
import toast from 'react-hot-toast';

export const StudentRegistrationLinkModal = ({ isOpen, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkData, setLinkData] = useState(null);
  const [error, setError] = useState('');

  const fetchLink = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await api.get('/students/registration-link');
      setLinkData(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load registration link.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLink();
    }
  }, [isOpen]);

  const handleRegenerate = async () => {
    if (!window.confirm('Regenerating this link will immediately invalidate all previously shared registration links. Continue?')) {
      return;
    }

    setIsRegenerating(true);
    try {
      const response = await api.post('/students/registration-link/regenerate');
      setLinkData(response.data);
      toast.success('Registration link regenerated! Previous links are now invalid.');
    } catch (err) {
      toast.error(err.message || 'Failed to regenerate link.');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleToggle = async () => {
    if (!linkData) return;
    const newStatus = !linkData.isActive;

    setIsToggling(true);
    try {
      await api.patch('/students/registration-link/toggle', { isActive: newStatus });
      setLinkData(prev => ({ ...prev, isActive: newStatus }));
      toast.success(`Registration link ${newStatus ? 'enabled' : 'disabled'}.`);
    } catch (err) {
      toast.error(err.message || 'Failed to toggle status.');
    } finally {
      setIsToggling(false);
    }
  };

  const getFullUrl = () => {
    if (!linkData?.path) return `${window.location.origin}/student/register`;
    return `${window.location.origin}${linkData.path}`;
  };

  const handleCopy = () => {
    const url = getFullUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Registration link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">Student Registration Link</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Share this secure link with admitted students</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
              <p className="text-sm">Fetching registration link...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 text-sm">
              {error}
            </div>
          ) : (
            <>
              {/* Status Banner */}
              <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                linkData?.isActive 
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400' 
                  : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400'
              }`}>
                <div className="flex items-center gap-2.5 text-sm font-medium">
                  <ShieldCheck className="w-5 h-5 shrink-0" />
                  <span>
                    Status: <strong>{linkData?.isActive ? 'Active (Accepting Registrations)' : 'Disabled (Registrations Blocked)'}</strong>
                  </span>
                </div>
                <button
                  onClick={handleToggle}
                  disabled={isToggling}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                    linkData?.isActive 
                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 hover:bg-amber-200' 
                      : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {linkData?.isActive ? 'Disable' : 'Enable'}
                </button>
              </div>

              {/* URL Box */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                  Registration URL
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs font-mono text-slate-800 dark:text-slate-200 truncate select-all">
                    {getFullUrl()}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 flex items-center gap-1.5 shrink-0 transition-all"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" /> Copy Link
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Security Details */}
              <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-xs text-slate-600 dark:text-slate-400 space-y-2">
                <p className="font-semibold text-slate-800 dark:text-slate-200">How Student Registration Works:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Only students with pre-created admission records in your college can register.</li>
                  <li>Students must verify their <strong>Admission Number</strong> + <strong>Email</strong> to activate their account.</li>
                  <li>Passwords are encrypted with industry-standard bcrypt hashing.</li>
                </ul>
              </div>

              {/* Regenerate Action */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={isRegenerating}
                  className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                  Regenerate Token (Invalidates Old Links)
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};
