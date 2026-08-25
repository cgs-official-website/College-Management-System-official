import React from 'react';
import { useMyPayslips } from '../../hooks/usePayroll';
import { Loader2, Download, IndianRupee } from 'lucide-react';

export default function Payslips() {
  const { data: payslips, isLoading, isError } = useMyPayslips();

  if (isLoading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
  }

  if (isError) {
    return <div className="text-center text-red-500 p-6">Failed to load payslips.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Payslips</h1>
      
      {payslips?.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-sm border text-center text-gray-500">
          No payslips available.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {payslips?.map(payslip => (
            <div key={payslip.id} className="bg-white rounded-lg shadow-sm border p-6 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {new Date(0, payslip.month - 1).toLocaleString('default', { month: 'long' })} {payslip.year}
                  </h3>
                  <span className={`mt-1 inline-block px-2 py-1 rounded-full text-xs font-medium ${payslip.status === 'Paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {payslip.status}
                  </span>
                </div>
                <div className="bg-indigo-100 p-2 rounded-full">
                  <IndianRupee className="text-indigo-600" size={24} />
                </div>
              </div>
              
              <div className="space-y-2 mb-6 flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Basic Pay</span>
                  <span className="font-medium">₹{payslip.basicPay.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Allowances</span>
                  <span className="font-medium text-green-600">+₹{payslip.allowances.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Deductions</span>
                  <span className="font-medium text-red-500">-₹{payslip.deductions.toFixed(2)}</span>
                </div>
                <div className="pt-2 mt-2 border-t flex justify-between">
                  <span className="font-bold text-gray-800">Net Pay</span>
                  <span className="font-bold text-indigo-600">₹{payslip.netPay.toFixed(2)}</span>
                </div>
              </div>

              {payslip.status === 'Paid' && (
                <button 
                  onClick={() => window.print()}
                  className="w-full py-2 px-4 border border-indigo-600 text-indigo-600 rounded-md hover:bg-indigo-50 font-medium flex justify-center items-center"
                >
                  <Download size={16} className="mr-2" /> Download / Print
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
