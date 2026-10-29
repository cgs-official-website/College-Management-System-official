import { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import { useExamTypes } from '../../../hooks/useExamCenter';
import { useConfirm } from '../../../contexts/ConfirmContext';

const inputClass =
  'w-full px-3 py-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none';

export default function ExamTypesManager() {
  const confirm = useConfirm();
  const { examTypes, isLoading, createType, updateType, deleteType, isSaving } = useExamTypes();
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [marks, setMarks] = useState(100);

  const reset = () => { setEditing(null); setName(''); setMarks(100); };

  const save = async () => {
    if (!name.trim()) return;
    const data = { name: name.trim(), defaultMaxMarks: Number(marks) || 100 };
    try {
      if (editing) await updateType({ id: editing.id, data: { ...data, isActive: editing.isActive } });
      else await createType(data);
      reset();
    } catch { /* toast shown */ }
  };

  const toggleActive = async (t) => {
    try {
      await updateType({ id: t.id, data: { name: t.name, defaultMaxMarks: t.defaultMaxMarks, isActive: !t.isActive } });
    } catch { /* toast shown */ }
  };

  const remove = async (t) => {
    if (await confirm({ title: 'Delete exam type', message: `Delete "${t.name}"?`, confirmText: 'Delete', variant: 'danger' })) {
      try { await deleteType(t.id); } catch { /* toast shown */ }
    }
  };

  return (
    <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-5">
      <div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Exam Types</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Create the exams your college runs, for example Internal 1, Internal 2, Internal 3 or CAT-1.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Name</label>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Internal 1" />
        </div>
        <div className="sm:w-40">
          <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">Default max marks</label>
          <input type="number" min="1" className={inputClass} value={marks} onChange={(e) => setMarks(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button onClick={save} disabled={isSaving || !name.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl">
            <Plus className="w-4 h-4" /> {editing ? 'Update' : 'Add'}
          </button>
          {editing && (
            <button onClick={reset} className="px-4 py-2.5 text-sm font-bold rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
              Cancel
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : examTypes.length === 0 ? (
        <p className="text-sm text-slate-500">No exam types yet. Add your first one above.</p>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-white/5 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
          {examTypes.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className={`font-bold ${t.isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 line-through'}`}>{t.name}</div>
                <div className="text-xs text-slate-500">Default max marks: {t.defaultMaxMarks}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(t)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300">
                  {t.isActive ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => { setEditing(t); setName(t.name); setMarks(t.defaultMaxMarks); }}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-primary-600"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => remove(t)}
                  className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}