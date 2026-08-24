import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from './Button';
import { Modal } from './Modal';
import {
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle,
  AlertCircle,
  FileCheck,
  X,
  HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export function ExcelUploadButton({
  onUpload,
  isLoading,
  label = 'Import',
  title = 'Import Excel Data',
  description = 'Upload an Excel (.xlsx, .xls) or CSV file. Review the required and optional column headers below before uploading.',
  fields = [],
  sampleFileName = 'import_template.xlsx'
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const fileInputRef = useRef(null);

  const handleOpenModal = () => {
    setSelectedFile(null);
    setParsedData([]);
    setPreviewRows([]);
    setValidationErrors([]);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isLoading) return;
    setIsModalOpen(false);
    setSelectedFile(null);
    setParsedData([]);
    setPreviewRows([]);
    setValidationErrors([]);
  };

  // Generate and download sample Excel template
  const handleDownloadTemplate = () => {
    try {
      const headers = {};
      const sampleRow = {};

      if (fields && fields.length > 0) {
        fields.forEach(f => {
          const headerKey = f.name + (f.required ? '*' : '');
          headers[headerKey] = '';
          sampleRow[headerKey] = f.example || '';
        });
      } else {
        headers['Item_Name*'] = '';
        sampleRow['Item_Name*'] = 'Sample Item';
      }

      const ws = XLSX.utils.json_to_sheet([sampleRow]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      XLSX.writeFile(wb, sampleFileName);
      toast.success('Template downloaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate template.');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      let sheetName = workbook.SheetNames.find(name => name.toLowerCase() !== 'instructions');
      if (!sheetName) sheetName = workbook.SheetNames[0];

      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonData.length === 0) {
        toast.error('No data found in the selected file.');
        return;
      }

      // Check required fields
      const errors = [];
      const requiredFields = fields.filter(f => f.required);
      const headersInFile = Object.keys(jsonData[0] || {});

      for (const reqField of requiredFields) {
        const hasHeader = headersInFile.some(h =>
          h.toLowerCase().replace(/[^a-z0-9]/g, '') === reqField.name.toLowerCase().replace(/[^a-z0-9]/g, '') ||
          h.toLowerCase().includes(reqField.name.toLowerCase())
        );
        if (!hasHeader) {
          errors.push(`Missing required column: "${reqField.name}"`);
        }
      }

      setSelectedFile(file);
      setParsedData(jsonData);
      setPreviewRows(jsonData.slice(0, 3));
      setValidationErrors(errors);

      if (errors.length === 0) {
        toast.success(`Loaded ${jsonData.length} row(s) for preview`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse Excel file. Please ensure it is a valid format.');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleConfirmImport = async () => {
    if (!parsedData || parsedData.length === 0) {
      toast.error('Please select a valid Excel file with data.');
      return;
    }

    try {
      await onUpload(parsedData);
      handleCloseModal();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        onClick={handleOpenModal}
        disabled={isLoading}
        className="flex items-center gap-2"
      >
        <Upload className="w-4 h-4" />
        {isLoading ? 'Importing...' : label}
      </Button>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={title}
      >
        <div className="space-y-6 max-h-[80vh] overflow-y-auto pr-1">
          {/* Header Description & Download Template */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-50 dark:bg-white/5 p-4 rounded-xl border border-slate-200 dark:border-white/10">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                Template & Column Guidelines
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {description}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="shrink-0 flex items-center gap-1.5 text-xs text-primary-600 dark:text-primary-400 border-primary-500/30 hover:bg-primary-50 dark:hover:bg-primary-500/10"
            >
              <Download className="w-3.5 h-3.5" />
              Download Template (.xlsx)
            </Button>
          </div>

          {/* Fields Specification Table */}
          {fields && fields.length > 0 && (
            <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden shadow-sm">
              <div className="bg-slate-100 dark:bg-white/5 px-4 py-2.5 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                  Expected Columns / Fields
                </span>
                <span className="text-xs text-slate-500">
                  {fields.filter(f => f.required).length} Required, {fields.filter(f => !f.required).length} Optional
                </span>
              </div>

              <div className="max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-white/5 sticky top-0 border-b border-slate-200 dark:border-white/10 z-10">
                    <tr>
                      <th className="px-3.5 py-2 font-bold text-slate-600 dark:text-slate-300">Column Name</th>
                      <th className="px-3.5 py-2 font-bold text-slate-600 dark:text-slate-300">Requirement</th>
                      <th className="px-3.5 py-2 font-bold text-slate-600 dark:text-slate-300">Type</th>
                      <th className="px-3.5 py-2 font-bold text-slate-600 dark:text-slate-300">Description & Example</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                    {fields.map((f, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-white/5">
                        <td className="px-3.5 py-2 font-mono font-bold text-slate-900 dark:text-white">
                          {f.name}
                        </td>
                        <td className="px-3.5 py-2">
                          {f.required ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400">
                              REQUIRED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300">
                              OPTIONAL
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {f.type || 'String'}
                        </td>
                        <td className="px-3.5 py-2 text-slate-600 dark:text-slate-300">
                          <div>{f.description}</div>
                          {f.example && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Ex: <code className="text-primary-600 dark:text-primary-400">{f.example}</code>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* File Upload Dropzone */}
          <div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />

            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-white/20 hover:border-primary-500 dark:hover:border-primary-400 rounded-2xl p-6 text-center cursor-pointer transition-all bg-slate-50/50 hover:bg-primary-50/20 dark:bg-white/5 dark:hover:bg-primary-950/20 group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                  Click to browse or drag & drop Excel file
                </h5>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Supports .xlsx, .xls, and .csv files
                </p>
              </div>
            ) : (
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm text-slate-900 dark:text-white block truncate max-w-xs sm:max-w-md">
                      {selectedFile.name}
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {parsedData.length} row(s) ready to import
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs"
                  >
                    Change File
                  </Button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setParsedData([]);
                      setPreviewRows([]);
                      setValidationErrors([]);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Validation Warnings */}
          {validationErrors.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3.5 text-xs text-amber-800 dark:text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                Column Validation Alert:
              </div>
              <ul className="list-disc list-inside pl-1 space-y-0.5 text-amber-700 dark:text-amber-400">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table of First Few Rows */}
          {previewRows.length > 0 && (
            <div className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="bg-slate-100 dark:bg-white/5 px-4 py-2 border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300">
                Data Preview (First {previewRows.length} Rows)
              </div>
              <div className="overflow-x-auto max-h-36">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                    <tr>
                      {Object.keys(previewRows[0] || {}).map((k, i) => (
                        <th key={i} className="px-3 py-1.5 font-bold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                    {previewRows.map((row, rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-slate-50/50">
                        {Object.values(row).map((val, cellIdx) => (
                          <td key={cellIdx} className="px-3 py-1.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {String(val || '-')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmImport}
              isLoading={isLoading}
              disabled={!selectedFile || parsedData.length === 0}
              className="flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              {parsedData.length > 0 ? `Import ${parsedData.length} Row(s)` : 'Import Data'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
