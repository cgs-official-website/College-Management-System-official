import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Briefcase, Building, Mail, ShieldCheck, Lock, User, CheckCircle2 } from 'lucide-react';
import apiClient from '../../services/apiClient';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function StaffSetup() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [staffInfo, setStaffInfo] = useState(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    const verifyToken = async () => {
      try {
        const res = await apiClient.get(`/auth/staff-setup/verify?token=${token}`);
        setStaffInfo(res.data);
        
        // Pre-fill name if it exists
        if (res.data.name) {
          const parts = res.data.name.split(' ');
          setFormData(prev => ({
            ...prev,
            firstName: parts[0] || '',
            lastName: parts.slice(1).join(' ') || ''
          }));
        }

        setIsValidToken(true);
      } catch (error) {
        console.error('Invalid setup token', error);
        toast.error("Invalid or expired setup link.");
        setIsValidToken(false);
      } finally {
        setIsLoading(false);
      }
    };

    verifyToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      return toast.error("Please provide your full name.");
    }
    if (formData.password.length < 6) {
      return toast.error("Password must be at least 6 characters.");
    }
    if (formData.password !== formData.confirmPassword) {
      return toast.error("Passwords do not match.");
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/auth/staff-setup', {
        token,
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password
      });

      toast.success("Account setup successful! Redirecting to login...");
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.error?.message || "Failed to setup account.");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020817]">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Invalid Link</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            The setup link you clicked is either invalid, expired, or your account has already been set up.
          </p>
          <Button onClick={() => navigate('/login')} className="w-full">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020817] p-4">
      <div className="max-w-xl w-full bg-white dark:bg-[#0A0F1C] rounded-3xl p-8 border border-slate-200 dark:border-white/10 shadow-xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 rounded-2xl mb-4">
            <Briefcase className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Staff Setup</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Complete your profile to access your staff dashboard.
          </p>
        </div>

        <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-4 mb-8 border border-slate-200 dark:border-white/10 flex flex-col gap-3">
          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
            <Mail className="w-4 h-4 text-slate-400" />
            <span className="font-medium text-sm">{staffInfo.email}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
            <Building className="w-4 h-4 text-emerald-500" />
            <span className="font-medium text-sm">{staffInfo.department || 'Assigned Department'}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
            <User className="w-4 h-4 text-primary-500" />
            <span className="font-medium text-sm capitalize">{staffInfo.role}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input 
              label="First Name" 
              placeholder="e.g. John"
              value={formData.firstName}
              onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))}
              required
            />
            <Input 
              label="Last Name" 
              placeholder="e.g. Doe"
              value={formData.lastName}
              onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-5">
            <Input 
              label="Set Password" 
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
              required
            />
            <Input 
              label="Confirm Password" 
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={(e) => setFormData(p => ({ ...p, confirmPassword: e.target.value }))}
              required
            />
          </div>

          <div className="pt-4">
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Complete Setup
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
