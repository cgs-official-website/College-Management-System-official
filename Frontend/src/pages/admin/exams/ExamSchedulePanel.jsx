import { useState, useEffect } from 'react';
import { CalendarPlus, Trash2 } from 'lucide-react';
import { useCourses } from '../../../hooks/useCourses';
import { useExamTypes, useSchedulePreview, useSchedule } from '../../../hooks/useExamCenter';
import { useConfirm } from '../../../contexts/ConfirmContext';

const sel =
  'w-full px-3 py-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50';
const cell =
  'w-full px-2 py-1.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500';
const TH = 'py-3 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider';

const today = () => new Date().toISOString().split('T')[0];

export default function ExamSchedulePanel() {
  const confirm = useConfirm();
  const { courses } = useCourses();
  const { examTypes } = useExamTypes();
  const [examTypeId, setExamTypeId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [semester, setSemester] = useState('');
  const [rows, setRows] = useState([]);

  const { preview, isLoading } = useSchedulePreview({ examTypeId, courseId, semester });
  const { schedule, createSchedule, deleteItem, isCreating } = useSchedule({ examTypeId, courseId, semester });

  const course = courses.find((c) => c.id === courseId);
  const semesterOptions = course ? Array.from({ length: course.semester }, (_, i) => i + 1) : [];
  const activeTypes = examTypes.filter((t) => t.isActive);

  useEffect(() => {
    if (!preview) { setRows([]); return; }
    setRows(preview.subjects.map((s) => ({
      subjectId: s.id, code: s.code, name: s.name, type: s.type,
      include: true, date: today(), startTime: '09:00', endTime: '12:00', room: '', maxMarks: s.maxMarks,
    })));
  }, [preview]);

  const setRow = (i, patch) => setRows((r) => r.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const scheduledIds = new Set(schedule.map((e) => e.subject?.id));

  const submit = async () => {
    const items = rows.filter((r) => r.include && !scheduledIds.has(r.subjectId)).map((r) => ({
      subjectId: r.subjectId, date: r.date, startTime: r.startTime || null, endTime: r.endTime || null,
      room: r.room || null, maxMarks: Number(r.maxMarks) || 1,
    }));
    if (!items.length) return;
    try {
      await createSchedule({ examTypeId, courseId, semester: Number(semester), items });
    } catch { /* toast shown */ }
  };

  const remove = async (e) => {
    if (await confirm({ title: 'Remove exam', message: `Remove ${e.subject?.name} from this schedule?`, confirmText: 'Remove', variant: 'danger' })) {
      try { await deleteItem(e.id); } catch { /* toast shown */ }
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-5">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Schedule Exams</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pick the exam type, program and semester. All subjects of that semester are listed so you can set the date, time and hall for each.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Exam type</label>
            <select className={sel} value={examTypeId} onChange={(e) => setExamTypeId(e.target.value)}>
              <option value="">Select exam type</option>
              {activeTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Program</label>
            <select className={sel} value={courseId} onChange={(e) => { setCourseId(e.target.value); setSemester(''); }}>
              <option value="">Select program</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Semester</label>
            <select className={sel} value={semester} disabled={!courseId} onChange={(e) => setSemester(e.target.value)}>
              <option value="">Select semester</option>
              {semesterOptions.map((n) => <option key={n} value={n}>Semester {n}</option>)}
            </select>
          </div>
        </div>

        {isLoading && <p className="text-sm text-slate-500">Loading subjects...</p>}

        {preview && rows.length === 0 && (
          <p className="text-sm text-slate-500">No active subjects for this semester. Add them in Academic Structure first.</p>
        )}

        {rows.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className={TH}></th><th className={TH}>Subject</th><th className={TH}>Date</th>
                    <th className={TH}>Start</th><th className={TH}>End</th><th className={TH}>Hall</th><th className={TH}>Max</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {rows.map((r, i) => {
                    const done = scheduledIds.has(r.subjectId);
                    return (
                      <tr key={r.subjectId} className={done ? 'opacity-50' : ''}>
                        <td className="py-2 px-3">
                          <input type="checkbox" checked={r.include && !done} disabled={done}
                            onChange={(e) => setRow(i, { include: e.target.checked })} />
                        </td>
                        <td className="py-2 px-3">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">{r.name}</div>
                          <div className="text-xs text-slate-500">{r.code}{done ? ' - already scheduled' : ''}</div>
                        </td>
                        <td className="py-2 px-3"><input type="date" className={cell} value={r.date} disabled={done} onChange={(e) => setRow(i, { date: e.target.value })} /></td>
                        <td className="py-2 px-3"><input type="time" className={cell} value={r.startTime} disabled={done} onChange={(e) => setRow(i, { startTime: e.target.value })} /></td>
                        <td className="py-2 px-3"><input type="time" className={cell} value={r.endTime} disabled={done} onChange={(e) => setRow(i, { endTime: e.target.value })} /></td>
                        <td className="py-2 px-3"><input className={cell} value={r.room} placeholder="Hall" disabled={done} onChange={(e) => setRow(i, { room: e.target.value })} /></td>
                        <td className="py-2 px-3 w-24"><input type="number" min="1" className={cell} value={r.maxMarks} disabled={done} onChange={(e) => setRow(i, { maxMarks: e.target.value })} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <button onClick={submit} disabled={isCreating}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl">
                <CalendarPlus className="w-4 h-4" /> {isCreating ? 'Scheduling...' : 'Schedule selected subjects'}
              </button>
            </div>
          </>
        )}
      </div>

      {schedule.length > 0 && (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Scheduled Exams</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className={TH}>Date</th><th className={TH}>Time</th><th className={TH}>Course Code</th>
                  <th className={TH}>Subject</th><th className={TH}>Exam</th><th className={TH}>Program / Sem</th>
                  <th className={TH}>Hall</th><th className={TH}>Max</th><th className={TH}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                {schedule.map((e) => (
                  <tr key={e.id}>
                    <td className="py-3 px-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">{e.date}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{e.startTime || '--'} - {e.endTime || '--'}</td>
                    <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">{e.subject?.code}</td>
                    <td className="py-3 px-3 text-slate-700 dark:text-slate-200">{e.subject?.name}</td>
                    <td className="py-3 px-3"><span className="px-2 py-1 text-xs font-bold rounded-md bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300">{e.examTypeName}</span></td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{e.courseName} / Sem {e.semester}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{e.room}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-300">{e.maxMarks}</td>
                    <td className="py-3 px-3 text-right">
                      <button onClick={() => remove(e)} className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-rose-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}