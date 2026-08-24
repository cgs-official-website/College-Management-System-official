import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Bus, 
  MapPin, 
  QrCode, 
  Users, 
  Plus, 
  Trash2, 
  Phone,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useTransport } from '../../../hooks/useTransport';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { ExcelUploadButton } from '../../../components/ui/ExcelUploadButton';

export default function TransportDashboard() {
  const confirm = useConfirm();
  const { items: routes, stats, isLoading, isAdding, createItem, deleteItem, bulkImport, isImporting } = useTransport();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    busNumber: '',
    driverName: '',
    driverPhone: '',
    stops: '',
    capacity: 45,
    status: 'On Time'
  });

  const handleAddRoute = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      await createItem({
        name: formData.name.trim(),
        busNumber: formData.busNumber.trim() || 'Bus #01',
        driverName: formData.driverName.trim() || 'Staff Driver',
        driverPhone: formData.driverPhone.trim() || '+91 98765 43210',
        stops: formData.stops.trim() || 'City Gate, Campus',
        capacity: Number(formData.capacity) || 45,
        status: formData.status
      });

      setIsModalOpen(false);
      setFormData({
        name: '',
        busNumber: '',
        driverName: '',
        driverPhone: '',
        stops: '',
        capacity: 45,
        status: 'On Time'
      });
    } catch {
      // Handled by toast
    }
  };

  const handleDelete = async (id, name) => {
    const ok = await confirm({
      title: 'Delete Transport Route',
      message: `Are you sure you want to remove "${name}"?`,
      confirmText: 'Delete',
      variant: 'danger'
    });

    if (ok) {
      await deleteItem(id);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'On Time':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> On Time
          </span>
        );
      case 'Delayed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Delayed
          </span>
        );
      case 'Maintenance':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Maintenance
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Transport Tracking</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage school buses, routes, and daily transport operations.</p>
        </div>
        <div className="flex gap-2">
          <ExcelUploadButton 
            onUpload={bulkImport} 
            isLoading={isImporting} 
          />
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 shadow-lg shadow-primary-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Bus Route
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Total Buses', value: isLoading ? '...' : stats.totalBuses, icon: Bus, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Active Routes', value: isLoading ? '...' : stats.activeRoutes, icon: MapPin, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Registered Students', value: isLoading ? '...' : stats.registeredStudents, icon: Users, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
          { title: 'QR Scans Today', value: isLoading ? '...' : stats.qrScansToday, icon: QrCode, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
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

      {/* Routes Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Transport Routes</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Real-time bus assignments and route monitoring.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Route & Bus</th>
                <th className="py-3.5 px-4">Driver Details</th>
                <th className="py-3.5 px-4">Stops / Waypoints</th>
                <th className="py-3.5 px-4">Capacity</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              {isLoading ? (
                [1, 2, 3].map(n => (
                  <tr key={n} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-6 w-36 bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-32 bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-44 bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-16 bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 dark:bg-white/5 rounded-lg" /></td>
                    <td className="py-4 px-4 text-right"></td>
                  </tr>
                ))
              ) : routes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Bus className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-slate-600 dark:text-slate-400">No transport routes created yet.</p>
                    <p className="text-xs text-slate-500 mt-1">Click "Add Bus Route" to configure your first vehicle route.</p>
                  </td>
                </tr>
              ) : (
                routes.map((route) => (
                  <tr key={route.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-sm">
                          <Bus className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{route.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{route.busNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{route.driverName}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {route.driverPhone}
                      </p>
                    </td>
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-300 text-xs max-w-xs truncate">
                      {route.stops}
                    </td>
                    <td className="py-4 px-4 font-medium text-slate-700 dark:text-slate-300">
                      <span>{route.studentsCount || 0} / {route.capacity}</span>
                    </td>
                    <td className="py-4 px-4">
                      {getStatusBadge(route.status)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button 
                        onClick={() => handleDelete(route.id, route.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        title="Delete Route"
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

      {/* Add Route Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Bus Route"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleAddRoute} className="space-y-4">
          <Input
            label="Route Name"
            placeholder="e.g. Route 1 - North Campus Express"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            autoFocus
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Bus Number / License Plate"
              placeholder="e.g. TN-33-AX-1234"
              value={formData.busNumber}
              onChange={(e) => setFormData({ ...formData, busNumber: e.target.value })}
            />
            <Input
              label="Seating Capacity"
              type="number"
              min="10"
              max="100"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Driver Name"
              placeholder="e.g. Ramesh Kumar"
              value={formData.driverName}
              onChange={(e) => setFormData({ ...formData, driverName: e.target.value })}
            />
            <Input
              label="Driver Phone"
              placeholder="e.g. +91 98765 43210"
              value={formData.driverPhone}
              onChange={(e) => setFormData({ ...formData, driverPhone: e.target.value })}
            />
          </div>

          <Input
            label="Stops / Waypoints"
            placeholder="e.g. Railway Station, City Center, Gate 2"
            value={formData.stops}
            onChange={(e) => setFormData({ ...formData, stops: e.target.value })}
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Current Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="On Time">On Time</option>
              <option value="Delayed">Delayed</option>
              <option value="Maintenance">Maintenance</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
            <Button variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isAdding}>
              Save Route
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
