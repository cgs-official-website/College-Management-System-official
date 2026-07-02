import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bus, 
  MapPin, 
  QrCode, 
  Settings,
  AlertTriangle,
  CheckCircle2,
  Users,
  X,
  Navigation2
} from 'lucide-react';

const TransportDashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Transport Tracking</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage school buses, routes, and daily transport operations.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center gap-2"
        >
          <MapPin className="w-4 h-4" />
          Live GPS Tracking
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {[
          { title: 'Total Buses', value: '12', icon: Bus, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Active Routes', value: '8', icon: MapPin, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Registered Students', value: '340', icon: Users, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'QR Scans Today', value: '512', icon: QrCode, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
        ].map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden group"
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
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity rounded-full ${stat.bg.split(' ')[0].replace('50', '500')}`} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Fleet Map Placeholder */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Fleet Status</h2>
            <div className="flex gap-2">
               <span className="flex items-center gap-1 text-xs font-medium text-slate-500"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> On Time</span>
               <span className="flex items-center gap-1 text-xs font-medium text-slate-500"><div className="w-2 h-2 rounded-full bg-rose-500"></div> Delayed</span>
            </div>
          </div>
          
          <div className="flex-1 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 relative overflow-hidden min-h-[300px] flex items-center justify-center flex-col gap-4">
             <div className="absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cartographer.png")' }}></div>
             <MapPin className="w-12 h-12 text-slate-400 animate-bounce" />
             <p className="text-slate-500 font-medium">Google Maps Integration Mockup</p>
             <button className="px-4 py-2 bg-white dark:bg-[#0A0F1C] rounded-lg shadow text-sm font-bold border border-slate-200 dark:border-white/10">Configure API Key</button>
          </div>
        </motion.div>

        {/* Fleet Alerts */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fleet Alerts</h2>
          </div>
          <div className="space-y-4">
            {[
              { route: 'Route 4 (City Center)', issue: 'Traffic Delay', severity: 'Medium', time: '10 mins ago' },
              { route: 'Route 7 (North Park)', issue: 'Bus Break Down', severity: 'High', time: '1 hr ago' },
            ].map((alert, i) => (
              <div key={i} className={`flex flex-col gap-2 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border-l-4 ${alert.severity === 'High' ? 'border-rose-500' : 'border-amber-500'}`}>
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{alert.issue}</h4>
                  <span className="text-xs text-slate-500">{alert.time}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">{alert.route}</span>
                  <span className={`font-bold ${alert.severity === 'High' ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`}>{alert.severity} Priority</span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-colors">
            View Log Book
          </button>
        </motion.div>
      </div>

      {/* Live GPS Tracking Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-[#0A0F1C] w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Fleet Tracking</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Real-time GPS coordinates of 38 active buses.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 flex flex-col md:flex-row min-h-0">
                {/* Map Area */}
                <div className="flex-1 bg-slate-100 dark:bg-[#0F172A] relative flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 opacity-20 dark:opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cartographer.png")' }}></div>
                  

                  <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-[#0A0F1C]/90 backdrop-blur p-3 rounded-xl shadow-lg border border-slate-200 dark:border-white/10 text-xs font-bold space-y-2">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary-500"></div> On Route</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div> Arrived</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-amber-500"></div> Delayed</div>
                  </div>
                </div>

                {/* Sidebar */}
                <div className="w-full md:w-80 bg-white dark:bg-[#0A0F1C] border-l border-slate-100 dark:border-white/5 flex flex-col shrink-0">
                  <div className="p-4 border-b border-slate-100 dark:border-white/5">
                    <input type="text" placeholder="Search bus or route..." className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white text-sm" />
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col items-center justify-center text-center">
                    <Bus className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No active buses on route</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TransportDashboard;
