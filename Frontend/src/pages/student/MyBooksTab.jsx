import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, AlertTriangle, IndianRupee, MapPin, Loader2, CalendarDays, RotateCcw, History, Info } from 'lucide-react';
import { useStudentMyBooks, useStudentBookHistory } from '../../hooks/useStudentPortal';

const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
const money = (n) => `₹${Number(n || 0).toFixed(2)}`;

const FINE_BADGE = {
  NONE: { label: 'No fine', cls: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-400' },
  PENDING: { label: 'Pending, pay at library', cls: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' },
  PAID: { label: 'Paid', cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' },
  WAIVED: { label: 'Waived', cls: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' },
};

function LoanStatus({ loan }) {
  if (loan.isOverdue) {
    return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20">Overdue by {loan.daysOverdue} {loan.daysOverdue === 1 ? 'day' : 'days'}</span>;
  }
  if (loan.isDueSoon) {
    return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20">Due in {loan.daysLeft} {loan.daysLeft === 1 ? 'day' : 'days'}</span>;
  }
  return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">{loan.daysLeft} days left</span>;
}

export default function MyBooksTab({ tabs }) {
  const [page, setPage] = useState(1);
  const { data: booksData, isLoading } = useStudentMyBooks();
  const { data: historyData, isLoading: historyLoading } = useStudentBookHistory(page);

  const summary = booksData?.data?.summary;
  const loans = booksData?.data?.loans || [];
  const history = historyData?.data || [];
  const meta = historyData?.meta || { page: 1, totalPages: 1, total: 0 };

  const heading = (
    <div>
      <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Books</h1>
      <p className="text-slate-500 dark:text-slate-400 mt-1">Track the books issued to you, their due dates, fines and your borrowing history.</p>
    </div>
  );

  if (isLoading || !summary) {
    return (
      <div className="space-y-6">
        {heading}
        {tabs}
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </div>
    );
  }

  const cards = [
    { title: 'Books Borrowed', value: `${summary.borrowedCount} / ${summary.limit}`, icon: BookOpen, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
    { title: 'Due Soon', value: summary.dueSoonCount, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { title: 'Overdue', value: summary.overdueCount, icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10' },
    { title: 'Pending Fines', value: money(summary.pendingFines + summary.accruingFines), icon: IndianRupee, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  ];

  return (
    <div className="space-y-6">
      {heading}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
        {cards.map((c, idx) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{c.title}</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{c.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${c.bg}`}>
                <c.icon className={`w-6 h-6 ${c.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {tabs}

      {summary.overdueCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold">
            You have {summary.overdueCount} overdue {summary.overdueCount === 1 ? 'book' : 'books'}. Return {summary.overdueCount === 1 ? 'it' : 'them'} to the library to avoid more fines of {money(summary.finePerDay)} per day.
          </p>
        </div>
      )}

      {summary.overdueCount === 0 && summary.dueSoonCount > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300">
          <Clock className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold">
            {summary.dueSoonCount} {summary.dueSoonCount === 1 ? 'book is' : 'books are'} due within 3 days. Return or renew at the library desk.
          </p>
        </div>
      )}

      {!summary.canBorrow && summary.overdueCount === 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300">
          <Info className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold">{summary.blockedReason}.</p>
        </div>
      )}

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Currently Borrowed</h2>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 rounded-full">
            {loans.length} {loans.length === 1 ? 'Book' : 'Books'}
          </span>
        </div>

        {loans.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center p-6">
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No books borrowed</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Books issued to you by the library will appear here with their due dates.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {loans.map((loan) => (
              <div key={loan.id} className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{loan.book?.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {loan.book?.author && <span>Author: <strong className="text-slate-700 dark:text-slate-300">{loan.book.author}</strong></span>}
                        {loan.book?.isbn && <span>ISBN: <strong className="font-mono">{loan.book.isbn}</strong></span>}
                        {loan.book?.category && <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10">{loan.book.category}</span>}
                        {(loan.book?.rackNo || loan.book?.location) && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <MapPin className="w-3.5 h-3.5" />
                            {loan.book.rackNo ? `Rack: ${loan.book.rackNo}` : loan.book.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0"><LoanStatus loan={loan} /></div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5 text-sm">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" /> Issued on</p>
                    <p className="font-semibold text-slate-900 dark:text-white mt-1">{fmt(loan.issueDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Due date</p>
                    <p className={`font-semibold mt-1 ${loan.isOverdue ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>{fmt(loan.dueDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><RotateCcw className="w-3.5 h-3.5" /> Renewals</p>
                    <p className="font-semibold text-slate-900 dark:text-white mt-1">{loan.renewCount} of {loan.maxRenewals} used</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1"><IndianRupee className="w-3.5 h-3.5" /> Fine so far</p>
                    <p className={`font-semibold mt-1 ${loan.accruingFine > 0 ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>
                      {loan.accruingFine > 0 ? money(loan.accruingFine) : 'None'}
                    </p>
                  </div>
                </div>

                {loan.remarks && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Librarian note: {loan.remarks}</p>
                )}
                <p className="text-xs text-slate-400">To renew or return this book, visit the library desk.</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center gap-2">
          <History className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Borrowing History</h2>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : history.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">No returned books yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="p-4 pl-6">Book</th>
                  <th className="p-4">Issued</th>
                  <th className="p-4">Due</th>
                  <th className="p-4">Returned</th>
                  <th className="p-4">Outcome</th>
                  <th className="p-4 pr-6">Fine</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {history.map((h) => {
                  const badge = FINE_BADGE[h.fineStatus];
                  return (
                    <tr key={h.id}>
                      <td className="p-4 pl-6">
                        <p className="font-bold text-sm text-slate-900 dark:text-white">{h.book?.title}</p>
                        {h.book?.author && <p className="text-xs text-slate-500">by {h.book.author}</p>}
                      </td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{fmt(h.issueDate)}</td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{fmt(h.dueDate)}</td>
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-400">{fmt(h.returnDate)}</td>
                      <td className="p-4 text-sm">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {h.status === 'LOST' ? 'Lost' : h.condition === 'DAMAGED' ? 'Returned (damaged)' : 'Returned'}
                        </span>
                        {h.lateDays > 0 && <p className="text-xs text-rose-600">{h.lateDays} late {h.lateDays === 1 ? 'day' : 'days'}</p>}
                      </td>
                      <td className="p-4 pr-6">
                        {h.fineAmount > 0 && <p className="text-sm font-semibold text-slate-900 dark:text-white">{money(h.fineAmount)}</p>}
                        <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-xs font-bold ${badge.cls}`}>{badge.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-slate-100 dark:border-white/5 text-sm">
            <span className="text-slate-500">Page {meta.page} of {meta.totalPages} · {meta.total} records</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-semibold disabled:opacity-40"
              >
                Prev
              </button>
              <button
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}