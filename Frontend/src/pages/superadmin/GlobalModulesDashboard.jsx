import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, ToggleLeft, ToggleRight, Building, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

const GlobalModulesDashboard = () => {
  const [modules, setModules] = useState([]); // Firebase-ready state

  const toggleModule = (id) => {
    setModules(modules.map(m => {
      if (m.id === id) {
        const newStatus = !m.enabled;
        toast.success(`${m.name} is now ${newStatus ? 'Enabled' : 'Disabled'} globally.`);
        return { ...m, enabled: newStatus };
      }
      return m;
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Global Modules</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage the availability of Core and Pro modules across all tenant colleges.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {[
          { title: 'Total Modules', value: '0', icon: Package, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Active Pro Modules', value: '0', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Registered Colleges', value: '0', icon: Building, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
        ].map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow"
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

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 dark:border-white/5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Module Configuration</h2>
        </div>
        <div className="overflow-x-auto">
          {modules.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-100 dark:border-white/5 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                <tr>
                  <th className="px-6 py-4">Module Name</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Global Status</th>
                  <th className="px-6 py-4">Adoption Rate</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {modules.map((module, idx) => (
                  <tr key={module.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 dark:text-white flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        module.type === 'Core' ? 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300' : 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                      }`}>
                        <Package className="w-4 h-4" />
                      </div>
                      {module.name}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        module.type === 'Core' 
                          ? 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400'
                          : 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400'
                      }`}>
                        {module.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${module.enabled ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}></div>
                        <span className={`font-bold ${module.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                          {module.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-slate-100 dark:bg-white/5 rounded-full h-1.5 overflow-hidden">
                          <div className={`h-full rounded-full ${module.type === 'Core' ? 'bg-slate-400' : 'bg-primary-500'}`} style={{ width: `${module.usage}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{module.usage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => toggleModule(module.id)}
                        className={`p-1.5 rounded-lg transition-colors ${module.enabled ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                      >
                        {module.enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Modules Configured</h3>
              <p className="text-slate-500 dark:text-slate-400">There are no global modules configured in the system yet.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default GlobalModulesDashboard;
