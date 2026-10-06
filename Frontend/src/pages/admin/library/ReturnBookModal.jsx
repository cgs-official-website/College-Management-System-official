import React, { useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useCirculation } from '../../../hooks/useCirculation';

export function ReturnBookModal({ isOpen, onClose, txn, onReturned }) {
  const { returnBook, isWorking } = useCirculation();
  const [condition, setCondition] = useState('GOOD');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (isOpen) {
      setCondition('GOOD');
      setRemarks('');
    }
  }, [isOpen]);

  if (!txn) return null;

  const handleReturn = async () => {
    try {
      await returnBook(txn.id, { condition, remarks: remarks || undefined });
      onReturned?.();
      onClose();
    } catch {
      /* toast already shown */
    }
  };

  const fieldCls =
    'w-full px-4 py-2.5 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:text-white';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Return Book" maxWidth="max-w-lg">
      <div className="space-y-5">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
          <p className="font-bold text-slate-900 dark:text-white">{txn.book?.title}</p>
          <p className="text-xs text-slate-500 mt-1">
            Borrowed by {txn.student?.user?.name || txn.student?.rollNumber} · Due{' '}
            {new Date(txn.dueDate).toLocaleDateString('en-IN')}
          </p>
          {txn.isOverdue && (
            <p className="text-sm font-semibold text-rose-600 mt-2">
              Overdue. Estimated fine: ₹{Number(txn.accruingFine).toFixed(2)}
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Book condition</label>
          <select className={`${fieldCls} mt-2`} value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="GOOD">Good</option>
            <option value="DAMAGED">Damaged</option>
            <option value="LOST">Lost (book price will be added to the fine)</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700 dark:text-slate-300">Remarks (optional)</label>
          <input className={`${fieldCls} mt-2`} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleReturn} isLoading={isWorking}>Confirm Return</Button>
        </div>
      </div>
    </Modal>
  );
}