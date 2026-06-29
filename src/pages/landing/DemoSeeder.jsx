import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Database, CheckCircle2, Loader2, AlertCircle, Home } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { seedDemoData } from '../../utils/demoDataSeeder';

const DemoSeeder = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSeedData = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      await seedDemoData((progressMsg) => {
        setStatus(progressMsg);
      });
      setSuccess(true);
      setStatus('All data seeded successfully!');
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred during seeding.');
      // Keep loading false on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020813] flex relative overflow-x-hidden text-slate-900 dark:text-slate-200 transition-colors duration-300">
      <Link to="/" className="absolute top-8 left-8 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary-600 transition-colors z-20">
        <Home className="w-5 h-5" /> Back to Home
      </Link>

      <div className="relative z-10 flex-1 flex flex-col justify-center items-center p-6 py-12">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center mb-6">
              <Database className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight mb-2 text-center">Demo Data Seeder</h1>
            <p className="text-slate-500 dark:text-slate-400 text-center text-sm">
              Generate dummy data for "Government College Of Engineering Erode" across all panels (Admin, Teachers, Students, Parents).
            </p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">Seeding Failed</p>
                <p className="mt-1">{error}</p>
                <p className="mt-2 text-xs opacity-80">Note: Ensure your Firestore rules temporarily allow writes, or you are logged in as a SuperAdmin.</p>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold">Success!</p>
                <p className="mt-1">The demo data has been injected.</p>
                <div className="mt-3 bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-emerald-200/50 dark:border-emerald-500/20">
                  <p className="font-semibold text-xs mb-1">Admin Credentials:</p>
                  <code className="text-xs">admin@gcee.edu.in / demo123</code>
                  
                  <p className="font-semibold text-xs mt-2 mb-1">Teacher Credentials:</p>
                  <code className="text-xs">teacher.cse@gcee.edu.in / demo123</code>
                  
                  <p className="font-semibold text-xs mt-2 mb-1">Student Credentials:</p>
                  <code className="text-xs">student1.cse@gcee.edu.in / demo123</code>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <button
              onClick={handleSeedData}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg shadow-primary-500/30 font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
              {loading ? 'Seeding Database...' : 'Inject Demo Data'}
            </button>

            {loading && status && (
              <div className="text-center text-sm font-medium text-slate-500 dark:text-slate-400 animate-pulse">
                {status}
              </div>
            )}
            
            {success && (
              <button
                onClick={() => navigate('/login')}
                className="w-full py-4 text-sm font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors"
              >
                Go to Login
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DemoSeeder;
