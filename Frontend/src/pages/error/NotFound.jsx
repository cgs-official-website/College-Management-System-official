import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle, ArrowLeft, Home } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020813] text-slate-900 dark:text-slate-200 p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl text-center"
      >
        <div className="w-20 h-20 bg-red-50 dark:bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-10 h-10 text-red-500" />
        </div>
        
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3">
          Oops! We can't find this page
        </h1>
        
        <p className="text-slate-500 dark:text-slate-400 mb-2">
          The link may be wrong or outdated, or this page is not available for your account.
        </p>
        <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
          Please go back or open your dashboard. If this keeps happening, contact your college admin.
        </p>

        <div className="flex flex-col gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back
          </button>
          
          <Link 
            to="/dashboard"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 transition-all"
          >
            <Home className="w-5 h-5" />
            Go to Dashboard
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;