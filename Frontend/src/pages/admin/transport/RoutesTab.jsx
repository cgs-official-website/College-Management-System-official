import { useState } from 'react';
import { Plus, Trash2, Pencil, Bus, Phone, MapPin, Users, X } from 'lucide-react';
import { useRoutes, useVehicles } from '../../../hooks/useTransportAdmin';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { StatCard, SelectField } from './transportUi';

const EMPTY = { name: '', status: 'On Time', vehicleId: '', stops: [] };

const STATUS_STYLE = {
  'On Time': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  Delayed: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
  Maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
};

export default function RoutesTab() {
  const confirm = useConfirm();
  const { items, stats, isLoading, createItem, updateItem, deleteItem, isSaving } = useRoutes();
  const { items: vehicles } = useVehicles();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [stopInput, setStopInput] = useState('');

  const busOptions = vehicles.filter(
    (v) => v.status === 'Active' && (!v.route || v.id === editing?.vehicleId)
  );
  const selectedBus = vehicles.find((v) => v.id === form.vehicleId);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setStopInput(''); setOpen(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({ name: r.name, status: r.status, vehicleId: r.vehicleId || '', stops: r.stops || [] });
    setStopInput('');
    setOpen(true);
  };

  const addStop = () => {
    const s = stopInput.trim();
    if (!s) return;
    if (!form.stops.some((x) => x.toLowerCase() === s.toLowerCase())) {
      setForm({ ...form, stops: [...form.stops, s] });
    }
    setStopInput('');
  };
  const removeStop = (i) => setForm({ ...form, stops: form.stops.filter((_, idx) => idx !== i) });

  const submit = async (e) => {
    e.preventDefault();
    const body = {
      name: form.name.trim(),
      status: form.status,
      vehicleId: form.vehicleId || null,
      stops: stopInput.trim() ? [...form.stops, stopInput.trim()] : form.stops,
    };
    try {
      if (editing) await updateItem({ id: editing.id, ...body });
      else await createItem(body);
      setOpen(false);
    } catch {
      // toast shown by the hook
    }
  };

  const handleDelete = async (r) => {
    const extra = r.studentsCount > 0
      ? ` ${r.studentsCount} assigned students will go back to "needs bus".`
      : '';
    const ok = await confirm({
      title: 'Delete Route',
      message: `Remove route "${r.name}"? The bus and driver are kept.${extra}`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) {
      try { await deleteItem(r.id); } catch { /* toast */ }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Create routes and attach one registered bus to each.
        </p>
        <Button onClick={openAdd} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Route
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Routes" value={isLoading ? '...' : stats.totalRoutes} />
        <StatCard title="With Bus" value={isLoading ? '...' : stats.withBus} tone="green" />
        <StatCard title="No Bus Yet" value={isLoading ? '...' : stats.withoutBus} tone="amber" />
        <StatCard title="Students Assigned" value={isLoading ? '...' : stats.studentsAssigned} />
        <StatCard title="Students Waiting" value={isLoading ? '...' : stats.studentsWaiting} tone="amber" />
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Route & Bus</th>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4">Stops</th>
                <th className="py-3 px-4">Students / Seats</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              {isLoading ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Bus className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="font-medium text-slate-600 dark:text-slate-400">No routes created yet.</p>
                    <p className="text-xs mt-1">Click "Add Route" to create the first one.</p>
                  </td>
                </tr>
              ) : items.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                        <Bus className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white">{r.name}</p>
                        {r.vehicle
                          ? <p className="text-xs text-slate-500 font-mono">{r.vehicle.vehicleNo}</p>
                          : <p className="text-xs text-amber-600 font-medium">No bus assigned</p>}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {r.vehicle?.driver ? (
                      <>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{r.vehicle.driver.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" /> {r.vehicle.driver.phone}
                        </p>
                      </>
                    ) : <span className="text-slate-400">Not assigned</span>}
                  </td>
                  <td className="py-4 px-4 text-xs text-slate-600 dark:text-slate-300 max-w-xs">
                    {r.stops?.length
                      ? <span className="flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0" />{r.stops.join(' → ')}</span>
                      : <span className="text-slate-400">No stops added</span>}
                  </td>
                  <td className="py-4 px-4 font-medium text-slate-700 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {r.studentsCount} / {r.vehicle ? r.seats : '-'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_STYLE[r.status] || STATUS_STYLE.Maintenance}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button onClick={() => openEdit(r)} className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(r)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Route' : 'Add Route'} maxWidth="max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Route Name *"
            placeholder="e.g. Erode Bypass"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
          />

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Stops (in order)
            </label>
            <div className="flex gap-2">
              <input
                value={stopInput}
                onChange={(e) => setStopInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStop(); } }}
                placeholder="Type a stop and press Enter"
                className="flex-1 px-3 py-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <Button type="button" variant="secondary" onClick={addStop}>Add</Button>
            </div>
            {form.stops.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {form.stops.map((s, i) => (
                  <span key={`${s}-${i}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200">
                    {i + 1}. {s}
                    <button type="button" onClick={() => removeStop(i)} className="hover:text-red-600">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <SelectField label="Bus" value={form.vehicleId} onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}>
            <option value="">No bus yet</option>
            {busOptions.map((v) => (
              <option key={v.id} value={v.id}>{v.vehicleNo} ({v.seatingCapacity} seats)</option>
            ))}
          </SelectField>
          {busOptions.length === 0 && (
            <p className="text-xs text-amber-600 -mt-2">
              No free buses. Register a bus in Vehicle Registration first.
            </p>
          )}

          {selectedBus && (
            <div className="text-xs rounded-xl bg-slate-50 dark:bg-white/5 px-3 py-2 text-slate-600 dark:text-slate-300">
              Driver:{' '}
              {selectedBus.driver
                ? `${selectedBus.driver.name} (${selectedBus.driver.phone})`
                : 'No driver linked. Link one in Driver Registration.'}
            </div>
          )}

          <SelectField label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option>On Time</option><option>Delayed</option><option>Maintenance</option>
          </SelectField>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSaving}>{editing ? 'Save Changes' : 'Save Route'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}