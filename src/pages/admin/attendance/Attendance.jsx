import React, { useState } from 'react';
import { Calendar, CheckCircle, XCircle, Clock } from 'lucide-react';
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
  const [selectedClass, setSelectedClass] = useState('1'); // Defaulting to Class 1 as per StudentFormModal
  const [selectedSection, setSelectedSection] = useState('A');

  const { attendanceRecords, isLoading: isAttendanceLoading, markAttendance } = useAttendance(collegeId, `${selectedClass}-${selectedSection}`, selectedDate);

  const filteredStudents = students.filter(s => s.class === selectedClass && s.section === selectedSection);

  const handleMark = (studentId, status) => {
    markAttendance(studentId, status);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return 'bg-emerald-500 text-white';
      case 'absent': return 'bg-red-500 text-white';
      case 'late': return 'bg-amber-500 text-white';
      default: return 'bg-slate-100 dark:bg-white/5 text-slate-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Daily Attendance</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Record and monitor student presence.</p>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-[#0A0F1C] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <Input 
          label="Date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        <Select 
          label="Class"
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          options={[
            { value: '1', label: 'Class 1' },
            { value: '2', label: 'Class 2' },
            { value: '10', label: 'Class 10' },
            { value: '12', label: 'Class 12' }
          ]}
        />
        <Select 
          label="Section"
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          options={[
            { value: 'A', label: 'Section A' },
            { value: 'B', label: 'Section B' },
            { value: 'C', label: 'Section C' }
          ]}
        />
      </div>

      {/* Students List */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/[0.02]">
          <h3 className="font-bold text-slate-900 dark:text-white">
            Class {selectedClass} - {selectedSection} Students
          </h3>
          <span className="text-sm font-medium text-slate-500 bg-white dark:bg-[#0A0F1C] px-3 py-1 rounded-full shadow-sm border border-slate-200 dark:border-white/10">
            Total: {filteredStudents.length}
          </span>
        </div>
        
        {isStudentsLoading || isAttendanceLoading ? (
          <div className="p-8 text-center text-slate-500">Loading records...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400">No students found in this class section.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {filteredStudents.map((student) => {
              const status = attendanceRecords[student.id]; // 'present', 'absent', 'late', or undefined

              return (
                <div key={student.id} className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                      {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{student.firstName} {student.lastName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">ID: {student.id.substring(0,6)}</p>
                    </div>
                  </div>

                  <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
                    <button 
                      onClick={() => handleMark(student.id, 'present')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${status === 'present' ? getStatusColor('present') : 'text-slate-500 hover:bg-white dark:hover:bg-[#0A0F1C] hover:text-emerald-500 shadow-sm'}`}
                    >
                      <CheckCircle className="w-4 h-4" /> Present
                    </button>
                    <button 
                      onClick={() => handleMark(student.id, 'absent')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${status === 'absent' ? getStatusColor('absent') : 'text-slate-500 hover:bg-white dark:hover:bg-[#0A0F1C] hover:text-red-500 shadow-sm'}`}
                    >
                      <XCircle className="w-4 h-4" /> Absent
                    </button>
                    <button 
                      onClick={() => handleMark(student.id, 'late')}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${status === 'late' ? getStatusColor('late') : 'text-slate-500 hover:bg-white dark:hover:bg-[#0A0F1C] hover:text-amber-500 shadow-sm'}`}
                    >
                      <Clock className="w-4 h-4" /> Late
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
