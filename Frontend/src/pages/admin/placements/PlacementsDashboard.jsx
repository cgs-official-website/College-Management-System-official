import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, X, Plus, Trash2, Calendar, Award, TrendingUp, Building } from 'lucide-react';
import { usePlacements } from '../../../hooks/usePlacements';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useConfirm } from '../../../contexts/ConfirmContext';

export default function PlacementsDashboard() {
  const confirm = useConfirm();
  const { items, stats, isLoading, isAdding, createItem, deleteItem } = usePlacements();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    role: '',
    ctc: '',
    driveDate: '',
    eligibilityCriteria: '',
    studentsPlaced: 0,
  });

  const handleAddDrive = async (e) => {
    e.preventDefault();
    if (!formData.companyName.trim()) return;

    try {
      await createItem({
        companyName: formData.companyName.trim(),
        role: formData.role.trim() || 'Software Engineer',
        ctc: formData.ctc.trim() ? `${formData.ctc.trim()}${formData.ctc.includes('LPA') ? '' : ' LPA'}` : '6.5 LPA',
        driveDate: formData.driveDate || new Date().toISOString(),
        eligibilityCriteria: formData.eligibilityCriteria.trim() || 'Min 60% aggregate',
        studentsPlaced: Number(formData.studentsPlaced) || 0,
      });

      setIsModalOpen(false);
      setFormData({
        companyName: '',
        role: '',
        ctc: '',
        driveDate: '',
        eligibilityCriteria: '',
        studentsPlaced: 0,
      });
    } catch {
      // Toast handled by mutation
    }
  };

  const handleDelete = async (id, companyName) => {
    const ok = await confirm({
      title: 'Delete Placement Drive',
      message: `Are you sure you want to remove the placement drive for "${companyName}"?`,
      confirmText: 'Delete',
      variant: 'danger'
    });

    if (ok) {
      await deleteItem(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Placement Cell</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage placement drives, internships, and student recruitment.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 shadow-lg shadow-primary-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Placement Drive
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { title: 'Total Drives', value: isLoading ? '...' : stats.totalDrives, icon: Building, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Students Placed', value: isLoading ? '...' : stats.studentsPlaced, icon: Award, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Top CTC', value: isLoading ? '...' : stats.topCtc, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
        ].map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={stat.title} 
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden group"
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

      {/* Placement Drives Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active & Upcoming Placement Drives</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Institutional recruitment drives stored in database.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Company</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Package (CTC)</th>
                <th className="py-3.5 px-4">Drive Date</th>
                <th className="py-3.5 px-4">Eligibility</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              {isLoading ? (
                [1, 2, 3].map(n => (
                  <tr key={n} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-6 w-32 bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-28 bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-24 bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-36 bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4 text-right"></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Briefcase className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-slate-600 dark:text-slate-400">No placement drives registered yet.</p>
                    <p className="text-xs text-slate-500 mt-1">Click "Add Placement Drive" to create your first drive.</p>
                  </td>
                </tr>
              ) : (
                items.map((drive) => (
                  <tr key={drive.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-4 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-xs">
                          {drive.company?.charAt(0) || 'C'}
                        </div>
                        <span>{drive.company || drive.companyName}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300 font-medium">
                      {drive.role}
                    </td>
                    <td className="py-4 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      {drive.ctc}
                    </td>
                    <td className="py-4 px-4 text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 text-xs">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{drive.date}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-500 dark:text-slate-400">
                      {drive.eligibilityCriteria}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        onClick={() => handleDelete(drive.id, drive.company || drive.companyName)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        title="Delete Drive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add Placement Drive Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Placement Drive"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAddDrive} className="space-y-4">
          <Input
            label="Company Name"
            placeholder="e.g. Microsoft, Infosys, Deloitte"
            value={formData.companyName}
            onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Designation / Role"
              placeholder="e.g. Software Engineer"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            />
            <Input
              label="Salary Package (CTC)"
              placeholder="e.g. 14.5 LPA"
              value={formData.ctc}
              onChange={(e) => setFormData({ ...formData, ctc: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Drive Date"
              type="date"
              value={formData.driveDate}
              onChange={(e) => setFormData({ ...formData, driveDate: e.target.value })}
            />
            <Input
              label="Students Placed (if completed)"
              type="number"
              min="0"
              placeholder="e.g. 15"
              value={formData.studentsPlaced}
              onChange={(e) => setFormData({ ...formData, studentsPlaced: e.target.value })}
            />
          </div>

          <Input
            label="Eligibility Criteria"
            placeholder="e.g. B.Tech CS/IT with min 65% aggregate"
            value={formData.eligibilityCriteria}
            onChange={(e) => setFormData({ ...formData, eligibilityCriteria: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isAdding}>
              Save Placement Drive
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
