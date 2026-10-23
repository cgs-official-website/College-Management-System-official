import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Lock, Save, Key, Mail, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

export default function TeacherSettings() {
  const { userData, updateUserData } = useAuth();
  
  const initialEmail = (userData?.email || '').trim().toLowerCase();

  const [formData, setFormData] = useState({
    firstName: userData?.firstName || '',
    lastName: userData?.lastName || '',
    email: userData?.email || '',
    phone: userData?.phone || '',
    designation: userData?.designation || '',
    currentPassword: '',
  });

  const [profileErrors, setProfileErrors] = useState({});

  useEffect(() => {
    if (userData) {
      setFormData(prev => ({
        ...prev,
        firstName: prev.firstName || userData.firstName || '',
        lastName: prev.lastName || userData.lastName || '',
        email: prev.email || userData.email || '',
        phone: prev.phone || userData.phone || '',
        designation: prev.designation || userData.designation || '',
      }));
    }
  }, [userData]);

  const isEmailChanged = Boolean(formData.email && formData.email.trim().toLowerCase() !== initialEmail);

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleFieldChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (profileErrors[field]) {
      setProfileErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileErrors({});

    if (isEmailChanged && !formData.currentPassword) {
      setProfileErrors(prev => ({
        ...prev,
        currentPassword: 'Current password is required to change your email.'
      }));
      return;
    }

    if (formData.phone) {
      const cleanPhone = String(formData.phone).replace(/\D/g, '');
      if (cleanPhone.length !== 10) {
        setProfileErrors(prev => ({
          ...prev,
          phone: 'Mobile phone number must be exactly 10 digits.'
        }));
        return;
      }
    }

    setSavingProfile(true);
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        designation: formData.designation,
      };

      if (isEmailChanged) {
        payload.email = formData.email.trim();
        payload.currentPassword = formData.currentPassword;
      }

      await api.put('/users/profile', payload);
      
      // Sync to Context instantly
      if (updateUserData) {
        updateUserData({
          firstName: formData.firstName,
          lastName: formData.lastName,
          designation: formData.designation,
          phone: formData.phone,
          ...(isEmailChanged ? { email: formData.email.trim().toLowerCase() } : {})
        });
      }
      
      setFormData(prev => ({ ...prev, currentPassword: '' }));
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error(error);
      const code = error?.code || error?.response?.data?.error?.code || error?.data?.error?.code;
      const msg = error?.message || error?.response?.data?.error?.message || error?.data?.error?.message || 'Failed to update profile';

      if (code === 'PASSWORD_REQUIRED') {
        setProfileErrors(prev => ({ ...prev, currentPassword: msg || 'Current password is required.' }));
      } else if (code === 'INVALID_PASSWORD') {
        setProfileErrors(prev => ({ ...prev, currentPassword: msg || 'Invalid current password. Please try again.' }));
      } else if (code === 'EMAIL_DOMAIN_NOT_ALLOWED') {
        setProfileErrors(prev => ({ ...prev, email: msg || 'Email domain is not authorized for this institution.' }));
      } else if (code === 'EMAIL_IN_USE') {
        setProfileErrors(prev => ({ ...prev, email: msg || 'This email address is already in use.' }));
      } else if (code === 'INVALID_PHONE') {
        setProfileErrors(prev => ({ ...prev, phone: msg || 'Mobile phone number must be exactly 10 digits.' }));
      } else {
        toast.error(msg);
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (passwords.newPassword.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }

    setSavingPassword(true);
    try {
      await api.put('/users/profile', {
        newPassword: passwords.newPassword,
        currentPassword: passwords.currentPassword
      });
      toast.success('Password updated successfully');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error(error);
      toast.error('Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Account Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your personal profile and security preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Details Section */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleProfileSave} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-primary-600 dark:text-primary-400">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Personal Information</h2>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Email Address</label>
                  {isEmailChanged && (
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      Email change requires current password
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    className={`w-full bg-slate-50 dark:bg-white/5 border rounded-xl pl-12 pr-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                      profileErrors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-white/10'
                    }`}
                    required
                  />
                </div>
                {profileErrors.email ? (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {profileErrors.email}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-2">Institution email used for login and notifications.</p>
                )}
              </div>

              {isEmailChanged && (
                <div className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                      Current Password <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      Confirm your identity to save new email
                    </span>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input 
                      type="password"
                      value={formData.currentPassword}
                      onChange={(e) => handleFieldChange('currentPassword', e.target.value)}
                      placeholder="Enter current password"
                      className={`w-full bg-white dark:bg-[#0A0F1C] border rounded-xl pl-12 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                        profileErrors.currentPassword ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-white/10'
                      }`}
                      required
                    />
                  </div>
                  {profileErrors.currentPassword && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {profileErrors.currentPassword}
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">First Name</label>
                  <input 
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleFieldChange('firstName', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Last Name</label>
                  <input 
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleFieldChange('lastName', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Phone Number</label>
                  <input 
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    className={`w-full bg-slate-50 dark:bg-white/5 border rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                      profileErrors.phone ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-white/10'
                    }`}
                  />
                  {profileErrors.phone && (
                    <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {profileErrors.phone}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Designation / Department</label>
                  <input 
                    type="text"
                    value={formData.designation}
                    onChange={(e) => handleFieldChange('designation', e.target.value)}
                    placeholder="e.g. Head of Computer Science"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-white/5">
                <button 
                  type="submit"
                  disabled={savingProfile}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 transition-all"
                >
                  {savingProfile ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
                  {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Security Section */}
        <div className="space-y-6">
          <form onSubmit={handlePasswordSave} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <Lock className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Security</h2>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Current Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="password"
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({...passwords, currentPassword: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">New Password</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({...passwords, newPassword: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Confirm Password</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="password"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({...passwords, confirmPassword: e.target.value})}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={savingPassword}
                className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 text-white dark:text-slate-900 rounded-xl font-bold transition-all mt-4"
              >
                {savingPassword ? <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
