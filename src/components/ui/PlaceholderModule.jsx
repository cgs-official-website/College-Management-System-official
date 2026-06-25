import React from 'react';
import { RefreshCw } from 'lucide-react';

export const PlaceholderModule = ({ title, icon: Icon, description }) => {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center max-w-md mx-auto">
      <div className="w-20 h-20 bg-primary-50 dark:bg-primary-500/10 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-primary-100 dark:border-primary-500/20">
        <Icon className="w-10 h-10 text-primary-500" />
      </div>
      <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white mb-3 tracking-tight">{title}</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
        {description}
      </p>
      <button className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center gap-2">
        <RefreshCw className="w-4 h-4" />
        Sync Module Data
      </button>
    </div>
  );
};

export default PlaceholderModule;
