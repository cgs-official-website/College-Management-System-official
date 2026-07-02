import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, AlertCircle } from 'lucide-react';

export default function ParentAttendance() {
  const { userData } = useAuth();

  if (!userData?.studentId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white dark:bg-[#0A0F1C] rounded-3xl border border-slate-200 dark:border-white/10 p-12 text-center">
        <AlertCircle className="w-16 h-16 text-amber-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">No Child Linked</h2>
        <p className="text-slate-500">Please contact the administration to link your child's profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Attendance Record</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">View your child's daily presence and absence history.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-12 text-center mt-6">
        <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Attendance Data Unavailable</h3>
        <p className="text-slate-500">The attendance tracking module for parents is currently being updated. Check back later for detailed reports.</p>
      </div>
    </div>
  );
}
