import { useState, useMemo } from 'react';
import { Plus, Trash2, Pencil, Search, Phone } from 'lucide-react';
import { useDrivers, useVehicles } from '../../../hooks/useTransportAdmin';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { StatCard, Badge, SelectField, toDateInput, fmtDate } from './transportUi';

const EMPTY = {
  name: '', phone: '', alternatePhone: '', licenseNo: '', licenseExpiry: '',
  licenseType: '', emergencyContact: '', status: 'Active', vehicleId: '',
};

export default function DriversTab() {
  const confirm = useConfirm();
  const { items, stats, isLoading, createItem, updateItem, deleteItem, isSaving } = useDrivers();
  const { items: vehicles } = useVehicles();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((d) =>
      !q || d.name.toLowerCase().includes(q) || d.phone.includes(q) || d.licenseNo.toLowerCase().includes(q)
    );
  }, [items, search]);

  const vehicleOptions = vehicles.filter((v) => !v.driverId || v.id === editing?.vehicle?.id);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (d) => {
    setEditing(d);
    setForm({
      name: d.name, phone: d.phone, alternatePhone: d.alternatePhone || '',
      licenseNo: d.licenseNo, licenseExpiry: toDateInput(d.licenseExpiry),
      licenseType: d.licenseType || '', emergencyContact: d.emergencyContact || '',
      status: d.status, vehicleId: d.vehicle?.id || '',
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = {
      ...form,
      alternatePhone: form.alternatePhone || null,
      licenseType: form.licenseType || null,
      emergencyContact: form.emergencyContact || null,
      vehicleId: form.vehicleId || null,
    };
    try {
      if (editing) await updateItem({ id: editing.id, ...body });
      else await createItem(body);
      setOpen(false);
    } catch {
      // toast shown by the hook
    }
  };

  const handleDelete = async (d) => {
    const ok = await confirm({
      title: 'Delete Driver',
      message: `Remove driver "${d.name}"?`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) {
      try { await deleteItem(d.id); } catch { /* toast */ }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Register drivers and link each one to a bus.</p>
        <Button onClick={openAdd} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Register Driver
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard title="Total" value={isLoading ? '...' : stats.total} />
        <StatCard title="Active" value={isLoading ? '...' : stats.active} tone="green" />
        <StatCard title="Assigned" value={isLoading ? '...' : stats.assigned} />
        <StatCard title="Unassigned" value={isLoading ? '...' : stats.unassigned} tone="amber" />
        <StatCard title="License Expiring" value={isLoading ? '...' : stats.expiring} tone="amber" />
        <StatCard title="License Expired" value={isLoading ? '...' : stats.expired} tone="red" />
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone or license number..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4">License</th>
                <th className="py-3 px-4">License Status</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              {isLoading ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400">No drivers found. Click "Register Driver" to add one.</td></tr>
              ) : filtered.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900 dark:text-white">{d.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1"><Phone className="w-3 h-3" />{d.phone}</p>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-mono text-xs">{d.licenseNo}</p>
                    <p className="text-xs text-slate-500">Expires {fmtDate(d.licenseExpiry)}</p>
                  </td>
                  <td className="py-3 px-4"><Badge label={d.licenseState} /></td>
                  <td className="py-3 px-4">
                    {d.vehicle ? <span className="font-mono text-xs">{d.vehicle.vehicleNo}</span> : <Badge label="Unassigned" />}
                  </td>
                  <td className="py-3 px-4"><Badge label={d.status} /></td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => openEdit(d)} className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(d)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Driver' : 'Register Driver'} maxWidth="max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <Input label="Full Name *" value={form.name} onChange={set('name')} required autoFocus />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Phone *" placeholder="e.g. 9876543210" value={form.phone} onChange={set('phone')} required />
            <Input label="Alternate Phone" value={form.alternatePhone} onChange={set('alternatePhone')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="License Number *" value={form.licenseNo} onChange={set('licenseNo')} required />
            <Input label="License Expiry *" type="date" value={form.licenseExpiry} onChange={set('licenseExpiry')} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="License Type" placeholder="e.g. HMV" value={form.licenseType} onChange={set('licenseType')} />
            <Input label="Emergency Contact" value={form.emergencyContact} onChange={set('emergencyContact')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField label="Assigned Vehicle" value={form.vehicleId} onChange={set('vehicleId')}>
              <option value="">No vehicle</option>
              {vehicleOptions.map((v) => <option key={v.id} value={v.id}>{v.vehicleNo} ({v.seatingCapacity} seats)</option>)}
            </SelectField>
            <SelectField label="Status" value={form.status} onChange={set('status')}>
              <option>Active</option><option>On Leave</option><option>Inactive</option>
            </SelectField>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSaving}>{editing ? 'Save Changes' : 'Register'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}