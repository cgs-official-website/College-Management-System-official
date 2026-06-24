import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileBarChart, Plus, Calendar as CalendarIcon, Clock, Users, X, Save } from 'lucide-react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { Modal } from '../../components/ui/Modal';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import toast from 'react-hot-toast';

export default function TeacherAssignments() {
  const { userData } = useAuth();
  const confirm = useConfirm();
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    courseId: '',
    dueDate: '',
    maxScore: 100
  });

  const fetchData = async () => {
    try {
      if (!userData?.collegeId) return;
      
      // Fetch courses for dropdown
      const coursesQ = query(
        collection(db, 'courses'), 
        where('collegeId', '==', userData.collegeId)
      );
      const coursesSnap = await getDocs(coursesQ);
      const myCourses = coursesSnap.docs.filter(d => d.data().assignedTeacher === userData.uid);
      setCourses(myCourses.map(d => ({ id: d.id, ...d.data() })));

      // Fetch assignments
      const assignQ = query(
        collection(db, 'assignments'), 
        where('collegeId', '==', userData.collegeId),
        where('teacherId', '==', userData.uid)
      );
      const assignSnap = await getDocs(assignQ);
      setAssignments(assignSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => b.createdAt - a.createdAt));
      
    } catch (err) {
      console.error(err);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userData?.collegeId) {
      setLoading(true);
      fetchData();
    }
  }, [userData?.collegeId, userData?.uid]);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!formData.courseId) return toast.error('Please select a class');
    
    const isConfirmed = await confirm({
      title: 'Publish Assignment',
      message: `Are you sure you want to publish "${formData.title}" to the students?`,
      confirmText: 'Publish',
      type: 'primary'
    });

    if (!isConfirmed) return;

    setSaving(true);
    try {
      const selectedCourse = courses.find(c => c.id === formData.courseId);
      
      await addDoc(collection(db, 'assignments'), {
        collegeId: userData.collegeId,
        teacherId: userData.uid,
        courseId: formData.courseId,
        courseName: selectedCourse?.name || 'Unknown',
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate,
        maxScore: Number(formData.maxScore),
        createdAt: serverTimestamp()
      });
      
      toast.success('Assignment published successfully!');
      setIsModalOpen(false);
      setFormData({ title: '', description: '', courseId: '', dueDate: '', maxScore: 100 });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const isConfirmed = await confirm({
      title: 'Delete Assignment',
      message: 'Are you sure you want to delete this assignment? Students will no longer see it.',
      confirmText: 'Delete',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      await deleteDoc(doc(db, 'assignments', id));
      setAssignments(prev => prev.filter(a => a.id !== id));
      toast.success('Assignment deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete assignment');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Assignments</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Create and manage class assignments and coursework.</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 transition-all"
        >
          <Plus className="w-5 h-5" />
          Create Assignment
        </button>
      </div>

      {loading ? (
        <div className="space-y-4 mt-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-white dark:bg-[#0A0F1C] rounded-2xl border border-slate-200 dark:border-white/10 animate-pulse" />
          ))}
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center mt-6">
          <FileBarChart className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Assignments Created</h3>
          <p className="text-slate-500 mb-6">You haven't posted any assignments for your classes yet.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-2 bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 font-bold rounded-xl hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors"
          >
            Create Your First Assignment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {assignments.map((assignment, idx) => (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              key={assignment.id}
              className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="px-2.5 py-1 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold mb-3 inline-block">
                    {assignment.courseName}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {assignment.title}
                  </h3>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-[#0A0F1C] rounded-lg shadow-sm border border-slate-100 dark:border-white/10 p-1">
                  <button onClick={() => handleDelete(assignment.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors" title="Delete">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-2 min-h-[40px]">
                {assignment.description}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center text-sm font-medium text-amber-600 dark:text-amber-500">
                  <Clock className="w-4 h-4 mr-1.5" />
                  Due: {new Date(assignment.dueDate).toLocaleDateString()}
                </div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {assignment.maxScore} Pts
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Assignment"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateAssignment} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Class / Subject</label>
            <select 
              value={formData.courseId} onChange={(e) => setFormData({...formData, courseId: e.target.value})} required
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select a class</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Assignment Title</label>
            <input 
              type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g. Chapter 3 Quiz"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description</label>
            <textarea 
              value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required
              rows={3}
              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Provide instructions..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Due Date</label>
              <input 
                type="date" value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} required
                min={new Date().toISOString().split('T')[0]}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Max Score</label>
              <input 
                type="number" value={formData.maxScore} onChange={(e) => setFormData({...formData, maxScore: e.target.value})} required min="1"
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl font-bold shadow-lg shadow-primary-500/30 transition-all flex justify-center items-center gap-2">
              {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
              Publish
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
