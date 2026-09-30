import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  GraduationCap, Building2, Mail, ShieldCheck,
  Lock, CheckCircle2, Eye, EyeOff, User, BadgeCheck
} from 'lucide-react';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';

export default function TeacherRegister() {
  const [searchParams] = useSearchParams();
  const token    = searchParams.get('token');
  const navigate = useNavigate();

  const [isLoading,    setIsLoading]    = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isComplete,   setIsComplete]   = useState(false);

  // teacherInfo is populated ONLY from the backend /auth/staff-setup/verify response.
  // NEVER from localStorage, URL query params, or any other frontend source.
  // collegeName, collegeSlug, email, teacherId all come from DB via JWT token verification.
  const [teacherInfo,  setTeacherInfo]  = useState(null);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [fieldErrors,  setFieldErrors]  = useState({});

  const [formData, setFormData] = useState({
    fullName:        '',
    password:        '',
    confirmPassword: '',
  });

  // Step 1: Validate the token via backend, get college info from DB
  useEffect(() => {
    if (!token) { setIsLoading(false); return; }
    const verifyToken = async () => {
      try {
        // Hits /auth/staff-setup/verify which:
        //   1. Verifies the JWT token signature & expiry
        //   2. Finds the teacher record in DB (collegeId from token claims)
        //   3. Fetches college name FRESH from DB (teacher.college.name)
        //   4. Returns collegeName — never from frontend/localStorage
        const res  = await apiClient.get(`/auth/staff-setup/verify?token=${encodeURIComponent(token)}`);
        const info = res?.data || res;
        if (!info || !info.collegeName) throw new Error('Incomplete token payload');
        setTeacherInfo(info);
        if (info.name) setFormData(p => ({ ...p, fullName: info.name.trim() }));
        setIsValidToken(true);
        console.log('[TEACHER] Token verified — College:', info.collegeName, '| TeacherID:', info.teacherId);
      } catch (err) {
        console.error('[TEACHER] Token verification failed:', err.response?.status ?? err.message);
        setIsValidToken(false);
      } finally {
        setIsLoading(false);
      }
    };
    verifyToken();
  }, [token]);

  const validate = () => {
    const errors = {};
    if (!formData.fullName.trim())         errors.fullName = 'Full name is required.';
    if (!formData.password)                errors.password = 'Password is required.';
    else if (formData.password.length < 6) errors.password = 'Password must be at least 6 characters.';
    if (!formData.confirmPassword)         errors.confirmPassword = 'Please confirm your password.';
    else if (formData.password !== formData.confirmPassword)
                                           errors.confirmPassword = 'Passwords do not match.';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    const parts     = formData.fullName.trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName  = parts.slice(1).join(' ') || '';
    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/staff-setup', {
        token, firstName, lastName,
        password:        formData.password,
        confirmPassword: formData.confirmPassword,
      });
      setIsComplete(true);
      toast.success('Account created! You can now log in.');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Registration failed. Please try again.');
      setIsSubmitting(false);
    }
  };

  const inputCls = (hasError) =>
    'block w-full px-4 py-3 rounded-xl border text-sm bg-slate-50 dark:bg-white/5 ' +
    'text-slate-900 dark:text-white placeholder-slate-400 ' +
    'focus:outline-none focus:ring-2 transition-all ' +
    (hasError
      ? 'border-red-500 focus:ring-red-400/40'
      : 'border-slate-200 dark:border-white/10 focus:ring-emerald-500/40 focus:border-emerald-500');

  const readonlyCls =
    'block w-full px-4 py-3 rounded-xl border text-sm ' +
    'bg-slate-100 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 ' +
    'text-slate-500 dark:text-slate-400 cursor-not-allowed select-none';

  const labelCls = 'block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wider';

  // Loading state
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020813]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Validating your registration link...</p>
      </div>
    </div>
  );

  // Invalid / expired token — NO college name shown per requirement
  if (!isValidToken) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020813] p-4">
      <div className="max-w-md w-full bg-white dark:bg-[#0A0F1C] rounded-3xl p-8 border border-slate-200 dark:border-white/10 text-center shadow-xl">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-5">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Invalid Registration Link</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6">
          This link is invalid, expired, or has already been used.<br />
          Contact your college administrator for a new link.
        </p>
        <button onClick={() => navigate('/login')}
          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all">
          Go to Login
        </button>
      </div>
    </div>
  );

  // Registration complete
  if (isComplete) {
    const loginPath = teacherInfo?.collegeSlug
      ? `/login?college=${encodeURIComponent(teacherInfo.collegeSlug)}`
      : '/login';
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020813] p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#0A0F1C] rounded-3xl p-8 border border-slate-200 dark:border-white/10 text-center shadow-xl">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Registration Complete!</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-1">
            Your teacher account at{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{teacherInfo?.collegeName}</span>{' '}
            has been created.
          </p>
          <p className="text-sm text-slate-500 mb-6">
            You can now log in using <span className="font-semibold text-slate-700 dark:text-slate-300">{teacherInfo?.email}</span>.
          </p>
          <button onClick={() => navigate(loginPath)}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all">
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Main registration form
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020813] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/*
          ════════════════════════════════════════════════════════════
          [1] COLLEGE / ORGANIZATION NAME
          Source: GET /auth/staff-setup/verify => teacher.college.name (DB)
          NEVER hardcoded. NEVER from localStorage. NEVER from URL.
          Only shown when token is valid — college belongs to the admin
          who generated this teacher registration link.
          ════════════════════════════════════════════════════════════
        */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 mb-3">
            <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
              Verified Institution
            </span>
          </div>
          {/* College / Organization Name — fetched from DB via token, not hardcoded */}
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
            {teacherInfo.collegeName}
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Authorized teacher registration portal
          </p>
        </div>

        {/* Registration Card */}
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl shadow-xl dark:shadow-2xl overflow-hidden">

          {/*
            ── [2] Card Header: "Teacher Registration" title ─────────────
            Sits BELOW the college name (above) and ABOVE the form fields.
          */}
          <div className="flex flex-col items-center pt-7 pb-5 px-8 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-3">
              <GraduationCap className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Teacher Registration
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
              Create your credentials to activate your account.
            </p>
          </div>

          {/* Form Fields */}
          <div className="p-8 pt-6">

            {/* Institution banner inside the card — college name from DB, teacher cannot change it */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] mb-5">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-none mb-0.5">
                  Institution
                </p>
                {/* College name — from backend DB lookup, read-only */}
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {teacherInfo.collegeName}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* [3] Full Name */}
              <div>
                <label className={labelCls}>Full Name <span className="text-red-500 normal-case font-normal">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    id="tr-fullname" type="text" placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={e => { setFormData(p => ({ ...p, fullName: e.target.value })); setFieldErrors(p => ({ ...p, fullName: '' })); }}
                    className={'pl-10 ' + inputCls(!!fieldErrors.fullName)}
                  />
                </div>
                {fieldErrors.fullName && <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.fullName}</p>}
              </div>

              {/* [4] Email — read-only from token (set by admin) */}
              <div>
                <label className={labelCls}>Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </div>
                  <input id="tr-email" type="email" value={teacherInfo.email} readOnly tabIndex={-1} className={'pl-10 ' + readonlyCls} />
                </div>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Set by your administrator — cannot be changed here.</p>
              </div>

              {/* [5] Password */}
              <div>
                <label className={labelCls}>Password <span className="text-red-500 normal-case font-normal">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    id="tr-password" type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password" autoComplete="new-password"
                    value={formData.password}
                    onChange={e => { setFormData(p => ({ ...p, password: e.target.value })); setFieldErrors(p => ({ ...p, password: '' })); }}
                    className={'pl-10 pr-11 ' + inputCls(!!fieldErrors.password)}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowPassword(s => !s)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.password}</p>}
              </div>

              {/* [6] Confirm Password */}
              <div>
                <label className={labelCls}>Confirm Password <span className="text-red-500 normal-case font-normal">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    id="tr-confirm" type={showConfirm ? 'text' : 'password'}
                    placeholder="Re-enter your password" autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={e => { setFormData(p => ({ ...p, confirmPassword: e.target.value })); setFieldErrors(p => ({ ...p, confirmPassword: '' })); }}
                    className={'pl-10 pr-11 ' + inputCls(!!fieldErrors.confirmPassword)}
                  />
                  <button type="button" tabIndex={-1} onClick={() => setShowConfirm(s => !s)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.confirmPassword}</p>}
              </div>

              {/* [7] Teacher ID — read-only from token */}
              <div>
                <label className={labelCls}>Teacher ID</label>
                <input id="tr-teacherid" type="text" value={teacherInfo.teacherId} readOnly tabIndex={-1}
                  className={readonlyCls + ' font-mono tracking-wide'} />
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Assigned by your administrator — cannot be changed here.</p>
              </div>

              {/* [8] Register submit button */}
              <div className="pt-2">
                <button id="tr-submit" type="submit" disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating Account...</>
                  ) : 'Register'}
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* Footer — college name from DB shown one more time */}
        <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-600">
          Registering for <span className="font-semibold text-slate-600 dark:text-slate-400">{teacherInfo.collegeName}</span>
        </p>
      </div>
    </div>
  );
}
