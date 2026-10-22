import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, Save, AlertCircle, FileBarChart, Sparkles, Calendar } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { api } from '../../services/api';
import toast from 'react-hot-toast';

export const STANDARD_EXAM_TYPES = [
  'Internal Assessment 1',
  'Internal Assessment 2',
  'Unit Test',
  'Model Examination',
  'Midterm Examination',
  'Semester Examination',
  'Final Examination',
  'Practical / Lab Exam',
  'Quiz / Class Test',
  'Viva Voce',
  'Assignment 1',
  'Assignment 2'
];

export default function TeacherGrades() {
  const { userData } = useAuth();
  const confirm = useConfirm();
  
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  
  // Scheduled exams for the selected course
  const [scheduledExams, setScheduledExams] = useState([]);
  const [selectedExamKey, setSelectedExamKey] = useState('Internal Assessment 1');
  const [customExamName, setCustomExamName] = useState('');
  const [maxMarks, setMaxMarks] = useState(100);
  
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch teacher's classes/courses
  useEffect(() => {
    if (!userData?.collegeId) return;
    const fetchCourses = async () => {
      try {
        const response = await api.get('/courses/my-classes');
        const courseList = response.data || [];
        setCourses(courseList);
        if (courseList.length > 0 && !selectedCourse) {
          setSelectedCourse(courseList[0].id);
        }
      } catch (error) {
        console.error("Error fetching courses:", error);
      }
    };
    fetchCourses();
  }, [userData]);

  // Fetch students & scheduled exams when class changes
  useEffect(() => {
    if (!selectedCourse || !userData?.collegeId) {
      setStudents([]);
      setScheduledExams([]);
      return;
    }

    const selectedClass = courses.find(c => c.id === selectedCourse);
    const targetCourseId = selectedClass?.courseId || selectedCourse;

    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch students and exams in parallel
        const [studentsRes, examsRes] = await Promise.all([
          api.get(`/students?sectionId=${selectedCourse}`),
          api.get('/exams', { params: { courseId: targetCourseId } }).catch(() => ({ data: [] }))
        ]);

        const studentData = studentsRes.data || [];
        setStudents(studentData);

        const examList = Array.isArray(examsRes.data) ? examsRes.data : [];
        setScheduledExams(examList);

        // Auto-select first scheduled exam if available, else standard
        if (examList.length > 0) {
          const firstExam = examList[0];
          setSelectedExamKey(`scheduled:${firstExam.id}`);
          setMaxMarks(firstExam.maxMarks || 100);
          
          // Pre-populate any existing marks
          const initialMarks = {};
          studentData.forEach(s => {
            const foundMark = firstExam.marks?.find(m => m.studentId === s.id);
            initialMarks[s.id] = (foundMark && foundMark.obtainedMarks !== undefined) ? String(foundMark.obtainedMarks) : '';
          });
          setMarks(initialMarks);
        } else {
          setSelectedExamKey('Internal Assessment 1');
          setMaxMarks(100);
          const initialMarks = {};
          studentData.forEach(s => initialMarks[s.id] = '');
          setMarks(initialMarks);
        }
      } catch (error) {
        console.error("Error loading roster/exams:", error);
        toast.error('Failed to load students');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedCourse, courses, userData]);

  // Handle exam selection change
  const handleExamChange = (newKey) => {
    setSelectedExamKey(newKey);

    if (newKey.startsWith('scheduled:')) {
      const examId = newKey.replace('scheduled:', '');
      const exam = scheduledExams.find(e => e.id === examId);
      if (exam) {
        setMaxMarks(exam.maxMarks || 100);
        const newMarks = {};
        students.forEach(s => {
          const found = exam.marks?.find(m => m.studentId === s.id);
          newMarks[s.id] = (found && found.obtainedMarks !== undefined) ? String(found.obtainedMarks) : '';
        });
        setMarks(newMarks);
        return;
      }
    }

    if (newKey === 'CUSTOM') {
      // Keep existing marks or blank
      return;
    }

    // Standard exam selected - check if an exam of this type already exists in scheduledExams
    const matchedExam = scheduledExams.find(e => (e.type === newKey || e.name === newKey || e.title === newKey));
    if (matchedExam) {
      setMaxMarks(matchedExam.maxMarks || 100);
      const newMarks = {};
      students.forEach(s => {
        const found = matchedExam.marks?.find(m => m.studentId === s.id);
        newMarks[s.id] = (found && found.obtainedMarks !== undefined) ? String(found.obtainedMarks) : '';
      });
      setMarks(newMarks);
    } else {
      setMaxMarks(100);
      const newMarks = {};
      students.forEach(s => newMarks[s.id] = '');
      setMarks(newMarks);
    }
  };

  const handleMarkChange = (studentId, value) => {
    const num = Number(value);
    if (value === '' || (num >= 0 && num <= maxMarks)) {
      setMarks(prev => ({ ...prev, [studentId]: value }));
    } else {
      toast.error(`Marks must be between 0 and ${maxMarks}`);
    }
  };

  const handleSaveGrades = async () => {
    if (!selectedCourse) return toast.error('Please select a class first');

    // Resolve exam title/type and optional examId
    let resolvedExamType = '';
    let resolvedExamId = undefined;

    if (selectedExamKey.startsWith('scheduled:')) {
      const examId = selectedExamKey.replace('scheduled:', '');
      const exam = scheduledExams.find(e => e.id === examId);
      resolvedExamId = exam?.id;
      resolvedExamType = exam?.type || exam?.name || exam?.title || 'Exam';
    } else if (selectedExamKey === 'CUSTOM') {
      if (!customExamName.trim()) {
        return toast.error('Please enter a name for the custom examination');
      }
      resolvedExamType = customExamName.trim();
    } else {
      resolvedExamType = selectedExamKey;
      const matchedExam = scheduledExams.find(e => (e.type === selectedExamKey || e.name === selectedExamKey));
      if (matchedExam) {
        resolvedExamId = matchedExam.id;
      }
    }
    
    // Check if any mark is empty
    const unentered = students.filter(s => marks[s.id] === '');
    if (unentered.length > 0) {
      if (!(await confirm({ message: `There are ${unentered.length} students without marks. Submit anyway?` }))) {
        return;
      }
    }

    setSaving(true);
    try {
      const records = [];
      Object.entries(marks).forEach(([studentId, obtainedMarks]) => {
        if (obtainedMarks !== '') {
          records.push({
            studentId,
            obtainedMarks: Number(obtainedMarks)
          });
        }
      });

      if (records.length === 0) {
        setSaving(false);
        return toast.error("No marks entered to save");
      }

      const selectedClass = courses.find(c => c.id === selectedCourse);

      await api.post('/exams/batch-marks', {
        courseId: selectedClass?.courseId || selectedCourse,
        examId: resolvedExamId,
        examType: resolvedExamType,
        maxMarks: Number(maxMarks),
        records
      });

      toast.success("Marks saved successfully");

      // Refresh exams cache so current marks persist
      const targetCourseId = selectedClass?.courseId || selectedCourse;
      const updatedExamsRes = await api.get('/exams', { params: { courseId: targetCourseId } });
      if (Array.isArray(updatedExamsRes?.data)) {
        setScheduledExams(updatedExamsRes.data);
      }
    } catch (err) {
      console.error(err);
      if (err.message?.includes('422')) {
        toast.error("Marks exceed the maximum allowed for this exam");
      } else {
        toast.error("Failed to save marks");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Marks & Grading</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Input scores for assignments and examinations.</p>
        </div>
        
        <button 
          onClick={handleSaveGrades}
          disabled={saving || students.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 transition-all hover:scale-105 active:scale-95"
        >
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Submitting...' : 'Submit Grades'}
        </button>
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Class / Subject</label>
            <select 
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">-- Choose a Class --</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.name} ({course.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Examination Type</label>
            <div className="relative">
              <FileBarChart className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
              <select 
                value={selectedExamKey}
                onChange={(e) => handleExamChange(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {scheduledExams.length > 0 && (
                  <optgroup label="Scheduled Course Exams">
                    {scheduledExams.map(ex => (
                      <option key={ex.id} value={`scheduled:${ex.id}`}>
                        {ex.title || ex.name} ({ex.type || 'Exam'} - Max {ex.maxMarks})
                      </option>
                    ))}
                  </optgroup>
                )}

                <optgroup label="Institutional Examination Types">
                  {STANDARD_EXAM_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </optgroup>

                <optgroup label="Other">
                  <option value="CUSTOM">+ Custom Examination Type...</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Maximum Marks</label>
            <input 
              type="number"
              value={maxMarks}
              onChange={(e) => setMaxMarks(Math.max(1, Number(e.target.value)))}
              min="1"
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Custom Exam Input Field */}
        {selectedExamKey === 'CUSTOM' && (
          <div className="bg-primary-50/60 dark:bg-primary-500/10 p-4 rounded-xl border border-primary-200 dark:border-primary-500/20 flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-in fade-in duration-200">
            <Sparkles className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5 sm:mt-0" />
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-primary-900 dark:text-primary-300 mb-1">
                Custom Examination Title / Type *
              </label>
              <input 
                type="text"
                value={customExamName}
                onChange={(e) => setCustomExamName(e.target.value)}
                placeholder="e.g. Surprise Test, Pre-Board Exam, CAT-1, Aptitude Test"
                className="w-full bg-white dark:bg-[#0A0F1C] border border-primary-300 dark:border-primary-500/30 rounded-lg px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}
      </div>

      {selectedCourse && (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/5">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-500" />
              Grading Roster ({students.length})
            </h3>
            <div className="text-sm font-bold text-slate-500 bg-slate-100 dark:bg-white/5 px-3 py-1.5 rounded-lg">
              Entered: {students.filter(s => marks[s.id] !== '').length} / {students.length}
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500">Loading roster...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No Students Found</h3>
              <p className="text-slate-500">There are no students enrolled in this class yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02]">
                    <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400 w-32">Roll No</th>
                    <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400">Student Name</th>
                    <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400 text-right w-48">Score / {maxMarks}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {students.map((student, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={student.id} 
                      className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4 font-medium text-slate-900 dark:text-white">
                        {student.rollNumber || `R-${idx+100}`}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-xs">
                            {student.firstName[0]}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{student.firstName} {student.lastName}</p>
                            <p className="text-xs text-slate-500">{student.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <input 
                            type="number"
                            value={marks[student.id]}
                            onChange={(e) => handleMarkChange(student.id, e.target.value)}
                            placeholder="-"
                            className={`w-20 text-center bg-slate-50 dark:bg-white/5 border rounded-xl py-2 font-bold focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all ${
                              marks[student.id] !== '' ? 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400' : 'border-slate-200 dark:border-white/10 text-slate-900 dark:text-white'
                            }`}
                          />
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
