import React, { useState, useEffect } from 'react';
import { Pagination } from '../ui/Pagination';

export function DataTable({ 
  columns, 
  data = [], 
  isLoading,
  emptyMessage = "No data found",
  pagination = true,
  initialPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100]
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Reset to page 1 if data length shrinks or filters change
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil((data?.length || 0) / pageSize));
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [data?.length, pageSize, currentPage]);

  const totalItems = data?.length || 0;
  const paginatedData = pagination 
    ? data.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : data;

  return (
    <div className="w-full overflow-hidden border border-slate-200/80 dark:border-white/10 rounded-2xl bg-white dark:bg-[#0A0F1C] shadow-sm flex flex-col">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-medium">
            <tr>
              {columns.map((col, index) => (
                <th key={col.header || col.accessorKey || `col-${index}`} className="px-6 py-4">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300">
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-8 text-center">
                  <div className="flex justify-center items-center">
                    <svg className="animate-spin h-6 w-6 text-primary-500" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                </td>
              </tr>
            ) : totalItems === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr 
                  key={row.id || row.key || row.admissionNo || `row-${rowIndex}`} 
                  className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                >
                  {columns.map((col, colIndex) => (
                    <td key={col.header || col.accessorKey || `cell-${colIndex}`} className="px-6 py-4">
                      {col.cell ? col.cell(row) : row[col.accessorKey]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Embedded Pagination */}
      {pagination && !isLoading && totalItems > 0 && (
        <Pagination
          totalItems={totalItems}
          currentPage={currentPage}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}
