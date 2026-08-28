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
import { api } from '../../services/api';



const Register = () => {
  const [searchParams] = useSearchParams();
  const { roleParam, collegeSlug } = useParams();
  const defaultCollegeCode = searchParams.get('code') || '';
  
  const initialRole = roleParam || searchParams.get('role') || 'admin';
  
  const { register, handleSubmit, watch, formState: { errors }, setValue, trigger } = useForm({
    defaultValues: {
      role: initialRole,
      collegeCode: defaultCollegeCode,
      affiliationType: 'AUTONOMOUS',
      aicteCode: '',
      affiliationCode: '',
      pan: '',
      tan: '',
      ugcCode: ''
    }
  });
  
  const [currentStep, setCurrentStep] = useState(1);
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
  const affiliationType = watch('affiliationType');

  useEffect(() => {
    if (affiliationType === 'AUTONOMOUS') {
      setValue('ugcCode', '');
    }
  }, [affiliationType, setValue]);

  const maxSteps = selectedRole === 'admin' ? 3 : 2;

  const handleNext = async () => {
    let fieldsToValidate = [];
    if (currentStep === 1) {
      fieldsToValidate = ['name', 'email', 'password'];
    } else if (currentStep === 2) {
      if (selectedRole === 'admin') {
        fieldsToValidate = ['collegeName'];
      } else if (selectedRole === 'teacher' || selectedRole === 'hod') {
        fieldsToValidate = ['collegeCode', 'teacherId'];
      } else if (selectedRole === 'parent') {
        fieldsToValidate = ['collegeCode', 'studentId'];
      } else {
        fieldsToValidate = ['collegeCode'];
      }
    }
    
    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, maxSteps));
    }
  };

  const handlePrev = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Fetch college if slug is provided
  useEffect(() => {
    const fetchCollegeBySlug = async () => {
      if (!collegeSlug) return;
      
      setFetchingCollege(true);
      try {
        const response = await api.get(`/colleges/slug/${collegeSlug}`);
        const collegeDoc = response.data?.data || response.data;
        
        if (collegeDoc && collegeDoc.id) {
          setFetchedCollegeName(collegeDoc.name);
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
        additionalData.aicteCode = data.aicteCode;
        additionalData.ugcCode = data.ugcCode;
        additionalData.affiliationCode = data.affiliationCode;
        additionalData.affiliationType = data.affiliationType;
        additionalData.pan = data.pan;
        additionalData.tan = data.tan;
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
      const apiErrMsg = err.response?.data?.error?.message || err.response?.data?.message || err.response?.data?.error;
      if (err.code === 'auth/email-already-in-use' || (typeof apiErrMsg === 'string' && apiErrMsg.toLowerCase().includes('already'))) {
        setError('This email is already registered. Please sign in or use another email.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use at least 6 characters.');
      } else if (apiErrMsg) {
        setError(apiErrMsg);
      } else {
        setError(err.message || 'Failed to create account. Please check your network and try again.');
      }
      setIsLoading(false); // Reset loading state on error
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
              {selectedRole === 'admin' 
                ? 'Register College' 
                : fetchedCollegeName ? `Join ${fetchedCollegeName}` : `Join as ${selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}`}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-center max-w-md">
              {selectedRole === 'admin'
                ? 'Create a new college account to get started.'
                : 'Create your account to access your institution\'s portal.'}
            </p>
          </div>

          {/* Form Card */}
          <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-2xl backdrop-blur-xl relative">
            
            {/* Step Progress Indicator */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wider">Step {currentStep} of {maxSteps}</span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {currentStep === 1 ? 'Account Setup' : currentStep === 2 && selectedRole === 'admin' ? 'Basic Info' : currentStep === 2 ? 'Details' : 'Statutory & Affiliation'}
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden flex gap-1">
                {Array.from({ length: maxSteps }).map((_, idx) => (
                  <motion.div
                    key={idx}
                    className={`h-full flex-1 rounded-full ${idx + 1 <= currentStep ? 'bg-primary-500' : 'bg-slate-200 dark:bg-white/10'}`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                  />
                ))}
              </div>
            </div>

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

            <form 
              onSubmit={handleSubmit(onSubmit)} 
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (currentStep < maxSteps) {
                    handleNext();
                  } else {
                    handleSubmit(onSubmit)();
                  }
                }
              }}
              className="space-y-6 overflow-hidden"
            >
              <input type="hidden" {...register("role")} />
              
              <AnimatePresence mode="wait">
                {/* STEP 1: Account Setup */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-5"
                  >
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                        {selectedRole === 'admin' ? 'Admin Full Name' : 'Full Name'} <span className="text-red-500">*</span>
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

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email Address <span className="text-red-500">*</span></label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                        </div>
                        <input
                          type="email"
                          {...register("email", { 
                            required: "Email is required",
                            pattern: { 
                              value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 
                              message: "Please enter a valid email address with a valid domain (e.g. .com, .edu, .in)" 
                            }
                          })}
                          className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all shadow-sm dark:shadow-none"
                          placeholder="address@example.com"
                        />
                      </div>
                      {errors.email && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.email.message}</p>}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Password <span className="text-red-500">*</span></label>
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
                  </motion.div>
                )}

                {/* STEP 2: Basic Info / Details */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-5"
                  >
                    {selectedRole === 'admin' && (
                      <>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">College Name <span className="text-red-500">*</span></label>
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
                      </>
                    )}

                    {selectedRole !== 'admin' && !fetchedCollegeId && (
                      <div className={selectedRole === 'teacher' || selectedRole === 'hod' ? "md:col-span-1" : "md:col-span-2"}>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">College Code <span className="text-red-500">*</span></label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Building2 className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                          </div>
                          <input
                            type="text"
                            {...register("collegeCode", { required: "College Code is required" })}
                            className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 uppercase focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-all"
                            placeholder="Internal College ID"
                          />
                        </div>
                        {errors.collegeCode && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.collegeCode.message}</p>}
                      </div>
                    )}

                    {(selectedRole === 'teacher' || selectedRole === 'hod') && (
                      <div className={fetchedCollegeId ? "md:col-span-2" : "md:col-span-1"}>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                          {selectedRole === 'hod' ? 'HOD ID' : 'Teacher ID'} <span className="text-red-500">*</span>
                        </label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <BadgeCheck className="h-5 w-5 text-slate-400 group-focus-within:text-teal-500 transition-colors" />
                          </div>
                          <input
                            type="text"
                            {...register("teacherId", { required: "ID is required for teachers/HODs" })}
                            className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                            placeholder="ID-8902"
                          />
                        </div>
                        {errors.teacherId && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.teacherId.message}</p>}
                      </div>
                    )}

                    {selectedRole === 'parent' && (
                      <div className={fetchedCollegeId ? "md:col-span-2" : "md:col-span-1"}>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Student ID (Child) <span className="text-red-500">*</span></label>
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
                      </div>
                    )}
                  </motion.div>
                )}

                {/* STEP 3: Statutory & Affiliation (Admin Only) */}
                {currentStep === 3 && selectedRole === 'admin' && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-5"
                  >
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Affiliation Type <span className="text-red-500">*</span></label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" value="AUTONOMOUS" {...register("affiliationType", { required: "Affiliation type is required" })} className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500" />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Autonomous</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="radio" value="UNIVERSITY" {...register("affiliationType", { required: "Affiliation type is required" })} className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500" />
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Affiliated to University</span>
                        </label>
                      </div>
                      {errors.affiliationType && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.affiliationType.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">AICTE Code <span className="text-red-500">*</span></label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <FileText className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                          type="text"
                          {...register("aicteCode", { required: "AICTE Code is required", pattern: { value: /^[A-Za-z0-9]{15,20}$/, message: "Must be 15-20 alphanumeric characters" } })}
                          className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                          placeholder="AICTE Code (15-20 chars)"
                        />
                      </div>
                      {errors.aicteCode && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.aicteCode.message}</p>}
                    </div>

                    {affiliationType === 'UNIVERSITY' && (
                      <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">UGC Code <span className="text-red-500">*</span></label>
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <BadgeCheck className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                          </div>
                          <input
                            type="text"
                            {...register("ugcCode", { required: "UGC Code is required for affiliated universities", pattern: { value: /^[A-Za-z0-9]+$/, message: "Must be alphanumeric" } })}
                            className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                            placeholder="UGC Code"
                          />
                        </div>
                        {errors.ugcCode && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.ugcCode.message}</p>}
                      </div>
                    )}

                    <div className={affiliationType === 'UNIVERSITY' ? "md:col-span-2" : "md:col-span-1"}>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Affiliation Code <span className="text-red-500">*</span></label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Building2 className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                          type="text"
                          {...register("affiliationCode", { required: "Affiliation Code is required", pattern: { value: /^[A-Za-z0-9]{10,15}$/, message: "Must be 10-15 alphanumeric characters" } })}
                          className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                          placeholder="Affiliation Code (10-15 chars)"
                        />
                      </div>
                      {errors.affiliationCode && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.affiliationCode.message}</p>}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">PAN <span className="text-red-500">*</span></label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <FileText className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                          type="text"
                          {...register("pan", { required: "PAN is required", pattern: { value: /^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/, message: "Invalid PAN format (e.g. ABCDE1234F)" } })}
                          className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all uppercase"
                          placeholder="ABCDE1234F"
                          onChange={(e) => setValue('pan', e.target.value.toUpperCase())}
                        />
                      </div>
                      {errors.pan && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.pan.message}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">TAN <span className="text-red-500">*</span></label>
                      <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <FileText className="h-5 w-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        </div>
                        <input
                          type="text"
                          {...register("tan", { required: "TAN is required", pattern: { value: /^[A-Za-z]{4}[0-9]{5}[A-Za-z]{1}$/, message: "Invalid TAN format (e.g. ABCD12345E)" } })}
                          className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all uppercase"
                          placeholder="ABCD12345E"
                          onChange={(e) => setValue('tan', e.target.value.toUpperCase())}
                        />
                      </div>
                      {errors.tan && <p className="mt-1.5 text-xs text-red-500 font-medium">{errors.tan.message}</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Controls */}
              <div className="flex gap-4 pt-6 mt-4 border-t border-slate-100 dark:border-white/5">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="flex-1 py-4 px-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors"
                  >
                    Back
                  </button>
                )}
                
                {currentStep < maxSteps ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-[2] py-4 px-4 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-xl bg-primary-600 hover:bg-primary-700 shadow-primary-500/30"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading || fetchingCollege}
                    className="flex-[2] flex items-center justify-center py-4 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden bg-primary-600 hover:bg-primary-700 shadow-primary-500/30 focus:ring-primary-500"
                  >
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r from-emerald-500 to-primary-600"></div>
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
                )}
              </div>
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
