import { useState } from 'react';
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { useHostelRooms, useRoomActions } from '../../../hooks/useHostel';

const DEFAULT_CAP = { Single: 1, Double: 2, Triple: 3, Dormitory: 6 };
const cell = 'w-full px-2 py-1.5 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500';
const badge = { Available: 'bg-emerald-100 text-emerald-700', Partial: 'bg-amber-100 text-amber-700', Full: 'bg-rose-100 text-rose-700' };

export function RoomsModal({ block, onClose }) {
  const confirm = useConfirm();
  const { data: rooms = [], isLoading } = useHostelRooms(block?.id);
  const { addRoom, updateRoom, deleteRoom } = useRoomActions();
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({});
  const [fresh, setFresh] = useState({ roomNo: '', roomType: 'Double', capacity: 2, floor: '' });

  const saveEdit = async (r) => {
    try {
      await updateRoom({ roomId: r.id, roomType: draft.roomType, capacity: Number(draft.capacity), floor: String(draft.floor || '') });
      setEditingId(null);
    } catch { /* toast handled */ }
  };

  const handleAdd = async () => {
    if (!fresh.roomNo.trim()) return toast.error('Room No is required');
    try {
      await addRoom({ blockId: block.id, roomNo: fresh.roomNo.trim(), roomType: fresh.roomType, capacity: Number(fresh.capacity), floor: String(fresh.floor || '') });
      setFresh({ roomNo: '', roomType: 'Double', capacity: 2, floor: '' });
    } catch { /* toast handled */ }
  };

  const handleDelete = async (r) => {
    const ok = await confirm({ title: 'Delete Room', message: `Delete room ${r.roomNo}?`, confirmText: 'Delete', variant: 'danger' });
    if (ok) { try { await deleteRoom(r.id); } catch { /* toast handled */ } }
  };

  return (
    <Modal isOpen={!!block} onClose={onClose} title={`Rooms: ${block?.name || ''}`} maxWidth="max-w-3xl">
      <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-white/10">
              <th className="py-2 px-2">Room</th><th className="px-2">Type</th><th className="px-2">Floor</th>
              <th className="px-2">Capacity</th><th className="px-2">Occupied</th><th className="px-2">Status</th><th className="px-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {isLoading ? (
              <tr><td colSpan={7} className="py-6 text-center text-slate-500">Loading...</td></tr>
            ) : rooms.map((r) => (
              <tr key={r.id}>
                <td className="py-2 px-2 font-bold text-slate-900 dark:text-white">{r.roomNo}</td>
                {editingId === r.id ? (
                  <>
                    <td className="px-2">
                      <select className={cell} value={draft.roomType} onChange={(e) => setDraft({ ...draft, roomType: e.target.value, capacity: DEFAULT_CAP[e.target.value] })}>
                        {Object.keys(DEFAULT_CAP).map((t) => <option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td className="px-2"><input className={cell} value={draft.floor} onChange={(e) => setDraft({ ...draft, floor: e.target.value })} /></td>
                    <td className="px-2"><input type="number" min="1" className={cell} value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: e.target.value })} /></td>
                  </>
                ) : (
                  <><td className="px-2 text-slate-600 dark:text-slate-300">{r.roomType}</td><td className="px-2 text-slate-600 dark:text-slate-300">{r.floor || '-'}</td><td className="px-2 text-slate-600 dark:text-slate-300">{r.capacity}</td></>
                )}
                <td className="px-2 text-slate-600 dark:text-slate-300">{r.occupied}</td>
                <td className="px-2"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${badge[r.status]}`}>{r.status}</span></td>
                <td className="px-2 text-right whitespace-nowrap">
                  {editingId === r.id ? (
                    <>
                      <button onClick={() => saveEdit(r)} className="p-1.5 text-emerald-600"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 text-slate-400"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setEditingId(r.id); setDraft({ roomType: r.roomType, capacity: r.capacity, floor: r.floor || '' }); }} className="p-1.5 text-slate-400 hover:text-primary-600"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(r)} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-12 gap-2 items-center mt-4 pt-4 border-t border-slate-100 dark:border-white/5">
        <input className={`${cell} col-span-3`} placeholder="Room No" value={fresh.roomNo} onChange={(e) => setFresh({ ...fresh, roomNo: e.target.value })} />
        <select className={`${cell} col-span-3`} value={fresh.roomType} onChange={(e) => setFresh({ ...fresh, roomType: e.target.value, capacity: DEFAULT_CAP[e.target.value] })}>
          {Object.keys(DEFAULT_CAP).map((t) => <option key={t}>{t}</option>)}
        </select>
        <input type="number" min="1" className={`${cell} col-span-2`} value={fresh.capacity} onChange={(e) => setFresh({ ...fresh, capacity: e.target.value })} />
        <input className={`${cell} col-span-2`} placeholder="Floor" value={fresh.floor} onChange={(e) => setFresh({ ...fresh, floor: e.target.value })} />
        <Button type="button" size="sm" className="col-span-2" onClick={handleAdd}><Plus className="w-4 h-4 mr-1" />Add</Button>
      </div>
    </Modal>
  );
}