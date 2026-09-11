import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Files, Download, Search, ShieldCheck, FileText, Loader2, Plus, X, Trash2, Upload, ExternalLink } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useStudentDocuments, useUploadStudentDocument, useDeleteStudentDocument } from '../../hooks/useStudentPortal';

const StudentDocumentsDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { data: docsData, isLoading } = useStudentDocuments();
  const uploadMutation = useUploadStudentDocument();
  const deleteMutation = useDeleteStudentDocument();

  const documents = docsData?.data || [];

  const [formData, setFormData] = useState({
    fileName: '',
    documentType: '10th Marksheet',
    fileSize: '1.5 MB',
    fileUrl: ''
  });

  const handleDownload = (doc) => {
    if (doc.fileUrl && doc.fileUrl.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = doc.fileUrl;
      a.download = doc.fileName;
      a.click();
    } else {
      toast.success(`Accessing document: ${doc.fileName}...`);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => ({
        ...prev,
        fileName: prev.fileName || file.name,
        fileUrl: reader.result,
        fileSize: sizeFormatted
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fileName.trim()) {
      return toast.error('Please enter a document name');
    }

    try {
      await uploadMutation.mutateAsync(formData);
      toast.success('Personal document uploaded successfully!');
      setIsUploadModalOpen(false);
      setFormData({ fileName: '', documentType: '10th Marksheet', fileSize: '1.5 MB', fileUrl: '' });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to upload document');
    }
  };

  const handleDeletePersonalDoc = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}"?`)) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Document removed');
    } catch (err) {
      toast.error('Failed to remove document');
    }
  };

  const filteredDocs = documents.filter(d => 
    (d.fileName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.documentType || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const personalDocsCount = documents.filter(d => d.isPersonal).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Document Vault</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Access verified institutional certificates, transcripts, and upload personal identity documents.
          </p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/30 transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Upload Personal Document
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {[
          { title: 'Total Repository Files', value: documents.length, icon: Files, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'My Uploaded Documents', value: personalDocsCount, icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
        ].map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{stat.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity rounded-full ${stat.bg.split(' ')[0].replace('50', '500')}`} />
          </motion.div>
        ))}

        <div className="flex items-end">
          <div className="relative w-full">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search documents or types..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium dark:text-white transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Institutional & Personal File Repository</h2>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 rounded-full">
            {documents.length} Files
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {filteredDocs.map((doc, idx) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 + (idx * 0.03) }}
              key={doc.id}
              className="border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0F1C] rounded-2xl p-5 hover:shadow-md transition-all group relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      doc.isPersonal 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400'
                    }`}>
                      {doc.isPersonal ? 'Personal' : 'Institutional'}
                    </span>
                    {doc.isPersonal && (
                      <button
                        onClick={() => handleDeletePersonalDoc(doc.id, doc.fileName)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 line-clamp-1" title={doc.fileName}>
                  {doc.fileName}
                </h3>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                  {doc.documentType || 'Personal Document'}
                </p>
                <p className="text-[11px] text-slate-400 mb-4">
                  Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()} {doc.fileSize ? `• ${doc.fileSize}` : ''}
                </p>
              </div>
              
              <button 
                onClick={() => handleDownload(doc)}
                className="w-full py-2.5 bg-slate-50 dark:bg-white/5 hover:bg-primary-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 group-hover:shadow-lg"
              >
                <Download className="w-4 h-4" />
                Download Document
              </button>
            </motion.div>
          ))}
          {filteredDocs.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
              <Files className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Documents In Vault</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">
                Official certificates and uploaded personal documents will appear here. Click 'Upload Personal Document' to add your identity credentials.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Upload Personal Document */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative"
            >
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>

              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                Upload Personal Document
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Upload your identification records, academic certificates, or official proofs.
              </p>

              <form onSubmit={handleUploadSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Document Category *
                  </label>
                  <select
                    value={formData.documentType}
                    onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  >
                    <option value="10th Marksheet">10th Marksheet / Secondary Certificate</option>
                    <option value="12th Marksheet">12th Marksheet / Higher Secondary</option>
                    <option value="Aadhaar Card">Aadhaar Card / National ID</option>
                    <option value="Transfer Certificate">Transfer Certificate (TC)</option>
                    <option value="Migration Certificate">Migration Certificate</option>
                    <option value="Community Certificate">Community / Caste Certificate</option>
                    <option value="Income Certificate">Income Certificate</option>
                    <option value="Birth Certificate">Birth Certificate</option>
                    <option value="Other">Other Personal Document</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Document Title / File Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Class_10_Marksheet_Verified.pdf"
                    value={formData.fileName}
                    onChange={(e) => setFormData({ ...formData, fileName: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Select File (PDF or Image)
                  </label>
                  <div className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-4 text-center hover:border-primary-500 transition-colors">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp"
                      onChange={handleFileChange}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-500/10 dark:file:text-primary-400"
                    />
                    <p className="text-[11px] text-slate-400 mt-2">Max file size 10MB (PDF, PNG, JPG)</p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsUploadModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 text-sm font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploadMutation.isPending}
                    className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                  >
                    {uploadMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Upload Document
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StudentDocumentsDashboard;
