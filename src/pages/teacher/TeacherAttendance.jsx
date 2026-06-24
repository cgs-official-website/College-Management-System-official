import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Search, CheckCircle2, XCircle, Clock, Save, AlertCircle, Users } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function TeacherAttendance() {
  const { userData } = useAuth();
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendanceState, setAttendanceState] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch courses assigned to teacher (Mocking all courses for now)
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

  // Fetch students when a course is selected
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedCourse || !userData?.collegeId) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'students'), 
          where('courseId', '==', selectedCourse)
        );
        const snap = await getDocs(q);
        const studentData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setStudents(studentData);
        
        // Initialize attendance state (default Present)
        const initialState = {};
        studentData.forEach(student => {
          initialState[student.id] = 'Present';
        });
        setAttendanceState(initialState);
      } catch (err) {
        toast.error('Failed to load students');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [selectedCourse, userData]);

  const handleMark = (studentId, status) => {
    setAttendanceState(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSaveAttendance = async () => {
    if (!selectedCourse) {
      toast.error('Please select a class first');
      return;
    }
    if (students.length === 0) {
      toast.error('No students to mark');
      return;
    }

    setSaving(true);
    try {
      const attendanceRef = collection(db, 'attendance');
      
      // Save individually (in production, use a batch)
      const promises = students.map(student => {
        return addDoc(attendanceRef, {
          collegeId: userData.collegeId,
          courseId: selectedCourse,
          studentId: student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          date: date,
          status: attendanceState[student.id],
          markedBy: userData.uid,
          createdAt: serverTimestamp()
        });
      });

      await Promise.all(promises);
      toast.success('Attendance saved successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Daily Attendance</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Mark student attendance for your assigned classes.</p>
        </div>
        
        <button 
          onClick={handleSaveAttendance}
          disabled={saving || students.length === 0}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 transition-all"
        >
          {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Saving...' : 'Save Records'}
        </button>
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Select Class / Subject</label>
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
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      </div>

      {selectedCourse && (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-white/5">
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-500" />
              Student List ({students.length})
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Search student..."
                className="pl-9 pr-4 py-1.5 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-slate-500">Loading students...</p>
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
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400">Roll No</th>
                    <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400">Student Name</th>
                    <th className="p-4 text-sm font-bold text-slate-500 dark:text-slate-400 text-center">Status</th>
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
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleMark(student.id, 'Present')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                              attendanceState[student.id] === 'Present' 
                                ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 ring-2 ring-emerald-500/50' 
                                : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" /> Present
                          </button>
                          <button 
                            onClick={() => handleMark(student.id, 'Late')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                              attendanceState[student.id] === 'Late' 
                                ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 ring-2 ring-amber-500/50' 
                                : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:text-amber-600'
                            }`}
                          >
                            <Clock className="w-4 h-4" /> Late
                          </button>
                          <button 
                            onClick={() => handleMark(student.id, 'Absent')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                              attendanceState[student.id] === 'Absent' 
                                ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 ring-2 ring-rose-500/50' 
                                : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600'
                            }`}
                          >
                            <XCircle className="w-4 h-4" /> Absent
                          </button>
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
