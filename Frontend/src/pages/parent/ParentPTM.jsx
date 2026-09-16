import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Calendar, 
  Clock, 
  Video, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  MessageSquare, 
  Loader2, 
  ExternalLink,
  GraduationCap
} from 'lucide-react';
import { useParentPTM, useBookPTM } from '../../hooks/useParentPortal';
import { useParentChild } from '../../contexts/ParentChildContext';
import { toast } from 'react-hot-toast';

export default function ParentPTM() {
  const { activeChildId, activeChild } = useParentChild();
  const { data: ptmData, isLoading } = useParentPTM(activeChildId);
  const bookMutation = useBookPTM();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    teacherId: '',
    preferredDate: '',
    preferredTime: '10:00 AM - 10:30 AM',
    subject: 'Academic Progress Review',
    notes: ''
  });

  const meetings = ptmData?.meetings || [];
  const availableTeachers = ptmData?.availableTeachers || [];

  const handleBookMeeting = async (e) => {
    e.preventDefault();
    if (!formData.teacherId || !formData.preferredDate || !formData.subject) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      await bookMutation.mutateAsync({
        teacherId: formData.teacherId,
        preferredDate: formData.preferredDate,
        preferredTime: formData.preferredTime,
        subject: formData.subject,
        notes: formData.notes
      });

      toast.success('Consultation meeting requested successfully!');
      setIsModalOpen(false);
      setFormData({
        teacherId: '',
        preferredDate: '',
        preferredTime: '10:00 AM - 10:30 AM',
        subject: 'Academic Progress Review',
        notes: ''
      });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to book meeting');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading parent-teacher meeting schedules...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Parent-Teacher Meetings (PTM)
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Book one-on-one academic reviews and consultations with teachers for{' '}
            <span className="font-bold text-teal-600 dark:text-teal-400">
              {activeChild?.name || 'your child'}
            </span>.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Request Consultation
        </button>
      </div>

      {/* Active Consultation Cards */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Scheduled Consultations</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Upcoming meetings with faculty advisors</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 rounded-full">
            {meetings.length} Scheduled
          </span>
        </div>

        {meetings.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Scheduled Meetings</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              You do not have any upcoming parent-teacher meetings scheduled for {activeChild?.name || 'this student'}.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {meetings.map((m) => (
              <div key={m.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 font-bold">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">{m.teacherName}</h4>
                      <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                        {m.status}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {m.teacherDesignation} • {m.subject}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(m.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {m.time}
                      </span>
                      <span className="flex items-center gap-1 font-medium text-teal-600 dark:text-teal-400">
                        <Video className="w-3.5 h-3.5" />
                        {m.mode}
                      </span>
                    </div>
                  </div>
                </div>

                {m.meetingLink && (
                  <a
                    href={m.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-teal-50 dark:bg-teal-500/10 hover:bg-teal-100 dark:hover:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Join Video Call
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Faculty Advisory Directory */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
          Assigned Department Faculty
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Instructors and course coordinators currently teaching in {activeChild?.department || 'the department'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableTeachers.map((t) => (
            <div key={t.id} className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {t.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{t.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{t.designation}</p>
                <p className="text-[10px] text-teal-600 dark:text-teal-400 font-medium truncate">{t.department}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Book Meeting Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-hidden relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Request PTM Consultation</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleBookMeeting} className="space-y-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Select Teacher / Mentor *
                  </label>
                  <select
                    value={formData.teacherId}
                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="">-- Choose Instructor --</option>
                    {availableTeachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.designation})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Discussion Subject *
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="e.g. Midterm Grades & Classroom Engagement"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-medium focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Preferred Date *
                    </label>
                    <input
                      type="date"
                      value={formData.preferredDate}
                      onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                      Time Slot
                    </label>
                    <select
                      value={formData.preferredTime}
                      onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                    >
                      <option value="10:00 AM - 10:30 AM">10:00 AM - 10:30 AM</option>
                      <option value="11:30 AM - 12:00 PM">11:30 AM - 12:00 PM</option>
                      <option value="02:30 PM - 03:00 PM">02:30 PM - 03:00 PM</option>
                      <option value="04:00 PM - 04:30 PM">04:00 PM - 04:30 PM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Agenda / Questions for Teacher
                  </label>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Specific academic performance questions or topics you'd like to discuss..."
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="submit"
                    disabled={bookMutation.isPending}
                    className="flex-1 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {bookMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Schedule Consultation'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
