import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap,
  BookOpen,
  Calendar,
  FileText,
  Settings as SettingsIcon, 
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  Zap,
  Building,
  CheckCircle2,
  UserPlus,
  User,
  Clock,
  ClipboardList,
  Wallet,
  Library as LibraryIcon,
  Megaphone,
  RefreshCw,
  Target,
  MonitorPlay,
  Home,
  Bus,
  Calculator,
  Briefcase,
  Smartphone,
  MessageSquareWarning
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import PlaceholderModule from '../../components/ui/PlaceholderModule';
import StudentList from './students/StudentList';
import Admission from './admission/Admission';
import HRManagement from './hr/HRManagement';
import CoursesList from './courses/CoursesList';
import Attendance from './attendance/Attendance';
import Exams from './exams/Exams';
import Fees from './fees/Fees';
import Library from './library/Library';
import Infrastructure from './infrastructure/Infrastructure';
import NoticeBoard from './notices/NoticeBoard';
import Timetable from './timetable/Timetable';
import Reports from './reports/Reports';
import Settings from './settings/Settings';
import MarketingDashboard from './marketing/MarketingDashboard';
import LMSDashboard from './lms/LMSDashboard';
import HostelDashboard from './hostel/HostelDashboard';
import TransportDashboard from './transport/TransportDashboard';
import PlacementsDashboard from './placements/PlacementsDashboard';
import ComplaintsDashboard from './complaints/ComplaintsDashboard';
import MobileAppsDashboard from './apps/MobileAppsDashboard';
import { SearchBar } from '../../components/ui/SearchBar';
import { NotificationDropdown } from '../../components/ui/NotificationDropdown';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, userData } = useAuth();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Admission', path: '/admin/admission', icon: UserPlus },
    { name: 'Marketing', path: '/admin/marketing', icon: Target },
    { name: 'Students', path: '/admin/students', icon: GraduationCap },
    { name: 'HR & Staff', path: '/admin/hr', icon: Users },
    { name: 'Classes', path: '/admin/courses', icon: BookOpen },
    { name: 'Timetable', path: '/admin/timetable', icon: Calendar },
    { name: 'Attendance', path: '/admin/attendance', icon: Clock },
    { name: 'Exams', path: '/admin/exams', icon: ClipboardList },
    { name: 'LMS', path: '/admin/lms', icon: MonitorPlay },
    { name: 'Fees & Finance', path: '/admin/fees', icon: Calculator },
    { name: 'Library', path: '/admin/library', icon: LibraryIcon },
    { name: 'Hostel', path: '/admin/hostel', icon: Home },
    { name: 'Transport', path: '/admin/transport', icon: Bus },
    { name: 'Infrastructure', path: '/admin/infrastructure', icon: Building },
    { name: 'Notice Board', path: '/admin/notices', icon: Megaphone },
    { name: 'Placements', path: '/admin/placements', icon: Briefcase },
    { name: 'Complaints', path: '/admin/complaints', icon: MessageSquareWarning },
    { name: 'Reports', path: '/admin/reports', icon: FileText },
    { name: 'Mobile Apps', path: '/admin/apps', icon: Smartphone },
    { name: 'Settings', path: '/admin/settings', icon: SettingsIcon },
  ];

  if (userData?.accountStatus === 'pending') {
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-[#020813] text-slate-900 dark:text-slate-200 overflow-hidden font-sans flex-col items-center justify-center p-6">
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <Building className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Application Pending</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            Your college registration is currently pending approval by a Superadmin. You will gain access to the dashboard once your application is approved.
          </p>
          <button 
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#020813] text-slate-900 dark:text-slate-200 overflow-hidden font-sans transition-colors duration-300">
      
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -250 }}
        animate={{ x: sidebarOpen || isDesktop ? 0 : -280 }}
        transition={{ type: 'spring', damping: 20 }}
        className="fixed lg:static inset-y-0 left-0 z-50 w-[280px] bg-white dark:bg-[#0A0F1C] border-r border-slate-200 dark:border-white/10 flex flex-col shadow-2xl lg:shadow-none"
      >
        <div className="h-16 flex items-center px-6 relative overflow-hidden mt-2">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-lg relative z-10 p-0.5 border border-slate-100 dark:border-white/10">
            <img src="/logo.png" alt="Zuna" className="w-full h-full object-contain" />
          </div>
          <span className="ml-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Zuna
          </span>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-4 py-2 mt-2">
          <div className="bg-slate-50 dark:bg-white/5 rounded-2xl p-3 flex items-center gap-3 border border-slate-100 dark:border-white/10 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#0A0F1C] flex items-center justify-center shadow-sm p-1 border border-slate-100 dark:border-white/10">
               {userData?.collegeLogo ? <img src={userData.collegeLogo} alt="Logo" className="w-full h-full object-contain rounded-lg"/> : <Building className="w-5 h-5 text-slate-400" />}
            </div>
            <div className="flex-1 overflow-hidden">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={userData?.collegeName || 'College Name'}>{userData?.collegeName || 'College Name'}</h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">ADMIN PANEL</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path || (link.path !== '/admin' && location.pathname.startsWith(link.path));
            const Icon = link.icon;
            
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative ${
                  isActive 
                    ? 'text-primary-700 dark:text-white font-bold' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeAdminTab" 
                    className="absolute inset-0 bg-primary-50 dark:bg-primary-500/10 rounded-xl border border-primary-100 dark:border-primary-500/20" 
                    initial={false}
                  />
                )}
                <Icon className={`w-5 h-5 relative z-10 transition-colors ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                <span className="relative z-10">{link.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-white/5 mt-auto">
           <div className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 p-2 rounded-xl transition-colors" onClick={handleLogout}>
             <div className="flex items-center gap-3 overflow-hidden">
               <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400 flex items-center justify-center font-bold text-sm shrink-0">
                 {userData?.firstName?.charAt(0) || 'A'}
                 {userData?.lastName?.charAt(0) || 'D'}
               </div>
               <div className="truncate">
                 <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition-colors truncate">{userData?.firstName || 'Admin'} {userData?.lastName || ''}</p>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">ADMIN</p>
               </div>
             </div>
             <LogOut className="w-5 h-5 text-slate-400 group-hover:text-red-600 transition-colors shrink-0 ml-2" />
           </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-20 bg-white/80 dark:bg-[#0A0F1C]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 flex items-center justify-between px-6 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="hidden md:flex relative group">
              <SearchBar links={navLinks} />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.location.reload()}
              className="p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <NotificationDropdown />
            
            <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>

            <button 
              onClick={() => navigate('/admin/settings')}
              className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">Admin</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">My College</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-md">
                AD
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-overlay"></div>
          
          <div className="max-w-7xl mx-auto relative">
            <Routes>
              <Route path="/" element={<AdminDashboardHome />} />
              <Route path="/admission" element={<Admission />} />
              <Route path="/marketing/*" element={<MarketingDashboard />} />
              <Route path="/students/*" element={<StudentList />} />
              <Route path="/hr/*" element={<HRManagement />} />
              <Route path="/courses/*" element={<CoursesList />} />
              <Route path="/timetable/*" element={<Timetable />} />
              <Route path="/attendance/*" element={<Attendance />} />
              <Route path="/exams/*" element={<Exams />} />
              <Route path="/lms/*" element={<LMSDashboard />} />
              <Route path="/fees/*" element={<Fees />} />
              <Route path="/library/*" element={<Library />} />
              <Route path="/hostel/*" element={<HostelDashboard />} />
              <Route path="/transport/*" element={<TransportDashboard />} />
              <Route path="/infrastructure/*" element={<Infrastructure />} />
              <Route path="/notices/*" element={<NoticeBoard />} />
              <Route path="/placements/*" element={<PlacementsDashboard />} />
              <Route path="/complaints/*" element={<ComplaintsDashboard />} />
              <Route path="/reports/*" element={<Reports />} />
              <Route path="/apps/*" element={<MobileAppsDashboard />} />
              <Route path="/settings/*" element={<Settings />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

const AdminDashboardHome = () => {
  const { userData } = useAuth();
  const stats = useDashboardStats(userData?.collegeId);
  const [copiedLink, setCopiedLink] = useState(null); // 'student', 'teacher', 'parent'
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleGenerateLink = async (role) => {
    if (!userData?.collegeId && !userData?.collegeSlug) return;
    
    // Construct the registration link with the college slug and specific role
    const baseUrl = window.location.origin;
    const inviteLink = userData?.collegeSlug 
      ? `${baseUrl}/register/${role}/${userData.collegeSlug}` 
      : `${baseUrl}/register/${role}?code=${userData.collegeId}`;
    
    // Copy to clipboard with fallback
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(inviteLink);
        toast.success(`Copied ${role} link to clipboard!`);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = inviteLink;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
          toast.success(`Copied ${role} link to clipboard!`);
        } catch (err) {
          console.error("Fallback copy failed", err);
          toast.error(
            <div className="flex flex-col gap-2">
              <span className="font-bold">Manual copy required:</span>
              <input readOnly value={inviteLink} className="text-xs p-1 rounded bg-slate-100 dark:bg-slate-800 border-none w-full" onClick={e => e.target.select()} />
            </div>, 
            { duration: 8000 }
          );
        }
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error("Failed to copy", err);
      toast.error(
        <div className="flex flex-col gap-2">
          <span className="font-bold">Manual copy required:</span>
          <input readOnly value={inviteLink} className="text-xs p-1 rounded bg-slate-100 dark:bg-slate-800 border-none w-full" onClick={e => e.target.select()} />
        </div>, 
        { duration: 8000 }
      );
    }
    
    setCopiedLink(role);
    setIsDropdownOpen(false);
    setTimeout(() => setCopiedLink(null), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">College Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage your institution's daily operations.</p>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all"
          >
            <Zap className="w-4 h-4" />
            Generate Invite Links
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-50 origin-top-right"
              >
                <div className="p-1">
                  <button onClick={() => handleGenerateLink('student')} className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                    <span className="flex items-center gap-2"><GraduationCap className="w-4 h-4 text-primary-500" /> Student Link</span>
                    {copiedLink === 'student' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </button>
                  <button onClick={() => handleGenerateLink('teacher')} className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                    <span className="flex items-center gap-2"><Users className="w-4 h-4 text-teal-500" /> Teacher Link</span>
                    {copiedLink === 'teacher' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </button>
                  <button onClick={() => handleGenerateLink('hod')} className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                    <span className="flex items-center gap-2"><Briefcase className="w-4 h-4 text-indigo-500" /> HOD Link</span>
                    {copiedLink === 'hod' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </button>
                  <button onClick={() => handleGenerateLink('parent')} className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                    <span className="flex items-center gap-2"><User className="w-4 h-4 text-amber-500" /> Parent Link</span>
                    {copiedLink === 'parent' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        {[
          { title: 'Total Students', value: stats.isLoading ? '...' : stats.totalStudents, trend: 'Current enrollment', icon: GraduationCap, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Total Teachers', value: stats.isLoading ? '...' : stats.totalTeachers, trend: 'Active staff', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Active Courses', value: stats.isLoading ? '...' : stats.activeCourses, trend: 'Departments', icon: BookOpen, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { title: 'Avg Attendance', value: stats.isLoading ? '...' : `${stats.attendanceRate}%`, trend: 'Last 30 days', icon: Calendar, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-500/10' },
        ].map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{stat.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-4">{stat.trend}</p>
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity rounded-full ${stat.bg.split(' ')[0].replace('50', '500')}`} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminLayout;
