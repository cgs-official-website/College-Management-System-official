const TONES = {
  slate: 'text-slate-900 dark:text-white',
  green: 'text-emerald-600',
  amber: 'text-amber-600',
  red: 'text-rose-600',
};

export const StatCard = ({ title, value, tone = 'slate' }) => (
  <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm">
    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
    <p className={`text-2xl font-extrabold mt-1 ${TONES[tone]}`}>{value ?? 0}</p>
  </div>
);

const BADGES = {
  Valid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  Expiring: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  Expired: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400',
  'Not Provided': 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
  'Under Maintenance': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  'On Leave': 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
  Inactive: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  Assigned: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400',
  Unassigned: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
};

export const Badge = ({ label, text }) => (
  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold ${BADGES[label] || BADGES.Inactive}`}>
    {text || label}
  </span>
);

export const SelectField = ({ label, children, ...props }) => (
  <div>
    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
      {label}
    </label>
    <select
      {...props}
      className="w-full px-3 py-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      {children}
    </select>
  </div>
);

export const toDateInput = (d) => (d ? String(d).slice(0, 10) : '');
export const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN') : '-');