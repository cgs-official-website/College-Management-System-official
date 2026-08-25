import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Library as LibraryIcon, Search, BookOpen, CheckCircle2, XCircle, MapPin, Loader2 } from 'lucide-react';
import { useStudentLibrary } from '../../hooks/useStudentPortal';

const StudentLibraryDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { data: libraryData, isLoading } = useStudentLibrary(searchTerm);
  const books = libraryData?.data || [];

  const totalBooks = books.length;
  const availableBooks = books.filter(b => b.availableCopies > 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Library Catalog</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Search the institutional book repository, check physical rack locations, and verify availability.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {[
          { title: 'Total Catalog Titles', value: totalBooks, icon: LibraryIcon, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Available In Library', value: availableBooks, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Circulation Status', value: 'Open', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
        ].map((stat, idx) => (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} key={idx} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{stat.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}><stat.icon className={`w-6 h-6 ${stat.color}`} /></div>
            </div>
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity rounded-full ${stat.bg.split(' ')[0].replace('50', '500')}`} />
          </motion.div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by book title, author, or ISBN..."
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl text-sm focus:ring-2 focus:ring-primary-500 outline-none shadow-sm dark:text-white"
        />
      </div>

      {/* Book List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Books Directory</h2>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 rounded-full">
            {books.length} Listed
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center p-6">
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <LibraryIcon className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Books Found</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">No library volumes match your search criteria. Try a different title or keyword.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {books.map((book) => {
              const isAvailable = book.availableCopies > 0;
              return (
                <div key={book.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-100 dark:border-primary-500/20 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0 font-extrabold text-sm">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">{book.title}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {book.author && <span>Author: <strong className="text-slate-700 dark:text-slate-300">{book.author}</strong></span>}
                        {book.isbn && <span>ISBN: <strong className="font-mono">{book.isbn}</strong></span>}
                        {book.category && <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-white/10">{book.category}</span>}
                        {book.rackNo && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                            <MapPin className="w-3.5 h-3.5" />
                            Rack: {book.rackNo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                      isAvailable
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                    }`}>
                      {isAvailable ? `${book.availableCopies} Copies Available` : 'Currently Checked Out'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default StudentLibraryDashboard;
