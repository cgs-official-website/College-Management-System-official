import React from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import { Loader2, Video, MapPin, CalendarClock } from 'lucide-react';

const cardCls =
  'bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm';

const toArray = (res) => {
  const raw = res?.data ?? res;
  return Array.isArray(raw) ? raw : [];
};
const dayOf = (d) => String(d).slice(0, 10);

const statusCls = (status) =>
  status === 'completed'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
    : status === 'cancelled'
    ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';

export default function StudentPtm() {
  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ['ptm-meetings'],
    queryFn: async () => toArray(await api.get('/ptm/meetings')),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          My PTM Meetings
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Meetings scheduled for you by your teachers.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${cardCls} overflow-hidden`}
      >
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Meetings</h2>
          <span className="text-xs font-bold px-2 py-0.5 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full">
            {meetings.length}
          </span>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="py-12 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-primary-500" /></div>
          ) : meetings.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <CalendarClock className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-sm font-bold text-slate-900 dark:text-white">No meetings yet</p>
              <p className="text-xs text-slate-500 mt-1">When a teacher schedules a meeting, it will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {meetings.map((m) => (
                <div key={m.id} className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {m.teacher?.user?.name || 'Teacher'}
                      {m.teacher?.designation ? ` • ${m.teacher.designation}` : ''}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusCls(m.status)}`}>
                      {m.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {m.slot ? `${dayOf(m.slot.date)} • ${m.slot.startTime} - ${m.slot.endTime}` : ''}
                  </p>
                  {m.agenda && <p className="text-xs text-slate-700 dark:text-slate-300">{m.agenda}</p>}

                  {m.status === 'scheduled' && (
                    m.mode === 'online' && m.meetingLink ? (
                      <a
                        href={m.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg items-center gap-1"
                      >
                        <Video className="w-3.5 h-3.5" /> Join Meeting
                      </a>
                    ) : (
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> {m.venue || 'Offline'}
                      </span>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}