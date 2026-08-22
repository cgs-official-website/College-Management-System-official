import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Clock, Home, Mail, XCircle } from 'lucide-react';

export const PendingApproval = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020813] flex flex-col justify-center items-center p-6 text-slate-900 dark:text-slate-200">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-2xl text-center"
      >
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10" />
        </div>
        
        <h1 className="text-2xl font-extrabold mb-3 text-slate-900 dark:text-white">Waiting for Approval</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          Your college registration has been submitted successfully and is currently waiting for Superadmin approval. You will gain access to the ERP environment once approved.
        </p>
        
        <div className="space-y-4">
          <Link 
            to="/"
            className="flex items-center justify-center w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-500/30"
          >
            <Home className="w-5 h-5 mr-2" /> Return Home
          </Link>
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

export const RejectedApproval = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020813] flex flex-col justify-center items-center p-6 text-slate-900 dark:text-slate-200">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-2xl text-center"
      >
        <div className="w-20 h-20 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10" />
        </div>
        
        <h1 className="text-2xl font-extrabold mb-3 text-slate-900 dark:text-white">Registration Rejected</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
          Your college registration was rejected by the Superadmin. Please contact support for more details or to appeal the decision.
        </p>
        
        <div className="space-y-4">
          <Link 
            to="/"
            className="flex items-center justify-center w-full py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary-500/30"
          >
            <Home className="w-5 h-5 mr-2" /> Return Home
          </Link>
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
