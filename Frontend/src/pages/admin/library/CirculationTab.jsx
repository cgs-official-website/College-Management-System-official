import React, { useEffect, useState } from 'react';
import { RotateCcw, CornerDownLeft, ClipboardList } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { useCirculation } from '../../../hooks/useCirculation';
import { ReturnBookModal } from './ReturnBookModal';

const FILTERS = [
  { key: 'ISSUED', label: 'Active' },
  { key: 'OVERDUE', label: 'Overdue' },
  { key: 'RETURNED', label: 'Returned' },
  { key: 'ALL', label: 'All History' },
];

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');

function StatusBadge({ t }) {
  let label = t.status;
  let cls = 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400';
  if (t.status === 'ISSUED' && t.isOverdue) {
    label = 'OVERDUE';
    cls = 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400';
  } else if (t.status === 'RETURNED') {
    cls = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400';
  } else if (t.status === 'LOST') {
    cls = 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400';
  }
  return <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider ${cls}`}>{label}</span>;
}

export function CirculationTab({ version, onIssueClick, onChanged }) {
  const { transactions, meta, isLoading, isWorking, fetchTransactions, renewBook} = useCirculation();
  const [filter, setFilter] = useState('ISSUED');
  const [page, setPage] = useState(1);
  const [returning, setReturning] = useState(null);

  const load = () => {
    const params = { page, limit: 15 };
    if (filter === 'OVERDUE') params.overdue = 'true';
    else if (filter !== 'ALL') params.status = filter;
    fetchTransactions(params);
  };

  useEffect(() => {
    load();
  }, [filter, page, version]);

  const handleRenew = async (t) => {
    try {
      await renewBook(t.id);
      load();
    } catch {
      /* toast already shown */
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white dark:bg-[#0A0F1C] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => { setFilter(f.key); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                filter === f.key
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button onClick={onIssueClick}>Issue Book</Button>
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4 pl-6">Student</th>
                <th className="p-4">Book</th>
                <th className="p-4">Issued</th>
                <th className="p-4">Due</th>
                <th className="p-4">Status</th>
                <th className="p-4">Fine</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {isLoading ? (
                <tr><td colSpan="7" className="p-10 text-center text-slate-500">Loading...</td></tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <ClipboardList className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                    <p className="font-bold text-slate-900 dark:text-white">No records</p>
                    <p className="text-sm text-slate-500">Nothing matches this filter yet.</p>
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const fine = t.status === 'ISSUED' ? Number(t.accruingFine || 0) : Number(t.fineAmount || 0);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                        <td className="p-4 pl-6">
                            <p className="font-bold text-sm text-slate-900 dark:text-white">{t.student?.user?.name || '-'}</p>
                            <p className="text-xs text-slate-500">{t.student?.admissionNumber}</p>
                            {(() => {
                                const s = t.student;
                                const info = [
                                s?.department?.name,
                                s?.section?.name && `Sec ${s.section.name}`,
                                s?.yearOfStudy && `Year ${s.yearOfStudy}`,
                                ].filter(Boolean).join(' • ');
                                return info ? <p className="text-xs text-slate-500 mt-0.5">{info}</p> : null;
                            })()}
                        </td>
                        <td className="p-4 text-sm text-slate-700 dark:text-slate-300">{t.book?.title}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{fmt(t.issueDate)}</td>
                        <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{fmt(t.dueDate)}</td>
                        <td className="p-4"><StatusBadge t={t} /></td>
                        <td className={`p-4 text-sm font-semibold ${fine > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                        {fine > 0 ? `₹${fine.toFixed(2)}${t.status === 'ISSUED' ? ' (accruing)' : ''}` : '-'}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        {t.status === 'ISSUED' && (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => handleRenew(t)}
                              disabled={isWorking}
                              title="Renew"
                              className="p-2 text-slate-400 hover:text-primary-600 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-lg shadow-sm disabled:opacity-50"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setReturning(t)}
                              title="Return"
                              className="p-2 text-slate-400 hover:text-emerald-600 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-lg shadow-sm"
                            >
                              <CornerDownLeft className="w-4 h-4" />
                            </button>
                          </div>
                        )}      
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-white/5 text-sm">
            <span className="text-slate-500">Page {meta.page} of {meta.totalPages} · {meta.total} records</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <Button variant="secondary" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      <ReturnBookModal
        isOpen={!!returning}
        onClose={() => setReturning(null)}
        txn={returning}
        onReturned={() => { load(); onChanged?.(); }}
      />
    </div>
  );
}