import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { 
  Wallet, IndianRupee, Clock, AlertCircle, CheckCircle2, 
  Search, ExternalLink, Calendar, ChevronLeft, ChevronRight,
  TrendingUp, CreditCard, Filter
} from 'lucide-react';

const STATUS_COLORS = {
  'PAID': '#10b981',
  'PENDING': '#f59e0b',
  'OVERDUE': '#f43f5e',
  'PARTIAL': '#3b82f6',
  'UNKNOWN': '#94a3b8'
};

const STATUS_BADGE_STYLES = {
  paid: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  overdue: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
  partial: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
};

const ITEMS_PER_PAGE = 8;

export default function FinancialSummaryChart({ 
  statusData = [], 
  typeData = [], 
  summary = null,
  feesList = [] 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Compute summary stats fallback if not passed directly
  const stats = useMemo(() => {
    if (summary) return summary;

    let totalFees = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    feesList.forEach(f => {
      const amt = parseFloat(f.amount ?? f.amountDue ?? 0) || 0;
      const paid = parseFloat(f.amountPaid ?? 0) || 0;
      const status = (f.status || 'pending').toLowerCase();

      totalFees += amt;

      if (status === 'paid') {
        totalCollected += amt;
        paidCount++;
      } else if (status === 'overdue') {
        totalOverdue += amt;
        overdueCount++;
        if (paid > 0) totalCollected += paid;
      } else if (status === 'partial') {
        totalCollected += paid;
        totalPending += Math.max(0, amt - paid);
      } else {
        totalPending += amt;
        pendingCount++;
        if (paid > 0) totalCollected += paid;
      }
    });

    const collectionRate = totalFees > 0 ? Math.round((totalCollected / totalFees) * 100) : 0;

    return {
      totalFees,
      totalCollected,
      totalPending,
      totalOverdue,
      collectionRate,
      paidCount,
      pendingCount,
      overdueCount,
      totalRecords: feesList.length
    };
  }, [summary, feesList]);

  // Filter fees list based on search and selected status
  const filteredFees = useMemo(() => {
    return feesList.filter(f => {
      const sName = (f.studentName || f.student?.user?.name || '').toLowerCase();
      const sClass = (f.studentClass || f.student?.course?.name || '').toLowerCase();
      const fType = (f.feeType || 'Tuition Fee').toLowerCase();
      const query = searchTerm.toLowerCase();

      const matchesSearch = !searchTerm || sName.includes(query) || sClass.includes(query) || fType.includes(query);

      const fStatus = (f.status || 'pending').toUpperCase();
      const matchesStatus = statusFilter === 'ALL' || fStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [feesList, searchTerm, statusFilter]);

  // Pagination slice
  const totalPages = Math.ceil(filteredFees.length / ITEMS_PER_PAGE) || 1;
  const paginatedFees = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredFees.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredFees, currentPage]);

  // Reset page when filter changes
  const handleFilterChange = (filter) => {
    setStatusFilter(filter);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const hasData = feesList.length > 0 || statusData.length > 0 || typeData.length > 0;

  return (
    <div className="space-y-6">
      {/* 1. Top KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invoiced */}
        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-xl p-4 flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-white/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Billed</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              ₹{(stats?.totalFees || 0).toLocaleString()}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
              <span>{stats?.totalRecords || 0} Total Records</span>
            </p>
          </div>
        </div>

        {/* Total Collected */}
        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-xl p-4 flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-white/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Collected</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ₹{(stats?.totalCollected || 0).toLocaleString()}
            </h3>
            <div className="mt-2 flex items-center gap-2">
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(100, stats?.collectionRate || 0)}%` }} 
                />
              </div>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                {stats?.collectionRate || 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Pending Dues */}
        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-xl p-4 flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-white/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pending Dues</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              ₹{(stats?.totalPending || 0).toLocaleString()}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {stats?.pendingCount || 0} Pending Invoices
            </p>
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 rounded-xl p-4 flex flex-col justify-between transition-all hover:border-slate-300 dark:hover:border-white/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Overdue Dues</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              ₹{(stats?.totalOverdue || 0).toLocaleString()}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {stats?.overdueCount || 0} Overdue Invoices
            </p>
          </div>
        </div>
      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Fee by Category */}
        <div className="bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 rounded-xl p-5 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Amount by Fee Category</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Breakdown across fee streams</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {typeData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={typeData} margin={{ top: 10, right: 10, left: -10, bottom: 25 }}>
                  <XAxis 
                    dataKey="name" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    stroke="#94a3b8"
                    interval={0}
                    tick={{ fill: '#94a3b8' }}
                  />
                  <YAxis 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false} 
                    stroke="#94a3b8" 
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val/1000).toFixed(0)}k` : val}`} 
                  />
                  <RechartsTooltip 
                    cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(255, 255, 255, 0.1)', 
                      color: '#fff',
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                    }} 
                    formatter={(val) => [`₹${Number(val).toLocaleString()}`, 'Total Amount']} 
                  />
                  <Bar 
                    dataKey="amount" 
                    fill="#f59e0b" 
                    radius={[6, 6, 0, 0]} 
                    barSize={36} 
                    name="Amount" 
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                <CreditCard className="w-8 h-8 mb-2 opacity-40" />
                <span>No category data available</span>
              </div>
            )}
          </div>
        </div>

        {/* Donut Chart: Fee by Status */}
        <div className="bg-slate-50/50 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 rounded-xl p-5 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Collection Status Distribution</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total volume by payment status</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {statusData?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={STATUS_COLORS[entry.name.toUpperCase()] || '#94a3b8'} 
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ 
                      backgroundColor: '#0f172a', 
                      borderRadius: '8px', 
                      border: '1px solid rgba(255, 255, 255, 0.1)', 
                      color: '#fff',
                      fontSize: '12px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                    }} 
                    formatter={(val) => [`₹${Number(val).toLocaleString()}`, 'Amount']} 
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => (
                      <span className="text-xs text-slate-600 dark:text-slate-300 ml-1 font-medium">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm">
                <AlertCircle className="w-8 h-8 mb-2 opacity-40" />
                <span>No status distribution data available</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Detailed Fee Records & Transactions Breakdown */}
      <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden bg-slate-50/30 dark:bg-white/[0.01]">
        {/* Table Filters & Search Header */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mr-2 flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              Fee Records Breakdown
            </h3>
            {/* Filter Tabs */}
            {['ALL', 'PAID', 'PENDING', 'OVERDUE'].map(status => (
              <button
                key={status}
                onClick={() => handleFilterChange(status)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                  statusFilter === status
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200/60 dark:border-white/10'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search student, class, fee type..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0F1C] text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500"
              />
            </div>

            <Link
              to="/admin/fees"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-500/20 transition-colors whitespace-nowrap"
            >
              <span>Manage Fees</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Table Content */}
        {filteredFees.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-100/60 dark:bg-white/[0.02] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Class / Section</th>
                  <th className="py-3 px-4">Fee Category</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Amount Paid</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {paginatedFees.map((fee, idx) => {
                  const studentName = fee.studentName || fee.student?.user?.name || 'Unnamed Student';
                  const studentClass = fee.studentClass || fee.student?.course?.name || 'General';
                  const amount = parseFloat(fee.amount ?? fee.amountDue ?? 0) || 0;
                  const amountPaid = parseFloat(fee.amountPaid ?? 0) || 0;
                  const statusKey = (fee.status || 'pending').toLowerCase();
                  const initials = studentName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

                  return (
                    <tr 
                      key={fee.id || `fee-${idx}`} 
                      className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors text-slate-700 dark:text-slate-300"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-[10px] shrink-0">
                            {initials || 'ST'}
                          </div>
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white block">
                              {studentName}
                            </span>
                            {fee.student?.user?.email && (
                              <span className="text-[11px] text-slate-400 block truncate max-w-[150px]">
                                {fee.student.user.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600 dark:text-slate-400">
                        {studentClass}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/50 dark:border-white/5 text-[11px] font-medium">
                          {fee.feeType || 'Tuition Fee'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white">
                        ₹{amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-medium">
                        {amountPaid > 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            ₹{amountPaid.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 opacity-60" />
                          <span>{fee.dueDate ? new Date(fee.dueDate).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                        {fee.paymentMethod || '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${STATUS_BADGE_STYLES[statusKey] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                          {statusKey.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              {feesList.length === 0 ? "No Fee Records Found" : "No Matching Fee Records"}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
              {feesList.length === 0 
                ? "There are no fee records created yet for this institution. Use Fee Management to set up fee structures and bill students."
                : "Try adjusting your search query or status filter to find the record you are looking for."}
            </p>
            {feesList.length === 0 && (
              <Link
                to="/admin/fees"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition shadow-sm"
              >
                Go to Fee Management
              </Link>
            )}
          </div>
        )}

        {/* Table Footer / Pagination */}
        {filteredFees.length > 0 && (
          <div className="p-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <div>
              Showing <span className="font-semibold text-slate-800 dark:text-slate-200">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{Math.min(currentPage * ITEMS_PER_PAGE, filteredFees.length)}</span> of{' '}
              <span className="font-semibold text-slate-800 dark:text-slate-200">{filteredFees.length}</span> records
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="p-1 rounded border border-slate-200 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/5 transition"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-medium">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded border border-slate-200 dark:border-white/10 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-white/5 transition"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
