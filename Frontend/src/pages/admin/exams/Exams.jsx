import React, { useState } from 'react';
import { Plus, Search, Calendar, MapPin, Clock, BookOpen, Edit, Trash2 } from 'lucide-react';
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

  // Simple tabs for future expansion (e.g. Results tab)
  const [activeTab, setActiveTab] = useState('schedules'); 

  const filteredExams = exams.filter(exam => 
    exam.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exam.courseName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingExam(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (exam) => {
    setEditingExam(exam);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: "Are you sure you want to cancel and delete this exam schedule?" })) {
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
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Schedule tests and manage student grades.</p>
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
            Schedules
          </button>
          <button 
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'results' ? 'bg-white dark:bg-[#0A0F1C] text-primary-600 dark:text-primary-400 shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Results
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input 
            placeholder="Search exams..."
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
                const examDateObj = new Date(exam.examDate);
                const month = examDateObj.toLocaleString('default', { month: 'short' });
                const day = examDateObj.getDate();

                return (
                  <div key={exam.id} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      
                      {/* Date Badge */}
                      <div className="flex flex-col items-center justify-center bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 rounded-xl px-3 py-2 text-primary-700 dark:text-primary-400">
                        <span className="text-xs font-bold uppercase tracking-wider">{month}</span>
                        <span className="text-2xl font-extrabold leading-none mt-0.5">{day}</span>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEdit(exam)} className="p-1.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors bg-slate-50 dark:bg-white/5 rounded-lg">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(exam.id)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-slate-50 dark:bg-white/5 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{exam.subject}</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-6">{exam.title} • {exam.courseName}</p>

                    <div className="mt-auto space-y-3 pt-4 border-t border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <Clock className="w-4 h-4" />
                        <span>{exam.startTime} - {exam.endTime} ({exam.totalMarks} Marks)</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <MapPin className="w-4 h-4" />
                        <span>{exam.room || "Room TBA"}</span>
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
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Results Module</h3>
          <p className="text-slate-500 dark:text-slate-400">Publishing and managing exam grades will be available in the next update.</p>
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
