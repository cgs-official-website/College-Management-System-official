import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { 
  LayoutDashboard, 
  BookOpen,
  Calendar,
  CheckSquare,
  FileBarChart,
  Settings, 
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  GraduationCap,
  RefreshCw,
  MonitorPlay,
  Video,
  Film,
  Award,
  Home,
  Bus,
  ShoppingCart,
  Briefcase,
  MessageSquareWarning,
  Files
} from 'lucide-react';
import { SearchBar } from '../../components/ui/SearchBar';
import { NotificationDropdown } from '../../components/ui/NotificationDropdown';
import { StudentSettings } from './StudentSettings';
import StoreDashboard from '../shared/StoreDashboard';
import StudentCoursesDashboard from './StudentCoursesDashboard';
import StudentAssignmentsDashboard from './StudentAssignmentsDashboard';
import StudentAttendanceDashboard from './StudentAttendanceDashboard';
import StudentTimetableDashboard from './StudentTimetableDashboard';
import StudentDocumentsDashboard from './StudentDocumentsDashboard';
import StudentLMS from './StudentLMS';
import StudentHostel from './StudentHostel';
import StudentTransport from './StudentTransport';
import StudentComplaints from './StudentComplaints';
import StudentPlacements from './StudentPlacements';

const StudentLayout = () => {
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
    { name: 'Dashboard', path: '/student', icon: LayoutDashboard },
    { name: 'My Courses', path: '/student/courses', icon: BookOpen },
    { name: 'Assignments', path: '/student/assignments', icon: FileBarChart },
    { name: 'Attendance', path: '/student/attendance', icon: CheckSquare },
    { name: 'Timetable', path: '/student/timetable', icon: Calendar },
    { name: 'LMS', path: '/student/lms', icon: MonitorPlay },
    { name: 'Live Classes', path: '/student/live-classes', icon: Video },
    { name: 'Video Library', path: '/student/video-library', icon: Film },
    { name: 'Certificates', path: '/student/certificates', icon: Award },
    { name: 'Hostel', path: '/student/hostel', icon: Home },
    { name: 'Transport', path: '/student/transport', icon: Bus },
    { name: 'Store', path: '/student/store', icon: ShoppingCart },
    { name: 'Placement', path: '/student/placement', icon: Briefcase },
    { name: 'Complaints', path: '/student/complaints', icon: MessageSquareWarning },
    { name: 'Documents', path: '/student/documents', icon: Files },
    { name: 'Settings', path: '/student/settings', icon: Settings },
  ];

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
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={userData?.collegeName || 'My College'}>{userData?.collegeName || 'My College'}</h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">STUDENT PORTAL</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path || (link.path !== '/student' && location.pathname.startsWith(link.path));
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
                    layoutId="activeStudentTab" 
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
               <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400 flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                 {userData?.firstName?.[0] || userData?.name?.[0] || 'S'}
               </div>
               <div className="truncate">
                 <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition-colors truncate">
                   {userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}` : userData?.name || 'Student'}
                 </p>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">STUDENT</p>
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
              onClick={() => navigate('/student/settings')}
              className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                  {userData?.firstName ? `${userData.firstName} ${userData.lastName || ''}` : userData?.name || 'Student'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{userData?.course || 'Student'}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-teal-600 flex items-center justify-center text-white font-bold shadow-md uppercase">
                {userData?.firstName?.[0] || userData?.name?.[0] || 'S'}
              </div>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-overlay"></div>
          
          <div className="max-w-7xl mx-auto relative">
            <Routes>
              <Route path="/" element={<StudentDashboardHome />} />
              <Route path="/courses" element={<StudentCoursesDashboard />} />
              <Route path="/assignments" element={<StudentAssignmentsDashboard />} />
              <Route path="/attendance" element={<StudentAttendanceDashboard />} />
              <Route path="/timetable" element={<StudentTimetableDashboard />} />
              <Route path="/lms" element={<StudentLMS />} />
              <Route path="/live-classes" element={<StudentLMS />} />
              <Route path="/video-library" element={<StudentLMS />} />
              <Route path="/certificates" element={<StudentLMS />} />
              <Route path="/hostel" element={<StudentHostel />} />
              <Route path="/transport" element={<StudentTransport />} />
              <Route path="/store" element={<StoreDashboard />} />
              <Route path="/placement" element={<StudentPlacements />} />
              <Route path="/complaints" element={<StudentComplaints />} />
              <Route path="/documents" element={<StudentDocumentsDashboard />} />
              <Route path="/settings" element={<StudentSettings />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

const StudentDashboardHome = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Student Portal</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track your academic progress and schedule.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        {[
          { title: 'Current CGPA', value: 'N/A', trend: '', icon: GraduationCap, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
          { title: 'Attendance', value: 'N/A', trend: '', icon: CheckSquare, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Assignments Due', value: '0', trend: '', icon: FileBarChart, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
          { title: 'Upcoming Classes', value: '0', trend: '', icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
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



export default StudentLayout;
