import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  GraduationCap, Building2, Mail, ShieldCheck,
  CheckCircle2, User, BadgeCheck, Send, ArrowRight
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
  const [registeredEmail, setRegisteredEmail] = useState('');

  // teacherInfo is populated ONLY from the backend /auth/teacher-register/verify response.
  // Contains institutional info only — NO admin-provided email.
  const [teacherInfo, setTeacherInfo] = useState(null);

  const [fieldErrors, setFieldErrors] = useState({});
  const [formData, setFormData] = useState({
    firstName: '',
    lastName:  '',
    email:     '',
  });

  // Step 1: Validate the registration token via backend
  useEffect(() => {
    if (!token) { setIsLoading(false); return; }
    const verify = async () => {
      try {
        const res  = await apiClient.get(`/auth/teacher-register/verify?token=${encodeURIComponent(token)}`);
        const info = res?.data || res;
        if (!info || !info.collegeName) throw new Error('Incomplete token payload');
        setTeacherInfo(info);
        setIsValidToken(true);
      } catch (err) {
        const status = err.response?.status;
        if (status === 409) {
          // Already registered — show appropriate message
          toast.error('This registration link has already been used. Please check your email for the Setup Link.');
        }
        setIsValidToken(false);
      } finally {
        setIsLoading(false);
      }
    };
    verify();
  }, [token]);

  const validate = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required.';
    if (!formData.email.trim())     errors.email     = 'Email address is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/teacher-register', {
        token,
        firstName: formData.firstName.trim(),
        lastName:  formData.lastName.trim(),
        email:     formData.email.trim().toLowerCase(),
      });
      setRegisteredEmail(formData.email.trim().toLowerCase());
      setIsComplete(true);
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Registration failed. Please try again.';
      toast.error(msg);
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

  // Invalid / expired token
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

  // Registration complete — setup link emailed
  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020813] p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#0A0F1C] rounded-3xl p-8 border border-slate-200 dark:border-white/10 text-center shadow-xl">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Registration Successful!</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-2">
            Your teacher registration at{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{teacherInfo?.collegeName}</span>{' '}
            has been received.
          </p>
          <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-emerald-700 dark:text-emerald-400 mb-1">
              <Send className="w-4 h-4" />
              <span className="text-sm font-bold">Setup Link Sent!</span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              A secure account setup link has been emailed to:<br />
              <span className="font-semibold">{registeredEmail}</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              Please check your inbox (and spam folder) and click the link to create your password and activate your account.
            </p>
          </div>
          <button onClick={() => navigate('/login')}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all flex items-center justify-center gap-2">
            Go to Login <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Main registration form — teacher enters their OWN name and email
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020813] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md">

        {/* College name from backend DB — never hardcoded */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 mb-3">
            <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
              Verified Institution
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight tracking-tight">
            {teacherInfo.collegeName}
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            Authorized teacher registration portal
          </p>
        </div>

        {/* Registration Card */}
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl shadow-xl dark:shadow-2xl overflow-hidden">

          {/* Card Header */}
          <div className="flex flex-col items-center pt-7 pb-5 px-8 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-3">
              <GraduationCap className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Teacher Registration
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center">
              Enter your details to register. A setup link will be sent to your email.
            </p>
          </div>

          {/* Form Fields */}
          <div className="p-8 pt-6">

            {/* Institution banner */}
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] mb-5">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 leading-none mb-0.5">
                  Institution
                </p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                  {teacherInfo.collegeName}
                </p>
              </div>
            </div>

            {/* Teacher ID — from token, read-only */}
            {teacherInfo.teacherId && (
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 mb-5">
                <BadgeCheck className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-violet-400 dark:text-violet-500 leading-none mb-0.5">
                    Your Teacher ID
                  </p>
                  <p className="text-sm font-bold font-mono text-violet-800 dark:text-violet-300">
                    {teacherInfo.teacherId}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Register</span>
                </div>
                <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-white/10 text-slate-400 text-[10px] font-bold flex items-center justify-center">2</span>
                  <span className="text-xs font-semibold text-slate-400">Setup via Email</span>
                </div>
              </div>

              {/* Name fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>First Name <span className="text-red-500 normal-case font-normal">*</span></label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                      <User className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      id="tr-firstname" type="text" placeholder="First name"
                      value={formData.firstName}
                      onChange={e => { setFormData(p => ({ ...p, firstName: e.target.value })); setFieldErrors(p => ({ ...p, firstName: '' })); }}
                      className={'pl-10 ' + inputCls(!!fieldErrors.firstName)}
                    />
                  </div>
                  {fieldErrors.firstName && <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.firstName}</p>}
                </div>
                <div>
                  <label className={labelCls}>Last Name</label>
                  <input
                    id="tr-lastname" type="text" placeholder="Last name"
                    value={formData.lastName}
                    onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))}
                    className={inputCls(false)}
                  />
                </div>
              </div>

              {/* Email — teacher enters their OWN email */}
              <div>
                <label className={labelCls}>Your Email Address <span className="text-red-500 normal-case font-normal">*</span></label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </div>
                  <input
                    id="tr-email" type="email" placeholder="Enter your email address"
                    value={formData.email}
                    onChange={e => { setFormData(p => ({ ...p, email: e.target.value })); setFieldErrors(p => ({ ...p, email: '' })); }}
                    className={'pl-10 ' + inputCls(!!fieldErrors.email)}
                    autoComplete="email"
                  />
                </div>
                {fieldErrors.email
                  ? <p className="mt-1 text-xs text-red-500 font-medium">{fieldErrors.email}</p>
                  : <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">The setup link will be sent to this email address.</p>
                }
              </div>

              {/* Info box */}
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-3 flex gap-2.5">
                <Send className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  After registering, a secure <strong>Account Setup Link</strong> will be automatically emailed to the address you enter above. Use that link to create your password.
                </p>
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <button id="tr-submit" type="submit" disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSubmitting ? (
                    <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Registering...</>
                  ) : (
                    <>Register & Get Setup Link <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-600">
          Registering for <span className="font-semibold text-slate-600 dark:text-slate-400">{teacherInfo.collegeName}</span>
        </p>
      </div>
    </div>
  );
}
