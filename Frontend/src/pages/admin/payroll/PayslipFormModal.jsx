import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { Button } from '../../../components/ui/Button';
import { useStaff } from '../../../hooks/useStaff';
import { useAuth } from '../../../contexts/AuthContext';

export function PayslipFormModal({ isOpen, onClose, onSubmit, isLoading }) {
  const { userData } = useAuth();
  const { staff } = useStaff(userData?.collegeId);
  
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const initialForm = {
    staffId: '',
    month: currentMonth,
    year: currentYear,
    basicPay: 0,
    hra: 0,
    da: 0,
    specialAllowance: 0,
    pf: 0,
    esi: 0,
    pt: 0,
    tds: 0,
    otherDeductions: 0
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    if (isOpen) {
      setFormData(initialForm);
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const parsedValue = name === 'staffId' ? value : Number(value);

    setFormData(prev => {
      const next = { ...prev, [name]: parsedValue };
      
      // Auto-calculate PF and ESI when earnings change
      if (['basicPay', 'hra', 'da', 'specialAllowance'].includes(name)) {
        const basic = next.basicPay || 0;
        const gross = basic + (next.hra || 0) + (next.da || 0) + (next.specialAllowance || 0);
        
        next.pf = Math.round(basic * 0.12);
        next.esi = Math.round(gross * 0.0075);
      }
      
      return next;
    });
  };

  const grossPay = (formData.basicPay || 0) + (formData.hra || 0) + (formData.da || 0) + (formData.specialAllowance || 0);
  const totalDeductions = (formData.pf || 0) + (formData.esi || 0) + (formData.pt || 0) + (formData.tds || 0) + (formData.otherDeductions || 0);
  const netPay = grossPay - totalDeductions;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      month: Number(formData.month),
      year: Number(formData.year),
    });
  };

  const staffOptions = (staff || []).map(s => ({ value: s.userId, label: s.name || s.email }));
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Payslip" size="2xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="space-y-4">
          <Select
            label="Staff Member"
            name="staffId"
            value={formData.staffId}
            onChange={handleChange}
            options={staffOptions}
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Month"
              name="month"
              value={formData.month}
              onChange={handleChange}
              options={monthOptions}
              required
            />
            <Input
              label="Year"
              name="year"
              type="number"
              value={formData.year}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Earnings</h3>
            <Input label="Basic Pay" name="basicPay" type="number" value={formData.basicPay} onChange={handleChange} required min="0" />
            <Input label="HRA" name="hra" type="number" value={formData.hra} onChange={handleChange} min="0" />
            <Input label="DA" name="da" type="number" value={formData.da} onChange={handleChange} min="0" />
            <Input label="Special Allowance" name="specialAllowance" type="number" value={formData.specialAllowance} onChange={handleChange} min="0" />
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-emerald-600">
              <span>Gross Pay:</span>
              <span>₹{grossPay.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-4 p-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/50">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Deductions</h3>
            <Input label="PF" name="pf" type="number" value={formData.pf} onChange={handleChange} min="0" />
            <Input label="ESI" name="esi" type="number" value={formData.esi} onChange={handleChange} min="0" />
            <Input label="PT" name="pt" type="number" value={formData.pt} onChange={handleChange} min="0" />
            <Input label="TDS" name="tds" type="number" value={formData.tds} onChange={handleChange} min="0" />
            <Input label="Other Deductions" name="otherDeductions" type="number" value={formData.otherDeductions} onChange={handleChange} min="0" />
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-red-500">
              <span>Total Deductions:</span>
              <span>₹{totalDeductions.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
          <span className="text-lg font-bold text-indigo-900 dark:text-indigo-100">Net Pay</span>
          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">₹{netPay.toFixed(2)}</span>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button variant="outline" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>Create Payslip</Button>
        </div>
      </form>
    </Modal>
  );
}
