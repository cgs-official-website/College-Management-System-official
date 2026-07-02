import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Users, Save, AlertCircle, FileBarChart } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import toast from 'react-hot-toast';

export default function TeacherGrades() {
  const { userData } = useAuth();
  const confirm = useConfirm();
  
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [examType, setExamType] = useState('Midterm');
  const [maxMarks, setMaxMarks] = useState(100);
  
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        if (!userData?.collegeId) return;
        const q = query(collection(db, 'courses'), where('collegeId', '==', userData.collegeId));
        const snap = await getDocs(q);
        setCourses(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchCourses();
  }, [userData]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedCourse || !userData?.collegeId) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'students'), 
          where('collegeId', '==', userData.collegeId),
          where('courseId', '==', selectedCourse)
        );
        const snap = await getDocs(q);
        const studentData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStudents(studentData);
        
        const initialMarks = {};
        studentData.forEach(s => initialMarks[s.id] = '');
        setMarks(initialMarks);
      } catch (err) {
        toast.error('Failed to load students');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [selectedCourse, userData]);

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
    
    // Check if any mark is empty
    const unentered = students.filter(s => marks[s.id] === '');
    if (unentered.length > 0) {
      return toast.error(`Please enter marks for all ${students.length} students. ${unentered.length} remaining.`);
    }

    const isConfirmed = await confirm({
      title: 'Submit Grades',
      message: `Are you sure you want to submit ${examType} grades for ${students.length} students? This action cannot be easily undone.`,
      type: 'warning',
      confirmText: 'Submit Grades'
    });

    if (!isConfirmed) return;

    setSaving(true);
    try {
      const gradesRef = collection(db, 'grades');
      
      const promises = students.map(student => {
        return addDoc(gradesRef, {
          collegeId: userData.collegeId,
          courseId: selectedCourse,
          studentId: student.id,
          examType,
          maxMarks,
          obtainedMarks: Number(marks[student.id]),
          gradedBy: userData.uid,
          createdAt: serverTimestamp()
        });
      });

      await Promise.all(promises);
      toast.success('Grades submitted successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit grades');
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
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 transition-all"
        >
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Submitting...' : 'Submit Grades'}
        </button>
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6">
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
              <FileBarChart className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select 
                value={examType}
                onChange={(e) => setExamType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none"
              >
                <option value="Assignment 1">Assignment 1</option>
                <option value="Assignment 2">Assignment 2</option>
                <option value="Midterm">Midterm Examination</option>
                <option value="Final">Final Examination</option>
                <option value="Practical">Practical / Lab</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Maximum Marks</label>
            <input 
              type="number"
              value={maxMarks}
              onChange={(e) => setMaxMarks(Number(e.target.value))}
              min="1"
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>
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
