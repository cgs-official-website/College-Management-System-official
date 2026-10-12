import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Calendar, CheckCircle2, XCircle, Clock, Users, UserCheck, UserX, CheckCheck } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useStudents } from '../../../hooks/useStudents';
import { useAttendance } from '../../../hooks/useAttendance';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';

export default function Attendance() {
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { students, isLoading: isStudentsLoading } = useStudents(collegeId);
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('ALL');

  const { attendanceRecords, isLoading: isAttendanceLoading, isSaving, markAttendance, markAll } = useAttendance(collegeId, null, selectedDate);

  // Extract unique classes dynamically from student records
  const classOptions = useMemo(() => {
    const unique = Array.from(new Set(students.map(s => s.class).filter(Boolean)));
    return [
      { value: 'ALL', label: 'All Classes' },
      ...unique.map(c => ({ value: c, label: `Class ${c}` }))
    ];
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (selectedClass === 'ALL') return students;
    return students.filter(s => s.class === selectedClass);
  }, [students, selectedClass]);

  // Compute live stats for the filtered list
  const presentCount = filteredStudents.filter(s => attendanceRecords[s.id] === 'present').length;
  const lateCount = filteredStudents.filter(s => attendanceRecords[s.id] === 'late').length;
  const absentCount = filteredStudents.filter(s => attendanceRecords[s.id] === 'absent').length;
  const unmarkedCount = filteredStudents.filter(s => !attendanceRecords[s.id]).length;
  const attendanceRate = filteredStudents.length > 0
    ? `${Math.round(((presentCount + lateCount) / filteredStudents.length) * 100)}%`
    : '0%';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Daily Attendance</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Record, monitor, and sync student presence in real time.</p>
        </div>
        <Button 
          variant="secondary" 
          onClick={() => markAll(filteredStudents, 'present')}
          disabled={isSaving || filteredStudents.length === 0}
          className="flex items-center gap-2"
        >
          <CheckCheck className="w-4 h-4 text-emerald-500" />
          Mark All Present
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Total Students</p>
            <p className="text-xl font-extrabold text-slate-900 dark:text-white">{filteredStudents.length}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Present</p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{presentCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Late Entry</p>
            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">{lateCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold">
            <UserX className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Absent / Rate</p>
            <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400">{absentCount} ({attendanceRate})</p>
          </div>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-[#0A0F1C] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <Input 
          label="Attendance Date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        <Select 
          label="Filter by Class"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          options={classOptions}
        />
      </div>

      {/* Students Attendance Table */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/[0.02]">
          <h3 className="font-bold text-slate-900 dark:text-white">
            Class Roster ({filteredStudents.length} Students)
          </h3>
          <span className="text-xs text-slate-500">
            {unmarkedCount > 0 ? `${unmarkedCount} unmarked` : 'All students marked'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Student Name</th>
                <th className="py-3.5 px-4">Admission No</th>
                <th className="py-3.5 px-4">Class & Section</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              {(isStudentsLoading || isAttendanceLoading) ? (
                [1, 2, 3].map(n => (
                  <tr key={n} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-6 w-36 bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-24 bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-28 bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4 text-center"><div className="h-6 w-16 mx-auto bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4 text-right"><div className="h-8 w-36 ml-auto bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                  </tr>
                ))
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-slate-600 dark:text-slate-400">No students found matching the selected class.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const currentStatus = attendanceRecords[student.id] || 'unmarked';

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-xs">
                            {student.firstName?.[0] || 'S'}
                          </div>
                          <span>{student.firstName} {student.lastName}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                        {student.admissionNo || student.admissionNumber || student.rollNumber || 'N/A'}
                      </td>
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                        {student.class || 'Class 1'} {student.section ? `(${student.section})` : ''}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          currentStatus === 'present'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : currentStatus === 'late'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                            : currentStatus === 'absent'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                            : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            currentStatus === 'present' ? 'bg-emerald-500' : currentStatus === 'late' ? 'bg-amber-500' : currentStatus === 'absent' ? 'bg-rose-500' : 'bg-slate-400'
                          }`} />
                          {currentStatus.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="inline-flex gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                          <button
                            onClick={() => markAttendance(student.id, 'present')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              currentStatus === 'present'
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-black/20'
                            }`}
                          >
                            P
                          </button>
                          <button
                            onClick={() => markAttendance(student.id, 'late')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              currentStatus === 'late'
                                ? 'bg-amber-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-black/20'
                            }`}
                          >
                            L
                          </button>
                          <button
                            onClick={() => markAttendance(student.id, 'absent')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              currentStatus === 'absent'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-black/20'
                            }`}
                          >
                            A
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
