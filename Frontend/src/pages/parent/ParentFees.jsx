import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CreditCard, 
  Wallet, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Download, 
  ArrowUpRight, 
  FileText, 
  X, 
  ShieldCheck, 
  Loader2,
  Calendar,
  User,
  GraduationCap
} from 'lucide-react';
import { useParentFees, usePayFee } from '../../hooks/useParentPortal';
import { useParentChild } from '../../contexts/ParentChildContext';
import { toast } from 'react-hot-toast';

export default function ParentFees() {
  const { activeChildId, activeChild } = useParentChild();
  const { data: feesData, isLoading } = useParentFees(activeChildId);
  const payFeeMutation = usePayFee();

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [receiptData, setReceiptData] = useState(null);

  const feeSummary = feesData || {
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
    invoices: []
  };

  const handleOpenPayModal = (inv) => {
    setSelectedInvoice(inv);
    setPaymentAmount(inv.pendingAmount || inv.amountDue || 0);
  };

  const handleProcessPayment = async (e) => {
    e.preventDefault();
    if (!selectedInvoice || !paymentAmount || Number(paymentAmount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    try {
      const res = await payFeeMutation.mutateAsync({
        feeId: selectedInvoice.id,
        amount: Number(paymentAmount),
        paymentMethod
      });

      toast.success('Fee payment completed successfully!');
      setSelectedInvoice(null);
      setReceiptData({
        ...res,
        studentName: activeChild?.name || 'Student',
        admissionNumber: activeChild?.admissionNumber || 'N/A',
        department: activeChild?.department || 'Academic',
        invoiceName: selectedInvoice.feeType,
        amount: paymentAmount,
        date: new Date().toLocaleDateString(),
        receiptNumber: res.receiptNumber || `REC-${Date.now()}`
      });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Payment processing failed');
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-10 h-10 text-teal-600 animate-spin" />
        <p className="text-sm font-medium text-slate-500">Loading student fee records...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Fees & Billing
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Review fee statements, settlement receipts, and pay outstanding dues for{' '}
            <span className="font-bold text-teal-600 dark:text-teal-400">
              {activeChild?.name || 'your child'}
            </span>.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Total Academic Fees
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-2">
                ₹{Number(feeSummary.totalAmount || 0).toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
            <span>Aggregated semester fees</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Total Paid
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                ₹{Number(feeSummary.paidAmount || 0).toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span>Verified cleared settlements</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-rose-500">
                Outstanding Balance
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-rose-500 mt-2">
                ₹{Number(feeSummary.pendingAmount || 0).toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
              <Wallet className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-rose-500 font-medium">
            <span>{feeSummary.pendingAmount > 0 ? 'Pending payment required' : 'All clear for this term'}</span>
          </div>
        </motion.div>
      </div>

      {/* Invoices List */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fee Statements & Invoices</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Itemized institutional charges and payment statuses</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 rounded-full">
            {feeSummary.invoices.length} Records
          </span>
        </div>

        {feeSummary.invoices.length === 0 ? (
          <div className="text-center py-16 px-6">
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Fee Invoices Found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              There are currently no fee schedules or invoices generated for {activeChild?.name || 'this student'}.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {feeSummary.invoices.map((inv) => {
              const isPaid = inv.status === 'paid';
              const isPartial = inv.status === 'partial';

              return (
                <div key={inv.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-bold border ${
                      isPaid 
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600'
                        : isPartial
                        ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-600'
                        : 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-500'
                    }`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">{inv.feeType}</h4>
                        <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full ${
                          isPaid 
                            ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                            : isPartial
                            ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'
                            : 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Due Date: {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : 'N/A'} • Paid: ₹{inv.amountPaid.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-slate-500 uppercase font-semibold">Total / Due</p>
                      <p className="text-base font-extrabold text-slate-900 dark:text-white">
                        ₹{inv.amountDue.toLocaleString('en-IN')}
                      </p>
                    </div>

                    {isPaid ? (
                      <button
                        onClick={() => {
                          setReceiptData({
                            studentName: activeChild?.name || 'Student',
                            admissionNumber: activeChild?.admissionNumber || 'N/A',
                            department: activeChild?.department || 'Academic',
                            invoiceName: inv.feeType,
                            amount: inv.amountPaid,
                            date: new Date(inv.dueDate || Date.now()).toLocaleDateString(),
                            receiptNumber: inv.transactions?.[0]?.gatewayRef || `REC-${inv.id.substring(0, 8)}`
                          });
                        }}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Receipt
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenPayModal(inv)}
                        className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-teal-500/20 flex items-center gap-1.5 transition-all"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Pay ₹{inv.pendingAmount.toLocaleString('en-IN')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Online Payment Modal */}
      <AnimatePresence>
        {selectedInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl overflow-hidden relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-500/10 text-teal-600 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Online Fee Payment</h3>
                </div>
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleProcessPayment} className="space-y-4 mt-4">
                <div className="bg-slate-50 dark:bg-white/5 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex justify-between text-slate-500">
                    <span>Student:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeChild?.name}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Fee Item:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedInvoice.feeType}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Total Outstanding:</span>
                    <span className="font-bold text-rose-500">₹{selectedInvoice.pendingAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Amount to Pay (INR)
                  </label>
                  <input
                    type="number"
                    max={selectedInvoice.pendingAmount}
                    min="1"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Payment Gateway / Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['UPI', 'Card', 'NetBanking'].map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                          paymentMethod === m
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300'
                            : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={payFeeMutation.isPending}
                    className="w-full py-3 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold rounded-xl shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    {payFeeMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Pay ₹{Number(paymentAmount || 0).toLocaleString('en-IN')}
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-slate-400 mt-2">
                    Secured 256-bit institutional encrypted payment gateway
                  </p>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Official Receipt Modal */}
      <AnimatePresence>
        {receiptData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl overflow-hidden relative"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Official Fee Receipt</h3>
                <button
                  onClick={() => setReceiptData(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div id="printable-receipt" className="space-y-4 my-4 p-4 border border-dashed border-slate-200 dark:border-white/10 rounded-xl bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="text-center pb-3 border-b border-slate-200 dark:border-white/10">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">COLLEGE MANAGEMENT SYSTEM</h2>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Institutional Fee Clearance Receipt</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Receipt No:</span>
                    <p className="font-bold text-slate-900 dark:text-white">{receiptData.receiptNumber}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Date:</span>
                    <p className="font-bold text-slate-900 dark:text-white">{receiptData.date}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Student Name:</span>
                    <p className="font-bold text-slate-900 dark:text-white">{receiptData.studentName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Admission No:</span>
                    <p className="font-bold text-slate-900 dark:text-white">{receiptData.admissionNumber}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Department:</span>
                    <p className="font-bold text-slate-900 dark:text-white">{receiptData.department}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Fee Head:</span>
                    <p className="font-bold text-slate-900 dark:text-white">{receiptData.invoiceName}</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-between items-center text-sm font-black">
                  <span>Amount Settled:</span>
                  <span className="text-emerald-600 text-base">₹{Number(receiptData.amount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handlePrintReceipt}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Print / Save PDF
                </button>
                <button
                  onClick={() => setReceiptData(null)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-bold text-xs rounded-xl hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
