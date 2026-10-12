import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Loader2, Plus, Trash2, Video, MapPin, CalendarClock, UserPlus, X, Check } from 'lucide-react';

const fieldCls =
  'w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white';
const labelCls = 'block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1';
const cardCls =
  'bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm';

const toArray = (res) => {
  const raw = res?.data ?? res;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.students)) return raw.students;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
};
const errMsg = (err) => err.response?.data?.error?.message || err.message || 'Something went wrong';
const dayOf = (d) => String(d).slice(0, 10);
const studentLabel = (s) => {
  const name = s.user?.name || [s.firstName, s.lastName].filter(Boolean).join(' ') || s.name || 'Student';
  return s.rollNumber ? `${name} (${s.rollNumber})` : name;
};

const statusCls = (status) =>
  status === 'available' || status === 'completed'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
    : status === 'cancelled'
    ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';

const emptySlot = { date: '', startTime: '', endTime: '' };
const emptyAssign = { studentId: '', mode: 'online', venue: '', agenda: '' };

export default function TeacherPtm() {
  const queryClient = useQueryClient();
  const [slotForm, setSlotForm] = useState(emptySlot);
  const [assignSlot, setAssignSlot] = useState(null);
  const [assignForm, setAssignForm] = useState(emptyAssign);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['ptm-slots'] });
    queryClient.invalidateQueries({ queryKey: ['ptm-meetings'] });
  };

  const { data: slots = [], isLoading: slotsLoading } = useQuery({
    queryKey: ['ptm-slots'],
    queryFn: async () => toArray(await api.get('/ptm/slots')),
  });

  const { data: meetings = [], isLoading: meetingsLoading } = useQuery({
    queryKey: ['ptm-meetings'],
    queryFn: async () => toArray(await api.get('/ptm/meetings')),
  });

  const { data: students = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['ptm-students'],
    queryFn: async () => toArray(await api.get('/ptm/students')),
    enabled: !!assignSlot,
  });

  const createSlotMutation = useMutation({
    mutationFn: (payload) => api.post('/ptm/slots', payload),
    onSuccess: () => {
      refresh();
      toast.success('Slot added');
      setSlotForm(emptySlot);
    },
    onError: (err) => toast.error(errMsg(err)),
  });

  const deleteSlotMutation = useMutation({
    mutationFn: (id) => api.delete(`/ptm/slots/${id}`),
    onSuccess: () => {
      refresh();
      toast.success('Slot deleted');
    },
    onError: (err) => toast.error(errMsg(err)),
  });

  const assignMutation = useMutation({
    mutationFn: (payload) => api.post('/ptm/meetings', payload),
    onSuccess: () => {
      refresh();
      toast.success('Meeting assigned to student');
      setAssignSlot(null);
      setAssignForm(emptyAssign);
    },
    onError: (err) => toast.error(errMsg(err)),
  });

  const updateMeetingMutation = useMutation({
    mutationFn: ({ id, status }) => api.patch(`/ptm/meetings/${id}`, { status }),
    onSuccess: () => {
      refresh();
      toast.success('Meeting updated');
    },
    onError: (err) => toast.error(errMsg(err)),
  });

  const handleCreateSlot = (e) => {
    e.preventDefault();
    if (!slotForm.date || !slotForm.startTime || !slotForm.endTime) {
      toast.error('Please fill date, start time and end time');
      return;
    }
    if (slotForm.endTime <= slotForm.startTime) {
      toast.error('End time must be after start time');
      return;
    }
    createSlotMutation.mutate(slotForm);
  };

  const handleAssign = (e) => {
    e.preventDefault();
    if (!assignForm.studentId) {
      toast.error('Please select a student');
      return;
    }
    if (assignForm.mode === 'offline' && !assignForm.venue.trim()) {
      toast.error('Venue is required for offline meetings');
      return;
    }
    assignMutation.mutate({
      slotId: assignSlot.id,
      studentId: assignForm.studentId,
      mode: assignForm.mode,
      venue: assignForm.mode === 'offline' ? assignForm.venue.trim() : undefined,
      agenda: assignForm.agenda.trim() || undefined,
    });
  };

  const closeModal = () => {
    setAssignSlot(null);
    setAssignForm(emptyAssign);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Parent-Teacher Meetings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Create your available slots and assign meetings to students.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Add slot form */}
        <motion.form
          onSubmit={handleCreateSlot}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className={`lg:col-span-2 ${cardCls} p-6 space-y-4 h-fit`}
        >
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Add Availability Slot</h2>
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              value={slotForm.date}
              onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })}
              className={fieldCls}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Start Time</label>
              <input
                type="time"
                value={slotForm.startTime}
                onChange={(e) => setSlotForm({ ...slotForm, startTime: e.target.value })}
                className={fieldCls}
                required
              />
            </div>
            <div>
              <label className={labelCls}>End Time</label>
              <input
                type="time"
                value={slotForm.endTime}
                onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                className={fieldCls}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={createSlotMutation.isPending}
            className="w-full px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {createSlotMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Slot
          </button>
        </motion.form>

        {/* Slots list */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`lg:col-span-3 ${cardCls} overflow-hidden`}
        >
          <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">My Slots</h2>
            <span className="text-xs font-bold px-2 py-0.5 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full">
              {slots.length}
            </span>
          </div>
          <div className="p-6 max-h-[360px] overflow-y-auto">
            {slotsLoading ? (
              <div className="py-10 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-primary-500" /></div>
            ) : slots.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <CalendarClock className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">No slots yet</p>
                <p className="text-xs text-slate-500 mt-1">Add your first availability slot.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {slots.map((s) => (
                  <div key={s.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{dayOf(s.date)}</p>
                      <p className="text-xs text-slate-500">{s.startTime} - {s.endTime}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusCls(s.status)}`}>
                        {s.status}
                      </span>
                      {s.status === 'available' && (
                        <button
                          onClick={() => setAssignSlot(s)}
                          className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" /> Assign
                        </button>
                      )}
                      {s.status !== 'booked' && (
                        <button
                          onClick={() => deleteSlotMutation.mutate(s.id)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg"
                          title="Delete slot"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Meetings list */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`${cardCls} overflow-hidden`}
      >
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Assigned Meetings</h2>
          <span className="text-xs font-bold px-2 py-0.5 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full">
            {meetings.length}
          </span>
        </div>
        <div className="p-6">
          {meetingsLoading ? (
            <div className="py-10 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-primary-500" /></div>
          ) : meetings.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No meetings assigned yet.</p>
          ) : (
            <div className="space-y-3">
              {meetings.map((m) => (
                <div key={m.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {m.student ? studentLabel(m.student) : 'Student'}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusCls(m.status)}`}>
                      {m.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {m.slot ? `${dayOf(m.slot.date)} • ${m.slot.startTime} - ${m.slot.endTime}` : ''}
                  </p>
                  {m.agenda && <p className="text-xs text-slate-700 dark:text-slate-300">{m.agenda}</p>}
                  <div className="flex flex-wrap items-center gap-2">
                    {m.mode === 'online' && m.meetingLink ? (
                      <a
                        href={m.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                      >
                        <Video className="w-3.5 h-3.5" /> Join Meeting
                      </a>
                    ) : (
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {m.venue || 'Offline'}
                      </span>
                    )}
                    {m.status === 'scheduled' && (
                      <>
                        <button
                          onClick={() => updateMeetingMutation.mutate({ id: m.id, status: 'completed' })}
                          className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" /> Mark Completed
                        </button>
                        <button
                          onClick={() => updateMeetingMutation.mutate({ id: m.id, status: 'cancelled' })}
                          className="px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 text-xs font-bold rounded-lg flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" /> Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>

      {/* Assign modal */}
      {assignSlot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <form onSubmit={handleAssign} className={`${cardCls} w-full max-w-md p-6 space-y-4`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Assign Meeting</h2>
              <button type="button" onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              {dayOf(assignSlot.date)} • {assignSlot.startTime} - {assignSlot.endTime}
            </p>

            <div>
              <label className={labelCls}>Student</label>
              <select
                value={assignForm.studentId}
                onChange={(e) => setAssignForm({ ...assignForm, studentId: e.target.value })}
                className={fieldCls}
                required
              >
                <option value="">{studentsLoading ? 'Loading students...' : 'Select student'}</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{studentLabel(s)}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Mode</label>
              <select
                value={assignForm.mode}
                onChange={(e) => setAssignForm({ ...assignForm, mode: e.target.value })}
                className={fieldCls}
              >
                <option value="online">Online (link auto-generated)</option>
                <option value="offline">Offline</option>
              </select>
            </div>

            {assignForm.mode === 'offline' && (
              <div>
                <label className={labelCls}>Venue</label>
                <input
                  type="text"
                  value={assignForm.venue}
                  onChange={(e) => setAssignForm({ ...assignForm, venue: e.target.value })}
                  placeholder="Example: Staff Room, Block A"
                  className={fieldCls}
                />
              </div>
            )}

            <div>
              <label className={labelCls}>Agenda (optional)</label>
              <textarea
                rows="3"
                value={assignForm.agenda}
                onChange={(e) => setAssignForm({ ...assignForm, agenda: e.target.value })}
                placeholder="What do you want to discuss?"
                className={`${fieldCls} resize-none`}
              />
            </div>

            <button
              type="submit"
              disabled={assignMutation.isPending}
              className="w-full px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {assignMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Assign Meeting
            </button>
          </form>
        </div>
      )}
    </div>
  );
}