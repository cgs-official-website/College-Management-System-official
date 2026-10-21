import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calculator, 
  Wallet, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Download, 
  Loader2, 
  CreditCard, 
  ShieldCheck, 
  X,
  Printer
} from 'lucide-react';
import { useStudentFees, usePayStudentFee } from '../../hooks/useStudentPortal';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const StudentFeesDashboard = () => {
  const { userData } = useAuth();
  const { data: feesData, isLoading } = useStudentFees();
  const payFeeMutation = usePayStudentFee();

  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [receiptData, setReceiptData] = useState(null);

  const rawFees = feesData?.data ?? feesData;
  const feeInfo = (rawFees && typeof rawFees === 'object' && 'totalAmount' in rawFees)
    ? rawFees
    : { totalAmount: 0, paidAmount: 0, pendingAmount: 0, invoices: [] };

  const handleOpenPayModal = (inv) => {
    setSelectedInvoice(inv);
    const due = Math.max(0, Number(inv.amountDue || 0) - Number(inv.amountPaid || 0));
    setPaymentAmount(due > 0 ? due : inv.amountDue);
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
        studentName: userData?.name || 'Student',
        admissionNumber: userData?.admissionNumber || userData?.rollNumber || 'N/A',
        department: userData?.department || 'Academic',
        invoiceName: selectedInvoice.feeType || 'Tuition Fee',
        amount: paymentAmount,
        date: new Date().toLocaleDateString(),
        receiptNumber: res.receiptNumber || `REC-STU-${Date.now()}`
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const isTransportInvoice = selectedInvoice?.feeType === 'Transport Fee';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Fees & Finance</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">Review your tuition fee breakdown, payment installments, and official receipts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {[
          { 
            title: 'Total College Fees', 
            value: `₹${feeInfo.totalAmount.toLocaleString('en-IN')}`, 
            icon: Calculator, 
            color: 'text-primary-500', 
            bg: 'bg-primary-50 dark:bg-primary-500/10' 
          },
          { 
            title: 'Amount Paid', 
            value: `₹${feeInfo.paidAmount.toLocaleString('en-IN')}`, 
            icon: CheckCircle2, 
            color: 'text-emerald-500', 
            bg: 'bg-emerald-50 dark:bg-emerald-500/10' 
          },
          { 
            title: 'Pending Balance', 
            value: `₹${feeInfo.pendingAmount.toLocaleString('en-IN')}`, 
            icon: feeInfo.pendingAmount > 0 ? AlertCircle : Wallet, 
            color: feeInfo.pendingAmount > 0 ? 'text-rose-500' : 'text-emerald-500', 
            bg: feeInfo.pendingAmount > 0 ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10' 
          },
        ].map((stat, idx) => (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} key={idx} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">{stat.value}</h3>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}><stat.icon className={`w-6 h-6 ${stat.color}`} /></div>
            </div>
            <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-0 group-hover:opacity-20 transition-opacity rounded-full ${stat.bg.split(' ')[0].replace('50', '500')}`} />
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Fee Invoices & Statements</h2>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400 rounded-full">
            {feeInfo.invoices?.length || 0} Invoices
          </span>
        </div>

        {(!feeInfo.invoices || feeInfo.invoices.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16 text-center p-6">
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Wallet className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Fee Invoices</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Assigned fee structures and tuition payment schedules will be listed here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {feeInfo.invoices.map((inv) => {
              const isPaid = inv.status === 'paid';
              const isPartial = inv.status === 'partial';
              const effectivePaid = isPaid && (!inv.amountPaid || Number(inv.amountPaid) === 0)
                ? Number(inv.amountDue || 0)
                : Number(inv.amountPaid || 0);
              const feeDisplayName = inv.feeType || inv.feeStructure?.name || inv.transactions?.[0]?.gatewayRef || 'Academic Fee';
              const pendingDue = Math.max(0, Number(inv.amountDue || 0) - effectivePaid);

              return (
                <div key={inv.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-sm border ${
                      isPaid 
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                        : isPartial
                        ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400'
                        : 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400'
                    }`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{feeDisplayName}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isPaid 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20' 
                            : isPartial
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Due: ₹{inv.amountDue?.toLocaleString('en-IN') || 0} • Paid: ₹{effectivePaid.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-base font-extrabold text-slate-900 dark:text-white">
                        ₹{inv.amountDue?.toLocaleString('en-IN') || 0}
                      </p>
                      {inv.dueDate && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Due Date: {new Date(inv.dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {isPaid ? (
                      <button
                        onClick={() => {
                          setReceiptData({
                            studentName: userData?.name || 'Student',
                            admissionNumber: userData?.admissionNumber || userData?.rollNumber || 'N/A',
                            department: userData?.department || 'Academic',
                            invoiceName: feeDisplayName,
                            amount: effectivePaid,
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
                        className="px-5 py-2.5 bg-gradient-to-r from-primary-600 to-teal-600 hover:from-primary-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-primary-500/20 flex items-center gap-1.5 transition-all"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Pay ₹{pendingDue.toLocaleString('en-IN')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

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
                  <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/10 text-primary-600 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Pay Student Fee</h3>
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
                    <span>Invoice:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {selectedInvoice.feeType || selectedInvoice.feeStructure?.name || 'Tuition Fee'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Total Fee Amount:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      ₹{selectedInvoice.amountDue?.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Amount to Pay (INR)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    readOnly={isTransportInvoice}
                    required
                    className={`w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 text-slate-900 dark:text-white font-bold focus:ring-2 focus:ring-primary-500 outline-none ${isTransportInvoice ? 'opacity-70 cursor-not-allowed' : ''}`}
                  />
                  {isTransportInvoice && (
                    <p className="text-[11px] text-slate-400 mt-1">Transport fees are paid in full.</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['UPI', 'Card', 'NetBanking'].map((m) => (
                      <button
                        type="button"
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                          paymentMethod === m
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300'
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
                    className="w-full py-3 bg-gradient-to-r from-primary-600 to-teal-600 hover:from-primary-700 hover:to-teal-700 text-white font-extrabold rounded-xl shadow-lg shadow-primary-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
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
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Fee Settlement Receipt</h3>
                <button
                  onClick={() => setReceiptData(null)}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div id="printable-student-receipt" className="space-y-4 my-4 p-4 border border-dashed border-slate-200 dark:border-white/10 rounded-xl bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="text-center pb-3 border-b border-slate-200 dark:border-white/10">
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">COLLEGE MANAGEMENT SYSTEM</h2>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Official Student Fee Receipt</p>
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
                    <span className="text-slate-400">Fee Head:</span>
                    <p className="font-bold text-slate-900 dark:text-white">{receiptData.invoiceName}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400">Payment Status:</span>
                    <p className="font-bold text-emerald-600 uppercase">Cleared</p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-white/10 flex justify-between items-center text-sm font-black">
                  <span>Total Amount Paid:</span>
                  <span className="text-emerald-600 text-base">₹{Number(receiptData.amount || 0).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handlePrintReceipt}
                  className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Print / Save Receipt
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
};

export default StudentFeesDashboard;
