import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { usePayrolls, useGeneratePayroll, useUpdatePayrollStatus } from '../../../hooks/usePayroll';
import { Loader2, IndianRupee, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export default function PayrollDashboard() {
  const { userRole, permissions } = useAuth();
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear] = useState(currentYear);
  const [statusFilter, setStatusFilter] = useState('');

  const canRead = userRole === 'superadmin' || userRole === 'admin' || permissions.payroll?.canRead;
  const canCreate = userRole === 'superadmin' || userRole === 'admin' || permissions.payroll?.canCreate;
  const canUpdate = userRole === 'superadmin' || userRole === 'admin' || permissions.payroll?.canUpdate;

  const { data: payrolls, isLoading, isError } = usePayrolls({ month, year, status: statusFilter });
  const generateMutation = useGeneratePayroll();
  const updateStatusMutation = useUpdatePayrollStatus();

  if (!canRead) {
    return <div className="p-6 text-center text-red-500">You do not have permission to view Payroll.</div>;
  }

  const handleGenerate = () => {
    generateMutation.mutate({ month, year });
  };

  const handleMarkPaid = (id) => {
    updateStatusMutation.mutate({ id, data: { status: 'Paid', paymentMethod: 'Bank Transfer' } });
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Payroll Management</h1>
        {canCreate && (
          <Button onClick={handleGenerate} disabled={generateMutation.isPending} className="flex items-center">
            {generateMutation.isPending ? <Loader2 className="animate-spin mr-2" size={18} /> : <IndianRupee className="mr-2" size={18} />}
            Generate Payroll
          </Button>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="border rounded-md px-3 py-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="border rounded-md px-3 py-2 w-24" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border rounded-md px-3 py-2">
            <option value="">All</option>
            <option value="Pending">Pending</option>
            <option value="Paid">Paid</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
      ) : isError ? (
        <div className="text-center text-red-500">Failed to load payroll records.</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-4 font-medium text-gray-600">Staff</th>
                <th className="p-4 font-medium text-gray-600">Basic Pay</th>
                <th className="p-4 font-medium text-gray-600">Allowances</th>
                <th className="p-4 font-medium text-gray-600">Deductions</th>
                <th className="p-4 font-medium text-gray-600">Net Pay</th>
                <th className="p-4 font-medium text-gray-600">Status</th>
                <th className="p-4 font-medium text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payrolls?.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-gray-500">No payroll records found for this period.</td>
                </tr>
              )}
              {payrolls?.map((payroll) => (
                <tr key={payroll.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-gray-900">{payroll.staff.firstName} {payroll.staff.lastName}</div>
                    <div className="text-sm text-gray-500">{payroll.staff.email}</div>
                  </td>
                  <td className="p-4">₹{payroll.basicPay.toFixed(2)}</td>
                  <td className="p-4">₹{payroll.allowances.toFixed(2)}</td>
                  <td className="p-4 text-red-500">-₹{payroll.deductions.toFixed(2)}</td>
                  <td className="p-4 font-bold text-green-600">₹{payroll.netPay.toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${payroll.status === 'Paid' ? 'bg-green-100 text-green-700' : payroll.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                      {payroll.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    {canUpdate && payroll.status === 'Pending' && (
                      <button 
                        onClick={() => handleMarkPaid(payroll.id)}
                        disabled={updateStatusMutation.isPending}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center justify-end w-full"
                      >
                        <CheckCircle size={16} className="mr-1" /> Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
