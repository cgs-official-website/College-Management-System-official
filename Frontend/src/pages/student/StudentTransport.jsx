import React from 'react';
import { motion } from 'framer-motion';
import { Bus, MapPin, Phone, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { useStudentTransport } from '../../hooks/useStudentPortal';

const StudentTransport = () => {
  const { data: transportData, isLoading } = useStudentTransport();
  const transport = transportData?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Transport & Bus Routes</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">View your assigned college transit route and pickup stop.</p>
      </div>

      {transport?.transportRequired === 'Yes' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 flex items-center justify-center">
                <Bus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Active Bus Pass</h3>
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Allocated Route
                </span>
              </div>
            </div>

            <div className="space-y-3 divide-y divide-slate-100 dark:divide-white/5 text-sm">
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Route Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{transport.route}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Pickup / Drop Point:</span>
                <span className="font-bold text-slate-900 dark:text-white">{transport.pickupPoint}</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Transit Schedule</h3>
                <p className="text-xs text-slate-500">Daily campus arrival & departure</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Buses arrive at campus by 8:45 AM and depart at 4:30 PM. Please be at your designated pickup point 10 minutes prior to scheduled departure.
            </p>
          </motion.div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bus className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Transport Subscription</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
            You do not currently have an active bus route subscription. To subscribe for college transport service, contact the transport desk or submit an inquiry via Helpdesk.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default StudentTransport;
