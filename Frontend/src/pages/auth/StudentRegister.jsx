import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
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
  ChevronLeft,
  Home,
  Building2,
  Eye,
  EyeOff
} from 'lucide-react';
import { api } from '../../services/api';

export default function StudentRegister() {
  const { tokenParam, collegeSlug: collegeSlugFromPath } = useParams();
  const [searchParams] = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || tokenParam || '';
  const collegeSlug = collegeSlugFromPath || searchParams.get('college') || '';
  const collegeIdFromUrl = searchParams.get('collegeId') || '';
  const navigate = useNavigate();

  // ── Step management ──────────────────────────────────────────────────────────
  // Step 1: Account Setup   (firstName, lastName, email, password, confirmPassword)
  // Step 2: Student Verify  (optional admissionNumber and phone)
  const [currentStep, setCurrentStep] = useState(1);
  const maxSteps = 2;

  const { register, handleSubmit, watch, trigger, formState: { errors } } = useForm({
    defaultValues: {
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
  const [collegeBySlug, setCollegeBySlug] = useState(null);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registeredData, setRegisteredData] = useState(null);

  const password = watch('password');
  const activeCollege = collegeInfo || collegeBySlug;
  const websiteHost = activeCollege?.website?.trim()
    .replace(/^https?:\/\//i, '')
    .split(/[/?#]/)[0]
    .replace(/^www\./i, '');
  const contactEmailDomain = activeCollege?.contactEmail?.split('@').pop();
  const emailDomain = activeCollege?.emailDomain || websiteHost || contactEmailDomain || 'college.edu';

  useEffect(() => {
    const collegeIdentifier = collegeIdFromUrl || collegeSlug;
    if (!collegeIdentifier) {
      setCollegeBySlug(null);
      return undefined;
    }

    let isCurrent = true;
    const resolveCollege = async () => {
      try {
        const response = await api.get(`/colleges/registration-context/${encodeURIComponent(collegeIdentifier)}`);
        const college = response.data?.data || response.data || response;
        if (isCurrent && college?.id) {
          setCollegeBySlug(college);
        } else if (isCurrent) {
          setError('Invalid registration link. College not found.');
        }
      } catch (err) {
        if (isCurrent) {
          setCollegeBySlug(null);
          setError(err.message || 'Failed to verify registration link.');
        }
      }
    };

    resolveCollege();
    return () => {
      isCurrent = false;
    };
  }, [collegeIdFromUrl, collegeSlug]);

  // Validate the invite token silently from the registration URL.
  useEffect(() => {
    if (tokenFromUrl && tokenFromUrl.trim().length >= 8) {
      validateToken(tokenFromUrl.trim());
    }
  }, [tokenFromUrl]);

  // Clear error when user changes steps
  useEffect(() => {
    setError('');
  }, [currentStep]);

  const validateToken = async (token) => {
    setIsValidatingLink(true);
    setError('');
    console.log(`[StudentRegister] Validating token. Exists: ${!!token}, Length: ${token?.length ?? 0}`);
    try {
      const response = await api.get(`/auth/student/register-info?token=${encodeURIComponent(token)}`);
      const registrationInfo = response.data?.data || response.data || response;
      setCollegeInfo(registrationInfo);
      console.log(`[StudentRegister] Token valid. College: ${registrationInfo?.collegeName ?? 'unknown'}, CollegeId: ${registrationInfo?.collegeId ?? 'unknown'}`);
    } catch (err) {
      setCollegeInfo(null);
      console.error('[StudentRegister] Token validation failed:', err.message);
      setError(err.message || 'Invalid or expired student registration link. Please contact your college administrator.');
    } finally {
      setIsValidatingLink(false);
    }
  };

  // ── Step 1 → Step 2 guard ────────────────────────────────────────────────────
  const handleNext = async () => {
    const step1Fields = ['firstName', 'email', 'password', 'confirmPassword'];
    const valid = await trigger(step1Fields);
    if (valid) {
      setError('');
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setError('');
    setCurrentStep(1);
  };

  // ── Final submit (only reachable from Step 2) ────────────────────────────────
  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');

    try {
      const resolvedToken = tokenFromUrl.trim();
      const resolvedCollegeId = collegeInfo?.collegeId || activeCollege?.id || collegeIdFromUrl;

      if (!resolvedToken && !resolvedCollegeId) {
        setError('Open the registration link provided by your institution to continue.');
        return;
      }

      console.log(`[StudentRegister] Submitting registration.`);
      console.log(`[StudentRegister] Token exists: ${!!resolvedToken}, Length: ${resolvedToken.length}`);
      console.log(`[StudentRegister] CollegeId from validated info: ${collegeInfo?.collegeId ?? 'not validated'}`);
      console.log(`[StudentRegister] Endpoint: POST /auth/student/register`);

      const payload = {
        admissionNumber: data.admissionNumber?.trim() || '',
        email: data.email.trim().toLowerCase(),
        firstName: data.firstName.trim(),
        lastName: data.lastName ? data.lastName.trim() : '',
        password: data.password,
        confirmPassword: data.confirmPassword
      };

      if (resolvedToken) payload.token = resolvedToken;
      if (resolvedCollegeId) payload.collegeId = resolvedCollegeId;

      if (data.phone && data.phone.trim()) {
        payload.phone = data.phone.trim();
      }

      const response = await api.post('/auth/student/register', payload);
      const registrationResult = response.data?.data || response.data || response;
      console.log('[StudentRegister] Registration successful:', { admissionNumber: registrationResult?.admissionNumber, email: registrationResult?.email });
      setRegisteredData(registrationResult || payload);
      setIsSuccess(true);
    } catch (err) {
      console.error('[StudentRegister] Registration error:', err.message, 'Code:', err.code);
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

  // ── Shared input class ───────────────────────────────────────────────────────
  const inputCls = 'block w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all';
  const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020813] flex relative overflow-hidden text-slate-900 dark:text-slate-200 transition-colors duration-300">

      {/* Background Glows */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-emerald-600/20 dark:bg-emerald-600/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute top-[40%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-primary-600/20 dark:bg-primary-600/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen"
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center items-center p-6 my-8">

        {/* Back to Home */}
        <Link
          to="/"
          className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-white transition-colors group"
        >
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
              {currentStep === 1 ? 'Create Your Account' : 'Student Account Setup'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-center max-w-md text-sm">
              {currentStep === 1
                ? 'Set up your login credentials to access the student portal.'
                : 'Complete your student profile for your institution.'}
            </p>
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-2xl backdrop-blur-xl relative">

            {/* ── SUCCESS VIEW ─────────────────────────────────────────────── */}
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
                    Your student profile and portal account are ready. You can now sign in using your registered Email Address.
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
              <>
                {/* ── STEP PROGRESS BAR ───────────────────────────────────── */}
                <div className="mb-8">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Step {currentStep} of {maxSteps}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {currentStep === 1 ? 'Account Setup' : 'Student Verification'}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex gap-1">
                    {Array.from({ length: maxSteps }).map((_, idx) => (
                      <motion.div
                        key={idx}
                        className={`h-full flex-1 rounded-full ${idx + 1 <= currentStep ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-white/10'}`}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.4, delay: idx * 0.1 }}
                      />
                    ))}
                  </div>
                </div>

                {/* ── COLLEGE INFO BADGE (shown once token is valid) ────────── */}
                <AnimatePresence>
                  {activeCollege && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-3"
                    >
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-white/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-sm">
                        {activeCollege.logoUrl ? (
                          <img src={activeCollege.logoUrl} alt="" className="w-5 h-5 object-contain" />
                        ) : (
                          <Building2 className="w-5 h-5" />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold uppercase tracking-wider">Authorized College Environment</p>
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{activeCollege.collegeName || activeCollege.name}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── ERROR BANNER ─────────────────────────────────────────── */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-start gap-3 overflow-hidden text-sm font-medium"
                    >
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ══════════════════════════════════════════════════════════ */}
                {/* STEP 1 — Account Setup: Name, Email, Password              */}
                {/* ══════════════════════════════════════════════════════════ */}
                <AnimatePresence mode="wait">
                  {currentStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-5"
                    >
                      {/* Full Name row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>First Name *</label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                              <User className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500" />
                            </div>
                            <input
                              type="text"
                              {...register('firstName', { required: 'First name is required' })}
                              placeholder="e.g. Alice"
                              className={inputCls}
                            />
                          </div>
                          {errors.firstName && <p className="mt-1 text-xs text-red-500 font-medium">{errors.firstName.message}</p>}
                        </div>
                        <div>
                          <label className={labelCls}>Last Name</label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                              <User className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500" />
                            </div>
                            <input
                              type="text"
                              {...register('lastName')}
                              placeholder="e.g. Johnson"
                              className={inputCls}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className={labelCls}>Official College Email *</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Mail className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500" />
                          </div>
                          <input
                            type="email"
                            {...register('email', {
                              required: 'Email is required',
                              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address' }
                            })}
                            placeholder={`student@${emailDomain}`}
                            className={inputCls}
                          />
                        </div>
                        {errors.email && <p className="mt-1 text-xs text-red-500 font-medium">{errors.email.message}</p>}
                      </div>

                      {/* Password row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className={labelCls}>Create Password *</label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                              <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500" />
                            </div>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              {...register('password', {
                                required: 'Password is required',
                                minLength: { value: 6, message: 'At least 6 characters' }
                              })}
                              placeholder="••••••••"
                              className={`${inputCls} pr-10`}
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
                          <label className={labelCls}>Confirm Password *</label>
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                              <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500" />
                            </div>
                            <input
                              type={showPassword ? 'text' : 'password'}
                              {...register('confirmPassword', {
                                required: 'Please confirm your password',
                                validate: value => value === password || 'Passwords do not match'
                              })}
                              placeholder="••••••••"
                              className={inputCls}
                            />
                          </div>
                          {errors.confirmPassword && <p className="mt-1 text-xs text-red-500 font-medium">{errors.confirmPassword.message}</p>}
                        </div>
                      </div>

                      {/* Continue button */}
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={handleNext}
                          className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2"
                        >
                          Continue <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* ════════════════════════════════════════════════════════ */}
                  {/* STEP 2 — Student Verification: Token + Admission Number */}
                  {/* ════════════════════════════════════════════════════════ */}
                  {currentStep === 2 && (
                    <motion.form
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.25 }}
                      onSubmit={handleSubmit(onSubmit)}
                      className="space-y-5"
                    >
                      {/* Admission Number */}
                      <div>
                        <label className={labelCls}>Admission Number (Optional)</label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <GraduationCap className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500" />
                          </div>
                          <input
                            type="text"
                            {...register('admissionNumber')}
                            placeholder="e.g. ADM2026001"
                            className={inputCls}
                          />
                        </div>
                      </div>

                      {/* Phone (optional) */}
                      <div>
                        <label className={labelCls}>Phone Number <span className="normal-case font-normal text-slate-400">(Optional)</span></label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                            <Phone className="h-4 w-4 text-slate-400 group-focus-within:text-emerald-500" />
                          </div>
                          <input
                            type="tel"
                            {...register('phone')}
                            placeholder="e.g. 9876543210"
                            className={inputCls}
                          />
                        </div>
                      </div>

                      {/* Navigation: Back + Submit */}
                      <div className="pt-2 flex gap-3">
                        <button
                          type="button"
                          onClick={handleBack}
                          className="flex items-center gap-2 px-5 py-4 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-50 dark:hover:bg-white/5 transition-all shrink-0"
                        >
                          <ChevronLeft className="w-4 h-4" /> Back
                        </button>
                        <button
                          type="submit"
                          disabled={isLoading || isValidatingLink}
                          className="flex-1 py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isLoading ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Creating Account...</>
                          ) : (
                            <>Complete Registration <ChevronRight className="w-5 h-5" /></>
                          )}
                        </button>
                      </div>
                    </motion.form>
                  )}
                </AnimatePresence>

                {/* Sign-in link */}
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 text-center text-sm text-slate-500 dark:text-slate-400">
                  Already registered?{' '}
                  <Link to="/login" className="font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300">
                    Sign in to your portal
                  </Link>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
