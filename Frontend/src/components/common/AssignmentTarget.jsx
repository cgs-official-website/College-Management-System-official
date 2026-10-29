import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/apiClient';

const selectClass =
  'w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white disabled:opacity-60';
const labelClass = 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5';


export default function AssignmentTarget({ value, onChange }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/assignments/options');
        const list = res?.data ?? res;
        if (!cancelled) setCourses(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) setError(e?.data?.error?.message || e?.message || 'Failed to load classes');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const course = useMemo(() => courses.find((c) => c.id === value.courseId), [courses, value.courseId]);
  const section = useMemo(() => course?.sections.find((s) => s.id === value.sectionId), [course, value.sectionId]);

    if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (courses.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No classes available. Sections and teaching assignments must be set up before assignments can be posted.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Course *</label>
        <select
          value={value.courseId}
          onChange={(e) => onChange({ courseId: e.target.value, sectionId: '', subjectId: '' })}
          className={selectClass}
          required
        >
          <option value="">Select a course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Section *</label>
          <select
            value={value.sectionId}
            disabled={!course}
            onChange={(e) => onChange({ ...value, sectionId: e.target.value, subjectId: '' })}
            className={selectClass}
            required
          >
            <option value="">{course ? 'Select a section' : 'Choose a course first'}</option>
            {course?.sections.map((s) => (
              <option key={s.id} value={s.id}>
                Section {s.name}{s.semester ? ` | Semester ${s.semester}` : ' | Semester not set'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>
            Subject {section?.semester ? `(Semester ${section.semester})` : ''} *
          </label>
          <select
            value={value.subjectId}
            disabled={!section || section.subjects.length === 0}
            onChange={(e) => onChange({ ...value, subjectId: e.target.value })}
            className={selectClass}
            required
          >
            <option value="">{section ? 'Select a subject' : 'Choose a section first'}</option>
            {section?.subjects.map((s) => (
              <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
            ))}
          </select>
        </div>
      </div>

      {section && section.subjects.length === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400">
          {section.semester
            ? `No active subjects for Semester ${section.semester} in this section.`
            : 'This section has no students with a current semester set, so its subjects cannot be listed.'}
        </p>
      )}
    </div>
  );
}