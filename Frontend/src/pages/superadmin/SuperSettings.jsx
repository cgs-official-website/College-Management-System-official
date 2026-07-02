import React, { useState } from 'react';
import { 
  Settings, 
  Globe, 
  Save,
  CheckCircle2
} from 'lucide-react';

const SuperSettings = () => {
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mt-2">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">System Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage global configurations for the Zuna ecosystem.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 md:p-8 shadow-sm mt-8">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary-500" />
          General Configuration
        </h2>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Platform Name</label>
              <input
                type="text"
                defaultValue="Zuna Core ERP"
                className="block w-full px-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Support Email</label>
              <input
                type="email"
                defaultValue="support@zuna.app"
                className="block w-full px-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Platform Maintenance Mode</label>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">Enable Maintenance</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Lock down the system for all users except SuperAdmins.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Default Region / Timezone</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Globe className="h-5 w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                </div>
                <select className="block w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all appearance-none cursor-pointer">
                  <option>Asia/Kolkata (IST)</option>
                  <option>America/New_York (EST)</option>
                  <option>Europe/London (GMT)</option>
                  <option>Australia/Sydney (AEST)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex justify-end">
            <button
              type="submit"
              className={`flex items-center gap-2 px-8 py-3 text-white text-sm font-bold rounded-xl shadow-lg transition-all ${
                isSaved ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' : 'bg-primary-600 hover:bg-primary-700 shadow-primary-500/30'
              }`}
            >
              {isSaved ? (
                <><CheckCircle2 className="w-5 h-5" /> Saved Successfully</>
              ) : (
                <><Save className="w-5 h-5" /> Save Changes</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SuperSettings;
