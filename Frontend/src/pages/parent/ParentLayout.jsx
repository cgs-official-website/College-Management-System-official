import React, { useState } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  FileBarChart,
  LogOut, 
  Menu, 
  X,
  User,
  RefreshCw,
  Home,
  Bus,
  MessageSquareWarning,
  CreditCard,
  Users,
  ChevronDown,
  GraduationCap
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { ParentChildProvider, useParentChild } from '../../contexts/ParentChildContext';
import { NotificationDropdown } from '../../components/ui/NotificationDropdown';
import { SearchBar } from '../../components/ui/SearchBar';
import ParentDashboard from './ParentDashboard';
import ParentAttendance from './ParentAttendance';
import ParentGrades from './ParentGrades';
import ParentHostel from './ParentHostel';
import ParentTransport from './ParentTransport';
import ParentComplaints from './ParentComplaints';
import ParentFees from './ParentFees';
import ParentPTM from './ParentPTM';

function ParentLayoutContent() {
  const { userData, logout } = useAuth();
  const { activeChild, activeChildId, setActiveChildId, linkedStudents } = useParentChild();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isChildMenuOpen, setIsChildMenuOpen] = useState(false);
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
    { name: 'Fees & Finance', icon: CreditCard, path: '/parent/fees' },
    { name: 'PTM Meetings', icon: Users, path: '/parent/ptm' },
    { name: 'Hostel', icon: Home, path: '/parent/hostel' },
    { name: 'Transport', icon: Bus, path: '/parent/transport' },
    { name: 'Complaints', icon: MessageSquareWarning, path: '/parent/complaints' },
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

        {/* Child Selector in Sidebar for Mobile */}
        {linkedStudents.length > 0 && (
          <div className="px-4 pt-4 pb-2">
            <div className="p-3 bg-teal-50/70 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{activeChild?.name}</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{activeChild?.department} • {activeChild?.admissionNumber}</p>
                </div>
              </div>
            </div>
          </div>
        )}

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

            {/* Child Switcher Dropdown */}
            {linkedStudents.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setIsChildMenuOpen(!isChildMenuOpen)}
                  className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-2xl transition-all border border-slate-200/60 dark:border-white/10"
                >
                  <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                    {activeChild?.name?.charAt(0) || 'S'}
                  </div>
                  <div className="text-left hidden sm:block">
                    <p className="text-xs font-extrabold text-slate-900 dark:text-white leading-tight">
                      {activeChild?.name || 'Selected Child'}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-none">
                      {activeChild?.department || 'Student'} • {activeChild?.admissionNumber || ''}
                    </p>
                  </div>
                  {linkedStudents.length > 1 && (
                    <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                  )}
                </button>

                {/* Dropdown Menu for multiple children */}
                <AnimatePresence>
                  {isChildMenuOpen && linkedStudents.length > 1 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute left-0 mt-2 w-64 bg-white dark:bg-[#0A0F1C] rounded-2xl shadow-xl border border-slate-200 dark:border-white/10 py-2 z-50 overflow-hidden"
                    >
                      <div className="px-4 py-2 border-b border-slate-100 dark:border-white/5 text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                        Switch Student
                      </div>
                      {linkedStudents.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => {
                            setActiveChildId(child.id);
                            setIsChildMenuOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors ${
                            child.id === activeChildId
                              ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 font-bold'
                              : 'hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold text-xs shrink-0">
                            {child.name?.charAt(0) || 'S'}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold truncate">{child.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{child.department} • {child.admissionNumber}</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
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

            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-teal-500/20 ring-2 ring-white dark:ring-[#0A0F1C] shrink-0">
              {userData?.name ? userData.name.charAt(0).toUpperCase() : 'P'}
            </div>
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
              <Route path="/fees" element={<ParentFees />} />
              <Route path="/ptm" element={<ParentPTM />} />
              <Route path="/hostel" element={<ParentHostel />} />
              <Route path="/transport" element={<ParentTransport />} />
              <Route path="/complaints" element={<ParentComplaints />} />
              <Route path="*" element={<Navigate to="/parent" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function ParentLayout() {
  return (
    <ParentChildProvider>
      <ParentLayoutContent />
    </ParentChildProvider>
  );
}
