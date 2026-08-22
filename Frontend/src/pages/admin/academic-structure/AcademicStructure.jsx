import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, GraduationCap, Users } from 'lucide-react';
import DepartmentsTab from './DepartmentsTab';
import CoursesTab from './CoursesTab';
import SectionsTab from './SectionsTab';

export default function AcademicStructure() {
  const [activeTab, setActiveTab] = useState('departments');
  const [selectedDepartment, setSelectedDepartment] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const handleDepartmentSelect = (dept) => {
    setSelectedDepartment(dept);
    setSelectedCourse(null);
    setActiveTab('courses');
  };

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    setActiveTab('sections');
  };

  const tabs = [
    { id: 'departments', name: 'Departments', icon: Building2 },
    { id: 'courses', name: 'Programs / Courses', icon: GraduationCap },
    { id: 'sections', name: 'Classes / Sections', icon: Users },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Academic Structure</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Configure your college's departments, programs, and classes.</p>
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-1 flex overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.name}
          </button>
        ))}
      </div>

      <div className="mt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'departments' && (
              <DepartmentsTab onSelect={handleDepartmentSelect} />
            )}
            {activeTab === 'courses' && (
              <CoursesTab 
                departmentId={selectedDepartment?.id} 
                departmentName={selectedDepartment?.name}
                onSelect={handleCourseSelect} 
                onClearFilter={() => setSelectedDepartment(null)}
              />
            )}
            {activeTab === 'sections' && (
              <SectionsTab 
                courseId={selectedCourse?.id} 
                courseName={selectedCourse?.name}
                onClearFilter={() => setSelectedCourse(null)}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
