import React, { useState, useEffect, useMemo } from 'react';
import { Users, Save, Send, AlertCircle, Lock, FileBarChart } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { api } from '../../services/apiClient';
import toast from 'react-hot-toast';

const STATUS = {
  NOT_STARTED: ['Not started', 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400'],
  DRAFT: ['Draft', 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'],
  SENT_TO_ADMIN: ['Sent to admin', 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'],
  PUBLISHED: ['Published to students', 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'],
};

const errMsg = (e, fallback) =>
  e?.data?.error?.message || e?.response?.data?.error?.message || e?.message || fallback;

export default function TeacherGrades() {
  const { userData } = useAuth();
  const confirm = useConfirm();

  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [selectedKey, setSelectedKey] = useState('');

  const [sheet, setSheet] = useState(null);
  const [rows, setRows] = useState({});
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadClasses = async () => {
    try {
      const res = await api.get('/exam-center/teacher/classes');
      const list = res.data || [];
      setClasses(list);
      return list;
    } catch (e) {
      toast.error(errMsg(e, 'Failed to load your classes'));
      return [];
    } finally {
      setLoadingClasses(false);
    }
  };

  useEffect(() => {
    if (!userData?.collegeId) return;
    loadClasses();
  }, [userData]);

  const selected = useMemo(
    () => classes.find((c) => `${c.examId}:${c.sectionId}` === selectedKey),
    [classes, selectedKey]
  );

  const loadSheet = async (examId, sectionId) => {
    setLoadingSheet(true);
    try {
      const res = await api.get(`/exam-center/marks/${examId}/${sectionId}`);
      const data = res.data;
      setSheet(data);
      const initial = {};
      data.students.forEach((s) => {
        initial[s.id] = {
          value: s.obtainedMarks === null || s.obtainedMarks === undefined ? '' : String(s.obtainedMarks),
          absent: !!s.isAbsent,
        };
      });
      setRows(initial);
    } catch (e) {
      toast.error(errMsg(e, 'Failed to load students'));
      setSheet(null);
    } finally {
      setLoadingSheet(false);
    }
  };

  useEffect(() => {
    if (!selected) { setSheet(null); setRows({}); return; }
    loadSheet(selected.examId, selected.sectionId);
  }, [selectedKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const locked = sheet ? sheet.status !== 'DRAFT' : true;
  const maxMarks = sheet?.exam?.maxMarks || 0;

  const setValue = (id, value) => {
    if (value !== '' && (Number(value) < 0 || Number(value) > maxMarks)) {
      toast.error(`Marks must be between 0 and ${maxMarks}`);
      return;
    }
    setRows((r) => ({ ...r, [id]: { value, absent: false } }));
  };

  const setAbsent = (id, absent) =>
    setRows((r) => ({ ...r, [id]: { value: absent ? '' : r[id].value, absent } }));

  const entered = sheet
    ? sheet.students.filter((s) => rows[s.id]?.absent || rows[s.id]?.value !== '').length
    : 0;
  const total = sheet?.students.length || 0;

  const buildRecords = () =>
    sheet.students.map((s) => {
      const r = rows[s.id];
      return {
        studentId: s.id,
        isAbsent: !!r.absent,
        obtainedMarks: r.absent || r.value === '' ? null : Number(r.value),
      };
    });

  const refreshAfterChange = async () => {
    await loadClasses();
    await loadSheet(selected.examId, selected.sectionId);
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      await api.put(`/exam-center/marks/${selected.examId}/${selected.sectionId}`, { records: buildRecords() });
      toast.success('Draft saved');
      await refreshAfterChange();
    } catch (e) {
      toast.error(errMsg(e, 'Failed to save marks'));
    } finally {
      setSaving(false);
    }
  };

  const publishToAdmin = async () => {
    if (entered < total) {
      toast.error(`${total - entered} student(s) have no mark. Enter a mark or tick AB.`);
      return;
    }
    const ok = await confirm({
      title: 'Publish to admin',
      message: 'After this you cannot edit the marks unless the admin sends them back. Continue?',
      confirmText: 'Publish to Admin',
    });
    if (!ok) return;

    setSubmitting(true);
    try {
      await api.put(`/exam-center/marks/${selected.examId}/${selected.sectionId}`, { records: buildRecords() });
      await api.post(`/exam-center/marks/${selected.examId}/${selected.sectionId}/submit`, {});
      toast.success('Marks sent to admin');
      await refreshAfterChange();
    } catch (e) {
      toast.error(errMsg(e, 'Failed to publish marks'));
    } finally {
      setSubmitting(false);
    }
  };

  const [badgeLabel, badgeClass] = STATUS[sheet?.status || selected?.status || 'NOT_STARTED'] || STATUS.NOT_STARTED;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Marks & Grading</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Enter internal exam marks for the subjects assigned to you, then publish them to the admin.
        </p>
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6">
        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Exam, subject and section</label>
        <div className="relative">
          <FileBarChart className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          <select
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
            className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">-- Choose an exam --</option>
            {classes.map((c) => (
              <option key={`${c.examId}:${c.sectionId}`} value={`${c.examId}:${c.sectionId}`}>
                {c.examTypeName} | {c.subject.name} ({c.subject.code}) | {c.courseName} - {c.sectionName} | Sem {c.semester}
              </option>
            ))}
          </select>
        </div>
        {!loadingClasses && classes.length === 0 && (
          <p className="text-sm text-slate-500 mt-3">
            No exams found. Marks entry opens when the admin schedules an exam for a subject assigned to you in your section's current semester.
          </p>
        )}
      </div>

      {selected && (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-white/5">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-primary-500" />
                {selected.subject.name} ({selected.subject.code}) - Section {selected.sectionName}
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {selected.examTypeName} | Exam date {selected.date} | Maximum marks {maxMarks}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${badgeClass}`}>{badgeLabel}</span>
              <span className="text-sm font-bold text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg">
                Entered: {entered} / {total}
              </span>
            </div>
          </div>

          {sheet?.remark && sheet.status === 'DRAFT' && (
            <div className="px-4 py-3 bg-rose-50 dark:bg-rose-500/10 border-b border-rose-200 dark:border-rose-500/20 text-sm text-rose-700 dark:text-rose-300 flex gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span><strong>Sent back by admin:</strong> {sheet.remark}</span>
            </div>
          )}

          {locked && sheet && (
            <div className="px-4 py-3 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-sm text-slate-600 dark:text-slate-300 flex gap-2">
              <Lock className="w-4 h-4 mt-0.5 shrink-0" />
              <span>These marks are locked. Only the admin can send them back for changes.</span>
            </div>
          )}

          {loadingSheet ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500">Loading students...</p>
            </div>
          ) : !sheet || sheet.students.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No students found</h3>
              <p className="text-slate-500">There are no students in this section yet.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                      <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400 w-32">Roll No</th>
                      <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400">Student</th>
                      <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400 text-center w-24">Absent</th>
                      <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400 text-right w-44">Mark / {maxMarks}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {sheet.students.map((s) => {
                      const r = rows[s.id] || { value: '', absent: false };
                      return (
                        <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                          <td className="p-4 font-medium text-slate-900 dark:text-white">{s.rollNumber}</td>
                          <td className="p-4">
                            <p className="font-bold text-slate-900 dark:text-white">{s.name}</p>
                            {s.registerNumber && <p className="text-xs text-slate-500">{s.registerNumber}</p>}
                          </td>
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              className="w-4 h-4"
                              checked={r.absent}
                              disabled={locked}
                              onChange={(e) => setAbsent(s.id, e.target.checked)}
                            />
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end">
                              <input
                                type="number"
                                min="0"
                                max={maxMarks}
                                step="0.1"
                                value={r.absent ? '' : r.value}
                                placeholder={r.absent ? 'AB' : '-'}
                                disabled={locked || r.absent}
                                onChange={(e) => setValue(s.id, e.target.value)}
                                className={`w-24 text-center bg-slate-50 dark:bg-white/5 border rounded-xl py-2 font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-60 ${
                                  r.absent || r.value !== ''
                                    ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                                    : 'border-slate-200 dark:border-white/10 text-slate-900 dark:text-white'
                                }`}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {!locked && (
                <div className="p-4 border-t border-slate-200 dark:border-white/10 flex flex-col sm:flex-row justify-end gap-3">
                  <button
                    onClick={saveDraft}
                    disabled={saving || submitting}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-50 text-slate-800 dark:text-slate-200 rounded-xl font-bold"
                  >
                    <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save draft'}
                  </button>
                  <button
                    onClick={publishToAdmin}
                    disabled={saving || submitting}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30"
                  >
                    <Send className="w-4 h-4" /> {submitting ? 'Publishing...' : 'Publish to Admin'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}