import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MonitorPlay, Video, Film, Upload, Plus, X } from 'lucide-react';
import { toast } from 'react-hot-toast';

const TeacherLMS = () => {
  const [activeTab, setActiveTab] = useState('materials');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleUploadMaterial = (e) => {
    e.preventDefault();
    toast.success('Study material uploaded successfully!');
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Teaching Portal</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Upload materials, conduct live classes, and manage your video library.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Upload Material
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {[
          { title: 'My Uploaded Materials', value: '0', icon: MonitorPlay, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'My Scheduled Classes', value: '0', icon: Video, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'My Videos', value: '0', icon: Film, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
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
          { id: 'materials', label: 'My Materials', icon: MonitorPlay },
          { id: 'live', label: 'My Live Classes', icon: Video },
          { id: 'videos', label: 'My Videos', icon: Film },
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

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden"
      >
        {activeTab === 'materials' && (
          <div className="p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">My Uploaded Materials</h2>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <MonitorPlay className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Materials Uploaded</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Click "Upload Material" to share study resources with your students.</p>
            </div>
          </div>
        )}

        {activeTab === 'live' && (
          <div className="p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">My Scheduled Live Classes</h2>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Classes Scheduled</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Classes scheduled by the admin for your subjects will appear here. You can start or join them.</p>
            </div>
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="p-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6">My Video Library</h2>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Film className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Videos Uploaded</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Upload recorded lectures or educational videos for your students to access anytime.</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Upload Material Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white dark:bg-[#0A0F1C] w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Upload Study Material</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUploadMaterial} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Title</label>
                  <input type="text" placeholder="e.g. Unit 3 - Sorting Algorithms Notes" className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Subject</label>
                  <input type="text" placeholder="e.g. Data Structures" className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Upload File</label>
                  <div className="w-full border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-8 flex flex-col items-center justify-center bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer group">
                    <Upload className="w-8 h-8 text-slate-400 group-hover:text-primary-500 transition-colors mb-3" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Click to upload</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">PDF, DOCX, PPTX, ZIP (Max 25MB)</p>
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">Cancel</button>
                  <button type="submit" className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all">Upload</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TeacherLMS;
