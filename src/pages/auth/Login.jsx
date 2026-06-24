import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Zap, 
  Mail, 
  Lock, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  Eye,
  EyeOff,
  Home
} from 'lucide-react';

const Login = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, currentUser, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && userRole) {
      navigate('/dashboard');
    }
  }, [currentUser, userRole, navigate]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    
    try {
      await login(data.email, data.password);
      // Redirection is handled by useEffect when AuthContext resolves user role
    } catch (err) {
      console.error("Login Error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else {
        setError('Failed to sign in. Please check your network and try again.');
      }
    }
    // We intentionally don't set isLoading(false) on success to keep the loading state until redirect
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020813] flex relative overflow-hidden text-slate-900 dark:text-slate-200 transition-colors duration-300">
      
      {/* Background Orbs */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-primary-600/20 dark:bg-primary-600/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen" 
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[40%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-emerald-600/20 dark:bg-emerald-600/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen" 
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center items-center p-6">
        
        {/* Back to Home Link */}
        <Link to="/" className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-white transition-colors group">
          <div className="w-8 h-8 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm dark:shadow-none">
            <Home className="w-4 h-4" />
          </div>
          <span className="hidden sm:inline">Back to Home</span>
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 mb-6">
              <img src="/logo.png" alt="Zuna" className="w-full h-full object-contain drop-shadow-2xl" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">Welcome Back</h1>
            <p className="text-slate-500 dark:text-slate-400 text-center">Authenticate to access your Zuna Ecosystem.</p>
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-2xl backdrop-blur-xl relative">
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, mb: 0 }}
                  animate={{ opacity: 1, height: 'auto', mb: 20 }}
                  exit={{ opacity: 0, height: 0, mb: 0 }}
                  className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-start gap-3 overflow-hidden"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email Input */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                  </div>
                  <input
                    type="email"
                    {...register("email", { 
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address"
                      }
                    })}
                    className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all shadow-sm dark:shadow-none"
                    placeholder="admin@college.edu"
                  />
                </div>
                {errors.email && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.email.message}</p>}
              </div>

              {/* Password Input */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Password</label>
                  <a href="#" className="text-xs font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">Forgot password?</a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    {...register("password", { 
                      required: "Password is required",
                      minLength: { value: 6, message: "Password must be at least 6 characters" }
                    })}
                    className="block w-full pl-11 pr-12 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all shadow-sm dark:shadow-none"
                    placeholder="••••••••"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.password.message}</p>}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg shadow-primary-500/30 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-primary-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <span className="relative z-10 flex items-center gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      Secure Login <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>
            
            <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/5 pt-6">
              Need an account?{' '}
              <Link to="/register" className="font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
                Create your environment
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Decorative Right Panel (Optional, hidden on small screens) */}
      <div className="hidden lg:flex w-1/2 bg-slate-100 dark:bg-[#060D1A] border-l border-slate-200 dark:border-white/5 relative items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 dark:opacity-10 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-100 via-transparent to-slate-100 dark:from-[#060D1A] dark:via-transparent dark:to-[#060D1A]"></div>
        
        <div className="relative z-10 max-w-md p-12">
          <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 rounded-xl flex items-center justify-center mb-6">
            <Lock className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-4">Enterprise-Grade Security</h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed">
            Zuna utilizes role-based cryptographic isolation to ensure that student, teacher, and administrative data remains absolutely secure.
          </p>
        </div>
      </div>

    </div>
  );
};

export default Login;
