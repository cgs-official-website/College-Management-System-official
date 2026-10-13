import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  User, Shield, Lock, Save, Camera, Upload, Trash2, Eye, EyeOff, Loader2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/apiClient';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const TABS = [
  { id: 'personal', label: 'Personal Info', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
];

const inputCls =
  'w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all';

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
      {label}
      {hint && <span className="ml-2 text-[11px] font-normal text-slate-400">{hint}</span>}
    </label>
    {children}
  </div>
);

const LockedField = ({ label, value }) => (
  <div>
    <div className="flex items-center justify-between mb-1.5">
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</label>
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
        <Lock className="w-3 h-3" /> Locked
      </span>
    </div>
    <div className="w-full px-4 py-3 bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed truncate min-h-[46px]">
      {value || '—'}
    </div>
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-4">{children}</h3>
);

export default function StaffSettings() {
  const { userData, updateUserData } = useAuth();
  const [tab, setTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState(null);
  const [locked, setLocked] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef(null);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const load = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await api.get('/staff-profile');
      setForm(res.data.editable);
      setLocked(res.data.locked);
      setPhoto(res.data.profileImage);
    } catch (err) {
      setLoadError(err.message || 'Failed to load your profile.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const digits = (key, len) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value.replace(/\D/g, '').slice(0, len) }));

  const initials = `${(form?.firstName || userData?.name || 'U').charAt(0)}${(form?.lastName || '').charAt(0)}`.toUpperCase();

  const handleSave = async (e) => {
    e.preventDefault();
    if (form.mobileNumber && !/^\d{10}$/.test(form.mobileNumber)) return toast.error('Mobile number must be 10 digits.');
    if (form.emergencyContactNumber && !/^\d{10}$/.test(form.emergencyContactNumber)) return toast.error('Emergency number must be 10 digits.');
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) return toast.error('Pincode must be 6 digits.');
    if (form.aadhaarNumber && !/^\d{12}$/.test(form.aadhaarNumber)) return toast.error('Aadhaar must be 12 digits.');
    if (form.panNumber && !/^[A-Z]{5}\d{4}[A-Z]$/.test(form.panNumber)) return toast.error('PAN must look like ABCDE1234F.');

    setSaving(true);
    try {
      const res = await api.put('/staff-profile', form);
      setForm(res.data.editable);
      const name = `${res.data.editable.firstName} ${res.data.editable.lastName}`.trim();
      updateUserData?.({ name, firstName: res.data.editable.firstName, lastName: res.data.editable.lastName });
      toast.success('Profile updated successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoPick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type)) return toast.error('Only JPEG, PNG or WebP images are allowed.');
    if (file.size > MAX_PHOTO_BYTES) return toast.error('Image must be 2 MB or smaller.');

    const reader = new FileReader();
    reader.onload = async () => {
      setPhotoBusy(true);
      try {
        const res = await api.put('/staff-profile/photo', { image: reader.result });
        setPhoto(res.data.profileImage);
        toast.success('Profile photo updated.');
      } catch (err) {
        toast.error(err.message || 'Failed to upload photo.');
      } finally {
        setPhotoBusy(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoRemove = async () => {
    setPhotoBusy(true);
    try {
      await api.delete('/staff-profile/photo');
      setPhoto(null);
      toast.success('Profile photo removed.');
    } catch (err) {
      toast.error(err.message || 'Failed to remove photo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handlePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword.length < 8) return toast.error('New password must be at least 8 characters.');
    if (pw.newPassword !== pw.confirmPassword) return toast.error('New passwords do not match.');
    setSavingPw(true);
    try {
      await api.put('/staff-profile/password', {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      toast.success('Password updated successfully.');
      setPw({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.message || 'Failed to update password.');
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Profile & Security</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Complete your profile and manage your password.
        </p>
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm overflow-hidden flex flex-col md:flex-row">
        {/* Tabs */}
        <div className="md:w-72 shrink-0 p-4 border-b md:border-b-0 md:border-r border-slate-100 dark:border-white/5 flex md:flex-col gap-2">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-left flex-1 md:flex-none ${
                tab === id
                  ? 'bg-white dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 shadow-sm border border-slate-200 dark:border-primary-500/20'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className={`w-5 h-5 ${tab === id ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400'}`} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-6 sm:p-8">
          {tab === 'personal' && (
            loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>
            ) : loadError ? (
              <div className="text-center py-16">
                <p className="text-sm text-red-500 mb-3">{loadError}</p>
                <button onClick={load} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 text-sm font-semibold">Retry</button>
              </div>
            ) : (
              <motion.form initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSave} className="space-y-8">
                {/* Photo */}
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Camera className="w-5 h-5 text-primary-500" /> Profile Photo
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Upload a clear portrait photo. Max size 2 MB (JPEG, PNG, WebP).
                  </p>
                  <div className="mt-4 flex items-center gap-5">
                    <div className="relative w-24 h-24 rounded-2xl border-2 border-primary-500 bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center overflow-hidden shadow-md">
                      {photo ? (
                        <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl font-extrabold text-primary-700 dark:text-primary-300">{initials}</span>
                      )}
                      {photoBusy && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 animate-spin text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input ref={fileRef} type="file" accept={PHOTO_TYPES.join(',')} className="hidden" onChange={handlePhotoPick} />
                      <button
                        type="button"
                        disabled={photoBusy}
                        onClick={() => fileRef.current?.click()}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50"
                      >
                        <Upload className="w-4 h-4" /> Select Photo
                      </button>
                      {photo && (
                        <button
                          type="button"
                          disabled={photoBusy}
                          onClick={handlePhotoRemove}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Locked */}
                <div>
                  <SectionTitle>Assigned by admin</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <LockedField label="Email ID" value={locked.email} />
                    <LockedField label="Teacher ID" value={locked.teacherId} />
                    <LockedField label="Department" value={locked.department} />
                    <LockedField label="Role" value={locked.role} />
                  </div>
                </div>

                {/* Editable */}
                <div>
                  <SectionTitle>Personal details</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="First Name">
                      <input className={inputCls} value={form.firstName} onChange={set('firstName')} required />
                    </Field>
                    <Field label="Last Name">
                      <input className={inputCls} value={form.lastName} onChange={set('lastName')} />
                    </Field>
                    <Field label="Mobile Number" hint="10 digits">
                      <input className={inputCls} inputMode="numeric" value={form.mobileNumber} onChange={digits('mobileNumber', 10)} placeholder="e.g. 9876543210" />
                    </Field>
                    <Field label="Gender">
                      <select className={inputCls} value={form.gender} onChange={set('gender')}>
                        <option value="">Select</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </Field>
                    <Field label="Date of Birth">
                      <input type="date" className={inputCls} value={form.dateOfBirth} max={new Date().toISOString().slice(0, 10)} onChange={set('dateOfBirth')} />
                    </Field>
                    <Field label="Blood Group">
                      <select className={inputCls} value={form.bloodGroup} onChange={set('bloodGroup')}>
                        <option value="">Select</option>
                        {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </Field>
                    <Field label="Qualification">
                      <input className={inputCls} value={form.qualification} onChange={set('qualification')} placeholder="e.g. M.Sc, B.Ed" />
                    </Field>
                    <Field label="Experience (years)">
                      <input type="number" min="0" max="60" className={inputCls} value={form.experienceYears} onChange={set('experienceYears')} />
                    </Field>
                  </div>
                </div>

                <div>
                  <SectionTitle>Employment details</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Designation">
                      <input className={inputCls} value={form.designation} onChange={set('designation')} placeholder="e.g. Assistant Professor, Librarian" />
                    </Field>
                    <Field label="Joining Date">
                      <input type="date" className={inputCls} value={form.joiningDate} max={new Date().toISOString().slice(0, 10)} onChange={set('joiningDate')} />
                    </Field>
                    <Field label="Employment Type">
                      <input className={inputCls} list="employment-types" value={form.employmentType} onChange={set('employmentType')} placeholder="e.g. Full-time" />
                      <datalist id="employment-types">
                        <option value="Full-time" />
                        <option value="Part-time" />
                        <option value="Contract" />
                        <option value="Visiting" />
                      </datalist>
                    </Field>
                    <Field label="Salary Grade">
                      <input className={inputCls} value={form.salaryGrade} onChange={set('salaryGrade')} placeholder="e.g. Grade A" />
                    </Field>
                  </div>
                </div>

                <div>
                  <SectionTitle>Identity documents</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Aadhaar Number" hint="12 digits">
                      <input className={inputCls} inputMode="numeric" value={form.aadhaarNumber} onChange={digits('aadhaarNumber', 12)} placeholder="e.g. 123456789012" />
                    </Field>
                    <Field label="PAN Number" hint="e.g. ABCDE1234F">
                      <input
                        className={`${inputCls} uppercase`}
                        maxLength={10}
                        value={form.panNumber}
                        onChange={(e) => setForm((f) => ({ ...f, panNumber: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10) }))}
                        placeholder="ABCDE1234F"
                      />
                    </Field>
                  </div>
                </div>

                <div>
                  <SectionTitle>Address</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2">
                      <Field label="Address">
                        <textarea rows={2} className={inputCls} value={form.address} onChange={set('address')} />
                      </Field>
                    </div>
                    <Field label="City"><input className={inputCls} value={form.city} onChange={set('city')} /></Field>
                    <Field label="District"><input className={inputCls} value={form.district} onChange={set('district')} /></Field>
                    <Field label="State"><input className={inputCls} value={form.state} onChange={set('state')} /></Field>
                    <Field label="Pincode" hint="6 digits">
                      <input className={inputCls} inputMode="numeric" value={form.pincode} onChange={digits('pincode', 6)} />
                    </Field>
                  </div>
                </div>

                <div>
                  <SectionTitle>Emergency contact</SectionTitle>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <Field label="Contact Name">
                      <input className={inputCls} value={form.emergencyContactName} onChange={set('emergencyContactName')} />
                    </Field>
                    <Field label="Contact Number" hint="10 digits">
                      <input className={inputCls} inputMode="numeric" value={form.emergencyContactNumber} onChange={digits('emergencyContactNumber', 10)} />
                    </Field>
                  </div>
                </div>

                <div className="flex justify-end pt-5 border-t border-slate-100 dark:border-white/5">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 transition-all"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    {saving ? 'Saving...' : 'Save Information'}
                  </button>
                </div>
              </motion.form>
            )
          )}

          {tab === 'security' && (
            <motion.form initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} onSubmit={handlePassword} className="max-w-md space-y-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white pb-4 border-b border-slate-100 dark:border-white/5">
                Change Password
              </h2>

              <Field label="Current Password">
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    className={`${inputCls} pr-12`}
                    value={pw.currentPassword}
                    onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </Field>

              <Field label="New Password" hint="min 8 characters">
                <input
                  type={showPw ? 'text' : 'password'}
                  className={inputCls}
                  value={pw.newPassword}
                  onChange={(e) => setPw({ ...pw, newPassword: e.target.value })}
                  autoComplete="new-password"
                  required
                />
              </Field>

              <Field label="Confirm New Password">
                <input
                  type={showPw ? 'text' : 'password'}
                  className={inputCls}
                  value={pw.confirmPassword}
                  onChange={(e) => setPw({ ...pw, confirmPassword: e.target.value })}
                  autoComplete="new-password"
                  required
                />
              </Field>

              <button
                type="submit"
                disabled={savingPw}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold shadow-lg disabled:opacity-50 transition-all"
              >
                {savingPw && <Loader2 className="w-4 h-4 animate-spin" />}
                Update Password
              </button>
            </motion.form>
          )}
        </div>
      </div>
    </div>
  );
}
