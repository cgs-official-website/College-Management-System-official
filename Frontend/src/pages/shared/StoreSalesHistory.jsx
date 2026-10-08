import React, { useEffect, useState } from 'react';
import { Search, Eye, ChevronLeft, ChevronRight, Receipt } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useStoreSales } from '../../hooks/useStore';
import StoreBillModal from './StoreBillModal';

const inr = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const YEARS = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year' };

const today = () => new Date().toLocaleDateString('en-CA'); 
const monthStart = () => `${today().slice(0, 8)}01`;

const filterCls = 'px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 text-sm outline-none focus:ring-2 focus:ring-primary-500';
const cardCls = 'bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm';
const thCls = 'px-4 py-3 text-xs font-bold text-slate-500 uppercase';

const PAY_STYLE = {
  CASH: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  UPI: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400',
  CARD: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
};

const EMPTY = { from: today(), to: today(), customerType: '', department: '', year: '', paymentMethod: '' };

export default function StoreSalesHistory({ departments }) {
  const [filters, setFilters] = useState(EMPTY);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewSale, setViewSale] = useState(null);

  // debounce the text search
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchText.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchText]);

  const { data: res, isLoading, isFetching, isError, error } = useStoreSales({ ...filters, search, page, limit: 25 });
  const sales = res?.data || [];
  const meta = res?.meta;
  const summary = meta?.summary;

  const setFilter = (key, value) => {
    setFilters((f) => ({
      ...f,
      [key]: value,
      ...(key === 'customerType' && value === 'OTHER' ? { department: '', year: '' } : {}),
      ...(key === 'customerType' && value !== 'STUDENT' ? { year: '' } : {}),
    }));
    setPage(1);
  };

  const quick = (from, to) => { setFilters((f) => ({ ...f, from, to })); setPage(1); };
  const reset = () => { setFilters(EMPTY); setSearchText(''); setSearch(''); setPage(1); };

  const cards = [
    { label: 'Bills', value: summary?.count ?? 0, plain: true },
    { label: 'Total collected', value: summary?.totalAmount ?? 0, strong: true },
    { label: 'Cash', value: summary?.byPayment?.CASH?.amount ?? 0, sub: `${summary?.byPayment?.CASH?.count ?? 0} bills` },
    { label: 'UPI', value: summary?.byPayment?.UPI?.amount ?? 0, sub: `${summary?.byPayment?.UPI?.count ?? 0} bills` },
    { label: 'Card', value: summary?.byPayment?.CARD?.amount ?? 0, sub: `${summary?.byPayment?.CARD?.count ?? 0} bills` },
  ];

  return (
    <div className="space-y-4">
      {/* summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`${cardCls} p-4 ${c.strong ? 'ring-1 ring-primary-500/30' : ''}`}>
            <p className="text-xs font-semibold text-slate-500 uppercase">{c.label}</p>
            <p className={`mt-1 font-extrabold ${c.strong ? 'text-xl text-primary-700 dark:text-primary-400' : 'text-lg text-slate-900 dark:text-white'}`}>
              {c.plain ? c.value : inr(c.value)}
            </p>
            {c.sub && <p className="text-xs text-slate-500 mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* filters */}
      <div className={`${cardCls} p-4 space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => quick(today(), today())} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20">Today</button>
          <button type="button" onClick={() => quick(monthStart(), today())} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20">This month</button>
          <button type="button" onClick={() => quick('', '')} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/20">All time</button>
          <div className="flex items-center gap-1.5 ml-auto">
            <input type="date" value={filters.from} max={filters.to || undefined} onChange={(e) => setFilter('from', e.target.value)} className={filterCls} />
            <span className="text-slate-400 text-sm">to</span>
            <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => setFilter('to', e.target.value)} className={filterCls} />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer name, roll no or invoice no..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white text-sm"
            />
          </div>
          <select value={filters.customerType} onChange={(e) => setFilter('customerType', e.target.value)} className={filterCls}>
            <option value="">All customers</option>
            <option value="STUDENT">Student</option>
            <option value="STAFF">Staff</option>
            <option value="OTHER">Other</option>
          </select>
          <select value={filters.department} onChange={(e) => setFilter('department', e.target.value)} className={filterCls}>
            <option value="">All departments</option>
            {departments.map((d) => <option key={d.id} value={d.name}>{d.code}</option>)}
          </select>
          <select value={filters.year} onChange={(e) => setFilter('year', e.target.value)} className={filterCls}>
            <option value="">All years</option>
            {Object.entries(YEARS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select value={filters.paymentMethod} onChange={(e) => setFilter('paymentMethod', e.target.value)} className={filterCls}>
            <option value="">All payments</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
          </select>
          <Button type="button" variant="outline" onClick={reset}>Reset</Button>
        </div>
      </div>

      {isError && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl p-3 text-sm text-rose-800 dark:text-rose-300">
          Could not load sales: {error?.message || 'Unknown error'}
        </div>
      )}

      {/* table */}
      <div className={`${cardCls} overflow-hidden ${isFetching && !isLoading ? 'opacity-70' : ''}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <th className={thCls}>Invoice</th>
                <th className={thCls}>Date & time</th>
                <th className={thCls}>Customer</th>
                <th className={thCls}>Items</th>
                <th className={thCls}>Total</th>
                <th className={thCls}>Payment</th>
                <th className={`${thCls} text-right`}>Bill</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {isLoading ? (
                <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">Loading sales...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan="7" className="px-4 py-10 text-center text-slate-500">
                  <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  No sales found for these filters.
                </td></tr>
              ) : sales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900 dark:text-white whitespace-nowrap">{s.invoiceNo}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    {new Date(s.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{s.customerName}</p>
                    <p className="text-xs text-slate-500">
                      {s.customerType === 'OTHER' ? 'Other' : [
                        s.customerType === 'STUDENT' ? 'Student' : 'Staff',
                        s.department, YEARS[s.year], s.section && `Sec ${s.section}`,
                      ].filter(Boolean).join(' · ')}
                    </p>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">
                    {s.items.reduce((n, i) => n + i.quantity, 0)}
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">{inr(s.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${PAY_STYLE[s.paymentMethod]}`}>{s.paymentMethod}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setViewSale(s)}
                      title="View / print bill"
                      className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {meta && meta.total > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-white/10 text-sm text-slate-600 dark:text-slate-400">
            <span>Page {meta.page} of {meta.totalPages} · {meta.total} bills</span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button type="button" variant="outline" size="sm" disabled={page >= meta.totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <StoreBillModal sale={viewSale} onClose={() => setViewSale(null)} />
    </div>
  );
}