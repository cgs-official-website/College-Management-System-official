import React from 'react';
import { motion } from 'framer-motion';
import { Home, DoorClosed, Phone, AlertCircle, User, ShieldCheck } from 'lucide-react';
import { useParentHostel } from '../../hooks/useParentPortal';
import { useParentChild } from '../../contexts/ParentChildContext';

export default function ParentHostel() {
  const { activeChildId } = useParentChild();
  const { data, isLoading, isError } = useParentHostel(activeChildId);

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="h-10 w-64 bg-slate-200 dark:bg-white/10 rounded-xl animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          <div className="h-64 bg-white dark:bg-[#0A0F1C] rounded-3xl border border-slate-200 dark:border-white/10" />
          <div className="h-64 bg-white dark:bg-[#0A0F1C] rounded-3xl border border-slate-200 dark:border-white/10" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] bg-white dark:bg-[#0A0F1C] rounded-3xl border border-slate-200 dark:border-white/10 p-12 text-center max-w-2xl mx-auto">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Unable to Load Hostel Info</h2>
        <p className="text-slate-500 text-sm">Failed to retrieve hostel room allocation. Please try again later.</p>
      </div>
    );
  }

  const isAllocated = data?.isAllocated;
  const room = data?.roomDetails;
  const warden = data?.wardenContact;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Child's Hostel</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Review campus accommodation allocation, room number, and warden incharge details.</p>
        </div>
      </div>

      {!isAllocated || !room ? (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm overflow-hidden p-12 text-center">
          <div className="w-20 h-20 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <DoorClosed className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Hostel Room Assigned</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Your child is currently registered as a Day Scholar or has not been assigned to a campus hostel block. Contact the hostel administration if you wish to apply for accommodation.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Room Allocation Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 lg:p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Room Allocation</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Current Semester Accommodation</p>
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-white/5">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Hostel Block</span>
                <span className="font-bold text-slate-900 dark:text-white">{room.blockName}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Room Number</span>
                <span className="font-bold text-teal-600 dark:text-teal-400 text-lg">Room {room.roomNumber}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-slate-500 dark:text-slate-400">Occupancy Type</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">{room.type}</span>
              </div>
            </div>
          </motion.div>

          {/* Warden Contact Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm p-6 lg:p-8 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Hostel Warden Incharge</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Block Supervision & Support</p>
                </div>
              </div>

              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3 py-2">
                  <User className="w-5 h-5 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Warden Name</p>
                    <p className="font-bold text-slate-900 dark:text-white">{warden?.name || 'Warden Office'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 py-2">
                  <Phone className="w-5 h-5 text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500">Official Contact</p>
                    <p className="font-bold text-teal-600 dark:text-teal-400">{warden?.phone || 'Contact College Admin'}</p>
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 mt-6">For leave permissions or room change requests, contact the warden office during visiting hours.</p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
