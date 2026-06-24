import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Upload, FileType } from 'lucide-react';
import toast from 'react-hot-toast';

export function BulkImportModal({ isOpen, onClose, onImport, isLoading }) {
  const [file, setFile] = useState(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && (selected.name.endsWith('.xlsx') || selected.name.endsWith('.xls') || selected.name.endsWith('.csv'))) {
      setFile(selected);
    } else {
      toast.error('Please select a valid Excel or CSV file.');
      e.target.value = null;
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Please select a file first.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        
        // Basic validation
        if (json.length === 0) {
          toast.error('The selected file is empty.');
          return;
        }

        // Pass to parent
        await onImport(json);
        setFile(null);
        onClose();
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Failed to parse the file. Ensure it is formatted correctly.');
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Import Students" maxWidth="max-w-md">
      <div className="space-y-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Upload an Excel (.xlsx) or CSV file containing student data. Ensure headers match the expected format (firstName, lastName, email, class, etc.).
        </p>

        <div className="border-2 border-dashed border-slate-300 dark:border-white/20 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
          <FileType className="w-10 h-10 text-slate-400 mb-3" />
          <label htmlFor="file-upload" className="cursor-pointer">
            <span className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
              Choose a file
            </span>
            <span className="text-slate-500 dark:text-slate-400"> or drag and drop</span>
            <input 
              id="file-upload" 
              type="file" 
              className="hidden" 
              accept=".xlsx, .xls, .csv"
              onChange={handleFileChange}
            />
          </label>
          {file && (
            <div className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-full">
              {file.name}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleImport} isLoading={isLoading}>
            <Upload className="w-4 h-4 mr-2" />
            Import Data
          </Button>
        </div>
      </div>
    </Modal>
  );
}
