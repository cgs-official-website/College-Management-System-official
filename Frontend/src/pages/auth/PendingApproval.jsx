import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Clock, Home, Mail, XCircle, RefreshCw, LogOut, Building2, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

export const PendingApproval = () => {
  const { userData, logout, restoreSession } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [collegeInfo, setCollegeInfo] = useState({
    name: userData?.collegeName || 'Your Institution',
    id: userData?.collegeId || '',
    status: userData?.collegeStatus || 'pending'
  });

  const checkStatus = useCallback(async (isManual = false) => {
    if (checking) return;
    setChecking(true);
    try {
      const response = await api.get('/colleges/me/status');
      const data = response.data?.data || response.data;
      if (data?.status) {
        setCollegeInfo(prev => ({
          ...prev,
          name: data.collegeName || prev.name,
          id: data.collegeId || prev.id,
          status: data.status
        }));

        if (data.status === 'active' || data.status === 'trial') {
          toast.success('🎉 College Approved! Redirecting to Dashboard...', { id: 'status-check' });
          await restoreSession();
          navigate('/admin', { replace: true });
          return;
        }

        if (data.status === 'rejected') {
          navigate('/rejected', { replace: true });
          return;
        }

        if (isManual) {
          toast.loading('College is still pending Super Admin review.', { duration: 2500, id: 'status-check' });
        }
      }
    } catch (err) {
      if (isManual) {
        toast.error('Unable to fetch live status. Please check connection.', { id: 'status-check' });
      }
    } finally {
      setChecking(false);
    }
  }, [checking, navigate, restoreSession]);

  // Polling every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      checkStatus(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020813] flex flex-col justify-center items-center p-6 text-slate-900 dark:text-slate-200 relative">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-2xl text-center relative overflow-hidden"
      >
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Clock className="w-10 h-10 animate-pulse" />
        </div>
        
        <h1 className="text-2xl font-extrabold mb-2 text-slate-900 dark:text-white">Waiting for Approval</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm leading-relaxed">
          Your college registration has been submitted and is waiting for Super Admin review. You will automatically receive full access once approved.
        </p>

        {/* Institution Details Badge */}
        <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 mb-6 text-left space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Institution</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
              ● Pending Review
            </span>
          </div>
          <p className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary-500" />
            {collegeInfo.name}
          </p>
          {collegeInfo.id && (
            <p className="text-xs text-slate-400 font-mono">
              ID: {collegeInfo.id}
            </p>
          )}
        </div>
        
        <div className="space-y-3">
          <button 
            onClick={() => checkStatus(true)}
            disabled={checking}
            className="flex items-center justify-center w-full py-3.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-500/30"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking Status...' : 'Check Approval Status'}
          </button>

          <button 
            onClick={handleLogout}
            className="flex items-center justify-center w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 font-bold rounded-xl transition-all text-slate-700 dark:text-slate-300"
          >
            <LogOut className="w-4 h-4 mr-2" /> Log Out
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-center gap-4 text-xs text-slate-400">
          <a href="mailto:support@zuna.com" className="hover:text-primary-500 flex items-center gap-1">
            <Mail className="w-3.5 h-3.5" /> Contact Support
          </a>
          <span>•</span>
          <Link to="/" className="hover:text-primary-500 flex items-center gap-1">
            <Home className="w-3.5 h-3.5" /> Return Home
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export const RejectedApproval = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020813] flex flex-col justify-center items-center p-6 text-slate-900 dark:text-slate-200">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-2xl text-center"
      >
        <div className="w-20 h-20 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <XCircle className="w-10 h-10" />
        </div>
        
        <h1 className="text-2xl font-extrabold mb-3 text-slate-900 dark:text-white">Registration Rejected</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed text-sm">
          Your college registration was rejected by the Super Admin. Please contact support if you believe this was an error.
        </p>
        
        <div className="space-y-4">
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-500/30"
          >
            <LogOut className="w-5 h-5 mr-2" /> Log Out
          </button>
          <a 
            href="mailto:support@zuna.com"
            className="flex items-center justify-center w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 font-bold rounded-xl transition-all"
          >
            <Mail className="w-5 h-5 mr-2" /> Contact Support
          </a>
        </div>
      </motion.div>
    </div>
  );
};
