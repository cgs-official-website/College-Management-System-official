import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useStoreMovements } from '../../hooks/useStore';

const labelCls = 'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1';
const selectCls = 'w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white text-sm';

export function StockModal({ isOpen, mode, item, items, onClose, onSubmit, isLoading }) {
  const [itemId, setItemId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [newStock, setNewStock] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setItemId(item?.id || items[0]?.id || '');
    setQuantity('');
    setNewStock(item ? String(item.stock) : '');
    setNote('');
  }, [isOpen, item, mode]); 

  const isRestock = mode === 'restock';
  const selected = items.find((i) => i.id === itemId) || item;
  const delta = !isRestock && newStock !== '' && selected ? Number(newStock) - selected.stock : null;

  const submit = (e) => {
    e.preventDefault();
    if (!itemId) return;
    onSubmit({
      itemId,
      quantity: Number(quantity),
      newStock: Number(newStock),
      note: note.trim() || null,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !isLoading && onClose()}
      title={isRestock ? 'Restock Item' : 'Adjust Stock'}
      maxWidth="max-w-lg"
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className={labelCls}>Item *</label>
          {item ? (
            <Input disabled readOnly value={item.name} />
          ) : (
            <select required value={itemId} onChange={(e) => setItemId(e.target.value)} className={selectCls}>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name} (Stock: {i.stock})</option>
              ))}
            </select>
          )}
          {selected && (
            <p className="text-xs text-slate-500 mt-1">Current stock: <strong>{selected.stock}</strong></p>
          )}
        </div>

        {isRestock ? (
          <div>
            <label className={labelCls}>Quantity to add *</label>
            <Input
              required type="number" min="1" step="1" placeholder="e.g. 50"
              value={quantity} onChange={(e) => setQuantity(e.target.value)}
            />
            {selected && quantity !== '' && Number(quantity) > 0 && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                New stock will be {selected.stock + Number(quantity)}
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className={labelCls}>Counted stock (actual units on the shelf) *</label>
            <Input
              required type="number" min="0" step="1"
              value={newStock} onChange={(e) => setNewStock(e.target.value)}
            />
            {delta !== null && delta !== 0 && (
              <p className={`text-xs mt-1 ${delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                This will {delta > 0 ? 'add' : 'remove'} {Math.abs(delta)} unit(s).
              </p>
            )}
          </div>
        )}

        <div>
          <label className={labelCls}>{isRestock ? 'Note (optional)' : 'Reason *'}</label>
          <Input
            required={!isRestock}
            placeholder={isRestock ? 'e.g. New batch from supplier' : 'e.g. 2 damaged, stock count correction'}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>{isRestock ? 'Add Stock' : 'Save Adjustment'}</Button>
        </div>
      </form>
    </Modal>
  );
}

const TYPE_STYLE = {
  OPENING: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
  RESTOCK: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  ADJUST: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
  SALE: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300',
};

export function StockHistoryModal({ item, onClose }) {
  const { data: rows = [], isLoading } = useStoreMovements(item?.id);

  return (
    <Modal isOpen={!!item} onClose={onClose} title={`Stock History${item ? ` - ${item.name}` : ''}`} maxWidth="max-w-3xl">
      <div className="overflow-x-auto max-h-[60vh]">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="sticky top-0 bg-slate-50 dark:bg-[#0f1626]">
            <tr className="border-b border-slate-200 dark:border-white/10">
              <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">Date</th>
              <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">Type</th>
              <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">Change</th>
              <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">Balance</th>
              <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">Note</th>
              <th className="px-3 py-2 text-xs font-bold text-slate-500 uppercase">By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-white/10">
            {isLoading ? (
              <tr><td colSpan="6" className="px-3 py-6 text-center text-slate-500">Loading history...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan="6" className="px-3 py-6 text-center text-slate-500">No stock movements recorded yet.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  {new Date(r.createdAt).toLocaleString('en-IN')}
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${TYPE_STYLE[r.type] || TYPE_STYLE.SALE}`}>{r.type}</span>
                </td>
                <td className={`px-3 py-2 font-mono font-bold ${r.quantity >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {r.quantity > 0 ? `+${r.quantity}` : r.quantity}
                </td>
                <td className="px-3 py-2 font-mono text-slate-800 dark:text-slate-200">{r.balanceAfter}</td>
                <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400 max-w-[14rem]">{r.note || '-'}</td>
                <td className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">{r.byName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}