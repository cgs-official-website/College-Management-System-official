import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Settings, 
  LogOut,
  Bell,
  Search,
  Menu,
  X,
  Zap,
  ShieldAlert,
  RefreshCw,
  Package
} from 'lucide-react';
import SuperColleges from './SuperColleges';
import SuperAdmins from './SuperAdmins';
import SuperSettings from './SuperSettings';
import { SearchBar } from '../../components/ui/SearchBar';
import { NotificationDropdown } from '../../components/ui/NotificationDropdown';
import GlobalModulesDashboard from './GlobalModulesDashboard';

const SuperAdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
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
    { name: 'Dashboard', path: '/super', icon: LayoutDashboard },
    { name: 'Colleges', path: '/super/colleges', icon: Building2 },
    { name: 'Admins', path: '/super/admins', icon: Users },
    { name: 'Modules', path: '/super/modules', icon: Package },
    { name: 'Settings', path: '/super/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#020813] text-slate-900 dark:text-slate-200 overflow-hidden font-sans transition-colors duration-300">
      
      {/* Mobile Sidebar Overlay */}
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
               <Building2 className="w-5 h-5 text-slate-400" />
            </div>
            <div className="flex-1 overflow-hidden">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate" title="Zuna Global HQ">Zuna Global HQ</h3>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">SUPER ADMIN</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path || (link.path !== '/super' && location.pathname.startsWith(link.path));
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
                    layoutId="activeTab" 
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
                 S
               </div>
               <div className="truncate">
                 <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition-colors truncate">Super Admin</p>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">SUPER ADMIN</p>
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

            {/* Search Bar */}
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

            {/* Profile Dropdown Placeholder */}
            <button 
              onClick={() => navigate('/super/settings')}
              className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              <div className="hidden md:block text-right">
                <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">Super Admin</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Zuna Global</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-md">
                SA
              </div>
            </button>
          </div>
        </header>

        {/* Page Content Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 relative">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] dark:opacity-[0.05] pointer-events-none mix-blend-overlay"></div>
          
          <div className="max-w-7xl mx-auto relative">
            <Routes>
              <Route path="/" element={<SuperDashboardHome />} />
              <Route path="/colleges" element={<SuperColleges />} />
              <Route path="/admins" element={<SuperAdmins />} />
              <Route path="/modules/*" element={<GlobalModulesDashboard />} />
              <Route path="/settings" element={<SuperSettings />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

// Placeholder for the main dashboard content
const SuperDashboardHome = () => {
  const stats = useDashboardStats(null, true);
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Global Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Monitor all institutions across the Zuna ecosystem.</p>
        </div>
        <Link to="/super/colleges" className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all">
          <Building2 className="w-4 h-4" />
          Onboard New College
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
        {[
          { title: 'Total Colleges', value: stats.isLoading ? '...' : stats.totalColleges, trend: 'Registered institutions', icon: Building2, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Active Students', value: 'N/A', trend: '', icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Total Revenue', value: 'N/A', trend: '', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { title: 'System Health', value: 'N/A', trend: '', icon: Settings, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
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
            
            {/* Decorative gradient blur */}
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity rounded-full ${stat.bg.split(' ')[0].replace('50', '500')}`} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SuperAdminLayout;
