import { useState, useMemo } from 'react';
import { Plus, Trash2, Pencil, Search } from 'lucide-react';
import { useVehicles, useDrivers } from '../../../hooks/useTransportAdmin';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { StatCard, Badge, SelectField, toDateInput, fmtDate } from './transportUi';
import { ExcelUploadButton } from '../../../components/ui/ExcelUploadButton';
import { useVehicleImport } from '../../../hooks/useTransportAdmin';

const VEHICLE_IMPORT_FIELDS = [
  { name: 'Vehicle_No', required: true, type: 'String', description: 'Bus registration number', example: 'TN 33 BB 5059' },
  { name: 'Seating_Capacity', required: true, type: 'Number', description: 'Total seats', example: '56' },
  { name: 'Vehicle_Type', required: false, type: 'String', description: 'Bus, Mini Bus or Van', example: 'Bus' },
  { name: 'RC_Number', required: false, type: 'String', description: 'Registration certificate number', example: 'RC123456' },
  { name: 'Insurance_Expiry_Date', required: false, type: 'Date', description: 'YYYY-MM-DD', example: '2027-01-15' },
  { name: 'FC_Expiry_Date', required: false, type: 'Date', description: 'YYYY-MM-DD', example: '2027-03-10' },
  { name: 'Permit_Expiry_Date', required: false, type: 'Date', description: 'YYYY-MM-DD', example: '2027-06-30' },
  { name: 'Driver_Name', required: false, type: 'String', description: 'Creates the driver and links them to this bus', example: 'Pradeep R' },
  { name: 'Driver_Phone', required: false, type: 'String', description: '10-digit phone, needed with Driver_Name', example: '8193826103' },
  { name: 'License_No', required: false, type: 'String', description: 'Needed with Driver_Name', example: 'TN3320200012345' },
  { name: 'License_Expiry_Date', required: false, type: 'Date', description: 'Needed with Driver_Name, YYYY-MM-DD', example: '2028-05-01' },
];

const EMPTY = {
  vehicleNo: '', vehicleType: 'Bus', seatingCapacity: '', rcNumber: '',
  insuranceExpiryDate: '', fcExpiryDate: '', permitExpiryDate: '',
  status: 'Active', driverId: '',
};

export default function VehiclesTab() {
  const confirm = useConfirm();
  const { items, stats, isLoading, createItem, updateItem, deleteItem, isSaving } = useVehicles();
  const { items: drivers } = useDrivers();
  const { bulkImport, isImporting } = useVehicleImport();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((v) =>
      (statusFilter === 'All' || v.status === statusFilter) &&
      (!q || v.vehicleNo.toLowerCase().includes(q) || (v.route?.name || '').toLowerCase().includes(q))
    );
  }, [items, search, statusFilter]);

  const driverOptions = drivers.filter((d) => !d.vehicle || d.id === editing?.driverId);

  const openAdd = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (v) => {
    setEditing(v);
    setForm({
      vehicleNo: v.vehicleNo, vehicleType: v.vehicleType || 'Bus',
      seatingCapacity: v.seatingCapacity, rcNumber: v.rcNumber || '',
      insuranceExpiryDate: toDateInput(v.insuranceExpiryDate),
      fcExpiryDate: toDateInput(v.fcExpiryDate),
      permitExpiryDate: toDateInput(v.permitExpiryDate),
      status: v.status, driverId: v.driverId || '',
    });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = {
      ...form,
      seatingCapacity: Number(form.seatingCapacity),
      rcNumber: form.rcNumber || null,
      insuranceExpiryDate: form.insuranceExpiryDate || null,
      fcExpiryDate: form.fcExpiryDate || null,
      permitExpiryDate: form.permitExpiryDate || null,
      driverId: form.driverId || null,
    };
    try {
      if (editing) await updateItem({ id: editing.id, ...body });
      else await createItem(body);
      setOpen(false);
    } catch {
      // toast shown by the hook
    }
  };

  const handleDelete = async (v) => {
    const ok = await confirm({
      title: 'Delete Vehicle',
      message: `Remove vehicle "${v.vehicleNo}"?`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) {
      try { await deleteItem(v.id); } catch { /* toast */ }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">Register and track your buses and their documents.</p>
        <div className="flex gap-2">
            <ExcelUploadButton
            onUpload={bulkImport}
            isLoading={isImporting}
            title="Import Vehicles"
            description="Upload an Excel (.xlsx, .xls) or CSV file. Add driver columns to create and link drivers at the same time."
            fields={VEHICLE_IMPORT_FIELDS}
            showFieldsTable={true}
            sampleFileName="vehicles_template.xlsx"
            />
            <Button onClick={openAdd} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Register Vehicle
            </Button>
        </div>
    </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard title="Total" value={isLoading ? '...' : stats.total} />
        <StatCard title="Active" value={isLoading ? '...' : stats.active} tone="green" />
        <StatCard title="Assigned" value={isLoading ? '...' : stats.assigned} />
        <StatCard title="Unassigned" value={isLoading ? '...' : stats.unassigned} tone="amber" />
        <StatCard title="Expiring (30d)" value={isLoading ? '...' : stats.expiring} tone="amber" />
        <StatCard title="Expired Docs" value={isLoading ? '...' : stats.expired} tone="red" />
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by vehicle number or route..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm"
          >
            <option>All</option>
            <option>Active</option>
            <option>Under Maintenance</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Seats</th>
                <th className="py-3 px-4">Driver</th>
                <th className="py-3 px-4">Compliance</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              {isLoading ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-10 text-center text-slate-400">No vehicles found. Click "Register Vehicle" to add one.</td></tr>
              ) : filtered.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                  <td className="py-3 px-4">
                    <p className="font-bold font-mono text-slate-900 dark:text-white">{v.vehicleNo}</p>
                    <p className="text-xs text-slate-500">{v.vehicleType}</p>
                  </td>
                  <td className="py-3 px-4">{v.seatingCapacity}</td>
                  <td className="py-3 px-4">
                    {v.driver ? (
                      <>
                        <p className="font-medium">{v.driver.name}</p>
                        <p className="text-xs text-slate-500">{v.driver.phone}</p>
                      </>
                    ) : <span className="text-slate-400">No driver</span>}
                  </td>
                  <td className="py-3 px-4"><Badge label={v.compliance} /></td>
                  <td className="py-3 px-4">
                    {v.route ? v.route.name : <Badge label="Unassigned" />}
                  </td>
                  <td className="py-3 px-4"><Badge label={v.status} /></td>
                  <td className="py-3 px-4 text-right">
                    <button onClick={() => openEdit(v)} className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(v)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Vehicle' : 'Register Vehicle'} maxWidth="max-w-lg">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Registration No *" placeholder="e.g. TN 33 BB 5059" value={form.vehicleNo} onChange={set('vehicleNo')} required autoFocus />
            <Input label="Seating Capacity *" type="number" min="1" value={form.seatingCapacity} onChange={set('seatingCapacity')} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField label="Vehicle Type" value={form.vehicleType} onChange={set('vehicleType')}>
              <option>Bus</option><option>Mini Bus</option><option>Van</option>
            </SelectField>
            <Input label="RC Number" value={form.rcNumber} onChange={set('rcNumber')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Insurance Expiry" type="date" value={form.insuranceExpiryDate} onChange={set('insuranceExpiryDate')} />
            <Input label="FC Expiry" type="date" value={form.fcExpiryDate} onChange={set('fcExpiryDate')} />
            <Input label="Permit Expiry" type="date" value={form.permitExpiryDate} onChange={set('permitExpiryDate')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <SelectField label="Driver" value={form.driverId} onChange={set('driverId')}>
              <option value="">No driver</option>
              {driverOptions.map((d) => <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>)}
            </SelectField>
            <SelectField label="Status" value={form.status} onChange={set('status')}>
              <option>Active</option><option>Under Maintenance</option>
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