import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Undo2, Eye } from 'lucide-react';
import { useCourses } from '../../../hooks/useCourses';
import { useExamTypes, useReview } from '../../../hooks/useExamCenter';
import { api } from '../../../services/apiClient';
import { Modal } from '../../../components/ui/Modal';

const sel =
  'w-full px-3 py-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none disabled:opacity-50';
const TH = 'py-3 px-3 text-xs font-bold text-slate-400 uppercase tracking-wider';

const BADGE = {
  NOT_STARTED: ['Not started', 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'],
  DRAFT: ['Draft', 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'],
  SENT_TO_ADMIN: ['Sent to admin', 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'],
  PUBLISHED: ['Published', 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'],
};

function MarksModal({ target, onClose }) {
  const { data, isLoading } = useQuery({
    queryKey: ['exam-center', 'marks-view', target?.examId, target?.sectionId],
    enabled: !!target,
    queryFn: async () => (await api.get(`/exam-center/marks/${target.examId}/${target.sectionId}`)).data,
  });

  return (
    <Modal
      isOpen={!!target}
      onClose={onClose}
      title={data ? `${data.exam.subject?.name} (${data.exam.subject?.code}) - Section ${data.section.name}` : 'Marks'}
      maxWidth="max-w-3xl"
    >
      {isLoading || !data ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            {data.exam.examTypeName} | Maximum marks {data.exam.maxMarks} | Status: {(BADGE[data.status] || BADGE.DRAFT)[0]}
          </p>
          <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-xl max-h-[60vh] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white dark:bg-[#0A0F1C]">
                <tr className="border-b border-slate-200 dark:border-white/10">
                  <th className={TH}>Sl.No</th><th className={TH}>Roll No</th><th className={TH}>Name</th>
                  <th className={TH}>Reg No</th><th className={`${TH} text-right`}>Mark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                {data.students.map((s, i) => (
                  <tr key={s.id}>
                    <td className="py-2.5 px-3 text-slate-500">{i + 1}</td>
                    <td className="py-2.5 px-3 text-slate-900 dark:text-white">{s.rollNumber}</td>
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">{s.name}</td>
                    <td className="py-2.5 px-3 text-slate-500">{s.registerNumber || '-'}</td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      {s.isAbsent ? <span className="text-rose-600">AB</span>
                        : s.obtainedMarks === null ? <span className="text-slate-400">-</span>
                        : <span className="text-slate-900 dark:text-white">{s.obtainedMarks}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function ExamReviewPanel() {
  const { courses } = useCourses();
  const { examTypes } = useExamTypes();
  const [examTypeId, setExamTypeId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [semester, setSemester] = useState('');
  const [viewing, setViewing] = useState(null);
  const { review, isLoading, act, publishAll } = useReview({ examTypeId, courseId, semester });

  const course = courses.find((c) => c.id === courseId);
  const semesterOptions = course ? Array.from({ length: course.semester }, (_, i) => i + 1) : [];

  const doAction = async (examId, sectionId, action) => {
    let remark;
    if (action === 'send_back') {
      remark = window.prompt('What should the teacher correct?');
      if (!remark || !remark.trim()) return;
    }
    try { await act({ examId, sectionId, action, remark }); } catch { /* toast shown */ }
  };

  const doPublishAll = async (sectionId) => {
    try { await publishAll({ examTypeId, courseId, semester: Number(semester), sectionId }); } catch { /* toast shown */ }
  };

  return (
    <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-5">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Review and Publish Marks</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Check the marks teachers submit. Publish them to students, or send them back with a remark.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <select className={sel} value={examTypeId} onChange={(e) => setExamTypeId(e.target.value)}>
          <option value="">Select exam type</option>
          {examTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select className={sel} value={courseId} onChange={(e) => { setCourseId(e.target.value); setSemester(''); }}>
          <option value="">Select program</option>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={sel} value={semester} disabled={!courseId} onChange={(e) => setSemester(e.target.value)}>
          <option value="">Select semester</option>
          {semesterOptions.map((n) => <option key={n} value={n}>Semester {n}</option>)}
        </select>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading...</p>}

      {review && review.rows.length === 0 && (
        <p className="text-sm text-slate-500">
          Nothing to review. Check that this exam is scheduled and that a section is in this semester.
        </p>
      )}

      {review && review.rows.length > 0 && (
        <div className="space-y-8">
          {review.sections.map((s) => (
            <div key={s.id}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-900 dark:text-white">
                  Section {s.name} <span className="text-xs font-medium text-slate-400">({s.students} students)</span>
                </h4>
                <button onClick={() => doPublishAll(s.id)}
                  className="text-xs font-bold px-3 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white">
                  Publish all sent subjects
                </button>
              </div>
              <div className="overflow-x-auto border border-slate-200 dark:border-white/10 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/10">
                      <th className={TH}>Subject</th><th className={TH}>Teacher</th>
                      <th className={TH}>Entered</th><th className={TH}>Status</th><th className={`${TH} text-right`}>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                    {review.rows.map((r) => {
                      const c = r.cells[s.id];
                      const [label, cls] = BADGE[c.status] || BADGE.NOT_STARTED;
                      return (
                        <tr key={r.exam.id}>
                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 dark:text-white text-sm">{r.exam.subject.name}</div>
                            <div className="text-xs text-slate-500">{r.exam.subject.code} | {r.exam.date}</div>
                          </td>
                          <td className="py-3 px-3 text-sm text-slate-600 dark:text-slate-300">{c.teacher || <span className="text-rose-500">Not assigned</span>}</td>
                          <td className="py-3 px-3 text-sm text-slate-600 dark:text-slate-300">{c.entered} / {c.total}</td>
                          <td className="py-3 px-3">
                            <span className={`inline-block px-2 py-1 text-xs font-bold rounded-md ${cls}`}>{label}</span>
                            {c.remark && c.status === 'DRAFT' && <div className="text-xs text-rose-500 mt-1">Sent back: {c.remark}</div>}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex justify-end gap-2 flex-wrap">
                              {c.entered > 0 && (
                                <button onClick={() => setViewing({ examId: r.exam.id, sectionId: s.id })}
                                  className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {c.status === 'SENT_TO_ADMIN' && (
                                <>
                                  <button onClick={() => doAction(r.exam.id, s.id, 'publish')}
                                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Publish
                                  </button>
                                  <button onClick={() => doAction(r.exam.id, s.id, 'send_back')}
                                    className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">
                                    <Undo2 className="w-3.5 h-3.5" /> Send back
                                  </button>
                                </>
                              )}
                              {c.status === 'PUBLISHED' && (
                                <button onClick={() => doAction(r.exam.id, s.id, 'unpublish')}
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">
                                  Withdraw
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <MarksModal target={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}