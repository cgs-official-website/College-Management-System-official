import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MonitorPlay, Video, Film, Award, PlayCircle, Clock, Users } from 'lucide-react';

const StudentLMS = () => {
  const [activeTab, setActiveTab] = useState('materials');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Learning Portal</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Access course materials, join live classes, and watch recordings.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {[
          { title: 'Enrolled Courses', value: '0', icon: MonitorPlay, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Live Classes Today', value: '0', icon: Video, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Videos Watched', value: '0', icon: Film, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          { title: 'Certificates Earned', value: '0', icon: Award, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
        ].map((stat, idx) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx}
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{stat.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity rounded-full ${stat.bg.split(' ')[0].replace('50', '500')}`} />
          </motion.div>
        ))}
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {[
          { id: 'materials', label: 'Course Materials', icon: MonitorPlay },
          { id: 'live', label: 'Live Classes', icon: Video },
          { id: 'videos', label: 'Video Library', icon: Film },
          { id: 'certificates', label: 'My Certificates', icon: Award },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20'
                : 'bg-white dark:bg-[#0A0F1C] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden"
      >
        {activeTab === 'materials' && (
          <div className="p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Course Materials</h2>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <MonitorPlay className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Course Materials Yet</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Study materials uploaded by your teachers will appear here. Check back after your courses begin.</p>
            </div>
          </div>
        )}

        {activeTab === 'live' && (
          <div className="p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Upcoming Live Classes</h2>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Live Classes Scheduled</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">When your teachers schedule a live class, you'll see a "Join Meeting" button here.</p>
            </div>
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Recorded Lectures</h2>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Film className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Recordings Available</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Recorded lectures and video resources from your teachers will appear here.</p>
            </div>
          </div>
        )}

        {activeTab === 'certificates' && (
          <div className="p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">My Certificates</h2>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Award className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Certificates Earned</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Complete courses and assessments to earn certificates that will appear here.</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default StudentLMS;
