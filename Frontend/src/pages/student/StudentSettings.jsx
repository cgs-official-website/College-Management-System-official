import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';
import { toast } from 'react-hot-toast';
import { 
  Loader2, 
  Save, 
  User, 
  Mail, 
  Phone, 
  Book, 
  Camera, 
  Trash2, 
  Upload, 
  ShieldCheck,
  AlertCircle,
  Lock
} from 'lucide-react';
import { 
  useStudentProfile, 
  useUploadStudentProfileImage, 
  useDeleteStudentProfileImage 
} from '../../hooks/useStudentPortal';

export const StudentSettings = () => {
  const { userData, user, updateUserData } = useAuth();
  const { data: profileData, refetch: refetchProfile } = useStudentProfile();
  const uploadImageMutation = useUploadStudentProfileImage();
  const deleteImageMutation = useDeleteStudentProfileImage();

  const fileInputRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageError, setImageError] = useState('');
  const [imageTimestamp, setImageTimestamp] = useState(() => Date.now());

  const profile = profileData?.data ?? profileData;
  const initialEmail = (profile?.email || profile?.emailId || user?.email || userData?.email || '').trim().toLowerCase();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    phone: '',
    emergencyContact: '',
    bloodGroup: ''
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const isEmailChanged = Boolean(formData.email && formData.email.trim().toLowerCase() !== initialEmail);

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        email: prev.email || profile.email || profile.emailId || user?.email || userData?.email || '',
        phone: profile.mobile || '',
        emergencyContact: profile.emergencyContact || '',
        bloodGroup: profile.bloodGroup || ''
      }));
    } else if (userData) {
      setFormData(prev => ({
        ...prev,
        firstName: userData.firstName || userData.name || '',
        lastName: userData.lastName || '',
        email: prev.email || userData.email || '',
        phone: userData.phone || '',
        emergencyContact: '',
        bloodGroup: ''
      }));
    }
  }, [profile, userData, user]);

  // Clean up object URL on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (e) => {
    setImageError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate format
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setImageError('Unsupported format. Please select a JPEG, PNG, or WebP photo.');
      toast.error('Unsupported format. Allowed: JPEG, PNG, WebP');
      return;
    }

    // Validate size (max 2 MB)
    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      setImageError('Image size exceeds 2 MB limit. Please select a smaller photo.');
      toast.error('Image exceeds 2 MB limit');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile) return;

    try {
      await uploadImageMutation.mutateAsync(selectedFile);
      toast.success('Profile photo uploaded and updated!');
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setImageTimestamp(Date.now());
      refetchProfile();
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.message || 'Failed to upload photo';
      setImageError(errMsg);
      toast.error(errMsg);
    }
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;

    try {
      await deleteImageMutation.mutateAsync();
      toast.success('Profile photo removed');
      setSelectedFile(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      setImageTimestamp(Date.now());
      refetchProfile();
    } catch (error) {
      toast.error(error.message || 'Failed to remove photo');
    }
  };

  const handleCancelSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setImageError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }

    if (name === 'phone') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, phone: digitsOnly }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    if (isEmailChanged && !formData.currentPassword) {
      setFieldErrors(prev => ({
        ...prev,
        currentPassword: 'Current password is required to change your email.'
      }));
      return;
    }

    if (formData.phone && formData.phone.length !== 10) {
      setFieldErrors(prev => ({
        ...prev,
        phone: 'Mobile Phone Number must be exactly 10 digits.'
      }));
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone
      };

      if (isEmailChanged) {
        payload.email = formData.email.trim();
        payload.currentPassword = formData.currentPassword;
      }

      await api.put('/users/profile', payload);

      updateUserData({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        ...(isEmailChanged ? { email: formData.email.trim().toLowerCase() } : {})
      });

      setFormData(prev => ({ ...prev, currentPassword: '' }));
      toast.success('Profile information updated successfully!');
      refetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      const code = error?.code || error?.response?.data?.error?.code || error?.data?.error?.code;
      const msg = error?.message || error?.response?.data?.error?.message || error?.data?.error?.message || 'Failed to update profile';

      if (code === 'PASSWORD_REQUIRED') {
        setFieldErrors(prev => ({ ...prev, currentPassword: msg || 'Current password is required.' }));
      } else if (code === 'INVALID_PASSWORD') {
        setFieldErrors(prev => ({ ...prev, currentPassword: msg || 'Invalid current password. Please try again.' }));
      } else if (code === 'EMAIL_DOMAIN_NOT_ALLOWED') {
        setFieldErrors(prev => ({ ...prev, email: msg || 'Email domain is not authorized for this college.' }));
      } else if (code === 'EMAIL_IN_USE') {
        setFieldErrors(prev => ({ ...prev, email: msg || 'This email is already in use by another account.' }));
      } else if (code === 'INVALID_PHONE') {
        setFieldErrors(prev => ({ ...prev, phone: msg || 'Mobile Phone Number must be exactly 10 digits.' }));
      } else {
        toast.error('Failed to update profile. ' + msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const authToken = localStorage.getItem('zuna_token');
  const hasPhoto = Boolean(profile?.hasProfileImage);
  const imageUrl = previewUrl || (hasPhoto ? `/api/v1/student/profile/image?t=${imageTimestamp}${authToken ? `&token=${encodeURIComponent(authToken)}` : ''}` : null);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Student Settings & Profile</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your official student avatar, contact details, and preferences.</p>
      </div>

      {/* Profile Photo Card */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <Camera className="w-5 h-5 text-primary-500" />
          Profile Photo
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          Upload a high-resolution portrait photo for your student ID and academic records. Max size 2 MB (JPEG, PNG, WebP).
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar Container */}
          <div className="relative group">
            <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-0.5 shadow-xl overflow-hidden flex items-center justify-center border-2 border-white dark:border-white/10">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt="Student Avatar" 
                  className="w-full h-full object-cover rounded-2xl"
                  onError={() => {
                    // Fallback to initials on load failure
                  }}
                />
              ) : (
                <div className="w-full h-full rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-extrabold text-3xl">
                  {profile?.firstName?.charAt(0) || userData?.firstName?.charAt(0) || 'S'}
                  {profile?.lastName?.charAt(0) || userData?.lastName?.charAt(0) || 'T'}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg transition-transform hover:scale-105"
              title="Change Photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept="image/jpeg,image/png,image/webp" 
            className="hidden" 
          />

          {/* Action Buttons */}
          <div className="flex-1 space-y-3 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-800 dark:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 border border-slate-200 dark:border-white/10"
              >
                <Upload className="w-4 h-4" />
                Select Photo
              </button>

              {selectedFile && (
                <>
                  <button
                    type="button"
                    onClick={handleUploadPhoto}
                    disabled={uploadImageMutation.isPending}
                    className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-500/20 flex items-center gap-2 disabled:opacity-50"
                  >
                    {uploadImageMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" /> Save Photo
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelSelection}
                    className="px-3 py-2.5 text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 font-semibold"
                  >
                    Cancel
                  </button>
                </>
              )}

              {hasPhoto && !selectedFile && (
                <button
                  type="button"
                  onClick={handleDeletePhoto}
                  disabled={deleteImageMutation.isPending}
                  className="px-4 py-2.5 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 border border-rose-200 dark:border-rose-500/20"
                >
                  {deleteImageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Remove Photo
                </button>
              )}
            </div>

            {selectedFile && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB) — Click &quot;Save Photo&quot; to apply.
              </p>
            )}

            {imageError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {imageError}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Personal Information Form */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Personal & Academic Details</h2>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">First Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Last Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Registered Email Address</label>
                {isEmailChanged && (
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Email change requires password
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all ${
                    fieldErrors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-white/10'
                  }`}
                  required
                />
              </div>
              {fieldErrors.email ? (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {fieldErrors.email}
                </p>
              ) : (
                <p className="text-xs text-slate-500 mt-1">Official institution email used for login.</p>
              )}
            </div>

            {isEmailChanged && (
              <div className="col-span-1 md:col-span-2 p-4 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
                    Current Password <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    Confirm your identity to save new email
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword}
                    onChange={handleChange}
                    placeholder="Enter current password"
                    className={`block w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0A0F1C] border rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all ${
                      fieldErrors.currentPassword ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-white/10'
                    }`}
                    required
                  />
                </div>
                {fieldErrors.currentPassword && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {fieldErrors.currentPassword}
                  </p>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Mobile Phone Number</label>
                <span className="text-[11px] text-slate-400 font-medium">10 digits</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  maxLength={10}
                  pattern="[0-9]{10}"
                  placeholder="Enter 10-digit mobile number"
                  className={`block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all ${
                    fieldErrors.phone ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200 dark:border-white/10'
                  }`}
                />
              </div>
              {fieldErrors.phone ? (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {fieldErrors.phone}
                </p>
              ) : formData.phone && formData.phone.length > 0 && formData.phone.length < 10 ? (
                <p className="text-xs text-amber-500 mt-1">Must be exactly 10 digits ({formData.phone.length}/10 entered)</p>
              ) : null}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Department</label>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full">
                  <Lock className="w-3 h-3 text-slate-400" /> Locked
                </span>
              </div>
              <div className="relative cursor-not-allowed">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Book className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={profile?.department || 'Academic Department'}
                  readOnly={true}
                  disabled={true}
                  tabIndex={-1}
                  aria-readonly="true"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed select-none pointer-events-none"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Admission Number</label>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full">
                  <Lock className="w-3 h-3 text-slate-400" /> Locked
                </span>
              </div>
              <div className="relative cursor-not-allowed">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ShieldCheck className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={profile?.admissionNumber || 'ADM-N/A'}
                  readOnly={true}
                  disabled={true}
                  tabIndex={-1}
                  aria-readonly="true"
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed font-mono select-none pointer-events-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-white/10">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Information
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentSettings;
