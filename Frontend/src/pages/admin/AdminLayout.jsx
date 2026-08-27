import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
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
  Settings2,
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
  MessageSquareWarning,
  LifeBuoy,
  ShieldCheck,
  Package,
  Sun,
  Moon,
  IndianRupee
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';
import PlaceholderModule from '../../components/ui/PlaceholderModule';
import RaiseTicketModal from '../../components/ui/RaiseTicketModal';
import StudentList from './students/StudentList';
import Admission from './admission/Admission';
import HRManagement from './hr/HRManagement';
import AcademicStructure from './academic-structure/AcademicStructure';
import Attendance from './attendance/Attendance';
import Exams from './exams/Exams';
import Fees from './fees/Fees';
import Library from './library/Library';
import Infrastructure from './infrastructure/Infrastructure';
import NoticeBoard from './notices/NoticeBoard';
import Timetable from './timetable/Timetable';
import Reports from './reports/Reports';
import Settings from './settings/Settings';
import RolesManagement from './roles/RolesManagement';
import MarketingDashboard from './marketing/MarketingDashboard';
import LMSDashboard from './lms/LMSDashboard';
import HostelDashboard from './hostel/HostelDashboard';
import TransportDashboard from './transport/TransportDashboard';
import PlacementsDashboard from './placements/PlacementsDashboard';
import ComplaintsDashboard from './complaints/ComplaintsDashboard';
import MobileAppsDashboard from './apps/MobileAppsDashboard';
import ApiIntegrations from './integrations/ApiIntegrations';
import InventoryDashboard from './inventory/InventoryDashboard';
import PayrollDashboard from './payroll/PayrollDashboard';

import CustomDashboard from '../../modules/custom/CustomDashboard';
import ModuleBuilder from '../../modules/builder/ModuleBuilder';
import DynamicDashboard from '../../modules/dynamic/DynamicDashboard';
import { useGetEntities } from '../../modules/builder/useBuilder';
import { SearchBar } from '../../components/ui/SearchBar';
import { NotificationDropdown } from '../../components/ui/NotificationDropdown';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, userData, userRole, permissions } = useAuth();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const { data: customEntitiesData } = useGetEntities();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const hasAccess = (moduleKey) => {
    // Check if the college subscription plan restricts this module
    if (moduleKey && userData?.allowedModules && Array.isArray(userData.allowedModules)) {
      if (!userData.allowedModules.includes(moduleKey)) {
        return false;
      }
    }

    if (userRole === 'admin' || userRole === 'superadmin') return true;
    if (!moduleKey) return true; // Everyone can see dashboard
    return permissions?.[moduleKey]?.canRead === true;
  };

  const navLinks = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard, moduleKey: null },

    { name: 'Admission', path: '/admin/admission', icon: UserPlus, moduleKey: 'admission' },
    { name: 'Students', path: '/admin/students', icon: GraduationCap, moduleKey: 'students' },
    { name: 'HR & Staff', path: '/admin/hr', icon: Users, moduleKey: 'staff' },
    { name: 'Academic Structure', path: '/admin/academic-structure', icon: BookOpen, moduleKey: 'academic' },
    { name: 'Timetable', path: '/admin/timetable', icon: Calendar, moduleKey: 'timetable' },
    { name: 'Attendance', path: '/admin/attendance', icon: Clock, moduleKey: 'attendance' },
    { name: 'Exams', path: '/admin/exams', icon: ClipboardList, moduleKey: 'exams' },
    { name: 'Fees & Finance', path: '/admin/fees', icon: Calculator, moduleKey: 'fees' },
    // { name: 'Library', path: '/admin/library', icon: LibraryIcon, moduleKey: 'library' },
    // { name: 'Hostel', path: '/admin/hostel', icon: Home, moduleKey: 'hostel' },
    // { name: 'Transport', path: '/admin/transport', icon: Bus, moduleKey: 'transport' },
    // { name: 'Infrastructure', path: '/admin/infrastructure', icon: Building, moduleKey: 'infrastructure' },
    { name: 'Notice Board', path: '/admin/notices', icon: Megaphone, moduleKey: 'notices' },
    { name: 'Placements', path: '/admin/placements', icon: Briefcase, moduleKey: 'placements' },
    { name: 'Reports', path: '/admin/reports', icon: FileText, moduleKey: 'reports' },
    // { name: 'Inventory', path: '/admin/inventory', icon: Package, moduleKey: 'inventory' },
    { name: 'Payroll', path: '/admin/payroll', icon: IndianRupee, moduleKey: 'payroll' },

    // { name: 'API Integrations', path: '/admin/api-integrations', icon: Zap, moduleKey: 'api_integration' },
    // { name: 'Module Builder', path: '/admin/builder', icon: Settings2, moduleKey: 'custom' },
    // ...(customEntitiesData?.map(ent => ({
    //   name: ent.name,
    //   path: `/admin/dynamic/${ent.slug}`,
    //   icon: FileText,
    //   moduleKey: 'custom'
    // })) || []),
    { name: 'Environment Setup', path: '/admin/settings', icon: SettingsIcon, moduleKey: 'settings' },
    { name: 'Roles & Permissions', path: '/admin/roles', icon: ShieldCheck, moduleKey: 'roles' },
  ].filter(link => hasAccess(link.moduleKey));

  if (userData?.college?.status === 'pending') {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 dark:bg-[#020813]">
        <div className="text-center p-8 bg-white dark:bg-[#0A0F1C] rounded-2xl shadow-xl max-w-md w-full border border-slate-200 dark:border-white/10">
          <ShieldCheck className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">College Pending</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Your college registration is currently pending approval from the Super Admin. You will receive an email once it is approved.
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

            <button 
              onClick={toggleTheme}
              className="p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
            </button>

            <button 
              onClick={() => setShowTicketModal(true)}
              className="p-2.5 text-amber-600 hover:text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors"
              title="Raise Support Ticket to Zuna"
            >
              <LifeBuoy className="w-5 h-5" />
            </button>

            <RaiseTicketModal 
              isOpen={showTicketModal}
              onClose={() => setShowTicketModal(false)}
              collegeName={userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}` : 'College Admin'}
              collegeEmail={userData?.email || ''}
            />

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
              <Route path="/roles/*" element={hasAccess('roles') ? <RolesManagement /> : <Navigate to="/404" replace />} />
              <Route path="/admission" element={hasAccess('admission') ? <Admission /> : <Navigate to="/404" replace />} />
              <Route path="/students/*" element={hasAccess('students') ? <StudentList /> : <Navigate to="/404" replace />} />
              <Route path="/hr/*" element={hasAccess('staff') ? <HRManagement /> : <Navigate to="/404" replace />} />
              <Route path="/academic-structure/*" element={hasAccess('academic') ? <AcademicStructure /> : <Navigate to="/404" replace />} />
              <Route path="/timetable/*" element={hasAccess('timetable') ? <Timetable /> : <Navigate to="/404" replace />} />
              <Route path="/attendance/*" element={hasAccess('attendance') ? <Attendance /> : <Navigate to="/404" replace />} />
              <Route path="/exams/*" element={hasAccess('exams') ? <Exams /> : <Navigate to="/404" replace />} />
              <Route path="/fees/*" element={hasAccess('fees') ? <Fees /> : <Navigate to="/404" replace />} />
              <Route path="/library/*" element={hasAccess('library') ? <Library /> : <Navigate to="/404" replace />} />
              <Route path="/hostel/*" element={hasAccess('hostel') ? <HostelDashboard /> : <Navigate to="/404" replace />} />
              <Route path="/transport/*" element={hasAccess('transport') ? <TransportDashboard /> : <Navigate to="/404" replace />} />
              <Route path="/infrastructure/*" element={hasAccess('infrastructure') ? <Infrastructure /> : <Navigate to="/404" replace />} />
              <Route path="/notices/*" element={hasAccess('notices') ? <NoticeBoard /> : <Navigate to="/404" replace />} />
              <Route path="/placements/*" element={hasAccess('placements') ? <PlacementsDashboard /> : <Navigate to="/404" replace />} />
              <Route path="/reports/*" element={hasAccess('reports') ? <Reports /> : <Navigate to="/404" replace />} />
              <Route path="/inventory/*" element={hasAccess('inventory') ? <InventoryDashboard /> : <Navigate to="/404" replace />} />
              <Route path="/api-integrations/*" element={hasAccess('api_integration') ? <ApiIntegrations /> : <Navigate to="/404" replace />} />
              <Route path="/payroll/*" element={hasAccess('payroll') ? <PayrollDashboard /> : <Navigate to="/404" replace />} />

              <Route path="/builder/*" element={hasAccess('custom') ? <ModuleBuilder /> : <Navigate to="/404" replace />} />
              <Route path="/dynamic/:entitySlug/*" element={hasAccess('custom') ? <DynamicDashboard /> : <Navigate to="/404" replace />} />
              <Route path="/custom/*" element={hasAccess('custom') ? <CustomDashboard /> : <Navigate to="/404" replace />} />
              <Route path="/settings/*" element={hasAccess('settings') ? <Settings /> : <Navigate to="/404" replace />} />
              <Route path="*" element={<Navigate to="/404" replace />} />
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
            key={stat.title} 
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

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        
        {/* Quick Actions */}
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</h2>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg text-indigo-500">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 flex-1">
            {[
              { label: 'Add Student', icon: UserPlus, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', path: '/admin/students' },
              { label: 'Mark Attendance', icon: CheckCircle2, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10', path: '/admin/attendance' },
              { label: 'Collect Fees', icon: Wallet, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', path: '/admin/fees' },
              { label: 'Post Notice', icon: Megaphone, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', path: '/admin/notices' },
            ].map((action, idx) => (
              <Link 
                key={idx}
                to={action.path}
                className="flex flex-col items-center justify-center p-4 rounded-2xl border border-slate-100 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 hover:bg-slate-50 dark:hover:bg-white/5 transition-all group"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${action.bg} group-hover:scale-110 transition-transform`}>
                  <action.icon className={`w-6 h-6 ${action.color}`} />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 text-center">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Activity Feed */}
        <div className="lg:col-span-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Activity</h2>
            <button className="text-sm font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
              View All
            </button>
          </div>
          
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 dark:before:via-white/10 before:to-transparent">
            {stats.isLoading ? (
              <p className="text-sm text-slate-500 text-center py-4">Loading activity...</p>
            ) : stats.recentActivity && stats.recentActivity.length > 0 ? (
              stats.recentActivity.map((item, idx) => {
                const Icon = item.type === 'student' ? UserPlus : Users;
                const color = item.type === 'student' ? 'text-emerald-500' : 'text-amber-500';
                const bg = item.type === 'student' ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-amber-50 dark:bg-amber-500/10';
                
                // Format relative time like "2 hours ago"
                const date = new Date(item.time);
                const now = new Date();
                const diffMs = now - date;
                const diffMins = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMins / 60);
                const diffDays = Math.floor(diffHours / 24);
                
                let timeStr = '';
                if (diffMins < 60) timeStr = diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`;
                else if (diffHours < 24) timeStr = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
                else if (diffDays === 1) timeStr = 'Yesterday';
                else timeStr = date.toLocaleDateString();

                return (
                  <div key={item.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    {/* Icon */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-[#0A0F1C] ${bg} text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    {/* Card */}
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-slate-900 dark:text-white text-sm">{item.title}</h3>
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{timeStr}</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{item.desc}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-slate-500 text-center py-4">No recent activity found.</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminLayout;
