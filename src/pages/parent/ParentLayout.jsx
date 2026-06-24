import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  FileBarChart,
  LogOut, 
  Menu, 
  X,
  User,
  Shield,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { NotificationDropdown } from '../../components/ui/NotificationDropdown';
import { SearchBar } from '../../components/ui/SearchBar';
import ParentDashboard from './ParentDashboard';
import ParentAttendance from './ParentAttendance';
import ParentGrades from './ParentGrades';

export default function ParentLayout() {
  const { userData, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  const navLinks = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/parent' },
    { name: 'Child Attendance', icon: CalendarIcon, path: '/parent/attendance' },
    { name: 'Academic Records', icon: FileBarChart, path: '/parent/grades' },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-[#020813] font-sans selection:bg-teal-500/30">
      
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 w-72 bg-white dark:bg-[#0A0F1C] border-r border-slate-200 dark:border-white/10 z-50 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl lg:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        <div className="h-20 flex items-center gap-3 px-6 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-lg relative p-0.5 border border-slate-100 dark:border-white/10">
            {userData?.collegeLogo ? (
              <img src={userData.collegeLogo} alt="Logo" className="w-full h-full object-contain rounded-lg" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xs">
                {userData?.collegeName?.charAt(0) || 'P'}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
              {userData?.collegeName || 'Parent Portal'}
            </h1>
            <p className="text-[10px] text-teal-600 dark:text-teal-400 font-bold tracking-wider uppercase">Parent Panel</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path || (link.path !== '/parent' && location.pathname.startsWith(link.path));
            
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all group relative overflow-hidden
                  ${isActive 
                    ? 'text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/10' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                {isActive && (
                  <motion.div layoutId="activeTabParent" className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500" />
                )}
                <Icon className={`w-5 h-5 relative transition-colors ${isActive ? 'text-teal-600 dark:text-teal-400' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`} />
                <span className="relative">{link.name}</span>
              </Link>
            );
          })}
        </div>

        {/* User Profile Card */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02]">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-500/20 flex items-center justify-center shrink-0 border border-teal-200 dark:border-teal-500/30">
              <User className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {userData?.name || 'Parent User'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {userData?.email}
              </p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-red-600 dark:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-20 bg-white/80 dark:bg-[#0A0F1C]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 flex items-center justify-between px-6 z-30 relative shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:block w-64 md:w-80 lg:w-96">
              <SearchBar placeholder="Search child records..." />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleRefresh}
              className={`p-2.5 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all
                ${isRefreshing ? 'animate-spin text-teal-500' : ''}`}
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            <NotificationDropdown />

            <div className="h-8 w-px bg-slate-200 dark:bg-white/10 mx-1"></div>

            <button onClick={() => navigate('/parent/settings')} className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/20 ring-2 ring-white dark:ring-[#0A0F1C] hover:scale-105 transition-transform shrink-0">
              {userData?.name ? userData.name.charAt(0).toUpperCase() : 'P'}
            </button>
          </div>
        </header>

        {/* Scrollable Main Area */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-overlay"></div>
          
          <div className="max-w-7xl mx-auto relative">
            <Routes>
              <Route path="/" element={<ParentDashboard />} />
              <Route path="/attendance" element={<ParentAttendance />} />
              <Route path="/grades" element={<ParentGrades />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}
