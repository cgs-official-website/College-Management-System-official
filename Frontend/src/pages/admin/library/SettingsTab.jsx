import React, { useEffect, useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { useCirculation } from '../../../hooks/useCirculation';

const FIELDS = [
  { key: 'loanDays', label: 'Loan period (days)', help: 'How long a student can keep a book before it is due.', min: 1, int: true, step: 1 },
  { key: 'maxBooksPerStudent', label: 'Max books per student', help: 'Books one student can hold at the same time.', min: 1, int: true, step: 1 },
  { key: 'maxRenewals', label: 'Max renewals per loan', help: 'Set 0 to turn renewals off.', min: 0, int: true, step: 1 },
  { key: 'graceDays', label: 'Grace days', help: 'Late days that are not charged after the due date.', min: 0, int: true, step: 1 },
  { key: 'finePerDay', label: 'Fine per day (₹)', help: 'Charged for each late day. Set 0 for no fines.', min: 0, int: false, step: 0.5 },
];

const toForm = (s) => Object.fromEntries(FIELDS.map((f) => [f.key, String(s[f.key] ?? '')]));

export function SettingsTab() {
  const { fetchSettings, saveSettings, isWorking } = useCirculation();
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await fetchSettings();
      if (!active) return;
      if (data) {
        setSaved(toForm(data));
        setForm(toForm(data));
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [fetchSettings]);

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Loading ...</div>;
  }

  if (!form) {
    return <div className="p-10 text-center text-slate-500">Could not load settings. Refresh and try again.</div>;
  }

  const errors = {};
  FIELDS.forEach((f) => {
    const raw = form[f.key];
    const n = Number(raw);
    if (raw === '' || !Number.isFinite(n)) errors[f.key] = 'Enter a number';
    else if (n < f.min) errors[f.key] = `Must be at least ${f.min}`;
    else if (f.int && !Number.isInteger(n)) errors[f.key] = 'Must be a whole number';
  });

  const hasErrors = Object.keys(errors).length > 0;
  const isDirty = FIELDS.some((f) => form[f.key] !== saved[f.key]);

  const handleSave = async () => {
    const payload = Object.fromEntries(FIELDS.map((f) => [f.key, Number(form[f.key])]));
    try {
      const data = await saveSettings(payload);
      setSaved(toForm(data));
      setForm(toForm(data));
    } catch {
      /* toast already shown */
    }
  };

  const loanDays = Number(form.loanDays) || 0;
  const graceDays = Number(form.graceDays) || 0;
  const finePerDay = Number(form.finePerDay) || 0;
  const sampleLate = 5;
  const sampleFine = Math.max(0, sampleLate - graceDays) * finePerDay;
  const sampleDue = new Date(Date.now() + loanDays * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Circulation Rules</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-6">
          These rules apply to your college only.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300">{f.label}</label>
              <input
                type="number"
                min={f.min}
                step={f.step}
                value={form[f.key]}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                className={`w-full mt-2 px-4 py-2.5 bg-white dark:bg-[#0A0F1C] border rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:text-white ${
                  errors[f.key] ? 'border-rose-400' : 'border-slate-200 dark:border-white/10'
                }`}
              />
              {errors[f.key] ? (
                <p className="text-xs text-rose-600 mt-1">{errors[f.key]}</p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{f.help}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-slate-200 dark:border-white/10">
          <Button variant="secondary" type="button" disabled={!isDirty || isWorking} onClick={() => setForm(saved)}>
            Reset
          </Button>
          <Button type="button" onClick={handleSave} isLoading={isWorking} disabled={!isDirty || hasErrors}>
            Save Settings
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm p-6">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Preview</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li>A book issued today is due on <strong className="text-slate-900 dark:text-white">{hasErrors ? '-' : sampleDue}</strong>.</li>
            <li>
              Returned {sampleLate} days late, the fine is{' '}
              <strong className="text-slate-900 dark:text-white">{hasErrors ? '-' : `₹${sampleFine.toFixed(2)}`}</strong>.
            </li>
          </ul>
        </div>

        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">How changes apply</h3>
          <ul className="mt-3 space-y-2 text-xs text-amber-800 dark:text-amber-300 list-disc pl-4">
            <li>Loan period affects new loans and renewals. Existing due dates stay as issued.</li>
            <li>Fine per day and grace days apply when a book is returned, including books already out.</li>
            <li>Max books and max renewals apply to the next issue or renewal.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}