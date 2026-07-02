import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../contexts/AuthContext';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Building, Shield, User, Camera, Eye, EyeOff } from 'lucide-react';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { auth } from '../../../firebase/config';
import toast from 'react-hot-toast';

export default function Settings() {
  const { userData, updateUserData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  
  const [activeTab, setActiveTab] = useState('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [logoBase64, setLogoBase64] = useState('');
  const fileInputRef = React.useRef(null);
  
  const [showPassword, setShowPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: {
      collegeName: '',
      contactEmail: '',
      contactPhone: '',
      address: '',
      website: ''
    }
  });

  useEffect(() => {
    const fetchCollegeData = async () => {
      try {
        const docRef = doc(db, 'colleges', collegeId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          reset({
            collegeName: data.collegeName || data.name || '',
            contactEmail: data.contactEmail || '',
            contactPhone: data.contactPhone || '',
            address: data.address || '',
            website: data.website || ''
          });
          if (data.logoBase64) {
            setLogoBase64(data.logoBase64);
          }
        }
      } catch (error) {
        console.error("Error fetching college data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (collegeId !== 'default_college_id') {
      fetchCollegeData();
    } else {
      setIsLoading(false);
    }
  }, [collegeId, reset]);

  const onProfileSubmit = async (data) => {
    setIsSaving(true);
    try {
      const docRef = doc(db, 'colleges', collegeId);
      const updateData = { ...data, name: data.collegeName, logoBase64 };
      await updateDoc(docRef, updateData);
      
      updateUserData({ collegeName: data.collegeName, collegeLogo: logoBase64 });
      toast.success("College profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.new !== passwordData.confirm) {
      toast.error("New passwords do not match.");
      return;
    }
    if (passwordData.new.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }
    setIsChangingPassword(true);
    try {
      const user = auth.currentUser;
      if (user && user.email) {
        const credential = EmailAuthProvider.credential(user.email, passwordData.current);
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, passwordData.new);
        toast.success("Password updated successfully!");
        setPasswordData({ current: '', new: '', confirm: '' });
      } else {
        toast.error("User not found.");
      }
    } catch (error) {
      console.error("Error updating password:", error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        toast.error("Incorrect current password.");
      } else {
        toast.error("Failed to update password.");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage college profile and system preferences.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Nav */}
        <div className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-2 shadow-sm space-y-1">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
            >
              <Building className="w-5 h-5" /> College Profile
            </button>
            <button 
              onClick={() => setActiveTab('security')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'security' ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'}`}
            >
              <Shield className="w-5 h-5" /> Account & Security
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1">
          {activeTab === 'profile' && (
            <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Building className="w-5 h-5 text-primary-500" /> General Information
              </h2>

              {isLoading ? (
                <div className="animate-pulse space-y-6">
                  <div className="h-12 bg-slate-100 dark:bg-white/5 rounded-xl w-full"></div>
                  <div className="h-12 bg-slate-100 dark:bg-white/5 rounded-xl w-full"></div>
                  <div className="h-12 bg-slate-100 dark:bg-white/5 rounded-xl w-full"></div>
                </div>
              ) : (
                <form onSubmit={handleSubmit(onProfileSubmit)} className="space-y-6">
                  <div className="flex items-center gap-6 mb-8">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*" 
                      onChange={handleLogoUpload} 
                    />
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className="w-24 h-24 rounded-full bg-slate-100 dark:bg-white/5 border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400 relative group cursor-pointer overflow-hidden shrink-0"
                    >
                      {logoBase64 || userData?.collegeLogo ? (
                        <img src={logoBase64 || userData?.collegeLogo} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera className="w-6 h-6 mb-1 group-hover:scale-110 transition-transform" />
                          <span className="text-[10px] uppercase font-bold tracking-wider">Upload</span>
                        </>
                      )}
                      <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white text-xs font-bold transition-all">
                        Change
                      </div>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">College Logo</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">Recommended size: 256x256px. Max file size: 2MB.</p>
                      <Button 
                        type="button" 
                        variant="secondary" 
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-3 text-xs py-1.5 px-3"
                      >
                        Update Logo
                      </Button>
                    </div>
                  </div>

                  <Input 
                    label="College / Institution Name" 
                    {...register('collegeName', { required: "College name is required" })}
                    error={errors.collegeName?.message}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input 
                      label="Contact Email" 
                      type="email"
                      {...register('contactEmail')}
                    />
                    <Input 
                      label="Contact Phone" 
                      {...register('contactPhone')}
                    />
                  </div>

                  <Input 
                    label="Physical Address" 
                    {...register('address')}
                  />

                  <Input 
                    label="Website URL" 
                    {...register('website')}
                  />

                  <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-white/5">
                    <Button type="submit" isLoading={isSaving}>
                      Save Changes
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary-500" /> Account Security
              </h2>

              <div className="space-y-6">
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                    {userData?.name?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{userData?.name || 'Administrator'}</h3>
                    <p className="text-xs text-slate-500">{userData?.email || 'admin@college.edu'}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-400 text-[10px] font-bold uppercase rounded">
                      {userData?.role || 'Admin'}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4">Change Password</h3>
                  <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
                    <Input 
                      label="Current Password" 
                      type={showPassword ? "text" : "password"} 
                      value={passwordData.current}
                      onChange={(e) => setPasswordData({...passwordData, current: e.target.value})}
                      required
                      rightElement={
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-600 transition-colors">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                    <Input 
                      label="New Password" 
                      type={showPassword ? "text" : "password"} 
                      value={passwordData.new}
                      onChange={(e) => setPasswordData({...passwordData, new: e.target.value})}
                      required
                      rightElement={
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-600 transition-colors">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                    <Input 
                      label="Confirm New Password" 
                      type={showPassword ? "text" : "password"} 
                      value={passwordData.confirm}
                      onChange={(e) => setPasswordData({...passwordData, confirm: e.target.value})}
                      required
                      rightElement={
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-600 transition-colors">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      }
                    />
                    <Button type="submit" isLoading={isChangingPassword}>Update Password</Button>
                  </form>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
