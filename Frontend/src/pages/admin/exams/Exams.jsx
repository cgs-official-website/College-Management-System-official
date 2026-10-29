import { useState } from 'react';
import { Search } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useExams } from '../../../hooks/useExams';
import { useDepartments } from '../../../hooks/useDepartments';
import { Pagination } from '../../../components/ui/Pagination';
import ExamTypesManager from './ExamTypesManager';
import ExamSchedulePanel from './ExamSchedulePanel';
import ExamReviewPanel from './ExamReviewPanel';

const TABS = [
  ['center', 'Exam Schedule'],
  ['review', 'Review & Publish'],
  ['types', 'Exam Types'],
  ['results', 'Exam Performance'],
];

export default function Exams() {
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { departments = [] } = useDepartments();
  const { exams } = useExams(collegeId, { courseId: 'ALL' });

  const [activeTab, setActiveTab] = useState('center');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredExams = exams.filter((exam) => {
    const q = searchTerm.trim().toLowerCase();
    const text = [exam.title, exam.name, exam.subject, exam.courseName, exam.departmentName, exam.departmentCode]
      .map((v) => (v || '').toLowerCase());
    const matchesSearch = !q || text.some((t) => t.includes(q));
    const matchesDept = selectedDeptFilter === 'ALL' || exam.departmentId === selectedDeptFilter;
    return matchesSearch && matchesDept;
  });

  const paginated = filteredExams.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#043324] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-primary-500/10">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-primary-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Examination Center</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Schedule exams for a semester, review the marks teachers submit, and publish them to students.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white dark:bg-[#0A0F1C] p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm">
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-max flex-wrap">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setCurrentPage(1); }}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'results' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              value={selectedDeptFilter}
              onChange={(e) => { setSelectedDeptFilter(e.target.value); setCurrentPage(1); }}
              className="min-w-[200px] pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              <option value="ALL">All Departments ({departments.length})</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
            </select>
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search exam or subject..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
              />
            </div>
          </div>
        )}
      </div>

      {activeTab === 'center' && <ExamSchedulePanel />}
      {activeTab === 'review' && <ExamReviewPanel />}
      {activeTab === 'types' && <ExamTypesManager />}

      {activeTab === 'results' && (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Exam Marks & Results Overview</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Summary of scores recorded across examinations.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Exam</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Program</th>
                  <th className="py-3 px-4">Students Graded</th>
                  <th className="py-3 px-4">Average</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                {filteredExams.length === 0 ? (
                  <tr><td colSpan={5} className="py-8 text-center text-slate-400">No records found.</td></tr>
                ) : paginated.map((ex) => (
                  <tr key={ex.id}>
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{ex.type}</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{ex.subject}</td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{ex.courseName}</td>
                    <td className="py-3.5 px-4">{ex.totalStudentsAppeared || 0}</td>
                    <td className="py-3.5 px-4 font-bold text-emerald-600">{ex.averageScore} / {ex.maxMarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredExams.length > 0 && (
            <Pagination
              totalItems={filteredExams.length}
              currentPage={currentPage}
              pageSize={pageSize}
              pageSizeOptions={[10, 20, 50, 100]}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              className="mt-4"
            />
          )}
        </div>
      )}
    </div>
  );
}