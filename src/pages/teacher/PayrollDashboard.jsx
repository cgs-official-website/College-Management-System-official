import React from 'react';
import { motion } from 'framer-motion';
import { Banknote, FileText, ArrowUpRight } from 'lucide-react';

const PayrollDashboard = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Payroll & Salary</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">View your earnings, deductions, and download payslips.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {[
          { title: 'Net Salary (Current)', value: 'N/A', icon: Banknote, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'YTD Earnings', value: 'N/A', icon: ArrowUpRight, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Tax Deductions YTD', value: 'N/A', icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-1 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Salary Breakdown</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-16 text-center p-6">
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Banknote className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">Not Available</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Your salary breakdown will appear here once payroll is processed by the HR department.</p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-white/5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Payslip History</h2>
          </div>
          <div className="flex flex-col items-center justify-center py-16 text-center p-6">
            <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Payslips Available</h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Your monthly payslips with download links will appear here after payroll processing.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PayrollDashboard;
