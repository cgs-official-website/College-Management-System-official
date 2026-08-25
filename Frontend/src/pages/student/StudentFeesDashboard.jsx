import React from 'react';
import { motion } from 'framer-motion';
import { Calculator, Wallet, AlertCircle, CheckCircle2, Clock, FileText, Download, Loader2 } from 'lucide-react';
import { useStudentFees } from '../../hooks/useStudentPortal';

const StudentFeesDashboard = () => {
  const { data: feesData, isLoading } = useStudentFees();
  const feeInfo = feesData?.data || { totalAmount: 0, paidAmount: 0, pendingAmount: 0, invoices: [] };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

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
            value: `₹${feeInfo.totalAmount.toLocaleString()}`, 
            icon: Calculator, 
            color: 'text-primary-500', 
            bg: 'bg-primary-50 dark:bg-primary-500/10' 
          },
          { 
            title: 'Amount Paid', 
            value: `₹${feeInfo.paidAmount.toLocaleString()}`, 
            icon: CheckCircle2, 
            color: 'text-emerald-500', 
            bg: 'bg-emerald-50 dark:bg-emerald-500/10' 
          },
          { 
            title: 'Pending Balance', 
            value: `₹${feeInfo.pendingAmount.toLocaleString()}`, 
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
              return (
                <div key={inv.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.02]">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-extrabold text-sm border ${
                      isPaid 
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                        : 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400'
                    }`}>
                      <FileText className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">{inv.feeStructure?.name || 'Academic Fee'}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          isPaid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20'
                        }`}>
                          {inv.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        Due: ₹{inv.amountDue?.toLocaleString() || 0} • Paid: ₹{inv.amountPaid?.toLocaleString() || 0}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-base font-extrabold text-slate-900 dark:text-white">
                      ₹{inv.amountDue?.toLocaleString() || 0}
                    </p>
                    {inv.dueDate && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Due Date: {new Date(inv.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default StudentFeesDashboard;
