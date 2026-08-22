import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Mail, Phone, Building, Calendar, Shield, Briefcase, User } from 'lucide-react';

export function StaffDetailsModal({ isOpen, onClose, staff }) {
  if (!staff) return null;

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Staff Profile"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-6">
        <div className="flex items-start gap-6 bg-slate-50 dark:bg-white/5 p-6 rounded-2xl border border-slate-100 dark:border-white/10">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-emerald-600 flex items-center justify-center text-white font-bold text-3xl shadow-lg shrink-0">
            {staff.firstName?.charAt(0) || staff.name?.charAt(0) || 'U'}{staff.lastName?.charAt(0) || ''}
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {staff.firstName || staff.name} {staff.lastName || ''}
            </h2>
            <div className="flex items-center gap-2 mt-2 text-slate-600 dark:text-slate-300">
              <Briefcase className="w-4 h-4 text-primary-500" />
              <span className="font-medium">{staff.designation || staff.role || 'Staff Member'}</span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-slate-500 dark:text-slate-400">
              <Building className="w-4 h-4 text-emerald-500" />
              <span>{staff.department || 'No Department'}</span>
            </div>
            
            <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10">
              <span className={`w-2 h-2 rounded-full ${staff.status === 'active' || staff.accountStatus === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
              <span className={staff.status === 'active' || staff.accountStatus === 'active' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}>
                {(staff.status || staff.accountStatus || 'Unknown').replace('_', ' ')}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-[#0A0F1C] p-4 rounded-xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1 text-sm">
              <Mail className="w-4 h-4" /> Email Address
            </div>
            <p className="font-medium text-slate-900 dark:text-white break-all">
              {staff.email || 'N/A'}
            </p>
          </div>

          <div className="bg-white dark:bg-[#0A0F1C] p-4 rounded-xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1 text-sm">
              <Phone className="w-4 h-4" /> Phone Number
            </div>
            <p className="font-medium text-slate-900 dark:text-white">
              {staff.phone || 'N/A'}
            </p>
          </div>

          <div className="bg-white dark:bg-[#0A0F1C] p-4 rounded-xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1 text-sm">
              <Calendar className="w-4 h-4" /> Joined Date
            </div>
            <p className="font-medium text-slate-900 dark:text-white">
              {staff.joinDate || staff.createdAt ? new Date(staff.joinDate || staff.createdAt).toLocaleDateString() : 'N/A'}
            </p>
          </div>

          <div className="bg-white dark:bg-[#0A0F1C] p-4 rounded-xl border border-slate-200 dark:border-white/10">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-1 text-sm">
              <Shield className="w-4 h-4" /> System Role
            </div>
            <p className="font-medium text-slate-900 dark:text-white capitalize">
              {staff.role || 'Staff'}
            </p>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
