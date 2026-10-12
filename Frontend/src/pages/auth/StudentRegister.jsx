import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  Phone,
  Calendar,
  Users,
  BookOpen,
  Layers,
  MapPin,
  Home,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Building2,
  CheckCircle2,
  IdCard
} from 'lucide-react';
import { api } from '../../services/api';

// ─── Reusable labelled input wrapper ────────────────────────────────────────
function Field({ label, required, error, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && (
        <p className="flex items-center gap-1 text-xs text-red-500">
          <AlertCircle className="w-3 h-3" />{error}
        </p>
      )}
    </div>
  );
}

// ─── Text / email / tel / date input ────────────────────────────────────────
function TextInput({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
      )}
      <input
        {...props}
        className={`block w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all`}
      />
    </div>
  );
}

// ─── Select dropdown ─────────────────────────────────────────────────────────
function SelectInput({ icon: Icon, children, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
      )}
      <select
        {...props}
        className={`block w-full ${Icon ? 'pl-10' : 'pl-4'} pr-4 py-3 bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all appearance-none`}
      >
        {children}
      </select>
    </div>
  );
}

// ─── Password field ──────────────────────────────────────────────────────────
function PasswordInput({ label, required, id, value, onChange, placeholder, error }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} required={required} error={error}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Lock className="w-4 h-4 text-slate-400" />
        </div>
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all"
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </Field>
  );
}

// ─── Section heading ─────────────────────────────────────────────────────────
function SectionHeading({ children }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 pb-2 pt-4">
      {children}
    </h3>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function StudentRegister() {
  const { tokenParam, collegeSlug: slugFromPath } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tokenFromUrl = searchParams.get('token') || tokenParam || '';
  const collegeSlugParam = slugFromPath || searchParams.get('college') || '';

  // ── College name (auto, from token) ────────────────────────────────────────
  const [collegeName, setCollegeName] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [collegeSlug, setCollegeSlug] = useState(collegeSlugParam);
  const [linkError, setLinkError] = useState('');
  const [isValidatingLink, setIsValidatingLink] = useState(false);

  // ── Courses from admin panel ───────────────────────────────────────────────
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

  // ── Form fields ────────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    admissionNumber: '',
    phone: '',
    dob: '',
    gender: '',
    course: '',
    section: '',
    parentName: '',
    parentPhone: '',
    address: '',
    residenceType: 'Day Scholar',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  // ── Validate college link / token on mount ─────────────────────────────────
  useEffect(() => {
    if (!tokenFromUrl && !collegeSlugParam) {
      setLinkError('Invalid registration link. Please use the link provided by your college.');
      return;
    }
    if (!tokenFromUrl) return; // slug-only path — college name shown after submit attempt or from slug

    const validate = async () => {
      setIsValidatingLink(true);
      try {
        const resp = await api.get(`/auth/student/register-info?token=${encodeURIComponent(tokenFromUrl)}`);
        const data = resp.data?.data || resp.data || resp;
        setCollegeName(data.collegeName || '');
        setCollegeId(data.collegeId || '');
        setCollegeSlug(data.collegeSlug || collegeSlugParam);
      } catch (err) {
        const code = err.code || err.response?.data?.error?.code;
        if (code === 'LINK_EXPIRED') {
          setLinkError('This registration link has expired. Please contact your college administrator.');
        } else {
          setLinkError('This registration link is invalid or has been disabled. Please contact your college.');
        }
      } finally {
        setIsValidatingLink(false);
      }
    };
    validate();
  }, [tokenFromUrl, collegeSlugParam]);

  // ── Also resolve college name from slug (for ?college= links) ─────────────
  useEffect(() => {
    if (tokenFromUrl || !collegeSlugParam || collegeName) return;
    const fetch = async () => {
      try {
        const resp = await api.get(`/colleges/registration-context/${encodeURIComponent(collegeSlugParam)}`);
        const data = resp.data?.data || resp.data || resp;
        if (data?.name) {
          setCollegeName(data.name);
          setCollegeId(data.id || '');
        }
      } catch {
        // Silent fail — college name is cosmetic here
      }
    };
    fetch();
  }, [tokenFromUrl, collegeSlugParam, collegeName]);

  // ── Fetch courses from admin panel once college identifier is known ────────
  useEffect(() => {
    const identifier = collegeId || collegeSlug || collegeSlugParam;
    if (!identifier) return;
    const fetchCourses = async () => {
      setCoursesLoading(true);
      try {
        const resp = await api.get(`/colleges/registration-context/${encodeURIComponent(identifier)}/courses`);
        const data = resp.data?.data || resp.data || [];
        setCourses(Array.isArray(data) ? data : []);
      } catch {
        setCourses([]);
      } finally {
        setCoursesLoading(false);
      }
    };
    fetchCourses();
  }, [collegeId, collegeSlug, collegeSlugParam]);

  // ── Form validation ────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Valid email is required';
    if (!form.admissionNumber.trim()) e.admissionNumber = 'Admission ID / Number is required';
    if (!form.dob || !form.dob.trim()) e.dob = 'Date of birth is required';
    if (!form.gender) e.gender = 'Please select your gender';
    if (!form.parentName.trim()) e.parentName = 'Parent/Guardian name is required';
    if (form.phone && !/^\d{10}$/.test(form.phone)) e.phone = 'Phone must be 10 digits';
    if (form.parentPhone && !/^\d{10}$/.test(form.parentPhone)) e.parentPhone = 'Phone must be 10 digits';
    if (!form.password || form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setIsSubmitting(true);

    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        admissionNumber: form.admissionNumber.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || null,
        dob: form.dob || null,
        gender: form.gender || null,
        course: form.course.trim() || null,
        section: form.section.trim() || null,
        parentName: form.parentName.trim() || null,
        parentPhone: form.parentPhone.trim() || null,
        address: form.address.trim() || null,
        residenceType: form.residenceType || 'Day Scholar',
        password: form.password,
        confirmPassword: form.confirmPassword,
      };

      if (tokenFromUrl) payload.token = tokenFromUrl;
      else if (collegeId) payload.collegeId = collegeId;

      await api.post('/auth/student/register', payload);

      const slug = collegeSlug || collegeSlugParam;
      navigate(slug ? `/login?college=${encodeURIComponent(slug)}` : '/login', {
        replace: true,
        state: {
          successMessage:
            'Registration submitted! Your account is pending administrator approval. You will be able to log in once approved.'
        }
      });
    } catch (err) {
      const code = err.code || err.response?.data?.error?.code;
      if (code === 'ALREADY_REGISTERED') {
        setSubmitError('This account has already been registered. Please log in instead.');
      } else if (code === 'EMAIL_MISMATCH') {
        setSubmitError('This email does not match our records for this Admission Number.');
      } else if (code === 'ADMISSION_NUMBER_ALREADY_EXISTS' || code === 'STUDENT_EMAIL_ALREADY_EXISTS') {
        setSubmitError('A student with this Admission Number or Email already exists. Please contact your administrator.');
      } else {
        setSubmitError(err.message || 'Registration failed. Please check your details and try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Render: link error state ───────────────────────────────────────────────
  if (linkError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#020813] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Invalid Registration Link</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">{linkError}</p>
          <Link to="/" className="inline-block mt-2 text-sm font-medium text-primary-600 hover:underline">← Back to Home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020813] flex relative overflow-hidden text-slate-900 dark:text-slate-200 transition-colors duration-300">

      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.4, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-emerald-600/20 dark:bg-emerald-600/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen"
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-[10%] -right-[10%] w-[40vw] h-[40vw] rounded-full bg-primary-600/20 dark:bg-primary-600/10 blur-[100px] mix-blend-multiply dark:mix-blend-screen"
        />
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center items-center p-4 sm:p-6 py-10">

        {/* Back to Home */}
        <Link
          to="/"
          className="absolute top-4 left-4 sm:top-8 sm:left-8 flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-white transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
            <Home className="w-4 h-4" />
          </div>
          <span className="hidden sm:inline">Back to Home</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="w-full max-w-2xl"
        >
          {/* Header */}
          <div className="flex flex-col items-center mb-7">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400 shadow-lg shadow-emerald-500/10">
              {isValidatingLink
                ? <Loader2 className="w-7 h-7 animate-spin" />
                : <GraduationCap className="w-8 h-8" />
              }
            </div>

            {/* College name badge */}
            {collegeName && (
              <div className="flex items-center gap-2 px-3 py-1.5 mb-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-full text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <Building2 className="w-3.5 h-3.5" />
                {collegeName}
              </div>
            )}

            <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center">
              Student Account Setup
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 text-center">
              Fill in your details to create your student account.
            </p>
          </div>

          {/* Form card */}
          <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-slate-200 dark:border-white/10 shadow-xl dark:shadow-none p-6 sm:p-8 space-y-6">
            <form onSubmit={handleSubmit} noValidate>

              {/* ── PERSONAL INFORMATION ─────────────────────────────────── */}
              <SectionHeading>Personal Information</SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">

                <Field label="First Name" required error={errors.firstName}>
                  <TextInput icon={User} type="text" placeholder="e.g. Ravi" value={form.firstName} onChange={set('firstName')} />
                </Field>

                <Field label="Last Name" error={errors.lastName}>
                  <TextInput icon={User} type="text" placeholder="e.g. Kumar" value={form.lastName} onChange={set('lastName')} />
                </Field>

                <Field label="Email Address" required error={errors.email}>
                  <TextInput icon={Mail} type="email" placeholder="student@college.edu" value={form.email} onChange={set('email')} />
                </Field>

                <Field label="Admission ID / Number" required error={errors.admissionNumber}>
                  <TextInput icon={IdCard} type="text" placeholder="e.g. ADM2024001" value={form.admissionNumber} onChange={set('admissionNumber')} />
                </Field>

                <Field label="Phone Number" error={errors.phone}>
                  <TextInput
                    icon={Phone}
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  />
                </Field>

                <Field label="Date of Birth" required error={errors.dob}>
                  <TextInput icon={Calendar} type="date" value={form.dob} onChange={set('dob')} />
                </Field>

                <Field label="Gender" required error={errors.gender}>
                  <SelectInput icon={Users} value={form.gender} onChange={set('gender')}>
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </SelectInput>
                </Field>

              </div>

              {/* ── ACADEMIC INFORMATION ──────────────────────────────────── */}
              <SectionHeading>Academic Information</SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">

                <Field label="Class / Course" error={errors.course}>
                  {coursesLoading ? (
                    <div className="flex items-center gap-2 pl-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading courses...
                    </div>
                  ) : courses.length > 0 ? (
                    <SelectInput icon={BookOpen} value={form.course} onChange={set('course')}>
                      <option value="">Select Course</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.name}>{c.name}{c.code ? ` (${c.code})` : ''}</option>
                      ))}
                    </SelectInput>
                  ) : (
                    <TextInput icon={BookOpen} type="text" placeholder="e.g. B.Tech Computer Science" value={form.course} onChange={set('course')} />
                  )}
                </Field>

                <Field label="Section" error={errors.section}>
                  <TextInput icon={Layers} type="text" placeholder="e.g. Year 1 / Section A" value={form.section} onChange={set('section')} />
                </Field>

              </div>

              {/* ── PARENT / GUARDIAN INFORMATION ───────────────────────── */}
              <SectionHeading>Parent / Guardian Information</SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">

                <Field label="Parent/Guardian Name" required error={errors.parentName}>
                  <TextInput icon={User} type="text" placeholder="e.g. Suresh Kumar" value={form.parentName} onChange={set('parentName')} />
                </Field>

                <Field label="Parent Phone" error={errors.parentPhone}>
                  <TextInput
                    icon={Phone}
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={form.parentPhone}
                    onChange={e => setForm(f => ({ ...f, parentPhone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Home Address" error={errors.address}>
                    <TextInput icon={MapPin} type="text" placeholder="Street, City, State" value={form.address} onChange={set('address')} />
                  </Field>
                </div>

                <div className="sm:col-span-2 sm:max-w-xs">
                  <Field label="Residence Type" error={errors.residenceType}>
                    <SelectInput icon={Home} value={form.residenceType} onChange={set('residenceType')}>
                      <option value="Day Scholar">Day Scholar</option>
                      <option value="Hosteller">Hosteller</option>
                    </SelectInput>
                  </Field>
                </div>

              </div>

              {/* ── ACCOUNT SETUP ─────────────────────────────────────────── */}
              <SectionHeading>Account Setup</SectionHeading>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <PasswordInput
                  label="Password"
                  required
                  id="password"
                  value={form.password}
                  onChange={set('password')}
                  placeholder="Min. 6 characters"
                  error={errors.password}
                />
                <PasswordInput
                  label="Confirm Password"
                  required
                  id="confirmPassword"
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  placeholder="Re-enter your password"
                  error={errors.confirmPassword}
                />
              </div>

              {/* Submit error */}
              {submitError && (
                <div className="flex items-start gap-2.5 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-sm text-red-700 dark:text-red-400 mt-4">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={isSubmitting || isValidatingLink}
                className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-xl transition-colors text-sm shadow-lg shadow-emerald-600/20"
              >
                {isSubmitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Registering...</>
                  : <><CheckCircle2 className="w-4 h-4" /> Register</>
                }
              </button>

              <p className="text-xs text-center text-slate-400 dark:text-slate-500 mt-3">
                After registration your account will be <strong className="text-slate-600 dark:text-slate-300">pending approval</strong>. You can log in once your college admin activates your account.
              </p>

              <p className="text-sm text-center text-slate-500 dark:text-slate-400 mt-3">
                Already registered?{' '}
                <a
                  href={
                    (collegeSlug || collegeSlugParam)
                      ? `/login?college=${encodeURIComponent(collegeSlug || collegeSlugParam)}`
                      : '/login'
                  }
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Sign in
                </a>
              </p>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
