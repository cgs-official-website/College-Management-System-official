import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Megaphone, Clock, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotices } from '../../../hooks/useNotices';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { NoticeFormModal } from './NoticeFormModal';
import { useConfirm } from '../../../contexts/ConfirmContext';

export default function NoticeBoard() {
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { notices, isLoading, addNotice, updateNotice, deleteNotice, isAdding, isUpdating } = useNotices(collegeId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState(null);

  const filteredNotices = notices.filter(notice => 
    notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notice.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingNotice(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (notice) => {
    setEditingNotice(notice);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: "Are you sure you want to delete this notice?" })) {
      await deleteNotice(id);
    }
  };

  const handleSubmit = async (data) => {
    try {
      if (editingNotice) {
        await updateNotice({ id: editingNotice.id, data });
      } else {
        await addNotice(data);
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30';
      case 'low': return 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400 border-slate-200 dark:border-slate-500/30';
      default: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'high': return <AlertCircle className="w-3 h-3 mr-1 inline" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notice Board</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Broadcast announcements to students and staff.</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Create Notice
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input 
            placeholder="Search notices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-48 bg-slate-100 dark:bg-white/5 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No notices found</h3>
          <p className="text-slate-500 dark:text-slate-400">Click "Create Notice" to broadcast your first announcement.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredNotices.map((notice, idx) => (
            <motion.div 
              key={notice.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col"
            >
              <div className="flex justify-between items-start mb-4">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded-md border ${getPriorityColor(notice.priority)}`}>
                  {getPriorityIcon(notice.priority)}
                  {notice.priority}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleOpenEdit(notice)} className="p-1.5 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors bg-slate-50 dark:bg-white/5 rounded-lg">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(notice.id)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-slate-50 dark:bg-white/5 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">{notice.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 line-clamp-3 flex-1">{notice.content}</p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  {notice.createdAt?.toDate ? new Date(notice.createdAt.toDate()).toLocaleDateString() : 'Just now'}
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-md uppercase tracking-wide">
                  {notice.targetAudience === 'all' ? 'Everyone' : notice.targetAudience}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <NoticeFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingNotice}
        isLoading={isAdding || isUpdating}
      />
    </div>
  );
}
