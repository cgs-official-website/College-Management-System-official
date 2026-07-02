import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  Smartphone, 
  Apple, 
  Download, 
  BellRing,
  Paintbrush,
  Settings,
  Star,
  X
} from 'lucide-react';

const MobileAppsDashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleSendNotification = (e) => {
    e.preventDefault();
    toast.success('Push notification sent to queue!');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Mobile Apps Center</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage i-Genius (Students/Parents) and ZenoxERP (Staff) apps.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg transition-all flex items-center gap-2"
        >
          <BellRing className="w-4 h-4" />
          Send Push Notification
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {[
          { title: 'Total Downloads', value: '0', icon: Download, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Active Students', value: '0', icon: Smartphone, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'App Rating', value: '0.0', icon: Star, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Notifications Sent', value: '0', icon: BellRing, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
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
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2 flex items-center gap-2">
                  {stat.value}
                  {stat.icon === Star && <Star className="w-5 h-5 text-primary-500 fill-primary-500" />}
                </h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity rounded-full ${stat.bg.split(' ')[0].replace('50', '500')}`} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* App Configuration */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">White-label Branding</h2>
            <button className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <Settings className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 border border-slate-200 dark:border-white/10 rounded-xl bg-slate-50 dark:bg-white/5">
              <div className="w-16 h-16 bg-white dark:bg-[#0A0F1C] rounded-2xl shadow-sm border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">
                <img src="/logo.png" alt="App Icon" className="w-10 h-10 object-contain" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 dark:text-white">App Icon</h3>
                <p className="text-xs text-slate-500 mb-2">Recommended size: 1024x1024px PNG</p>
                <button className="text-xs font-bold text-primary-600 dark:text-primary-400">Update Icon</button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Theme Colors</h3>
              <div className="flex gap-4">
                <div className="flex flex-col gap-1 items-center">
                  <div className="w-12 h-12 rounded-full bg-[#0ea5e9] shadow-inner border-2 border-white dark:border-[#0A0F1C] cursor-pointer hover:scale-110 transition-transform"></div>
                  <span className="text-[10px] font-bold text-slate-500">Primary</span>
                </div>
                <div className="flex flex-col gap-1 items-center">
                  <div className="w-12 h-12 rounded-full bg-[#10b981] shadow-inner border-2 border-white dark:border-[#0A0F1C] cursor-pointer hover:scale-110 transition-transform"></div>
                  <span className="text-[10px] font-bold text-slate-500">Secondary</span>
                </div>
                <div className="flex flex-col gap-1 items-center">
                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center border-2 border-dashed border-slate-300 dark:border-white/20 cursor-pointer hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
                    <Paintbrush className="w-4 h-4 text-slate-400" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">Custom</span>
                </div>
              </div>
            </div>
            
            <button className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl transition-colors">
              Save App Configuration
            </button>
          </div>
        </motion.div>

        {/* Live Preview Mockup */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-slate-900 rounded-2xl p-6 shadow-sm relative overflow-hidden flex items-center justify-center min-h-[400px]"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 to-primary-700/20"></div>
          
          {/* Mock Phone Frame */}
          <div className="w-[240px] h-[480px] bg-black rounded-[3rem] p-2 relative shadow-2xl border-4 border-slate-800 z-10">
            {/* Screen */}
            <div className="w-full h-full bg-white rounded-[2.5rem] overflow-hidden relative flex flex-col">
              {/* Notch */}
              <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
                <div className="w-24 h-4 bg-black rounded-b-xl"></div>
              </div>
              
              {/* App Header */}
              <div className="bg-primary-500 pt-8 pb-4 px-4 text-white">
                <div className="flex justify-between items-center">
                  <div className="font-bold">i-Genius</div>
                  <div className="w-6 h-6 rounded-full bg-white/20"></div>
                </div>
              </div>
              
              {/* App Content Area */}
              <div className="flex-1 bg-slate-50 p-4 space-y-3">
                <div className="h-20 bg-white rounded-xl shadow-sm"></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-24 bg-white rounded-xl shadow-sm"></div>
                  <div className="h-24 bg-white rounded-xl shadow-sm"></div>
                  <div className="h-24 bg-white rounded-xl shadow-sm"></div>
                  <div className="h-24 bg-white rounded-xl shadow-sm"></div>
                </div>
              </div>
              
              {/* App Tab Bar */}
              <div className="h-14 bg-white border-t border-slate-100 flex justify-around items-center px-2">
                <div className="w-8 h-8 rounded bg-slate-200"></div>
                <div className="w-8 h-8 rounded bg-slate-100"></div>
                <div className="w-8 h-8 rounded bg-slate-100"></div>
                <div className="w-8 h-8 rounded bg-slate-100"></div>
              </div>
            </div>
          </div>
          
          <div className="absolute bottom-4 right-4 flex gap-2 z-10">
            <div className="p-2 bg-white/10 backdrop-blur rounded-lg"><Apple className="w-5 h-5 text-white" /></div>
            <div className="p-2 bg-white/10 backdrop-blur rounded-lg"><Smartphone className="w-5 h-5 text-white" /></div>
          </div>
        </motion.div>
      </div>

      {/* Send Push Notification Modal */}
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
              className="relative bg-white dark:bg-[#0A0F1C] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Send Push Notification</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSendNotification} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Notification Title</label>
                  <input type="text" placeholder="e.g. Tomorrow is a Holiday" className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Message Body</label>
                  <textarea rows="3" placeholder="Enter the full notification message here..." className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white resize-none" required></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Target App</label>
                    <select className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white">
                      <option>i-Genius (Students & Parents)</option>
                      <option>ZenoxERP (Staff)</option>
                      <option>All Apps</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                    <select className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white">
                      <option>Standard</option>
                      <option>High Priority (Sound Alert)</option>
                    </select>
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all">Send Now</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileAppsDashboard;
