import React from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Package, Search } from 'lucide-react';

const StoreDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Campus Store</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Browse and request campus uniforms, textbooks, and merchandise.</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-[#0A0F1C] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search items..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium dark:text-white transition-all"
          />
        </div>
      </div>

      {/* Empty Catalog */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="flex flex-col items-center justify-center py-20 text-center p-6">
          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
            <Package className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">Store Catalog Empty</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Items will appear here once the college admin adds products to the campus store inventory.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default StoreDashboard;
