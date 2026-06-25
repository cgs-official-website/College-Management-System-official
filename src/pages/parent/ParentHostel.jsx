import React from 'react';
import { motion } from 'framer-motion';
import { Home, DoorClosed, Phone } from 'lucide-react';

const ParentHostel = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Child's Hostel</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View your child's hostel room details and warden contact.</p>
        </div>
      </div>

      {/* Room Details */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Room Allocation</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center p-6">
          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
            <DoorClosed className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Room Assigned</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Your child's hostel room allocation (block, room number, roommate details) will appear here once assigned by the admin.</p>
        </div>
      </motion.div>

      {/* Warden Contact */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Warden Contact</h2>
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center p-6">
          <div className="w-14 h-14 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
            <Phone className="w-7 h-7 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Warden contact information will be available once hostel details are configured.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default ParentHostel;
