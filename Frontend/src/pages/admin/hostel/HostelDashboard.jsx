import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Building2, 
  DoorClosed, 
  Users, 
  Plus, 
  Trash2, 
  Phone, 
  CheckCircle2, 
  AlertCircle,
  Percent
} from 'lucide-react';
import { useHostel } from '../../../hooks/useHostel';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useConfirm } from '../../../contexts/ConfirmContext';

export default function HostelDashboard() {
  const confirm = useConfirm();
  const { items: blocks, stats, isLoading, isAdding, createItem, deleteItem } = useHostel();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Boys',
    totalRooms: 100,
    occupied: 0,
    wardenName: '',
    wardenPhone: '',
    status: 'Active'
  });

  const handleAddBlock = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      await createItem({
        name: formData.name.trim(),
        type: formData.type,
        totalRooms: Number(formData.totalRooms) || 100,
        occupied: Number(formData.occupied) || 0,
        wardenName: formData.wardenName.trim() || 'Chief Warden',
        wardenPhone: formData.wardenPhone.trim() || '+91 98765 43210',
        status: formData.status
      });

      setIsModalOpen(false);
      setFormData({
        name: '',
        type: 'Boys',
        totalRooms: 100,
        occupied: 0,
        wardenName: '',
        wardenPhone: '',
        status: 'Active'
      });
    } catch {
      // Toast handled by mutation
    }
  };

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: 'Delete Hostel Block',
      message: `Are you sure you want to remove "${name}"?`,
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
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Hostel & Accommodation</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage residential blocks, room allocations, and student occupancy.</p>
        </div>
        <Button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 shadow-lg shadow-primary-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Hostel Block
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Blocks', value: isLoading ? '...' : stats.totalBlocks, icon: Building2, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Total Capacity', value: isLoading ? '...' : `${stats.totalCapacity} Beds`, icon: DoorClosed, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
          { title: 'Occupied Beds', value: isLoading ? '...' : stats.occupiedBeds, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Occupancy Rate', value: isLoading ? '...' : stats.occupancyRate, icon: Percent, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
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

      {/* Hostel Blocks Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Hostel Blocks & Residency</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Manage room inventory and residential student capacity.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Block Details</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Occupancy Progress</th>
                <th className="py-3.5 px-4">Warden / Caretaker</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              {isLoading ? (
                [1, 2, 3].map(n => (
                  <tr key={n} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-6 w-36 bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-40 bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-32 bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4 text-right"></td>
                  </tr>
                ))
              ) : blocks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Building2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-slate-600 dark:text-slate-400">No hostel blocks registered yet.</p>
                    <p className="text-xs text-slate-500 mt-1">Click "Add Hostel Block" to add your campus residential facility.</p>
                  </td>
                </tr>
              ) : (
                blocks.map((block) => {
                  const percentage = block.totalRooms > 0 ? Math.min(100, Math.round((block.occupied / block.totalRooms) * 100)) : 0;
                  return (
                    <tr key={block.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-sm">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{block.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{block.totalRooms} Total Beds</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
                          {block.type}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="w-44">
                          <div className="flex justify-between text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            <span>{block.occupied} / {block.totalRooms} Beds</span>
                            <span>{percentage}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                percentage >= 95 ? 'bg-rose-500' : percentage >= 75 ? 'bg-amber-500' : 'bg-primary-500'
                              }`} 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{block.wardenName}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {block.wardenPhone}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                          block.status === 'Full' 
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                            : block.status === 'Renovation'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            block.status === 'Full' ? 'bg-rose-500' : block.status === 'Renovation' ? 'bg-amber-500' : 'bg-emerald-500'
                          }`} />
                          {block.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button 
                          onClick={() => handleDelete(block.id, block.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                          title="Delete Block"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Add Block Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Hostel Block"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAddBlock} className="space-y-4">
          <Input
            label="Block Name"
            placeholder="e.g. Ganga Block (Girls Hostel)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Category / Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="Boys">Boys</option>
                <option value="Girls">Girls</option>
                <option value="Co-Ed">Co-Ed</option>
                <option value="Staff">Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Current Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="Active">Active</option>
                <option value="Full">Full</option>
                <option value="Renovation">Renovation</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Total Capacity (Beds)"
              type="number"
              min="1"
              value={formData.totalRooms}
              onChange={(e) => setFormData({ ...formData, totalRooms: e.target.value })}
            />
            <Input
              label="Currently Occupied"
              type="number"
              min="0"
              value={formData.occupied}
              onChange={(e) => setFormData({ ...formData, occupied: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Warden / Caretaker Name"
              placeholder="e.g. Dr. Meena Iyer"
              value={formData.wardenName}
              onChange={(e) => setFormData({ ...formData, wardenName: e.target.value })}
            />
            <Input
              label="Warden Contact Phone"
              placeholder="e.g. +91 98765 43210"
              value={formData.wardenPhone}
              onChange={(e) => setFormData({ ...formData, wardenPhone: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isAdding}>
              Save Hostel Block
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
