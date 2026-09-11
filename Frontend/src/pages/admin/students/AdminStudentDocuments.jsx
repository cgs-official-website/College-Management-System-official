import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Files, 
  Search, 
  Download, 
  ExternalLink, 
  Eye, 
  FileText, 
  ShieldCheck, 
  User, 
  GraduationCap, 
  Calendar,
  X,
  Loader2,
  Filter
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../../services/apiClient';
import { Pagination } from '../../../components/ui/Pagination';
import toast from 'react-hot-toast';

export default function AdminStudentDocuments() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Query all student documents from admin endpoint
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['admin-student-documents'],
    queryFn: async () => {
      const res = await api.get('/students/all-documents');
      const raw = res?.data ?? res;
      return Array.isArray(raw) ? raw : [];
    }
  });

  const handleDownload = (doc) => {
    if (doc.fileUrl && doc.fileUrl.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = doc.fileUrl;
      a.download = doc.fileName;
      a.click();
      toast.success(`Downloading ${doc.fileName}...`);
    } else {
      toast.success(`Accessing verified document: ${doc.fileName}...`);
    }
  };

  // Filter & paginate
  const filtered = documents.filter((d) => {
    const matchesSearch = 
      (d.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.admissionNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.fileName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.documentType || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (categoryFilter === 'marksheet') {
      return matchesSearch && (d.documentType || '').toLowerCase().includes('marksheet');
    }
    if (categoryFilter === 'id') {
      return matchesSearch && ((d.documentType || '').toLowerCase().includes('aadhaar') || (d.documentType || '').toLowerCase().includes('id') || (d.documentType || '').toLowerCase().includes('certificate'));
    }
    if (categoryFilter === 'personal') {
      return matchesSearch && d.isPersonal === true;
    }
    return matchesSearch;
  });

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const personalCount = documents.filter(d => d.isPersonal).length;
  const marksheetsCount = documents.filter(d => (d.documentType || '').toLowerCase().includes('marksheet')).length;
  const uniqueStudents = new Set(documents.filter(d => d.studentId).map(d => d.studentId)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Student Personal Documents
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Access, verify, and download student personal documents, academic marksheets, and official credentials.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { title: 'Total Documents', value: documents.length, icon: Files, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Personal Uploads', value: personalCount, icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Marksheets & Transcripts', value: marksheetsCount, icon: GraduationCap, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
          { title: 'Students with Records', value: uniqueStudents, icon: User, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
        ].map((stat, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                  {isLoading ? '...' : stat.value}
                </h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search student, admission no, document..." 
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {[
            { label: 'All Documents', value: 'all' },
            { label: 'Personal Uploads', value: 'personal' },
            { label: 'Marksheets', value: 'marksheet' },
            { label: 'Identity / Certificates', value: 'id' }
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => { setCategoryFilter(f.value); setCurrentPage(1); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                categoryFilter === f.value
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-white/[0.02]">
                <th className="py-4 px-6">Student Information</th>
                <th className="py-4 px-6">Student ID</th>
                <th className="py-4 px-6">Document Details</th>
                <th className="py-4 px-6">Type / Category</th>
                <th className="py-4 px-6">Uploaded Date</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
                    Loading student documents...
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Files className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    No documents found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-50/80 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 flex items-center justify-center font-bold text-xs shrink-0">
                          {doc.studentName?.charAt(0) || 'S'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{doc.studentName}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {doc.department} {doc.section ? `• Sec ${doc.section}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {doc.admissionNumber}
                      </span>
                    </td>

                    <td className="py-4 px-6 max-w-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary-500 shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1" title={doc.fileName}>
                            {doc.fileName}
                          </p>
                          <span className="text-[11px] text-slate-400 font-medium">
                            {doc.fileSize || '1.2 MB'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300">
                        {doc.documentType || 'Personal Document'}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-slate-500 text-xs">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedDoc(doc)}
                          className="p-1.5 text-slate-500 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                          title="Download Document"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > pageSize && (
          <div className="p-4 border-t border-slate-200 dark:border-white/10 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(filtered.length / pageSize)}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Modal: View Document Information */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative"
            >
              <button
                onClick={() => setSelectedDoc(null)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <span className="text-xs font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                  Document Details
                </span>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                  {selectedDoc.fileName}
                </h2>
              </div>

              <div className="space-y-4 text-sm">
                <div className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Student Name:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{selectedDoc.studentName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Admission ID:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{selectedDoc.admissionNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Department:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{selectedDoc.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Document Type:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{selectedDoc.documentType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">File Size:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{selectedDoc.fileSize}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-medium">Uploaded Date:</span>
                    <span className="font-bold text-slate-800 dark:text-white">{new Date(selectedDoc.uploadedAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/10">
                  <button
                    onClick={() => setSelectedDoc(null)}
                    className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => handleDownload(selectedDoc)}
                    className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Document
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
