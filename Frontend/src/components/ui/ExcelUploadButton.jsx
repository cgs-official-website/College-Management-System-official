import React, { useRef } from 'react';
import * as XLSX from 'xlsx';
import { Button } from './Button';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';

export function ExcelUploadButton({ onUpload, isLoading, label = "Import" }) {
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      
      // Look for a data sheet, typically the second one if the first is "Instructions"
      let sheetName = workbook.SheetNames.find(name => name.toLowerCase() !== 'instructions');
      if (!sheetName) sheetName = workbook.SheetNames[0];

      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (jsonData.length === 0) {
        toast.error("No data found in the Excel sheet.");
        return;
      }

      await onUpload(jsonData);
    } catch (err) {
      console.error(err);
      toast.error("Failed to parse Excel file.");
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls, .csv"
        className="hidden"
      />
      <Button 
        variant="secondary" 
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
      >
        <Upload className="w-4 h-4 mr-2" />
        {isLoading ? 'Importing...' : label}
      </Button>
    </>
  );
}
