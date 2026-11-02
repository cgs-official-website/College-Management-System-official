import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { GraduationCap, Building, Mail, ShieldCheck, User, IdCard, BookOpen } from 'lucide-react';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const errMsg = (e, fb) => e.message || e.response?.data?.error?.message || fb;

export default function StudentSetup() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [info, setInfo] = useState(null);
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });

  useEffect(() => {
    if (!token) {
      setErrorMessage('No setup token found in link. Please use the full setup link sent to you.');
      setIsLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await apiClient.get(`/auth/student-setup/verify?${new URLSearchParams({ token })}`);
        setInfo(res?.data ?? res);
        setIsValidToken(true);
      } catch (e) {
        setErrorMessage(errMsg(e, 'Invalid or expired setup link.'));
      } finally {
        setIsLoading(false);
      }
    })();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password.length < 6) return toast.error('Password must be at least 6 characters.');
    if (formData.password !== formData.confirmPassword) return toast.error('Passwords do not match.');

    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/student-setup', { token, ...formData });
      toast.success('Account setup successful! Redirecting to login...');
      setTimeout(() => {
        const q = info?.collegeSlug ? `?college=${encodeURIComponent(info.collegeSlug)}` : '';
        navigate(`/login${q}`);
      }, 2000);
    } catch (e2) {
      toast.error(errMsg(e2, 'Failed to set up account.'));
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020817]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isValidToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020817] p-4">
        <div className="max-w-md w-full bg-white dark:bg-[#0A0F1C] rounded-3xl p-8 border border-slate-200 dark:border-white/10 text-center shadow-xl">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-500/20 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Invalid or Expired Link</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {errorMessage || 'This setup link is invalid, expired, or already used. Ask your college administrator to resend it.'}
          </p>
          <Button onClick={() => navigate('/login')} className="w-full">Go to Login</Button>
        </div>
      </div>
    );
  }

  const rows = [
    { icon: User, color: 'text-indigo-500', label: 'Name', value: info?.name || 'Student' },
    { icon: Mail, color: 'text-slate-400', label: 'Email', value: info?.email },
    { icon: IdCard, color: 'text-primary-500', label: 'Admission No', value: info?.admissionNumber, mono: true },
    info?.course && { icon: BookOpen, color: 'text-emerald-500', label: 'Course', value: info.course },
    { icon: Building, color: 'text-amber-500', label: 'College', value: info?.collegeName },
  ].filter(Boolean);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020817] p-4">
      <div className="max-w-xl w-full bg-white dark:bg-[#0A0F1C] rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-2xl mb-4">
            <GraduationCap className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Student Account Setup</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Create your password to activate your account.</p>
        </div>

        <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-5 mb-8 border border-slate-200 dark:border-white/10 flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.label} className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <r.icon className={`w-4 h-4 shrink-0 ${r.color}`} />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 w-24 shrink-0">{r.label}</span>
              <span className={`font-medium text-sm ${r.mono ? 'font-mono' : ''}`}>{r.value}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Set Password" type="password" placeholder="••••••••" autoComplete="new-password" required
            value={formData.password} onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))} />
          <Input label="Confirm Password" type="password" placeholder="••••••••" autoComplete="new-password" required
            value={formData.confirmPassword} onChange={(e) => setFormData((p) => ({ ...p, confirmPassword: e.target.value }))} />
          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={isSubmitting}>Complete Setup</Button>
          </div>
        </form>
      </div>
    </div>
  );
}