import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  Home, 
  Users, 
  DoorClosed, 
  Wrench, 
  CreditCard,
  AlertCircle,
  X
} from 'lucide-react';

const HostelDashboard = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAllocateRoom = (e) => {
    e.preventDefault();
    toast.success('Room allocated successfully!');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Hostel Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage rooms, allocations, fees, and maintenance.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center gap-2"
        >
          <DoorClosed className="w-4 h-4" />
          Allocate Room
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {[
          { title: 'Total Residents', value: '450', icon: Users, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Available Rooms', value: '32', icon: DoorClosed, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Pending Dues', value: '₹1,20,000', icon: CreditCard, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Open Maintenance', value: '5', icon: Wrench, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Room Availability */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Block Occupancy</h2>
            <button className="text-primary-600 dark:text-primary-400 text-sm font-bold hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {[
              { name: 'A Block (Boys)', occupied: 180, total: 200, status: 'Active' },
              { name: 'B Block (Boys)', occupied: 150, total: 150, status: 'Full' },
              { name: 'C Block (Girls)', occupied: 120, total: 150, status: 'Active' }
            ].map((block, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-xl">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{block.name}</h4>
                  <p className="text-sm text-slate-500">{block.occupied} / {block.total} Students</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${block.status === 'Full' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'}`}>
                  {block.status}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recent Maintenance Requests */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Maintenance Requests</h2>
          </div>
          <div className="space-y-4">
            {[
              { room: 'Room 204, A Block', issue: 'AC Not Cooling', status: 'Pending', date: 'Today' },
              { room: 'Room 105, C Block', issue: 'Leaking Tap', status: 'In Progress', date: 'Yesterday' },
              { room: 'Room 312, B Block', issue: 'Broken Chair', status: 'Pending', date: '2 days ago' }
            ].map((req, i) => (
              <div key={i} className="flex flex-col gap-2 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border-l-4 border-amber-500">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm">{req.issue}</h4>
                  <span className="text-xs text-slate-500">{req.date}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">{req.room}</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">{req.status}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-colors">
            View All Requests
          </button>
        </motion.div>
      </div>

      {/* Allocate Room Modal */}
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
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Allocate Room to Student</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAllocateRoom} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Search Student</label>
                  <input type="text" placeholder="Enter student name or roll number..." className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Hostel Block</label>
                    <select className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white">
                      <option>A Block (Boys)</option>
                      <option>B Block (Boys)</option>
                      <option>C Block (Girls)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Room Type</label>
                    <select className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white">
                      <option>2 Sharing (AC)</option>
                      <option>3 Sharing (Non-AC)</option>
                      <option>Single Room (AC)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Room Number</label>
                    <input type="text" placeholder="e.g. 204" className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white" required />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Allocation Date</label>
                    <input type="date" className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all dark:text-white" required />
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all">Confirm Allocation</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HostelDashboard;
