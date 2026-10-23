import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Globe, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Copy, 
  Check, 
  ShieldCheck, 
  Users, 
  HelpCircle,
  ExternalLink,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '../../../services/apiClient';
import toast from 'react-hot-toast';

export default function DomainManagementPage() {
  const queryClient = useQueryClient();
  const [newDomain, setNewDomain] = useState('');
  const [addError, setAddError] = useState('');
  const [copiedKey, setCopiedKey] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);
  const [verifyErrors, setVerifyErrors] = useState({});
  const [deletingId, setDeletingId] = useState(null);

  // Fetch registered domains
  const { 
    data: domainsResponse, 
    isLoading, 
    isError, 
    error: fetchError,
    refetch 
  } = useQuery({
    queryKey: ['college-domains'],
    queryFn: async () => {
      const res = await api.get('/domains');
      return res.data?.data || res.data || [];
    },
  });

  const domains = Array.isArray(domainsResponse) ? domainsResponse : [];

  // Add domain mutation
  const addMutation = useMutation({
    mutationFn: async (domain) => {
      const res = await api.post('/domains', { domain });
      return res.data?.data || res.data;
    },
    onSuccess: (data) => {
      setNewDomain('');
      setAddError('');
      toast.success('Domain registered! Please configure the DNS TXT record to verify ownership.');
      queryClient.invalidateQueries({ queryKey: ['college-domains'] });
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Failed to add domain.';
      setAddError(msg);
      toast.error(msg);
    }
  });

  // Verify domain mutation
  const verifyMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/domains/${id}/verify`);
      return res.data;
    },
    onSuccess: (res, id) => {
      setVerifyErrors(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.success(res?.message || 'Domain verified successfully!');
      queryClient.invalidateQueries({ queryKey: ['college-domains'] });
      queryClient.invalidateQueries({ queryKey: ['non-compliant-users'] });
    },
    onError: (err, id) => {
      const msg = err.response?.data?.message || err.message || 'Verification failed. Please check your DNS record.';
      setVerifyErrors(prev => ({ ...prev, [id]: msg }));
      toast.error(msg);
    },
    onSettled: () => {
      setVerifyingId(null);
    }
  });

  // Delete domain mutation
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/domains/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Domain deleted successfully.');
      queryClient.invalidateQueries({ queryKey: ['college-domains'] });
      queryClient.invalidateQueries({ queryKey: ['non-compliant-users'] });
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.message || 'Failed to delete domain.';
      toast.error(msg);
    },
    onSettled: () => {
      setDeletingId(null);
    }
  });

  const handleAddDomain = (e) => {
    e.preventDefault();
    setAddError('');

    let cleaned = newDomain.trim().toLowerCase();
    cleaned = cleaned.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0].split('@').pop();

    if (!cleaned) {
      setAddError('Please enter a valid domain name (e.g. university.edu).');
      return;
    }

    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
    if (!domainRegex.test(cleaned)) {
      setAddError('Invalid domain format. Use format like "institution.edu" or "college.ac.in".');
      return;
    }

    addMutation.mutate(cleaned);
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  const handleVerify = (id) => {
    setVerifyingId(id);
    setVerifyErrors(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    verifyMutation.mutate(id);
  };

  const handleDelete = (id, domainName) => {
    if (window.confirm(`Are you sure you want to remove ${domainName}? Users with this email domain may lose access or be flagged as non-compliant.`)) {
      setDeletingId(id);
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
              <Globe className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                College Domain Management
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Authorize and verify institutional email domains to enforce email compliance across staff and students.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/admin/non-compliant-users"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:border-primary-500 dark:hover:border-primary-500 bg-white dark:bg-[#0A0F1C] text-slate-700 dark:text-slate-200 text-sm font-semibold transition-all shadow-sm group"
          >
            <Users className="w-4 h-4 text-primary-500 group-hover:scale-110 transition-transform" />
            <span>Audit Non-Compliant Users</span>
          </Link>
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A0F1C] text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
            title="Refresh domains"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-2xl bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/30 flex items-start gap-3.5">
        <Info className="w-5 h-5 text-primary-600 dark:text-primary-400 shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <strong className="font-semibold text-slate-900 dark:text-white">How Domain Enforcement Works:</strong> Once at least one verified domain is active, all new student and staff accounts (plus profile email updates) must end with an authorized domain. If zero domains are verified, any email domain is permitted.
        </div>
      </div>

      {/* Add Domain Form */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
          Add New Institution Domain
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
          Enter your college or university's primary email domain (e.g., <code className="bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-primary-600 dark:text-primary-400 font-mono">stanford.edu</code> or <code className="bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded text-primary-600 dark:text-primary-400 font-mono">bits-pilani.ac.in</code>).
        </p>

        <form onSubmit={handleAddDomain} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Globe className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={newDomain}
                onChange={(e) => {
                  setNewDomain(e.target.value);
                  if (addError) setAddError('');
                }}
                placeholder="e.g. college.edu"
                className={`w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-white/5 border ${addError ? 'border-red-500 focus:ring-red-500/20' : 'border-slate-200 dark:border-white/10 focus:ring-primary-500/20 focus:border-primary-500'} rounded-2xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-4 transition-all`}
                disabled={addMutation.isPending}
              />
            </div>
            <button
              type="submit"
              disabled={addMutation.isPending || !newDomain.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-primary-500/25 transition-all shrink-0"
            >
              {addMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              <span>Add Domain</span>
            </button>
          </div>

          {addError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400 pt-1"
            >
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{addError}</span>
            </motion.div>
          )}
        </form>
      </div>

      {/* Domain List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Configured Domains ({domains.length})
          </h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading domains...</p>
          </div>
        ) : isError ? (
          <div className="p-8 text-center bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-3xl text-red-600 dark:text-red-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-semibold text-sm">Failed to load college domains.</p>
            <p className="text-xs mt-1 text-slate-500">{fetchError?.message}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all"
            >
              Retry
            </button>
          </div>
        ) : domains.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-[#0A0F1C] border border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
            <Globe className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Domains Configured Yet</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Add your institution's email domain above. Until a domain is verified, any email domain is accepted for registrations.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5">
            {domains.map((dom) => {
              const isVerified = dom.status === 'VERIFIED';
              const isVerifying = verifyingId === dom.id;
              const isDeleting = deletingId === dom.id;
              const hostKey = `host-${dom.id}`;
              const valKey = `val-${dom.id}`;
              const verifyError = verifyErrors[dom.id];

              const txtHost = dom.instructions?.host || `_zuna-verify.${dom.domain}`;
              const txtValue = dom.instructions?.value || `zuna-verify=${dom.verificationToken}`;

              return (
                <div
                  key={dom.id}
                  className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-sm overflow-hidden transition-all"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm ${isVerified ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                        {isVerified ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                            @{dom.domain}
                          </h3>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${isVerified ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/30'}`}>
                            {isVerified ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>VERIFIED</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5" />
                                <span>PENDING VERIFICATION</span>
                              </>
                            )}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          Added on {dom.createdAt ? new Date(dom.createdAt).toLocaleDateString() : 'N/A'}
                          {dom.verifiedAt && ` • Verified on ${new Date(dom.verifiedAt).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto">
                      {!isVerified && (
                        <button
                          type="button"
                          onClick={() => handleVerify(dom.id)}
                          disabled={isVerifying}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-500/20"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                          <span>{isVerifying ? 'Verifying DNS...' : 'Verify DNS Record'}</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleDelete(dom.id, dom.domain)}
                        disabled={isDeleting}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
                        title="Delete Domain"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Pending verification DNS instructions */}
                  {!isVerified && (
                    <div className="mt-5 space-y-4">
                      <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 mb-1">
                          Step: Add DNS TXT Record to Verify Ownership
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          Log in to your DNS provider (e.g. Cloudflare, GoDaddy, Route53, Namecheap) and create the following TXT record for <strong className="text-slate-800 dark:text-slate-200">{dom.domain}</strong>:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          {/* Host */}
                          <div className="p-3 bg-white dark:bg-[#060A13] border border-amber-200 dark:border-white/10 rounded-xl">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                              <span>RECORD TYPE & HOST / NAME</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(txtHost, hostKey)}
                                className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline"
                              >
                                {copiedKey === hostKey ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedKey === hostKey ? 'Copied' : 'Copy Host'}</span>
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">TXT</span>
                              <span className="font-mono text-xs text-slate-900 dark:text-white select-all break-all">{txtHost}</span>
                            </div>
                          </div>

                          {/* Value */}
                          <div className="p-3 bg-white dark:bg-[#060A13] border border-amber-200 dark:border-white/10 rounded-xl">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
                              <span>TXT RECORD VALUE</span>
                              <button
                                type="button"
                                onClick={() => handleCopy(txtValue, valKey)}
                                className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline"
                              >
                                {copiedKey === valKey ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedKey === valKey ? 'Copied' : 'Copy Value'}</span>
                              </button>
                            </div>
                            <div className="font-mono text-xs text-slate-900 dark:text-white select-all break-all">
                              {txtValue}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Inline verify error if any */}
                      {verifyError && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5"
                        >
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                          <div className="leading-relaxed">
                            <p className="font-bold">Verification Error:</p>
                            <p>{verifyError}</p>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
