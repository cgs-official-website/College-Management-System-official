import React, { useState, useRef, useEffect } from 'react';
import { 
  Download, 
  ChevronDown, 
  FileSpreadsheet, 
  FileText, 
  FileDown, 
  Printer, 
  Loader2, 
  Check 
} from 'lucide-react';
import { exportToExcel, exportToCSV, exportToPDF, openPrintReport, hasValidExportData } from './reportExporter';
import toast from 'react-hot-toast';

export default function ReportExportMenu({
  data = [],
  fileName = 'Report',
  title = 'Institutional Report',
  subtitle = 'Institutional Analytics & Records',
  summary = null,
  customColumns = null,
  disabled = false,
  buttonText = 'Export',
  size = 'sm', // 'sm' | 'md'
  variant = 'outline', // 'outline' | 'primary' | 'ghost'
  align = 'right' // 'right' | 'left'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAction, setActiveAction] = useState(null);
  const menuRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const resolveData = () => {
    if (typeof data === 'function') {
      return data();
    }
    return data || [];
  };

  const handleExport = async (format) => {
    const currentData = resolveData();
    if (!hasValidExportData(currentData)) {
      toast.error('Data not found');
      setIsOpen(false);
      return;
    }

    setActiveAction(format);
    try {
      if (format === 'excel') {
        await exportToExcel({
          data: currentData,
          fileName,
          title,
          metadata: summary,
          sheetName: title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 31)
        });
      } else if (format === 'csv') {
        await exportToCSV({
          data: currentData,
          fileName
        });
      } else if (format === 'pdf') {
        await exportToPDF({
          data: currentData,
          fileName,
          title,
          subtitle,
          summary,
          customColumns
        });
      } else if (format === 'print') {
        await openPrintReport({
          data: currentData,
          title,
          subtitle,
          summary,
          customColumns
        });
      }
    } finally {
      setTimeout(() => {
        setActiveAction(null);
        setIsOpen(false);
      }, 400);
    }
  };

  const buttonClasses = {
    outline: 'border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0F1C] hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 shadow-sm',
    primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm shadow-primary-500/20',
    ghost: 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
  }[variant] || 'border border-slate-200 dark:border-white/10';

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs font-semibold gap-1.5 rounded-xl',
    md: 'px-4 py-2 text-sm font-semibold gap-2 rounded-xl'
  }[size] || 'px-3 py-1.5 text-xs font-semibold gap-1.5 rounded-xl';

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-between transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${buttonClasses} ${sizeClasses}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="flex items-center gap-1.5">
          {activeAction ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-500" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          <span>{buttonText}</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 opacity-70 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 w-64 rounded-2xl bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-2xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150`}
          role="menu"
          aria-orientation="vertical"
        >
          {/* Header Label */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Download Format
            </span>
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate mt-0.5">
              {title}
            </p>
          </div>

          {/* Option 1: Excel */}
          <button
            type="button"
            onClick={() => handleExport('excel')}
            disabled={activeAction !== null}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-emerald-500/10 dark:hover:bg-emerald-500/15 group transition cursor-pointer"
            role="menuitem"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {activeAction === 'excel' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Excel (.xlsx)
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Spreadsheet
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                Formatted workbook for Microsoft Excel
              </p>
            </div>
          </button>

          {/* Option 2: CSV */}
          <button
            type="button"
            onClick={() => handleExport('csv')}
            disabled={activeAction !== null}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-blue-500/10 dark:hover:bg-blue-500/15 group transition cursor-pointer mt-0.5"
            role="menuitem"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {activeAction === 'csv' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  CSV (.csv)
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                  Raw Data
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                Universal comma-separated format
              </p>
            </div>
          </button>

          {/* Option 3: PDF */}
          <button
            type="button"
            onClick={() => handleExport('pdf')}
            disabled={activeAction !== null}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-rose-500/10 dark:hover:bg-rose-500/15 group transition cursor-pointer mt-0.5"
            role="menuitem"
          >
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {activeAction === 'pdf' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  PDF (.pdf)
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-semibold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                  Document
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                Vector document with institutional header
              </p>
            </div>
          </button>

          {/* Divider */}
          <div className="my-1 border-t border-slate-100 dark:border-white/5" />

          {/* Option 4: Print / Save PDF Preview */}
          <button
            type="button"
            onClick={() => handleExport('print')}
            disabled={activeAction !== null}
            className="w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left hover:bg-slate-100 dark:hover:bg-white/5 group transition cursor-pointer"
            role="menuitem"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-200/60 dark:bg-white/5 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {activeAction === 'print' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                Print / Save PDF
              </span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                Full-fidelity print dialog preview
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
