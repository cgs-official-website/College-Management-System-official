import React from 'react';
import { motion } from 'framer-motion';
import { Banknote, FileText, ArrowUpRight, Download } from 'lucide-react';
import { usePayroll } from '../../hooks/usePayroll';

const PayrollDashboard = () => {
  const { records, isLoading } = usePayroll();
  
  const currentRecord = records && records.length > 0 ? records[0] : null;
  const ytdEarnings = records?.reduce((acc, curr) => acc + curr.basicSalary + curr.allowances, 0) || 0;
  const ytdDeductions = records?.reduce((acc, curr) => acc + curr.deductions, 0) || 0;
  
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Payroll & Salary</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">View your earnings, deductions, and download payslips.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {[
          { title: 'Net Salary (Current)', value: currentRecord ? formatCurrency(currentRecord.netSalary) : 'N/A', icon: Banknote, color: 'text-primary-500', bg: 'bg-primary-50 dark:bg-primary-500/10' },
          { title: 'YTD Earnings', value: formatCurrency(ytdEarnings), icon: ArrowUpRight, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { title: 'Tax Deductions YTD', value: formatCurrency(ytdDeductions), icon: FileText, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
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
            <p className="text-xs text-slate-500 mt-1">For {currentRecord?.month || 'Current Month'}</p>
          </div>
          
          {isLoading ? (
             <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : currentRecord ? (
            <div className="p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Basic Salary</span>
                <span className="font-medium text-slate-900 dark:text-white">{formatCurrency(currentRecord.basicSalary)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Allowances</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">+{formatCurrency(currentRecord.allowances)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Deductions</span>
                <span className="font-medium text-red-600 dark:text-red-400">-{formatCurrency(currentRecord.deductions)}</span>
              </div>
              <div className="pt-4 border-t border-slate-100 dark:border-white/10 flex justify-between font-bold">
                <span className="text-slate-900 dark:text-white">Net Salary</span>
                <span className="text-primary-600 dark:text-primary-400 text-lg">{formatCurrency(currentRecord.netSalary)}</span>
              </div>
              <div className="pt-2">
                 <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                    currentRecord.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                 }`}>
                   {currentRecord.status.toUpperCase()}
                 </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center p-6">
              <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <Banknote className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">Not Available</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Your salary breakdown will appear here once payroll is processed by the HR department.</p>
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="lg:col-span-2 bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 dark:border-white/5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Payslip History</h2>
          </div>
          
          {isLoading ? (
             <div className="p-8 text-center text-slate-500">Loading...</div>
          ) : records && records.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Month</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Net Salary</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {records.map(record => (
                    <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{record.month}</td>
                      <td className="py-4 px-6 text-slate-700 dark:text-slate-300 font-medium">{formatCurrency(record.netSalary)}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          record.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {record.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                          <Download className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center p-6">
              <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-slate-300 dark:text-slate-600" />
              </div>
              <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-1">No Payslips Available</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-sm">Your monthly payslips with download links will appear here after payroll processing.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PayrollDashboard;
