import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ChevronRight, 
  Home,
  Building2,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '../../services/api';

export default function StudentRegister() {
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const navigate = useNavigate();

  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm({
    defaultValues: {
      token: tokenFromUrl,
      admissionNumber: '',
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      password: '',
      confirmPassword: ''
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingLink, setIsValidatingLink] = useState(false);
  const [collegeInfo, setCollegeInfo] = useState(null);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registeredData, setRegisteredData] = useState(null);

  const watchToken = watch('token');
  const password = watch('password');

  // Verify registration token on mount or token change
  useEffect(() => {
    const tokenToValidate = tokenFromUrl || watchToken;
    if (tokenToValidate && tokenToValidate.trim().length >= 8) {
      validateToken(tokenToValidate.trim());
    }
  }, [tokenFromUrl, watchToken]);

  const validateToken = async (token) => {
    setIsValidatingLink(true);
    setError('');
    try {
      const response = await api.get(`/auth/student/register-info?token=${encodeURIComponent(token)}`);
      setCollegeInfo(response.data);
    } catch (err) {
      setCollegeInfo(null);
      setError(err.message || 'Invalid or expired student registration link. Please contact your college administrator.');
    } finally {
      setIsValidatingLink(false);
    }
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');

    try {
      const payload = {
        token: (data.token || tokenFromUrl).trim(),
        admissionNumber: data.admissionNumber.trim(),
        email: data.email.trim().toLowerCase(),
        firstName: data.firstName.trim(),
        lastName: data.lastName ? data.lastName.trim() : '',
        phone: data.phone ? data.phone.trim() : null,
        password: data.password,
        confirmPassword: data.confirmPassword
      };

      const response = await api.post('/auth/student/register', payload);
      setRegisteredData(response.data || payload);
      setIsSuccess(true);
    } catch (err) {
      console.error('Registration error:', err);
      if (err.code === 'ALREADY_REGISTERED' || err.status === 409) {
        setError('This student account is already registered! Please sign in using your Admission Number or Email.');
      } else if (err.code === 'STUDENT_RECORD_NOT_FOUND') {
        setError('No student record found matching this Admission Number in the specified college.');
      } else if (err.code === 'EMAIL_MISMATCH') {
        setError('The provided email does not match our official student records for this admission number.');
      } else if (err.code === 'INVALID_REGISTRATION_TOKEN') {
        setError('The registration link token is invalid or has been deactivated.');
      } else {
        setError(err.message || 'Failed to complete registration. Please check your details and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020813] flex relative overflow-hidden text-slate-900 dark:text-slate-200 transition-colors duration-300">
      
      {/* Background Glows */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-emerald-600/20 dark:bg-emerald-600/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen" 
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[40%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-primary-600/20 dark:bg-primary-600/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen" 
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center items-center p-6 my-8">
        
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
          className="w-full max-w-xl"
        >
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2 text-center">
              Student Account Setup
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-center max-w-md text-sm">
              Activate your official student portal account using your college-issued Admission Number and Email.
            </p>
          </div>

          {/* Registration Card */}
          <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-2xl backdrop-blur-xl relative">
            
            {/* Success View */}
            {isSuccess ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-6"
              >
                <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xl">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Registration Complete!</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
                    Your student portal account has been successfully activated. You can now sign in using your registered Email Address.
                  </p>
                </div>

                <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-left text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Registered Email:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{registeredData?.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Admission No:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{registeredData?.admissionNumber}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/login')}
                  className="w-full py-4 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                >
                  Proceed to Student Login <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            ) : (
              <div>
                {/* College Info Badge */}
                {collegeInfo && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0 shadow-sm">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wider">Authorized College Environment</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{collegeInfo.collegeName}</p>
                    </div>
                  </motion.div>
                )}

                {/* Error Banner */}
                <AnimatePresence>
                  {error && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0, mb: 0 }}
                      animate={{ opacity: 1, height: 'auto', mb: 20 }}
                      exit={{ opacity: 0, height: 0, mb: 0 }}
                      className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-start gap-3 overflow-hidden text-sm font-medium"
                    >
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Token Field (Only shown if missing from URL) */}
                  {!tokenFromUrl && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                        Registration Link Token *
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <KeyRound className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500" />
                        </div>
                        <input
                          type="text"
                          {...register("token", { required: "Registration token is required" })}
                          placeholder="Paste registration token from your college admin link"
                          className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                        />
                      </div>
                      {errors.token && <p className="mt-1 text-xs text-red-500 font-medium">{errors.token.message}</p>}
                    </div>
                  )}

                  {/* Admission Number & Email */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                        Admission Number *
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <GraduationCap className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500" />
                        </div>
                        <input
                          type="text"
                          {...register("admissionNumber", { required: "Admission Number is required" })}
                          placeholder="e.g. ADM2026001"
                          className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                        />
                      </div>
                      {errors.admissionNumber && <p className="mt-1 text-xs text-red-500 font-medium">{errors.admissionNumber.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                        Official Email *
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Mail className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500" />
                        </div>
                        <input
                          type="email"
                          {...register("email", { 
                            required: "Email is required",
                            pattern: {
                              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                              message: "Invalid email address"
                            }
                          })}
                          placeholder="student@college.edu"
                          className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                        />
                      </div>
                      {errors.email && <p className="mt-1 text-xs text-red-500 font-medium">{errors.email.message}</p>}
                    </div>
                  </div>

                  {/* Student Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                        First Name *
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500" />
                        </div>
                        <input
                          type="text"
                          {...register("firstName", { required: "First name is required" })}
                          placeholder="e.g. Alice"
                          className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                        />
                      </div>
                      {errors.firstName && <p className="mt-1 text-xs text-red-500 font-medium">{errors.firstName.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                        Last Name
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <User className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500" />
                        </div>
                        <input
                          type="text"
                          {...register("lastName")}
                          placeholder="e.g. Johnson"
                          className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                      Phone Number (Optional)
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Phone className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500" />
                      </div>
                      <input
                        type="tel"
                        {...register("phone")}
                        placeholder="e.g. 9876543210"
                        className="block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                        Create Password *
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          {...register("password", { 
                            required: "Password is required",
                            minLength: { value: 6, message: "At least 6 characters" }
                          })}
                          placeholder="••••••••"
                          className="block w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {errors.password && <p className="mt-1 text-xs text-red-500 font-medium">{errors.password.message}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                        Confirm Password *
                      </label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                          <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500" />
                        </div>
                        <input
                          type={showPassword ? "text" : "password"}
                          {...register("confirmPassword", { 
                            required: "Please confirm your password",
                            validate: value => value === password || "Passwords do not match"
                          })}
                          placeholder="••••••••"
                          className="block w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500"
                        />
                      </div>
                      {errors.confirmPassword && <p className="mt-1 text-xs text-red-500 font-medium">{errors.confirmPassword.message}</p>}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isLoading || isValidatingLink}
                      className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Activating Student Account...
                        </>
                      ) : (
                        <>
                          Complete Registration <ChevronRight className="w-5 h-5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 text-center text-sm text-slate-500 dark:text-slate-400">
                  Already registered?{' '}
                  <Link to="/login" className="font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">
                    Sign in to your portal
                  </Link>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>

    </div>
  );
}
