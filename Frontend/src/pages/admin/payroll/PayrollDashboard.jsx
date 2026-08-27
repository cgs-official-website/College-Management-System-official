import React, { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { usePayrolls, useCreatePayslip, useBulkImportPayrolls, useUpdatePayrollStatus } from '../../../hooks/usePayroll';
import { Loader2, IndianRupee, CheckCircle, Plus } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Select } from '../../../components/ui/Select';
import { Input } from '../../../components/ui/Input';
import { ExcelUploadButton } from '../../../components/ui/ExcelUploadButton';
import { PayslipFormModal } from './PayslipFormModal';

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
  const { mutateAsync: createPayslip, isPending: isCreating } = useCreatePayslip();
  const { mutateAsync: bulkImport, isPending: isImporting } = useBulkImportPayrolls();
  const updateStatusMutation = useUpdatePayrollStatus();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!canRead) {
    return <div className="p-6 text-center text-red-500">You do not have permission to view Payroll.</div>;
  }

  const handleCreateSubmit = async (data) => {
    await createPayslip(data);
    setIsModalOpen(false);
  };

  const handleBulkImport = async (data) => {
    await bulkImport(data);
  };

  const handleMarkPaid = (id) => {
    updateStatusMutation.mutate({ id, data: { status: 'Paid', paymentMethod: 'Bank Transfer' } });
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Payroll Management</h1>
        {canCreate && (
          <div className="flex flex-wrap gap-3 mt-4 sm:mt-0">
            <ExcelUploadButton
              onUpload={handleBulkImport}
              isLoading={isImporting}
              title="Bulk Import Payslips"
              label="Bulk Import"
              fields={[
                { key: 'staffId', label: 'Staff ID', type: 'string', required: true },
                { key: 'month', label: 'Month (1-12)', type: 'number', required: true },
                { key: 'year', label: 'Year', type: 'number', required: true },
                { key: 'basicPay', label: 'Basic Pay', type: 'number', required: true },
                { key: 'hra', label: 'HRA', type: 'number' },
                { key: 'da', label: 'DA', type: 'number' },
                { key: 'specialAllowance', label: 'Special Allowance', type: 'number' },
                { key: 'pf', label: 'PF', type: 'number' },
                { key: 'esi', label: 'ESI', type: 'number' },
                { key: 'pt', label: 'PT', type: 'number' },
                { key: 'tds', label: 'TDS', type: 'number' },
                { key: 'otherDeductions', label: 'Other Deductions', type: 'number' }
              ]}
            />
            <Button onClick={() => setIsModalOpen(true)} className="flex items-center">
              <Plus className="mr-2 h-4 w-4" />
              Create Payslip
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row flex-wrap gap-4">
        <div className="w-full sm:w-48">
          <Select
            label="Month"
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }))}
            placeholder={false}
          />
        </div>
        <div className="w-full sm:w-32">
          <Input
            label="Year"
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All' },
              { value: 'Pending', label: 'Pending' },
              { value: 'Paid', label: 'Paid' },
              { value: 'Cancelled', label: 'Cancelled' },
            ]}
            placeholder={false}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
      ) : isError ? (
        <div className="text-center text-red-500">Failed to load payroll records.</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="p-4 font-medium text-gray-600">Staff</th>
                <th className="p-4 font-medium text-gray-600">Basic Pay</th>
                <th className="p-4 font-medium text-gray-600">Gross Pay</th>
                <th className="p-4 font-medium text-gray-600">PF & ESI</th>
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
                    <div className="font-medium text-gray-900">{payroll.staff.name || 'Unnamed Staff'}</div>
                    <div className="text-sm text-gray-500">{payroll.staff.email}</div>
                  </td>
                  <td className="p-4">₹{(payroll.basicPay || 0).toFixed(2)}</td>
                  <td className="p-4 text-emerald-600">₹{(payroll.grossPay || 0).toFixed(2)}</td>
                  <td className="p-4 text-red-500">
                    <div>PF: ₹{(payroll.pf || 0).toFixed(2)}</div>
                    <div>ESI: ₹{(payroll.esi || 0).toFixed(2)}</div>
                  </td>
                  <td className="p-4 font-bold text-indigo-600">₹{(payroll.netPay || 0).toFixed(2)}</td>
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
        </div>
      )}
      <PayslipFormModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateSubmit}
        isLoading={isCreating}
      />
    </div>
  );
}
