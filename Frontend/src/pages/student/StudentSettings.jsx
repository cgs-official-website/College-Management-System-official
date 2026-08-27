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
  AlertCircle
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
  const [imageTimestamp, setImageTimestamp] = useState(Date.now());

  const profile = profileData?.data;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    emergencyContact: '',
    bloodGroup: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        phone: profile.mobile || '',
        emergencyContact: profile.emergencyContact || '',
        bloodGroup: profile.bloodGroup || ''
      });
    } else if (userData) {
      setFormData({
        firstName: userData.firstName || userData.name || '',
        lastName: userData.lastName || '',
        phone: userData.phone || '',
        emergencyContact: '',
        bloodGroup: ''
      });
    }
  }, [profile, userData]);

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
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/users/profile', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone
      });

      updateUserData({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone
      });

      toast.success('Profile information updated successfully!');
      refetchProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile. ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const hasPhoto = Boolean(profile?.hasProfileImage);
  const imageUrl = previewUrl || (hasPhoto ? `/api/v1/student/profile/image?t=${imageTimestamp}` : null);

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
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Registered Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={profile?.email || user?.email || ''}
                  disabled
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Official tenant email is locked by administration.</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Mobile Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Department</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Book className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={profile?.department || 'Academic Department'}
                  disabled
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Admission Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <ShieldCheck className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={profile?.admissionNumber || 'ADM-N/A'}
                  disabled
                  className="block w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed font-mono"
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
