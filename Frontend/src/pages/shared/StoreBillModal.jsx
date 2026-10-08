import React, { useState } from 'react';
import { CheckCircle2, Download, Printer } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { fetchSaleBillPdf } from '../../hooks/useStore';

const inr = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const YEARS = { '1': '1st Year', '2': '2nd Year', '3': '3rd Year', '4': '4th Year' };

export const customerSummary = (s) => {
  if (s.customerType === 'STUDENT') {
    return [s.customerName, 'Student', s.department, YEARS[s.year] || s.year, s.section && `Sec ${s.section}`].filter(Boolean).join(' | ');
  }
  if (s.customerType === 'STAFF') return [s.customerName, 'Staff', s.department].filter(Boolean).join(' | ');
  return s.customerName;
};

export default function StoreBillModal({ sale, onClose, isNew = false }) {
  const [busy, setBusy] = useState('');

  const getBlob = async () => {
    const blob = await fetchSaleBillPdf(sale.id);
    if (!(blob instanceof Blob) || blob.size === 0) throw new Error('Empty PDF');
    return blob;
  };

  const download = async () => {
    setBusy('download');
    try {
      const url = URL.createObjectURL(await getBlob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sale.invoiceNo}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      toast.error(e.message || 'Could not download the bill');
    } finally {
      setBusy('');
    }
  };

  const print = async () => {
    setBusy('print');
    try {
      const url = URL.createObjectURL(await getBlob());
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
      iframe.src = url;
      iframe.onload = () => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
        } catch {
          window.open(url, '_blank'); 
        }
      };
      document.body.appendChild(iframe);
      setTimeout(() => { iframe.remove(); URL.revokeObjectURL(url); }, 120000);
    } catch (e) {
      toast.error(e.message || 'Could not print the bill');
    } finally {
      setBusy('');
    }
  };

  return (
    <Modal isOpen={!!sale} onClose={onClose} title={isNew ? 'Bill Generated' : 'Bill'} maxWidth="max-w-lg">
      {sale && (
        <div className="space-y-4">
          <div className="flex flex-col items-center text-center gap-1">
            {isNew && <CheckCircle2 className="w-10 h-10 text-emerald-500" />}
            <p className="text-xs text-slate-500 uppercase font-bold">Invoice number</p>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{sale.invoiceNo}</p>
            <p className="text-xs text-slate-500">
              {new Date(sale.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </div>

          <div className="text-sm bg-slate-50 dark:bg-white/5 rounded-xl p-3 space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-200">{customerSummary(sale)}</p>
            {sale.rollNo && <p className="text-xs text-slate-500">Roll No: {sale.rollNo}</p>}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200 dark:border-white/10">
                <th className="py-1.5">Item</th>
                <th className="py-1.5 text-right">Qty</th>
                <th className="py-1.5 text-right">Price</th>
                <th className="py-1.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {sale.items.map((i) => (
                <tr key={i.id} className="text-slate-800 dark:text-slate-200">
                  <td className="py-1.5">{i.name}</td>
                  <td className="py-1.5 text-right">{i.quantity}</td>
                  <td className="py-1.5 text-right">{inr(i.unitPrice)}</td>
                  <td className="py-1.5 text-right font-semibold">{inr(i.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-sm space-y-1">
            <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Subtotal</span><span>{inr(sale.subtotal)}</span></div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Discount</span><span>- {inr(sale.discount)}</span></div>
            )}
            <div className="flex justify-between text-lg font-extrabold text-slate-900 dark:text-white pt-1 border-t border-slate-100 dark:border-white/10">
              <span>Total</span><span>{inr(sale.total)}</span>
            </div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Payment</span><span>{sale.paymentMethod}{sale.paymentRef ? ` (${sale.paymentRef})` : ''}</span>
            </div>
            {sale.createdByName && (
              <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Issued by</span><span>{sale.createdByName}</span></div>
            )}
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <Button type="button" variant="outline" onClick={onClose}>{isNew ? 'Start New Sale' : 'Close'}</Button>
            <Button type="button" variant="outline" onClick={print} isLoading={busy === 'print'} className="flex items-center gap-2">
              <Printer className="w-4 h-4" /> Print
            </Button>
            <Button type="button" onClick={download} isLoading={busy === 'download'} className="flex items-center gap-2">
              <Download className="w-4 h-4" /> Download PDF
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}