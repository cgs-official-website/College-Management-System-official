import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Save, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../ui/Modal';
import { api } from '../../services/apiClient';

const isHttpUrl = (u) => /^https?:\/\//i.test(u || '');
const errText = (e, fallback) => e?.data?.error?.message || e?.message || fallback;

function SubmissionRow({ assignment, sub, onSaved }) {
  const [score, setScore] = useState(sub.score ?? '');
  const [feedback, setFeedback] = useState(sub.feedback || '');
  const [saving, setSaving] = useState(false);
  const graded = sub.score !== null && sub.score !== undefined;

  const save = async (clear = false) => {
    if (!clear) {
      if (score === '') return toast.error('Enter a score');
      const n = Number(score);
      if (Number.isNaN(n) || n < 0 || n > assignment.maxScore) {
        return toast.error(`Score must be between 0 and ${assignment.maxScore}`);
      }
    }
    setSaving(true);
    try {
      await api.patch(`/assignments/${assignment.id}/submissions/${sub.id}/grade`, {
        score: clear ? null : Number(score),
        feedback: clear ? null : feedback,
      });
      toast.success(clear ? 'Grade removed. The student can resubmit before the deadline.' : 'Grade saved');
      if (clear) {
        setScore('');
        setFeedback('');
      }
      onSaved();
    } catch (e) {
      toast.error(errText(e, 'Failed to save grade'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-bold text-slate-900 dark:text-white text-sm">{sub.studentName}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Adm No: {sub.admissionNumber} | {sub.department}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Submitted: {new Date(sub.submittedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              graded
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                : 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400'
            }`}
          >
            {graded ? 'Graded' : 'Needs review'}
          </span>
          {isHttpUrl(sub.fileUrl) ? (
            <a
              href={sub.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open work
            </a>
          ) : (
            <span className="text-xs text-rose-500">Invalid link</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3">
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
            Score / {assignment.maxScore}
          </label>
          <input
            type="number"
            min="0"
            max={assignment.maxScore}
            step="0.5"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Feedback (optional)</label>
          <input
            type="text"
            maxLength={1000}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Short comment for the student"
            className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        {graded && (
          <button
            onClick={() => save(true)}
            disabled={saving}
            className="px-3 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl disabled:opacity-50"
          >
            Remove grade
          </button>
        )}
        <button
          onClick={() => save(false)}
          disabled={saving}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {graded ? 'Update grade' : 'Save grade'}
        </button>
      </div>
    </div>
  );
}

export default function AssignmentSubmissions({ assignment, onClose, onChanged }) {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const res = await api.get(`/assignments/${assignment.id}/submissions`);
      const list = res?.data ?? res;
      setSubs(Array.isArray(list) ? list : []);
      setError('');
    } catch (e) {
      setError(errText(e, 'Failed to load submissions'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
  }, [assignment.id]);

  const handleSaved = async () => {
    await load();
    onChanged?.();
  };

  const gradedCount = subs.filter((s) => s.score !== null && s.score !== undefined).length;

  return (
    <Modal isOpen onClose={onClose} title={`Review: ${assignment.title}`} maxWidth="max-w-3xl">
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {assignment.subject} | {assignment.courseName}
          {assignment.sectionName ? ` - ${assignment.sectionName}` : ''} | {subs.length} Submitted, {gradedCount} Graded
        </p>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : error ? (
          <p className="text-sm text-rose-600">{error}</p>
        ) : subs.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            No submissions yet.
          </div>
        ) : (
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            {subs.map((s) => (
              <SubmissionRow key={s.id} assignment={assignment} sub={s} onSaved={handleSaved} />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}