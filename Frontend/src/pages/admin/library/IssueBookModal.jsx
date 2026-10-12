import React, { useEffect, useState } from 'react';
import { Search, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useCirculation } from '../../../hooks/useCirculation';

export function IssueBookModal({ isOpen, onClose, books, initialBook = null, onIssued }) {
  const { searchStudents, getStudentSummary, issueBook, isWorking } = useCirculation();

  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState([]);
  const [summary, setSummary] = useState(null);
  const [bookQuery, setBookQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setStudentQuery('');
      setStudentResults([]);
      setSummary(null);
      setBookQuery('');
      setSelectedBook(initialBook);
    }
  }, [isOpen, initialBook]);

  useEffect(() => {
    if (summary || studentQuery.trim().length < 2) {
      setStudentResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setStudentResults(await searchStudents(studentQuery.trim()));
    }, 300);
    return () => clearTimeout(t);
  }, [studentQuery, summary, searchStudents]);

  const pickStudent = async (student) => {
    setStudentResults([]);
    setStudentQuery('');
    const data = await getStudentSummary(student.id);
    if (data) setSummary(data);
  };

  const availableBooks = (books || [])
    .filter((b) => b.availableCopies > 0)
    .filter((b) => {
      const q = bookQuery.toLowerCase();
      if (!q) return true;
      return (
        b.title?.toLowerCase().includes(q) ||
        b.author?.toLowerCase().includes(q) ||
        b.isbn?.toLowerCase().includes(q)
      );
    })
    .slice(0, 6);

  const canSubmit = summary && summary.canBorrow && selectedBook && !isWorking;

  const handleSubmit = async () => {
    try {
      await issueBook({ studentId: summary.student.id, bookId: selectedBook.id });
      onIssued?.();
      onClose();
    } catch {
      /* toast already shown */
    }
  };

  const inputCls =
    'w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:text-white';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Issue Book" maxWidth="max-w-2xl">
      <div className="space-y-6">
        {/* STUDENT */}
        <div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">1. Student</p>
          {summary ? (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="font-bold text-slate-900 dark:text-white">{summary.student.user?.name || 'Student'}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Roll: {summary.student.rollNumber} · Adm: {summary.student.admissionNumber}
                  </p>
                </div>
                <button className="text-xs text-primary-600 font-semibold" onClick={() => setSummary(null)}>
                  Change
                </button>
              </div>
              <div className="flex flex-wrap gap-3 mt-3 text-xs">
                <span className="px-2 py-1 rounded bg-slate-100 dark:bg-white/10">
                  Borrowed: {summary.activeLoans.length} / {summary.limit}
                </span>
                <span className={`px-2 py-1 rounded ${summary.overdueCount > 0 ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 dark:bg-white/10'}`}>
                  Overdue: {summary.overdueCount}
                </span>
                <span className="px-2 py-1 rounded bg-slate-100 dark:bg-white/10">
                  Pending fines: ₹{summary.pendingFines.toFixed(2)}
                </span>
              </div>
              {!summary.canBorrow && (
                <div className="mt-3 flex items-center gap-2 text-sm text-rose-600 font-semibold">
                  <AlertTriangle className="w-4 h-4" /> Cannot borrow: {summary.blockedReason}
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                className={inputCls}
                placeholder="Search by name, roll number or admission number..."
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
              />
              {studentResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-xl shadow-lg overflow-hidden">
                  {studentResults.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pickStudent(s)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 text-sm"
                    >
                      <span className="font-semibold text-slate-900 dark:text-white">{s.user?.name || 'Student'}</span>
                      <span className="text-xs text-slate-500 ml-2">{s.rollNumber} · {s.admissionNumber}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* BOOK */}
        <div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">2. Book</p>
          {selectedBook ? (
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 flex justify-between items-center gap-3">
              <div>
                <p className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {selectedBook.title}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedBook.author ? `by ${selectedBook.author} · ` : ''}
                  {selectedBook.availableCopies} available
                </p>
              </div>
              <button className="text-xs text-primary-600 font-semibold" onClick={() => setSelectedBook(null)}>
                Change
              </button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  className={inputCls}
                  placeholder="Search available books by title, author or ISBN..."
                  value={bookQuery}
                  onChange={(e) => setBookQuery(e.target.value)}
                />
              </div>
              <div className="mt-2 border border-slate-200 dark:border-white/10 rounded-xl divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                {availableBooks.length === 0 ? (
                  <p className="p-4 text-sm text-slate-500">No available books match.</p>
                ) : (
                  availableBooks.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBook(b)}
                      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5 text-sm flex justify-between gap-3"
                    >
                      <span className="font-semibold text-slate-900 dark:text-white line-clamp-1">{b.title}</span>
                      <span className="text-xs text-slate-500 shrink-0">{b.availableCopies} available</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSubmit} isLoading={isWorking} disabled={!canSubmit}>
            Issue Book
          </Button>
        </div>
      </div>
    </Modal>
  );
}