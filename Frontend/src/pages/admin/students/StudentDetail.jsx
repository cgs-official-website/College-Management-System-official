import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudent } from '../../../hooks/useStudents';
import { Button } from '../../../components/ui/Button';
import { ArrowLeft, User, BookOpen, GraduationCap, Phone, MapPin } from 'lucide-react';

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: student, isLoading, error } = useStudent(id);

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading student details...</div>;
  }

  if (error || !student) {
    return <div className="p-8 text-center text-red-500">Error loading student or student not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate('/admin/students')}
          className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Student Profile</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Detailed view of student information.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mb-4 shadow-lg shadow-indigo-500/20">
            {student.firstName?.[0]}{student.lastName?.[0]}
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {student.firstName} {student.lastName}
          </h2>
          <p className="text-indigo-600 dark:text-indigo-400 font-medium mt-1">
            {student.admissionNo}
          </p>
          <span className={`mt-3 px-3 py-1 rounded-full text-xs font-medium ${
            student.status === 'active' 
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
              : 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-400'
          }`}>
            {student.status === 'active' ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Right Column: Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-500" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Email</p>
                <p className="font-medium text-slate-900 dark:text-white">{student.email || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Phone</p>
                <p className="font-medium text-slate-900 dark:text-white">{student.phone || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Date of Birth</p>
                <p className="font-medium text-slate-900 dark:text-white">{student.dob || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Gender</p>
                <p className="font-medium text-slate-900 dark:text-white capitalize">{student.gender || '-'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-500" />
              Academic Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Class</p>
                <p className="font-medium text-slate-900 dark:text-white">{student.class || '-'}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Section</p>
                <p className="font-medium text-slate-900 dark:text-white">{student.section || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
