import { useState } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  MapPin, 
  Clock, 
  BookOpen, 
  Edit2, 
  Trash2, 
  Award, 
  GraduationCap, 
  Sparkles,
  Filter,
  Layers,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useExams } from '../../../hooks/useExams';
import { useDepartments } from '../../../hooks/useDepartments';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ExamFormModal } from './ExamFormModal';
import { useConfirm } from '../../../contexts/ConfirmContext';

export default function Exams() {
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { exams, isLoading, addExam, updateExam, deleteExam, isAdding, isUpdating } = useExams(collegeId);
  const { departments } = useDepartments();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [activeTab, setActiveTab] = useState('schedules'); 

  const filteredExams = exams.filter(exam => {
    const title = (exam.title || exam.name || '').toLowerCase();
    const subject = (exam.subject || '').toLowerCase();
    const course = (exam.courseName || '').toLowerCase();
    const dept = (exam.departmentName || '').toLowerCase();
    const deptCode = (exam.departmentCode || '').toLowerCase();
    const q = searchTerm.toLowerCase();

    const matchesSearch = title.includes(q) || subject.includes(q) || course.includes(q) || dept.includes(q) || deptCode.includes(q);
    const matchesDept = selectedDeptFilter === 'ALL' || exam.departmentId === selectedDeptFilter || exam.departmentName === selectedDeptFilter;

    return matchesSearch && matchesDept;
  });

  const handleOpenAdd = () => {
    setEditingExam(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (exam) => {
    setEditingExam({
      ...exam,
      title: exam.title || exam.name,
      departmentId: exam.departmentId || '',
      courseId: exam.courseId || '',
      subject: exam.subject || exam.name,
      totalMarks: exam.maxMarks || exam.totalMarks || 100,
      examDate: exam.date || exam.examDate,
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id, title) => {
    if (await confirm({ 
      title: "Delete Exam Schedule",
      message: `Are you sure you want to cancel and delete "${title || 'this exam'}"?`,
      confirmText: "Delete",
      variant: "danger"
    })) {
      await deleteExam(id);
    }
  };

  const handleSubmit = async (data) => {
    try {
      if (editingExam) {
        await updateExam({ id: editingExam.id, data });
      } else {
        await addExam(data);
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - Product Primary Theme */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-[#043324] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden border border-primary-500/10">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-8 w-64 h-64 bg-primary-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-500/10 backdrop-blur-md border border-primary-500/20 text-xs font-semibold text-primary-300 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-primary-400" />
            Academic Assessment & Examinations
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Examination Center</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Schedule mid-terms, semester assessments, and track grading across institutional departments.
          </p>
        </div>
        <div className="relative z-10 shrink-0">
          <button 
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-3 bg-primary-600 hover:bg-primary-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-600/30 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Schedule Exam
          </button>
        </div>
      </div>

      {/* Tabs & Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white dark:bg-[#0A0F1C] p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-sm">
        
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-max">
            <button 
              onClick={() => setActiveTab('schedules')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'schedules' 
                  ? 'bg-primary-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Exam Schedules
            </button>
            <button 
              onClick={() => setActiveTab('results')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'results' 
                  ? 'bg-primary-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Exam Performance
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Department Filter */}
          <div className="relative min-w-[200px]">
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-primary-500"
            >
              <option value="ALL">All Departments ({departments.length})</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name} ({dept.code})
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input 
              type="text"
              placeholder="Search exam or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Grid Content */}
      {activeTab === 'schedules' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-56 bg-slate-100 dark:bg-white/5 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200/80 dark:border-white/10 rounded-3xl p-12 sm:p-16 text-center max-w-xl mx-auto shadow-sm">
              <div className="w-16 h-16 bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-primary-600 dark:text-primary-400">
                <Calendar className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No exams scheduled</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                Schedule your next examination by selecting one of your created departments.
              </p>
              <button 
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-primary-600/25"
              >
                <Plus className="w-4 h-4" />
                Schedule Exam
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredExams.map((exam) => {
                const dateStr = exam.date || exam.examDate || new Date().toISOString();
                const examDateObj = new Date(dateStr);
                const month = isNaN(examDateObj.getTime()) ? 'TBA' : examDateObj.toLocaleString('default', { month: 'short' });
                const day = isNaN(examDateObj.getTime()) ? '--' : examDateObj.getDate();
                const deptLabel = exam.departmentCode || exam.departmentName || 'General';

                return (
                  <div 
                    key={exam.id} 
                    className="group relative bg-white dark:bg-[#0A0F1C] border border-slate-200/80 dark:border-white/10 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl hover:border-primary-500/40 dark:hover:border-primary-500/40 hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between overflow-hidden"
                  >
                    {/* Top Accent Gradient Bar */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary-600 via-primary-500 to-emerald-400 opacity-80 group-hover:opacity-100 transition-opacity" />

                    <div>
                      {/* Card Header: Date & Actions */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          {/* Date Block */}
                          <div className="flex flex-col items-center justify-center bg-primary-50 dark:bg-primary-500/10 border border-primary-200/60 dark:border-primary-500/20 rounded-2xl px-3.5 py-2 text-primary-700 dark:text-primary-300">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider">{month}</span>
                            <span className="text-xl font-black leading-none mt-0.5">{day}</span>
                          </div>

                          {/* Department & Exam Type Pills */}
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-primary-50 dark:bg-primary-500/10 text-primary-800 dark:text-primary-300 border border-primary-200/60 dark:border-primary-500/20">
                              <GraduationCap className="w-3 h-3 text-primary-600 dark:text-primary-400" />
                              {deptLabel}
                            </span>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                {exam.type || 'Midterm'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1.5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleOpenEdit(exam)} 
                            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-primary-50 dark:hover:bg-primary-500/20 text-slate-500 hover:text-primary-600 dark:text-slate-400 dark:hover:text-primary-400 border border-slate-200/60 dark:border-white/5 transition-colors" 
                            title="Edit Exam"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDelete(exam.id, exam.title || exam.name)} 
                            className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-rose-50 dark:hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 border border-slate-200/60 dark:border-white/5 transition-colors" 
                            title="Delete Exam"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Subject & Title */}
                      <h3 
                        className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors leading-snug line-clamp-2 mb-1.5"
                      >
                        {exam.subject || exam.name}
                      </h3>
                      
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1 mb-4">
                        {exam.title || exam.name} • {exam.departmentName || exam.courseName}
                      </p>
                    </div>

                    {/* Card Footer */}
                    <div className="pt-4 border-t border-slate-100 dark:border-white/5 space-y-2.5 mt-auto">
                      <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Award className="w-3.5 h-3.5 text-amber-500" />
                          <span>Max Marks:</span>
                          <strong className="text-slate-900 dark:text-white font-bold">{exam.maxMarks || exam.totalMarks || 100}</strong>
                        </div>

                        {exam.room && (
                          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <MapPin className="w-3.5 h-3.5 text-rose-500" />
                            <span className="truncate max-w-[120px]">{exam.room}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'results' && (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Exam Marks & Results Overview</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Summary of scores recorded across institutional examinations.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Exam Name</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Course / Program</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Students Graded</th>
                  <th className="py-3 px-4">Average Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                {filteredExams.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">No examination records found for selected criteria.</td>
                  </tr>
                ) : (
                  filteredExams.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{ex.name || ex.title}</td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-extrabold bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300">
                          {ex.departmentCode || ex.departmentName || 'General'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{ex.courseName || ex.subject}</td>
                      <td className="py-3.5 px-4"><span className="px-2 py-0.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-white/10">{ex.type}</span></td>
                      <td className="py-3.5 px-4 font-medium">{ex.totalStudentsAppeared || 0} students</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">{ex.averageScore || '0.0'} / {ex.maxMarks}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule Exam Modal */}
      <ExamFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingExam}
        isLoading={isAdding || isUpdating}
      />
    </div>
  );
}
