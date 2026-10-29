import React, { useState } from 'react';
import { UserCheck } from 'lucide-react';
import { useCourses } from '../../../hooks/useCourses';
import { useSections } from '../../../hooks/useSections';
import { useStaff } from '../../../hooks/useStaff';
import { useAuth } from '../../../contexts/AuthContext';
import { useTeachingMatrix } from '../../../hooks/useTeachingAssignments';

const selectClass =
  'w-full px-4 py-3 bg-slate-50 dark:bg-[#020813] border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all dark:text-white disabled:opacity-50';

const TH = 'py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider';

const TYPE_STYLES = {
  THEORY: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  LAB: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  PROJECT: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
};

const teacherLabel = (t) =>
  t.name || t.user?.name || t.user?.email || t.email || 'Teacher';

export default function TeachingTab() {
  const { userData } = useAuth();
  const { courses } = useCourses();
  const { staff } = useStaff(userData?.collegeId);

  const [courseId, setCourseId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [semester, setSemester] = useState('');

  const { sections } = useSections(courseId || null);
  const selectedCourse = courses.find((c) => c.id === courseId);
  const semesterOptions = selectedCourse
    ? Array.from({ length: selectedCourse.semester }, (_, i) => i + 1)
    : [];

  const { matrix, isLoading, assignTeacher, removeAssignment } =
    useTeachingMatrix(sectionId, semester);

  const busy = assignTeacher.isPending || removeAssignment.isPending;

  const handleCourseChange = (value) => {
    setCourseId(value);
    setSectionId('');
    setSemester('');
  };

  const handleSectionChange = (value) => {
    setSectionId(value);
    const section = sections.find((s) => s.id === value);
    const known = (section?.semesterCounts || []).filter((c) => c.semester != null);
    if (known.length > 0) {
      const top = known.reduce((a, b) => (b.count > a.count ? b : a));
      setSemester(String(top.semester));
    }
  };

  const handleTeacherChange = (row, teacherId) => {
    if (!teacherId) {
      if (row.assignment) removeAssignment.mutate(row.assignment.id);
      return;
    }
    assignTeacher.mutate({ subjectId: row.subject.id, sectionId, teacherId });
  };

  const rows = matrix?.rows || [];
  const assignedCount = rows.filter((r) => r.assignment).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Program</label>
          <select value={courseId} onChange={(e) => handleCourseChange(e.target.value)} className={selectClass}>
            <option value="">Select program</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Section</label>
          <select
            value={sectionId}
            onChange={(e) => handleSectionChange(e.target.value)}
            disabled={!courseId}
            className={selectClass}
          >
            <option value="">Select section</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">Semester</label>
          <select
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            disabled={!courseId}
            className={selectClass}
          >
            <option value="">Select semester</option>
            {semesterOptions.map((n) => (
              <option key={n} value={n}>Semester {n}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
        {!sectionId || !semester ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Choose a class</h3>
            <p className="text-slate-500 dark:text-slate-400">
              Select program, section and semester to assign teachers to subjects.
            </p>
          </div>
        ) : isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading subjects...</div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No active subjects</h3>
            <p className="text-slate-500 dark:text-slate-400">
              Add subjects for this program and semester in the Subjects tab first.
            </p>
          </div>
        ) : (
          <>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-white/10 text-sm text-slate-600 dark:text-slate-300">
              {matrix?.section?.course?.name} / {matrix?.section?.name} / Semester {matrix?.semester}
              <span className="ml-3 font-bold">{assignedCount} of {rows.length} subjects assigned</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                    <th className={TH}>Subject</th>
                    <th className={TH}>Type</th>
                    <th className={TH}>Credits</th>
                    <th className={TH}>Teacher</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {rows.map((row) => (
                    <tr key={row.subject.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 dark:text-white">{row.subject.name}</div>
                        <div className="text-sm text-slate-500">{row.subject.code}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-block px-2 py-1 text-xs font-bold rounded-md ${TYPE_STYLES[row.subject.type]}`}>
                          {row.subject.type}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-600 dark:text-slate-300">{row.subject.credits}</td>
                      <td className="py-4 px-6 min-w-[260px]">
                        <select
                          value={row.assignment?.teacherId || ''}
                          onChange={(e) => handleTeacherChange(row, e.target.value)}
                          disabled={busy}
                          className={selectClass}
                        >
                          <option value="">Not assigned</option>
                          {staff?.map((t) => (
                            <option key={t.id} value={t.id}>{teacherLabel(t)}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}