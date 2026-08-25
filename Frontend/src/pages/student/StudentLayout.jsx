import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  BookOpen, 
  FileBarChart, 
  CheckSquare, 
  Calendar, 
  ClipboardList,
  Calculator,
  Megaphone,
  Library as LibraryIcon,
  Home, 
  Bus, 
  Briefcase, 
  MessageSquareWarning, 
  Files, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  GraduationCap, 
  Sun, 
  Moon, 
  RefreshCw,
  Bell,
  ArrowUpRight
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { useStudentProfile, useStudentDashboard } from '../../hooks/useStudentPortal';

import StudentCoursesDashboard from './StudentCoursesDashboard';
import StudentAssignmentsDashboard from './StudentAssignmentsDashboard';
import StudentAttendanceDashboard from './StudentAttendanceDashboard';
import StudentTimetableDashboard from './StudentTimetableDashboard';
import StudentExamsDashboard from './StudentExamsDashboard';
import StudentFeesDashboard from './StudentFeesDashboard';
import StudentNoticesDashboard from './StudentNoticesDashboard';
import StudentLibraryDashboard from './StudentLibraryDashboard';
import StudentHostel from './StudentHostel';
import StudentTransport from './StudentTransport';
import StudentPlacements from './StudentPlacements';
import StudentComplaints from './StudentComplaints';
import StudentDocumentsDashboard from './StudentDocumentsDashboard';
import StudentSettings from './StudentSettings';

const StudentLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, userData } = useAuth();
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const { theme, toggleTheme } = useTheme();
  const { data: profileData } = useStudentProfile();

  const profile = profileData?.data;
  const residenceType = (profile?.residenceType || userData?.residenceType || 'Day Scholar').toLowerCase();
  const isHosteller = residenceType.includes('hostel');
  const isDayScholar = !isHosteller;

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const allNavLinks = [
    { name: 'Dashboard', path: '/student', icon: LayoutDashboard },
    { name: 'My Courses', path: '/student/courses', icon: BookOpen },
    { name: 'Assignments', path: '/student/assignments', icon: FileBarChart },
    { name: 'Attendance', path: '/student/attendance', icon: CheckSquare },
    { name: 'Timetable', path: '/student/timetable', icon: Calendar },
    { name: 'Exams & Results', path: '/student/exams', icon: ClipboardList },
    { name: 'Fees & Finance', path: '/student/fees', icon: Calculator },
    { name: 'Notice Board', path: '/student/notices', icon: Megaphone },
    { name: 'Library', path: '/student/library', icon: LibraryIcon },
    { name: 'Hostel', path: '/student/hostel', icon: Home, show: isHosteller },
    { name: 'Transport', path: '/student/transport', icon: Bus, show: isDayScholar },
    { name: 'Placements', path: '/student/placement', icon: Briefcase },
    { name: 'Complaints', path: '/student/complaints', icon: MessageSquareWarning },
    { name: 'Documents', path: '/student/documents', icon: Files },
    { name: 'Settings', path: '/student/settings', icon: Settings },
  ];

  const navLinks = allNavLinks.filter(link => link.show === undefined || link.show === true);

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
               {userData?.collegeLogo ? <img src={userData.collegeLogo} alt="Logo" className="w-full h-full object-contain rounded-lg"/> : <GraduationCap className="w-5 h-5 text-slate-400" />}
            </div>
            <div className="flex-1 overflow-hidden">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={userData?.collegeName || 'College Name'}>{userData?.collegeName || 'College Name'}</h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                STUDENT • {isHosteller ? 'HOSTELLER' : 'DAY SCHOLAR'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path || (link.path !== '/student' && location.pathname.startsWith(link.path));
            const Icon = link.icon;
            
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive 
                    ? 'text-primary-700 dark:text-white font-bold' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeStudentTab" 
                    className="absolute inset-0 bg-primary-50 dark:bg-primary-500/10 rounded-xl border border-primary-100 dark:border-primary-500/20" 
                    initial={false}
                  />
                )}
                <Icon className={`w-5 h-5 relative z-10 transition-colors ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                <span className="relative z-10 text-sm">{link.name}</span>
              </Link>
            );
          })}
        </div>

        {/* User Account / Logout */}
        <div className="p-4 border-t border-slate-100 dark:border-white/5 mt-auto">
           <div className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 p-2 rounded-xl transition-colors" onClick={handleLogout}>
             <div className="flex items-center gap-3 overflow-hidden">
               <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
                 {userData?.firstName?.charAt(0) || 'S'}
                 {userData?.lastName?.charAt(0) || 'T'}
               </div>
               <div className="truncate">
                 <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition-colors truncate">{userData?.firstName || 'Student'} {userData?.lastName || ''}</p>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">STUDENT PORTAL</p>
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
          </div>

          <div className="flex items-center gap-3">
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

            <Link
              to="/student/notices"
              className="p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors relative"
              title="Campus Notices"
            >
              <Bell className="w-5 h-5" />
            </Link>

            <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>

            <button 
              onClick={() => navigate('/student/settings')}
              className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{userData?.firstName || 'Student'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Verified Student</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-md">
                {userData?.firstName?.charAt(0) || 'S'}
              </div>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-overlay"></div>
          
          <div className="max-w-7xl mx-auto relative">
            <Routes>
              <Route path="/" element={<StudentDashboardHome isHosteller={isHosteller} isDayScholar={isDayScholar} />} />
              <Route path="/courses" element={<StudentCoursesDashboard />} />
              <Route path="/assignments" element={<StudentAssignmentsDashboard />} />
              <Route path="/attendance" element={<StudentAttendanceDashboard />} />
              <Route path="/timetable" element={<StudentTimetableDashboard />} />
              <Route path="/exams" element={<StudentExamsDashboard />} />
              <Route path="/fees" element={<StudentFeesDashboard />} />
              <Route path="/notices" element={<StudentNoticesDashboard />} />
              <Route path="/library" element={<StudentLibraryDashboard />} />
              <Route path="/hostel" element={isHosteller ? <StudentHostel /> : <Navigate to="/student" replace />} />
              <Route path="/transport" element={isDayScholar ? <StudentTransport /> : <Navigate to="/student" replace />} />
              <Route path="/placement" element={<StudentPlacements />} />
              <Route path="/complaints" element={<StudentComplaints />} />
              <Route path="/documents" element={<StudentDocumentsDashboard />} />
              <Route path="/settings" element={<StudentSettings />} />
              <Route path="*" element={<Navigate to="/student" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

const StudentDashboardHome = ({ isHosteller, isDayScholar }) => {
  const { data: dashboardData, isLoading } = useStudentDashboard();
  const { data: profileData } = useStudentProfile();
  const navigate = useNavigate();

  const profile = profileData?.data;
  const metrics = dashboardData?.data?.metrics;
  const notices = dashboardData?.data?.recentNotices || [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Welcome back, {profile?.firstName || 'Student'}! 👋
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {profile?.department || 'Academic'} • Admission No: <span className="font-bold text-slate-700 dark:text-slate-200">{profile?.admissionNumber || '-'}</span> • <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">{isHosteller ? 'Hosteller' : 'Day Scholar'}</span>
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { 
            title: 'Attendance Rate', 
            value: metrics ? `${metrics.attendancePercentage}%` : '100%', 
            trend: `${metrics?.presentDays || 0} / ${metrics?.totalDays || 0} sessions present`, 
            icon: CheckSquare, 
            color: 'text-emerald-500', 
            bg: 'bg-emerald-50 dark:bg-emerald-500/10',
            path: '/student/attendance'
          },
          { 
            title: 'Enrolled Courses', 
            value: metrics ? String(metrics.coursesCount) : '0', 
            trend: 'Current Semester', 
            icon: BookOpen, 
            color: 'text-blue-500', 
            bg: 'bg-blue-50 dark:bg-blue-500/10',
            path: '/student/courses'
          },
          { 
            title: 'Pending Assignments', 
            value: metrics ? String(metrics.pendingAssignments) : '0', 
            trend: metrics?.pendingAssignments > 0 ? 'Requires attention' : 'All caught up!', 
            icon: FileBarChart, 
            color: 'text-rose-500', 
            bg: 'bg-rose-50 dark:bg-rose-500/10',
            path: '/student/assignments'
          },
          { 
            title: 'Upcoming Exams', 
            value: metrics ? String(metrics.upcomingExams) : '0', 
            trend: 'Scheduled ahead', 
            icon: Calendar, 
            color: 'text-purple-500', 
            bg: 'bg-purple-50 dark:bg-purple-500/10',
            path: '/student/exams'
          },
        ].map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            onClick={() => navigate(stat.path)}
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group cursor-pointer"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                  {isLoading ? '...' : stat.value}
                </h3>
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

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => navigate('/student/timetable')}
          className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">Class Timetable</h3>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-primary-600 transition-colors" />
          </div>
          <p className="text-xs text-slate-500 mt-1">View weekly lecture rooms, faculty, and timings.</p>
        </div>

        <div 
          onClick={() => navigate('/student/fees')}
          className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
            <Calculator className="w-5 h-5" />
          </div>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 dark:text-white">Fees & Statements</h3>
            <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
          </div>
          <p className="text-xs text-slate-500 mt-1">Check tuition fee invoices and payment status.</p>
        </div>

        {isHosteller ? (
          <div 
            onClick={() => navigate('/student/hostel')}
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 flex items-center justify-center mb-3">
              <Home className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">Hostel Residence</h3>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
            </div>
            <p className="text-xs text-slate-500 mt-1">View your assigned room and hostel block allocation.</p>
          </div>
        ) : (
          <div 
            onClick={() => navigate('/student/transport')}
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 flex items-center justify-center mb-3">
              <Bus className="w-5 h-5" />
            </div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">Campus Transport</h3>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 transition-colors" />
            </div>
            <p className="text-xs text-slate-500 mt-1">View daily bus route and pickup stop pass.</p>
          </div>
        )}
      </div>

      {/* Recent Campus Notices */}
      {notices.length > 0 && (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-amber-500" />
              Latest Campus Notices
            </h3>
            <Link to="/student/notices" className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline">
              View All Notices
            </Link>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {notices.map((notice) => (
              <div key={notice.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">{notice.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{notice.content}</p>
                </div>
                <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 shrink-0">
                  {new Date(notice.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentLayout;
