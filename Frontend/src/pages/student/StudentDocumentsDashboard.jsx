import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Files, Download, Search, ShieldCheck, Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

const StudentDocumentsDashboard = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showSensitiveData, setShowSensitiveData] = useState(false);
  const [documents, setDocuments] = useState([]); // Firebase-ready empty state

  const handleDownload = (doc) => {
    if (doc.isProtected && !showSensitiveData) {
      toast.error('Please unlock sensitive documents first.');
      return;
    }
    toast.success(`Downloading ${doc.name}...`);
  };

  const filteredDocs = documents.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Documents</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Access your academic records, ID cards, and receipts securely.</p>
        </div>
        <button 
          onClick={() => {
            setShowSensitiveData(!showSensitiveData);
            if (!showSensitiveData) toast.success('Sensitive documents unlocked.');
          }}
          className={`px-5 py-2.5 text-sm font-bold rounded-xl shadow-sm transition-all flex items-center gap-2 border ${
            showSensitiveData 
              ? 'bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400'
              : 'bg-white border-slate-200 text-slate-700 dark:bg-[#0A0F1C] dark:border-white/10 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
          }`}
        >
          {showSensitiveData ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showSensitiveData ? 'Lock Sensitive Data' : 'Unlock Sensitive Data'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {[
          { title: 'Total Documents', value: '0', icon: Files, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'Identity Records', value: '0', icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
        ].map((stat, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow md:col-span-1"
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

        <div className="md:col-span-1 flex items-end">
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
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Document Vault</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
          {filteredDocs.map((doc, idx) => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + (idx * 0.05) }}
              key={doc.id}
              className={`border rounded-2xl p-5 hover:shadow-md transition-all group relative overflow-hidden ${
                doc.isProtected && !showSensitiveData
                  ? 'bg-slate-50 border-slate-200 dark:bg-white/[0.02] dark:border-white/5'
                  : 'bg-white border-slate-200 dark:bg-[#0A0F1C] dark:border-white/10'
              }`}
            >
              {doc.isProtected && !showSensitiveData && (
                <div className="absolute inset-0 z-10 backdrop-blur-sm bg-white/40 dark:bg-black/40 flex flex-col items-center justify-center">
                  <Lock className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Protected Document</span>
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  doc.type === 'Academic' ? 'bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400' :
                  doc.type === 'Identity' ? 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400' :
                  doc.type === 'Financial' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' :
                  'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
                }`}>
                  <Files className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{doc.size}</span>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 line-clamp-1" title={doc.name}>
                {doc.name}
              </h3>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">{doc.type} • {doc.date}</p>
              
              <button 
                onClick={() => handleDownload(doc)}
                className="w-full py-2.5 bg-slate-50 dark:bg-white/5 hover:bg-primary-600 hover:text-white text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 group-hover:shadow-lg"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </button>
            </motion.div>
          ))}
          {filteredDocs.length === 0 && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-center">
              <Files className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Documents Found</h3>
              <p className="text-slate-500 dark:text-slate-400">Your uploaded and allocated documents will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDocumentsDashboard;
