import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export function Pagination({
  totalItems = 0,
  currentPage = 1,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  className = ''
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Generate page numbers array with ellipses
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (safeCurrentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (safeCurrentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-6 bg-white dark:bg-[#0A0F1C] border-t border-slate-200/80 dark:border-white/10 rounded-b-2xl ${className}`}>
      
      {/* Items count & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
        <span>
          Showing <strong className="text-slate-900 dark:text-white font-bold">{startItem}</strong> to{' '}
          <strong className="text-slate-900 dark:text-white font-bold">{endItem}</strong> of{' '}
          <strong className="text-slate-900 dark:text-white font-bold">{totalItems}</strong> entries
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-white/10">
            <span className="text-slate-400">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                if (onPageChange) onPageChange(1);
              }}
              className="py-1 px-2.5 bg-slate-50 dark:bg-[#060D1A] border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-primary-500 outline-none cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1.5">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={safeCurrentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage === 1}
          className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((page, idx) => {
            if (page === '...') {
              return (
                <span key={`dots-${idx}`} className="px-2 py-1 text-xs text-slate-400 font-bold">
                  ...
                </span>
              );
            }

            const isActive = safeCurrentPage === page;
            return (
              <button
                key={`page-${page}`}
                onClick={() => onPageChange(page)}
                className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-md shadow-primary-600/25'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage === totalPages}
          className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={safeCurrentPage === totalPages}
          className="p-1.5 rounded-lg border border-slate-200/80 dark:border-white/10 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          title="Last Page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
