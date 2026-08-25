import React from 'react';
import { motion } from 'framer-motion';
import { Home, DoorClosed, Users, Phone, Loader2, Bed, CheckCircle2 } from 'lucide-react';
import { useStudentHostel } from '../../hooks/useStudentPortal';

const StudentHostel = () => {
  const { data: hostelData, isLoading } = useStudentHostel();
  const hostel = hostelData?.data;

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
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Hostel & Residence</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">View your campus residential room allocation and block details.</p>
      </div>

      {hostel?.isHosteller ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 flex items-center justify-center">
                <Bed className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Assigned Residence</h3>
                <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active Allotment
                </span>
              </div>
            </div>

            <div className="space-y-3 divide-y divide-slate-100 dark:divide-white/5 text-sm">
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Hostel Block:</span>
                <span className="font-bold text-slate-900 dark:text-white">{hostel.blockName}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Room Number:</span>
                <span className="font-bold text-slate-900 dark:text-white">{hostel.roomNo}</span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Residence Category:</span>
                <span className="font-bold text-slate-900 dark:text-white">{hostel.residenceType}</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Residential Office</h3>
                <p className="text-xs text-slate-500">Hostel warden & support contact</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              For room issues, maintenance requests, or night-out passes, please contact your block resident warden or raise a ticket under <strong>Complaints</strong>.
            </p>
          </motion.div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <DoorClosed className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">Day Scholar Status</h3>
          <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm mx-auto">
            You are currently registered as a Day Scholar. If you require on-campus hostel accommodation, please contact the admissions & hostel office.
          </p>
        </motion.div>
      )}
    </div>
  );
};

export default StudentHostel;
