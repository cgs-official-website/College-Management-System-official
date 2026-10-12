import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  DoorClosed,
  Users,
  Plus,
  Trash2,
  Phone,
  Percent
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RoomsModal } from './RoomsModal';
import { useHostel, useAvailableRooms } from '../../../hooks/useHostel';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { ExcelUploadButton } from '../../../components/ui/ExcelUploadButton';

const ROOM_DEFAULT_CAPACITY = { Single: 1, Double: 2, Triple: 3, Dormitory: 6 };
const emptyRoom = () => ({ roomNo: '', roomType: 'Double', capacity: 2, floor: '' });
const emptyBlock = () => ({ name: '', type: 'Boys', wardenName: '', wardenPhone: '', status: 'Active' });
const cell = 'w-full px-3 py-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500';

const ROOM_IMPORT_FIELDS = [
  { name: 'Hostel_Block', required: true, type: 'String', description: 'Block name. Rows with the same name are grouped.', example: 'Boys Block A' },
  { name: 'Room_No', required: true, type: 'String', description: 'Unique within the block', example: 'A-101' },
  { name: 'Room_Type', required: true, type: 'Dropdown', description: 'Single, Double, Triple or Dormitory', example: 'Double' },
  { name: 'Capacity', required: true, type: 'Number', description: 'Beds in the room', example: '2' },
  { name: 'Floor', required: false, type: 'String', description: 'Floor number', example: '1' },
  { name: 'Warden_Name', required: false, type: 'String', description: 'Taken from the first row of each block', example: 'Hariharan' },
  { name: 'Warden_Contact', required: false, type: 'Number', description: '10 digits', example: '8370108752' },
];

export default function HostelDashboard() {
  const confirm = useConfirm();
  const {
    items: blocks, stats, isLoading, isAdding, createItem, deleteItem,
    students, isLoadingStudents, assignRoom, isAssigningRoom, isImporting, bulkImport
  } = useHostel();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [assignFormData, setAssignFormData] = useState({ hostelBlockId: '', hostelRoomId: '' });
  const { data: availableRooms = [], isLoading: loadingRooms } = useAvailableRooms(
    assignFormData.hostelBlockId, selectedStudent?.hostelRoomId
  );
  const [formData, setFormData] = useState(emptyBlock());
  const [rooms, setRooms] = useState([emptyRoom()]);
  const [roomsBlock, setRoomsBlock] = useState(null);

  const totalBeds = rooms.reduce((s, r) => s + (Number(r.capacity) || 0), 0);
  const patchRoom = (i, patch) => setRooms((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const handleAddBlock = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error('Block name is required');
    if (rooms.length === 0) return toast.error('Add at least one room');
    const nos = new Set();
    for (const r of rooms) {
      const no = r.roomNo.trim().toLowerCase();
      if (!no) return toast.error('Every room needs a Room No');
      if (nos.has(no)) return toast.error(`Duplicate room number: ${r.roomNo}`);
      if (!(Number(r.capacity) >= 1)) return toast.error(`Capacity for ${r.roomNo} must be at least 1`);
      nos.add(no);
    }
    if (formData.wardenPhone && !/^\d{10}$/.test(formData.wardenPhone)) {
      return toast.error('Warden contact must be 10 digits');
    }

    try {
      await createItem({
        ...formData,
        name: formData.name.trim(),
        rooms: rooms.map((r) => ({
          roomNo: r.roomNo.trim(),
          roomType: r.roomType,
          capacity: Number(r.capacity),
          floor: String(r.floor || '').trim(),
        })),
      });
      setIsModalOpen(false);
      setFormData(emptyBlock());
      setRooms([emptyRoom()]);
    } catch {
      // toast handled by mutation
    }
  };

  const closeAssign = () => {
    setIsAssignModalOpen(false);
    setSelectedStudent(null);
    setAssignFormData({ hostelBlockId: '', hostelRoomId: '' });
  };

  const handleAssignRoom = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !assignFormData.hostelRoomId) return toast.error('Select a room');
    try {
      await assignRoom({ id: selectedStudent.id, hostelRoomId: assignFormData.hostelRoomId });
      closeAssign();
    } catch {
      // toast handled by mutation
    }
  };

  const handleUnassign = async () => {
    try {
      await assignRoom({ id: selectedStudent.id, hostelRoomId: null });
      closeAssign();
    } catch {
      // toast handled by mutation
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
      try {
        await deleteItem(id);
      } catch {
        // toast handled by mutation
      }
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
        <div className="flex gap-2">
          <ExcelUploadButton
            onUpload={bulkImport}
            isLoading={isImporting}
            fields={ROOM_IMPORT_FIELDS}
            sampleFileName="Room_Master_Template.xlsx"
          />
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 shadow-lg shadow-primary-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Hostel Block
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { title: 'Total Blocks', value: isLoading ? '...' : stats.totalBlocks, icon: Building2, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Total Rooms', value: isLoading ? '...' : stats.totalRooms, icon: DoorClosed, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-500/10' },
          { title: 'Total Beds', value: isLoading ? '...' : stats.totalCapacity, icon: DoorClosed, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
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
                    <p className="text-xs text-slate-500 mt-1">Click "Add Hostel Block" or import a Room_Master sheet to get started.</p>
                  </td>
                </tr>
              ) : (
                blocks.map((block) => {
                  const percentage = block.totalBeds > 0
                    ? Math.min(100, Math.round((block.occupied / block.totalBeds) * 100))
                    : 0;
                  return (
                    <tr key={block.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors group">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-sm">
                            <Building2 className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white">{block.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{block.totalRooms} rooms • {block.totalBeds} beds</p>
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
                            <span>{block.occupied} / {block.totalBeds} Beds</span>
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
                        <p className="font-medium text-slate-800 dark:text-slate-200">{block.wardenName || '-'}</p>
                        {block.wardenPhone && (
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3" /> {block.wardenPhone}
                          </p>
                        )}
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
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => setRoomsBlock(block)}
                          className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                          title="Manage Rooms"
                        >
                          <DoorClosed className="w-4 h-4" />
                        </button>
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

      {/* Hosteller Students Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Hosteller Students</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Assign rooms to students marked as Hostellers.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Admission No.</th>
                <th className="py-3.5 px-4">Department</th>
                <th className="py-3.5 px-4">Hostel Block</th>
                <th className="py-3.5 px-4">Room No.</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              {isLoadingStudents ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-500">Loading students...</td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No hosteller students found.</p>
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-4 font-medium text-slate-900 dark:text-white">{student.name}</td>
                    <td className="py-4 px-4 text-slate-500">{student.admissionNo}</td>
                    <td className="py-4 px-4 text-slate-500">{student.department}</td>
                    <td className="py-4 px-4 text-slate-800 dark:text-slate-200">{student.hostelBlockName || '-'}</td>
                    <td className="py-4 px-4 text-slate-800 dark:text-slate-200">{student.hostelRoom || '-'}</td>
                    <td className="py-4 px-4 text-right">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedStudent(student);
                          setAssignFormData({
                            hostelBlockId: student.hostelBlockId || '',
                            hostelRoomId: student.hostelRoomId || ''
                          });
                          setIsAssignModalOpen(true);
                        }}
                      >
                        {student.hostelRoomId ? 'Change Room' : 'Assign Room'}
                      </Button>
                    </td>
                  </tr>
                ))
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
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleAddBlock} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Block Name"
              showRequired
              placeholder="e.g. Boys Block A"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              autoFocus
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                Category / Type <span className="text-red-500">*</span>
              </label>
              <select
                className={cell}
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                {['Boys', 'Girls', 'Co-Ed', 'Staff'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <Input
              label="Warden Name"
              placeholder="e.g. Hariharan"
              value={formData.wardenName}
              onChange={(e) => setFormData({ ...formData, wardenName: e.target.value })}
            />
            <Input
              label="Warden Contact"
              placeholder="10 digit number"
              inputMode="numeric"
              maxLength={10}
              value={formData.wardenPhone}
              onChange={(e) => setFormData({ ...formData, wardenPhone: e.target.value.replace(/\D/g, '') })}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Status</label>
              <select
                className={cell}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Renovation">Renovation</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Rooms <span className="text-red-500">*</span>
              </h4>
              <span className="text-xs text-slate-500">{rooms.length} room(s) • {totalBeds} beds</span>
            </div>

            <div className="grid grid-cols-12 gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
              <span className="col-span-3">Room No *</span>
              <span className="col-span-3">Type *</span>
              <span className="col-span-2">Capacity *</span>
              <span className="col-span-3">Floor</span>
              <span className="col-span-1" />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {rooms.map((r, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className={`${cell} col-span-3`}
                    placeholder="A-101"
                    value={r.roomNo}
                    onChange={(e) => patchRoom(i, { roomNo: e.target.value })}
                  />
                  <select
                    className={`${cell} col-span-3`}
                    value={r.roomType}
                    onChange={(e) => patchRoom(i, { roomType: e.target.value, capacity: ROOM_DEFAULT_CAPACITY[e.target.value] })}
                  >
                    {Object.keys(ROOM_DEFAULT_CAPACITY).map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    className={`${cell} col-span-2`}
                    value={r.capacity}
                    onChange={(e) => patchRoom(i, { capacity: e.target.value })}
                  />
                  <input
                    className={`${cell} col-span-3`}
                    placeholder="1"
                    value={r.floor}
                    onChange={(e) => patchRoom(i, { floor: e.target.value })}
                  />
                  <button
                    type="button"
                    disabled={rooms.length === 1}
                    onClick={() => setRooms((rs) => rs.filter((_, idx) => idx !== i))}
                    className="col-span-1 p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30"
                    title="Remove room"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setRooms((rs) => [...rs, emptyRoom()])}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Room
            </Button>
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

      {/* Assign Room Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={closeAssign}
        title="Assign Hostel Room"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAssignRoom} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Hostel Block <span className="text-red-500">*</span>
            </label>
            <select
              className={cell}
              value={assignFormData.hostelBlockId}
              onChange={(e) => setAssignFormData({ hostelBlockId: e.target.value, hostelRoomId: '' })}
            >
              <option value="">-- Select Block --</option>
              {blocks.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.type})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Room <span className="text-red-500">*</span>
            </label>
            <select
              className={cell}
              value={assignFormData.hostelRoomId}
              disabled={!assignFormData.hostelBlockId || loadingRooms}
              onChange={(e) => setAssignFormData({ ...assignFormData, hostelRoomId: e.target.value })}
            >
              <option value="">
                {loadingRooms ? 'Loading...' : availableRooms.length ? '-- Select Room --' : 'No rooms with free beds'}
              </option>
              {availableRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.roomNo} • {r.roomType} • {r.occupied}/{r.capacity}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-between gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
            <div>
              {selectedStudent?.hostelRoomId && (
                <Button variant="secondary" type="button" onClick={handleUnassign}>
                  Unassign
                </Button>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" type="button" onClick={closeAssign}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isAssigningRoom}>
                Assign Room
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Rooms Panel */}
      <RoomsModal block={roomsBlock} onClose={() => setRoomsBlock(null)} />
    </div>
  );
}
