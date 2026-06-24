import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link, useSearchParams, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Zap, 
  Mail, 
  Lock, 
  ChevronRight, 
  Loader2, 
  AlertCircle,
  Eye,
  EyeOff,
  User,
  Users,
  GraduationCap,
  Briefcase,
  Building2,
  BadgeCheck,
  Home,
  ShieldCheck,
  FileText,
  Upload
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

const Register = () => {
  const [searchParams] = useSearchParams();
  const { collegeSlug } = useParams();
  const defaultCollegeCode = searchParams.get('code') || '';
  
  const preselectedRole = searchParams.get('role');
  
  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm({
    defaultValues: {
      role: preselectedRole && ['student', 'teacher', 'admin', 'parent'].includes(preselectedRole) ? preselectedRole : 'student',
      collegeCode: defaultCollegeCode
    }
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [fetchingCollege, setFetchingCollege] = useState(false);
  const [fetchedCollegeName, setFetchedCollegeName] = useState('');
  const [fetchedCollegeId, setFetchedCollegeId] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [logoBase64, setLogoBase64] = useState('');
  const { register: registerUser, currentUser, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && userRole) {
      navigate('/dashboard');
    }
  }, [currentUser, userRole, navigate]);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoBase64(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const selectedRole = watch('role');

  // Fetch college if slug is provided
  useEffect(() => {
    const fetchCollegeBySlug = async () => {
      if (!collegeSlug) return;
      
      setFetchingCollege(true);
      try {
        const q = query(collection(db, 'colleges'), where('slug', '==', collegeSlug));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const collegeDoc = querySnapshot.docs[0];
          setFetchedCollegeName(collegeDoc.data().name);
          setFetchedCollegeId(collegeDoc.id);
          setValue('collegeCode', collegeDoc.id);
        } else {
          setError('Invalid registration link. College not found.');
        }
      } catch (err) {
        console.error("Error fetching college:", err);
        setError('Failed to verify registration link.');
      } finally {
        setFetchingCollege(false);
      }
    };

    fetchCollegeBySlug();
  }, [collegeSlug, setValue]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    
    try {
      const additionalData = {
        name: data.name,
        role: data.role,
      };

      if (data.role === 'admin') {
        additionalData.collegeName = data.collegeName;
        additionalData.aicteNumber = data.aicteNumber;
        additionalData.ugcRecognition = data.ugcRecognition;
        additionalData.affiliationCode = data.affiliationCode;
        additionalData.logoBase64 = logoBase64;
      } else {
        additionalData.collegeId = fetchedCollegeId || data.collegeCode;
        if (data.role === 'teacher') {
          additionalData.teacherId = data.teacherId;
        }
        if (data.role === 'parent') {
          additionalData.studentId = data.studentId;
        }
      }

      await registerUser(data.email.toLowerCase().trim(), data.password, additionalData);
      // Redirection is handled by useEffect when AuthContext resolves user role
    } catch (err) {
      console.error("Registration Error:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else {
        setError('Failed to create account. Please check your network and try again.');
      }
    }
    // We intentionally don't set isLoading(false) on success to keep the loading state until redirect
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020813] flex relative overflow-x-hidden text-slate-900 dark:text-slate-200 transition-colors duration-300">
      
      {/* Background Orbs */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-primary-600/20 dark:bg-primary-600/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen" 
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[40%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-teal-600/20 dark:bg-teal-600/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen" 
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center items-center p-6 py-12">
        
        {/* Back to Home Link */}
        <Link to="/" className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-white transition-colors group">
          <div className="w-8 h-8 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm dark:shadow-none">
            <Home className="w-4 h-4" />
          </div>
          <span className="hidden sm:inline">Back to Home</span>
        </Link>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl"
        >
          {/* Logo & Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 mb-6">
              <img src="/logo.png" alt="Zuna" className="w-full h-full object-contain drop-shadow-2xl" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-2">
              {fetchedCollegeName ? `Join ${fetchedCollegeName}` : 'Join the Ecosystem'}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
              {fetchedCollegeName 
                ? 'Create your account to access your institution\'s portal.' 
                : 'Register your college or join an existing one to get started.'}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-2xl backdrop-blur-xl relative">
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0, mb: 0 }}
                  animate={{ opacity: 1, height: 'auto', mb: 20 }}
                  exit={{ opacity: 0, height: 0, mb: 0 }}
                  className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-start gap-3 overflow-hidden"
                >
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <span className="text-sm font-medium">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">I am a...</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className={`relative flex items-center justify-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${selectedRole === 'student' ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 shadow-sm' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                    <input type="radio" value="student" {...register("role")} className="sr-only" />
                    <GraduationCap className={`w-5 h-5 ${selectedRole === 'student' ? 'text-primary-500' : 'text-slate-400'}`} />
                    <span className="font-bold text-sm">Student</span>
                    {selectedRole === 'student' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-primary-500"></div>}
                  </label>
                  
                  <label className={`relative flex items-center justify-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${selectedRole === 'teacher' ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-400 shadow-sm' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                    <input type="radio" value="teacher" {...register("role")} className="sr-only" />
                    <Briefcase className={`w-5 h-5 ${selectedRole === 'teacher' ? 'text-teal-500' : 'text-slate-400'}`} />
                    <span className="font-bold text-sm">Teacher</span>
                    {selectedRole === 'teacher' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-teal-500"></div>}
                  </label>

                  <label className={`relative flex items-center justify-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${selectedRole === 'parent' ? 'border-amber-500 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 shadow-sm' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                    <input type="radio" value="parent" {...register("role")} className="sr-only" />
                    <Users className={`w-5 h-5 ${selectedRole === 'parent' ? 'text-amber-500' : 'text-slate-400'}`} />
                    <span className="font-bold text-sm">Parent</span>
                    {selectedRole === 'parent' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500"></div>}
                  </label>

                  {/* Hide Admin option if registering via a specific college link */}
                  {!fetchedCollegeId && (
                    <label className={`relative flex items-center justify-center gap-3 p-4 border rounded-xl cursor-pointer transition-all ${selectedRole === 'admin' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                      <input type="radio" value="admin" {...register("role")} className="sr-only" />
                      <ShieldCheck className={`w-5 h-5 ${selectedRole === 'admin' ? 'text-indigo-500' : 'text-slate-400'}`} />
                      <span className="font-bold text-sm">College Admin</span>
                      {selectedRole === 'admin' && <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500"></div>}
                    </label>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    {selectedRole === 'admin' ? 'Admin Full Name' : 'Full Name'}
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      {...register("name", { required: "Name is required" })}
                      className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                  {errors.name && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.name.message}</p>}
                </div>

                {/* College Admin Fields */}
                {selectedRole === 'admin' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5"
                  >
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">College Name</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Building2 className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                          type="text"
                          {...register("collegeName", { required: "College Name is required for admins" })}
                          className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                          placeholder="ABC Institute of Technology"
                        />
                      </div>
                      {errors.collegeName && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.collegeName.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">AICTE Number</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <FileText className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                          type="text"
                          {...register("aicteNumber")}
                          className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                          placeholder="AICTE-12345"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">UGC Recognition</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <BadgeCheck className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                          type="text"
                          {...register("ugcRecognition")}
                          className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                          placeholder="UGC-890"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Affiliation Code</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Building2 className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                          type="text"
                          {...register("affiliationCode")}
                          className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                          placeholder="Affiliation Code"
                        />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">College Logo</label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Upload className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all cursor-pointer"
                        />
                      </div>
                      {logoBase64 && (
                        <div className="mt-3">
                          <img src={logoBase64} alt="College Logo Preview" className="h-16 rounded-lg object-contain border border-slate-200 dark:border-white/10" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* College Code (Hidden if Admin or if fetched from slug) */}
                {selectedRole !== 'admin' && !fetchedCollegeId && (
                  <div className={selectedRole === 'teacher' ? "md:col-span-1" : "md:col-span-2"}>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">College Code</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Building2 className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                      </div>
                      <input
                        type="text"
                        {...register("collegeCode", { 
                          required: "College Code is required"
                        })}
                        className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 uppercase focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                        placeholder="Internal College ID"
                      />
                    </div>
                    {errors.collegeCode && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.collegeCode.message}</p>}
                  </div>
                )}

                {/* Teacher ID (Conditional) */}
                {selectedRole === 'teacher' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={fetchedCollegeId ? "md:col-span-2" : "md:col-span-1"}
                  >
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Teacher ID</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <BadgeCheck className="h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                      </div>
                      <input
                        type="text"
                        {...register("teacherId", { required: "Teacher ID is required for teachers" })}
                        className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                        placeholder="TCH-8902"
                      />
                    </div>
                    {errors.teacherId && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.teacherId.message}</p>}
                  </motion.div>
                )}

                {/* Parent Student ID */}
                {selectedRole === 'parent' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={fetchedCollegeId ? "md:col-span-2" : "md:col-span-1"}
                  >
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Student ID (Child)</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                      </div>
                      <input
                        type="text"
                        {...register("studentId", { required: "Student ID is required" })}
                        className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                        placeholder="STU-1234"
                      />
                    </div>
                    {errors.studentId && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.studentId.message}</p>}
                  </motion.div>
                )}

                {/* Email Input */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email Address</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                    </div>
                    <input
                      type="email"
                      {...register("email", { 
                        required: "Email is required",
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: "Invalid email address"
                        }
                      })}
                      className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all shadow-sm dark:shadow-none"
                      placeholder="address@example.com"
                    />
                  </div>
                  {errors.email && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.email.message}</p>}
                </div>

                {/* Password Input */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      {...register("password", { 
                        required: "Password is required",
                        minLength: { value: 6, message: "Password must be at least 6 characters" }
                      })}
                      className="block w-full pl-11 pr-12 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all shadow-sm dark:shadow-none"
                      placeholder="••••••••"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.password.message}</p>}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || fetchingCollege}
                className={`w-full flex items-center justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden ${
                  selectedRole === 'teacher' ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-500/30 focus:ring-teal-500' : 
                  selectedRole === 'admin' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30 focus:ring-indigo-500' :
                  'bg-primary-600 hover:bg-primary-700 shadow-primary-500/30 focus:ring-primary-500'
                }`}
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r ${
                  selectedRole === 'teacher' ? 'from-cyan-500 to-teal-600' : 
                  selectedRole === 'admin' ? 'from-blue-500 to-indigo-600' :
                  'from-emerald-500 to-primary-600'
                }`}></div>
                <span className="relative z-10 flex items-center gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                      Creating Identity...
                    </>
                  ) : fetchingCollege ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                      Verifying College...
                    </>
                  ) : (
                    <>
                      {selectedRole === 'admin' ? 'Register College' : 'Register into Zuna'} <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>
            
            <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-white/5 pt-6">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
                Sign in here
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
