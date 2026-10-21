import { useState } from 'react';
import { Plus, Trash2, Pencil, CheckCircle2, Receipt } from 'lucide-react';
import { useTerms } from '../../../hooks/useTransportAdmin';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useConfirm } from '../../../contexts/ConfirmContext';
import { StatCard, toDateInput, fmtDate } from './transportUi';

const EMPTY = { label: '', semester: '', dueDate: '', isCurrent: false };

export default function FeeTermTab() {
  const confirm = useConfirm();
  const { items, stats, isLoading, createItem, updateItem, deleteItem, setCurrent, isSettingCurrent, generate, isGenerating, isSaving } = useTerms();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const hasCurrent = items.some((t) => t.isCurrent);

  const openAdd = () => { setEditing(null); setForm({ ...EMPTY, isCurrent: !hasCurrent }); setOpen(true); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({ label: t.label, semester: t.semester, dueDate: toDateInput(t.dueDate), isCurrent: t.isCurrent });
    setOpen(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    const body = { label: form.label.trim(), semester: Number(form.semester), dueDate: form.dueDate };
    try {
      if (editing) await updateItem({ id: editing.id, ...body });
      else await createItem({ ...body, isCurrent: form.isCurrent });
      setOpen(false);
    } catch {
      // toast shown by the hook
    }
  };

  const handleDelete = async (t) => {
    const ok = await confirm({
      title: 'Delete Term',
      message: `Remove term "${t.label}"?`,
      confirmText: 'Delete',
      variant: 'danger',
    });
    if (ok) {
      try { await deleteItem(t.id); } catch { /* toast */ }
    }
  };

  const handleGenerate = async (t) => {
    const ok = await confirm({
      title: 'Generate Transport Fees',
      message: `Create a transport fee under "${t.label}" for every assigned student who doesn't have one yet? Each student is billed their stop's current fee. Students already billed are skipped.`,
      confirmText: 'Generate',
    });
    if (ok) {
      try { await generate(t.id); } catch { /* toast */ }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Set the current fee term once per semester. Transport fees are created under it.
        </p>
        <Button onClick={openAdd} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Term
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <StatCard title="Terms" value={isLoading ? '...' : stats.total} />
        <StatCard title="Current Term" value={isLoading ? '...' : (stats.current || 'None')} tone={stats.current ? 'green' : 'amber'} />
      </div>

      {!isLoading && !hasCurrent && (
        <div className="text-sm rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 px-4 py-3">
          No current term is set. Students can't be assigned to a bus until one is.
        </div>
      )}

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Term</th>
                <th className="py-3 px-4">Semester</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Fees Created</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              {isLoading ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-slate-400">No terms yet. Click "Add Term".</td></tr>
              ) : items.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                  <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">{t.label}</td>
                  <td className="py-3 px-4">{t.semester}</td>
                  <td className="py-3 px-4">{fmtDate(t.dueDate)}</td>
                  <td className="py-3 px-4">{t.feesCount}</td>
                  <td className="py-3 px-4">
                    {t.isCurrent ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Current
                      </span>
                    ) : (
                      <button
                        onClick={() => setCurrent(t.id).catch(() => {})}
                        disabled={isSettingCurrent}
                        className="text-xs font-semibold text-primary-600 hover:underline disabled:opacity-50"
                      >
                        Set as current
                      </button>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleGenerate(t)}
                      disabled={isGenerating}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg disabled:opacity-50"
                      title="Generate transport fees for this term"
                    >
                      <Receipt className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(t)} className="p-1.5 text-slate-400 hover:text-primary-600 rounded-lg" title="Edit">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(t)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={editing ? 'Edit Term' : 'Add Term'} maxWidth="max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <Input
            label="Term Label *"
            placeholder="e.g. Sem 1 2026-27"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            required
            autoFocus
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Semester *"
              type="number"
              min="1"
              max="20"
              value={form.semester}
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
              required
            />
            <Input
              label="Due Date *"
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              required
            />
          </div>
          {!editing && (
            <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={form.isCurrent}
                onChange={(e) => setForm({ ...form, isCurrent: e.target.checked })}
              />
              Make this the current term
            </label>
          )}
          {editing && (
            <p className="text-xs text-slate-400">
              Changing the due date affects fees created from now on, not fees already created.
            </p>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
            <Button variant="secondary" type="button" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isSaving}>{editing ? 'Save Changes' : 'Add Term'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}