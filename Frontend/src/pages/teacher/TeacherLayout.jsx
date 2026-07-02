import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen,
  Calendar,
  CheckSquare,
  FileBarChart,
  Settings as SettingsIcon, 
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  Briefcase,
  RefreshCw,
  MonitorPlay,
  Video,
  Film,
  UsersRound,
  MessageSquareWarning,
  Clock,
  FolderKanban,
  Banknote
} from 'lucide-react';
import { SearchBar } from '../../components/ui/SearchBar';
import { NotificationDropdown } from '../../components/ui/NotificationDropdown';
import PTMDashboard from '../shared/PTMDashboard';
import TimesheetDashboard from './TimesheetDashboard';
import ProjectTimesheetDashboard from './ProjectTimesheetDashboard';
import PayrollDashboard from './PayrollDashboard';
import TeacherLMS from './TeacherLMS';
import TeacherComplaints from './TeacherComplaints';
import TeacherDashboard from './TeacherDashboard';
import TeacherClasses from './TeacherClasses';
import TeacherAssignments from './TeacherAssignments';
import TeacherAttendance from './TeacherAttendance';
import TeacherSchedule from './TeacherSchedule';
import TeacherGrades from './TeacherGrades';
import TeacherSettings from './TeacherSettings';
import Timetable from '../admin/timetable/Timetable';

const TeacherLayout = () => {
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
    { name: 'Dashboard', path: '/teacher', icon: LayoutDashboard },
    { name: 'My Classes', path: '/teacher/classes', icon: Users },
    { name: 'Assignments', path: '/teacher/assignments', icon: BookOpen },
    { name: 'Attendance', path: '/teacher/attendance', icon: CheckSquare },
    { name: 'Schedule', path: '/teacher/schedule', icon: Calendar },
    { name: 'Marks & Grading', path: '/teacher/grades', icon: FileBarChart },
    { name: 'LMS', path: '/teacher/lms', icon: MonitorPlay },
    { name: 'Live Classes', path: '/teacher/live-classes', icon: Video },
    { name: 'Video Library', path: '/teacher/video-library', icon: Film },
    { name: 'PTM', path: '/teacher/ptm', icon: UsersRound },
    { name: 'Complaints', path: '/teacher/complaints', icon: MessageSquareWarning },
    { name: 'Timesheet', path: '/teacher/timesheet', icon: Clock },
    { name: 'Projects', path: '/teacher/projects', icon: FolderKanban },
    { name: 'Payroll', path: '/teacher/payroll', icon: Banknote },
    { name: 'Settings', path: '/teacher/settings', icon: SettingsIcon },
  ];

  if (userData?.role === 'hod') {
    navLinks.splice(4, 0, { name: 'Manage Timetable', path: '/teacher/timetable', icon: Calendar });
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
               {userData?.collegeLogo ? <img src={userData.collegeLogo} alt="Logo" className="w-full h-full object-contain rounded-lg"/> : <Briefcase className="w-5 h-5 text-slate-400" />}
            </div>
            <div className="flex-1 overflow-hidden">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={userData?.collegeName || 'My College'}>{userData?.collegeName || 'My College'}</h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">FACULTY PORTAL</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path || (link.path !== '/teacher' && location.pathname.startsWith(link.path));
            const Icon = link.icon;
            
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative ${
                  isActive 
                    ? 'text-teal-700 dark:text-white font-bold' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <motion.div 
                    layoutId="activeTeacherTab" 
                    className="absolute inset-0 bg-teal-50 dark:bg-teal-500/10 rounded-xl border border-teal-100 dark:border-teal-500/20" 
                    initial={false}
                  />
                )}
                <Icon className={`w-5 h-5 relative z-10 transition-colors ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                <span className="relative z-10">{link.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-100 dark:border-white/5 mt-auto">
           <div className="flex items-center justify-between group cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 p-2 rounded-xl transition-colors" onClick={handleLogout}>
             <div className="flex items-center gap-3 overflow-hidden">
               <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold text-sm shrink-0">
                 {userData?.firstName ? userData.firstName.charAt(0) : 'F'}
               </div>
               <div className="truncate">
                 <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition-colors truncate">{userData?.firstName || 'Faculty'} {userData?.lastName || 'Member'}</p>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">{userData?.designation || 'TEACHER'}</p>
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
              onClick={() => navigate('/teacher/settings')}
              className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{userData?.firstName || 'Teacher'}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{userData?.designation || 'Faculty Member'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white font-bold shadow-md">
                T
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-overlay"></div>
          
          <div className="max-w-7xl mx-auto relative">
            <Routes>
              <Route path="/" element={<TeacherDashboard />} />
              <Route path="/classes" element={<TeacherClasses />} />
              <Route path="/assignments" element={<TeacherAssignments />} />
              <Route path="/attendance" element={<TeacherAttendance />} />
              <Route path="/schedule" element={<TeacherSchedule />} />
              <Route path="/grades" element={<TeacherGrades />} />
              <Route path="/lms" element={<TeacherLMS />} />
              <Route path="/live-classes" element={<TeacherLMS />} />
              <Route path="/video-library" element={<TeacherLMS />} />
              <Route path="/ptm" element={<PTMDashboard />} />
              <Route path="/complaints" element={<TeacherComplaints />} />
              <Route path="/timesheet" element={<TimesheetDashboard />} />
              <Route path="/projects" element={<ProjectTimesheetDashboard />} />
              <Route path="/payroll" element={<PayrollDashboard />} />
              <Route path="/settings" element={<TeacherSettings />} />
              {userData?.role === 'hod' && <Route path="/timetable" element={<Timetable />} />}
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

export default TeacherLayout;
