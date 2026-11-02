import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Building, Shield, Trash2, Camera, Eye, EyeOff, Upload, Loader2 } from 'lucide-react';
import { api } from '../../../services/apiClient';
import toast from 'react-hot-toast';

const LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function Settings() {
  const { userData, updateUserData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState('profile');
  const [logoBase64, setLogoBase64] = useState('');
  const fileInputRef = React.useRef(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [passwordErrors, setPasswordErrors] = useState({});

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      website: '',
      academicYear: '',
      affiliationCode: '',
      aicteNumber: '',
      ugcCode: ''
    }
  });

  const { data: collegeData, isLoading } = useQuery({
    queryKey: ['college', collegeId],
    queryFn: async () => {
      if (collegeId === 'default_college_id') return null;
      const response = await api.get(`/colleges/${collegeId}`);
      return response.data || response;
    },
    enabled: collegeId !== 'default_college_id',
    staleTime: 5 * 60 * 1000
  });

  useEffect(() => {
    if (collegeData) {
      const col = collegeData.data || collegeData;
      reset({
        name: col.name || '',
        contactEmail: col.contactEmail || '',
        contactPhone: col.contactPhone || '',
        address: col.address || '',
        website: col.website || '',
        academicYear: col.academicYear || '',
        affiliationCode: col.affiliationCode || '',
        aicteNumber: col.aicteNumber || '',
        ugcCode: col.ugcCode || ''
      });
      setLogoBase64(col.logoUrl || col.logoBase64 || '');
    }
  }, [collegeData, reset]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data) => {
      const updateData = { ...data, logoUrl: logoBase64 || null };
      const response = await api.put(`/colleges/${collegeId}`, updateData);
      return response?.data || response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['college', collegeId] });
      const collegeObj = data?.data || data;
      if (collegeObj?.name) {
        updateUserData({ collegeName: collegeObj.name, collegeLogo: collegeObj.logoUrl });
      }
      toast.success("College profile updated successfully!");
    },
    onError: (err) => {
      const errorMsg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || "Failed to update profile.";
      toast.error(errorMsg);
    }
  });

  const updateLogoMutation = useMutation({
  mutationFn: async (logo) => {
    const response = await api.put(`/colleges/${collegeId}`, { logoUrl: logo || null });
    return { logo, response: response?.data || response };
  },
  onSuccess: ({ logo }) => {
    queryClient.invalidateQueries({ queryKey: ['college', collegeId] });
    updateUserData({ collegeLogo: logo || null });
    toast.success(logo ? 'Logo updated!' : 'Logo removed.');
  },
  onError: (err) => {
    toast.error(err?.response?.data?.error?.message || err?.message || 'Failed to update logo.');
  }
});

  const changePasswordMutation = useMutation({
    mutationFn: async (payload) => {
      const response = await api.put('/users/change-password', payload);
      return response?.data || response;
    },
    onSuccess: (res) => {
      toast.success(res?.message || 'Password updated successfully.');
      setPasswordData({ current: '', new: '', confirm: '' });
      setPasswordErrors({});
    },
    onError: (err) => {
      const errorMsg = err?.data?.error?.message || err?.response?.data?.error?.message || err?.message || 'Unable to update password. Please try again.';
      toast.error(errorMsg);
    }
  });

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const errs = {};
    if (!passwordData.current) {
      errs.current = 'Current password is required';
    }
    if (!passwordData.new) {
      errs.new = 'New password is required';
    } else if (passwordData.new.length < 6) {
      errs.new = 'Password must be at least 6 characters';
    }
    if (!passwordData.confirm) {
      errs.confirm = 'Confirm password is required';
    } else if (passwordData.new !== passwordData.confirm) {
      errs.confirm = 'New password and confirm password do not match';
    }

    if (Object.keys(errs).length > 0) {
      setPasswordErrors(errs);
      if (errs.confirm && passwordData.new && passwordData.confirm && passwordData.new !== passwordData.confirm) {
        toast.error('New password and confirm password do not match');
      } else if (errs.new && passwordData.new && passwordData.new.length < 6) {
        toast.error('Password must be at least 6 characters');
      } else {
        toast.error('Please fill in all required password fields');
      }
      return;
    }

    setPasswordErrors({});
    changePasswordMutation.mutate({
      currentPassword: passwordData.current,
      newPassword: passwordData.new,
      confirmPassword: passwordData.confirm
    });
  };

  const onProfileSubmit = (data) => {
    updateProfileMutation.mutate(data);
  };

  const handleLogoUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  if (file.size > 2 * 1024 * 1024) {
    toast.error('File size must be less than 2MB');
    e.target.value = '';
    return;
  }

  if (!LOGO_TYPES.includes(file.type)) {
    toast.error('Only JPEG, PNG or WebP images are allowed.');
    e.target.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onloadend = () => {
    setLogoBase64(reader.result);
    updateLogoMutation.mutate(reader.result);
  };
  reader.readAsDataURL(file);
  e.target.value = '';
};

const handleRemoveLogo = () => {
  setLogoBase64('');
  updateLogoMutation.mutate('');
};

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Environment Setup</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Configure your college's environment and settings.</p>
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden flex flex-col md:flex-row">
        {/* Sidebar */}
        <div className="w-full md:w-64 bg-slate-50 dark:bg-white/5 border-b md:border-b-0 md:border-r border-slate-200 dark:border-white/10 p-4">
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeTab === 'profile' ? 'bg-white dark:bg-[#0A0F1C] text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200 dark:border-white/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'}`}
            >
              <Building className="w-5 h-5" /> Institution Profile
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-colors ${activeTab === 'security' ? 'bg-white dark:bg-[#0A0F1C] text-primary-600 dark:text-primary-400 shadow-sm border border-slate-200 dark:border-white/10' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'}`}
            >
              <Shield className="w-5 h-5" /> Security
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 md:p-8">
          {activeTab === 'profile' && (
            <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-8">
              <div className="pb-6 border-b border-slate-200 dark:border-white/10">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary-500" /> College Logo
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Upload your institution's logo. Max size 2 MB (JPEG, PNG, WebP).
                </p>

                <div className="mt-4 flex items-center gap-5">
                  <div className="relative w-24 h-24 rounded-2xl border-2 border-primary-500 bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center overflow-hidden shadow-md">
                    {logoBase64 ? (
                      <img src={logoBase64} alt="College Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Building className="w-8 h-8 text-primary-400" />
                    )}
                    {updateLogoMutation.isPending && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="w-6 h-6 animate-spin text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept={LOGO_TYPES.join(',')}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={updateLogoMutation.isPending}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-xs font-bold text-slate-700 dark:text-slate-200 disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" /> Upload
                    </button>
                    {logoBase64 && (
                      <button
                        type="button"
                        disabled={updateLogoMutation.isPending}
                        onClick={handleRemoveLogo}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-1 md:col-span-2">
                  <Input label="College Name" {...register('name', { required: 'College Name is required' })} error={errors.name?.message} />
                </div>
                <Input label="Contact Email" type="email" {...register('contactEmail')} />
                <Input label="Contact Phone" {...register('contactPhone')} />
                <div className="col-span-1 md:col-span-2">
                  <Input label="Address" {...register('address')} />
                </div>
                <Input label="Website" {...register('website')} placeholder="https://example.edu" />
                <Input label="Current Academic Year" {...register('academicYear')} placeholder="e.g. 2024-2025" />
                <Input label="Affiliation Code" {...register('affiliationCode')} />
                <Input label="AICTE Number" {...register('aicteNumber')} />
                <Input label="UGC Code" {...register('ugcCode')} />
              </div>
              <div className="flex justify-end pt-4">
                <Button type="submit" isLoading={updateProfileMutation.isPending} className="bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg shadow-primary-500/30">
                  Save Environment Settings
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-white/10 pb-4">Change Password</h3>
              <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                <Input
                  label="Current Password"
                  type={showPassword ? "text" : "password"}
                  value={passwordData.current}
                  onChange={(e) => {
                    setPasswordData({ ...passwordData, current: e.target.value });
                    if (passwordErrors.current) setPasswordErrors(prev => ({ ...prev, current: null }));
                  }}
                  error={passwordErrors.current}
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  }
                />
                <Input
                  label="New Password"
                  type={showPassword ? "text" : "password"}
                  value={passwordData.new}
                  onChange={(e) => {
                    setPasswordData({ ...passwordData, new: e.target.value });
                    if (passwordErrors.new) setPasswordErrors(prev => ({ ...prev, new: null }));
                  }}
                  error={passwordErrors.new}
                />
                <Input
                  label="Confirm New Password"
                  type={showPassword ? "text" : "password"}
                  value={passwordData.confirm}
                  onChange={(e) => {
                    setPasswordData({ ...passwordData, confirm: e.target.value });
                    if (passwordErrors.confirm) setPasswordErrors(prev => ({ ...prev, confirm: null }));
                  }}
                  error={passwordErrors.confirm}
                />
                <Button
                  type="submit"
                  isLoading={changePasswordMutation.isPending}
                  className="mt-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl"
                >
                  {changePasswordMutation.isPending ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
