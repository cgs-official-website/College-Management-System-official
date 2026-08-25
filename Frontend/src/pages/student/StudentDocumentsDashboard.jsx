import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Files, Download, Search, ShieldCheck, FileText, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useStudentDocuments } from '../../hooks/useStudentPortal';

const StudentDocumentsDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: docsData, isLoading } = useStudentDocuments();
  const documents = docsData?.data || [];

  const handleDownload = (doc) => {
    toast.success(`Accessing document: ${doc.fileName}...`);
  };

  const filteredDocs = documents.filter(d => (d.fileName || '').toLowerCase().includes(searchQuery.toLowerCase()));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Document Vault</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Access verified institutional certificates, transcripts, and credentials.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {[
          { title: 'Verified Documents', value: documents.length, icon: Files, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Identity Records', value: 'Active', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
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
              placeholder="Search documents..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none text-sm font-medium dark:text-white transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Institutional File Repository</h2>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 rounded-full">
            {documents.length} Files
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {filteredDocs.map((doc, idx) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 + (idx * 0.05) }}
              key={doc.id}
              className="border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0F1C] rounded-2xl p-5 hover:shadow-md transition-all group relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400">
                  <FileText className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">PDF</span>
              </div>
              
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 line-clamp-1" title={doc.fileName}>
                {doc.fileName}
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-4">Verified Certificate</p>
              
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
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Official certificates and verification documents issued by the university will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDocumentsDashboard;
