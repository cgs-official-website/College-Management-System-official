import { useState } from 'react';
import { Plus, Search, Calendar, MapPin, Clock, BookOpen, Edit, Trash2, Award } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useExams } from '../../../hooks/useExams';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { ExamFormModal } from './ExamFormModal';
import { useConfirm } from '../../../contexts/ConfirmContext';

export default function Exams() {
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { exams, isLoading, addExam, updateExam, deleteExam, isAdding, isUpdating } = useExams(collegeId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExam, setEditingExam] = useState(null);
  const [activeTab, setActiveTab] = useState('schedules'); 

  const filteredExams = exams.filter(exam => {
    const title = (exam.title || exam.name || '').toLowerCase();
    const subject = (exam.subject || '').toLowerCase();
    const course = (exam.courseName || '').toLowerCase();
    const q = searchTerm.toLowerCase();
    return title.includes(q) || subject.includes(q) || course.includes(q);
  });

  const handleOpenAdd = () => {
    setEditingExam(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (exam) => {
    setEditingExam({
      ...exam,
      title: exam.title || exam.name,
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Examination Center</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Schedule tests and manage institutional student grades.</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Schedule Exam
        </Button>
      </div>

      {/* Tabs & Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white dark:bg-[#0A0F1C] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        
        <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl w-max">
          <button 
            onClick={() => setActiveTab('schedules')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'schedules' ? 'bg-white dark:bg-[#0A0F1C] text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Exam Schedules
          </button>
          <button 
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'results' ? 'bg-white dark:bg-[#0A0F1C] text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Exam Performance
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input 
            placeholder="Search exams by subject or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 mb-0"
          />
        </div>
      </div>

      {/* Grid Content */}
      {activeTab === 'schedules' && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-48 bg-slate-100 dark:bg-white/5 rounded-2xl animate-pulse"></div>
              ))}
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No upcoming exams</h3>
              <p className="text-slate-500 dark:text-slate-400">Click "Schedule Exam" to add a new test.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredExams.map((exam) => {
                const dateStr = exam.date || exam.examDate || new Date().toISOString();
                const examDateObj = new Date(dateStr);
                const month = isNaN(examDateObj.getTime()) ? 'TBA' : examDateObj.toLocaleString('default', { month: 'short' });
                const day = isNaN(examDateObj.getTime()) ? '--' : examDateObj.getDate();

                return (
                  <div key={exam.id} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      
                      {/* Date Badge */}
                      <div className="flex flex-col items-center justify-center bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 rounded-xl px-3 py-2 text-primary-700 dark:text-primary-400">
                        <span className="text-xs font-bold uppercase tracking-wider">{month}</span>
                        <span className="text-2xl font-extrabold leading-none mt-0.5">{day}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(exam)} className="p-1.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors bg-slate-50 dark:bg-white/5 rounded-lg" title="Edit">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(exam.id, exam.title || exam.name)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-slate-50 dark:bg-white/5 rounded-lg" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{exam.subject || exam.name}</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">{exam.title || exam.name} • {exam.courseName}</p>

                    <div className="mt-auto space-y-3 pt-4 border-t border-slate-100 dark:border-white/5">
                      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary-500" />
                          <span>{exam.maxMarks || exam.totalMarks || 100} Max Marks</span>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                          {exam.type || 'Midterm'}
                        </span>
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
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Exam Marks & Results Overview</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Summary of scores recorded across active examinations.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">Exam Name</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Students Graded</th>
                  <th className="py-3 px-4">Average Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
                {exams.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">No examination records found.</td>
                  </tr>
                ) : (
                  exams.map((ex) => (
                    <tr key={ex.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{ex.name || ex.title}</td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">{ex.courseName}</td>
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
