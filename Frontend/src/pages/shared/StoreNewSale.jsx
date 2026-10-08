import React, { useMemo, useState } from 'react';
import {
  Package, Search, Plus, Minus, X, ShoppingCart, CheckCircle2, Filter, GraduationCap, Briefcase, User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import StoreBillModal from './StoreBillModal';

const inr = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const YEARS = [
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
];
const yearLabel = (v) => YEARS.find((y) => y.value === v)?.label || v;

const TYPES = [
  { value: 'STUDENT', label: 'Student', icon: GraduationCap },
  { value: 'STAFF', label: 'Staff', icon: Briefcase },
  { value: 'OTHER', label: 'Other', icon: User },
];
const PAYMENTS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
];

const EMPTY_CUSTOMER = { type: 'STUDENT', name: '', rollNo: '', department: '', year: '', section: '' };

const labelCls = 'block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1';
const selectCls = 'w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white text-sm';
const filterCls = 'px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 text-sm outline-none focus:ring-2 focus:ring-primary-500';
const cardCls = 'bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm';

export default function StoreNewSale({ items, categories, departments, onCreateSale, isCreating }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cart, setCart] = useState({}); // { itemId: qty }
  const [customer, setCustomer] = useState(EMPTY_CUSTOMER);
  const [discount, setDiscount] = useState('');
  const [payment, setPayment] = useState('CASH');
  const [paymentRef, setPaymentRef] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [completed, setCompleted] = useState(null);

  const sellable = useMemo(() => items.filter((i) => i.isActive), [items]);

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sellable.filter((i) => {
      if (categoryFilter && i.categoryId !== categoryFilter) return false;
      if (q && !`${i.name} ${i.category || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sellable, search, categoryFilter]);

  // cart lines, always capped to the live stock
  const lines = useMemo(() => Object.entries(cart).map(([id, qty]) => {
    const item = sellable.find((i) => i.id === id);
    if (!item || item.stock <= 0) return null;
    const q = Math.min(qty, item.stock);
    return { item, qty: q, lineTotal: round2(item.price * q) };
  }).filter(Boolean), [cart, sellable]);

  const subtotal = round2(lines.reduce((s, l) => s + l.lineTotal, 0));
  const discountNum = discount === '' ? 0 : Number(discount);
  const discountInvalid = Number.isNaN(discountNum) || discountNum < 0 || discountNum > subtotal;
  const total = round2(subtotal - (discountInvalid ? 0 : discountNum));

  // ---------- cart ----------
  const addItem = (item) => {
    const cur = cart[item.id] || 0;
    if (item.stock <= 0) return toast.error(`'${item.name}' is out of stock`);
    if (cur >= item.stock) return toast.error(`Only ${item.stock} of '${item.name}' in stock`);
    setCart({ ...cart, [item.id]: cur + 1 });
  };

  const setQty = (item, value) => {
    const n = Math.max(1, Math.min(item.stock, parseInt(value, 10) || 1));
    setCart({ ...cart, [item.id]: n });
  };

  const removeLine = (id) => {
    const next = { ...cart };
    delete next[id];
    setCart(next);
  };

  // ---------- customer ----------
  const setType = (type) => {
    setCustomer((c) => ({
      type,
      name: c.name,
      rollNo: type === 'STUDENT' ? c.rollNo : '',
      department: type === 'OTHER' ? '' : c.department,
      year: type === 'STUDENT' ? c.year : '',
      section: type === 'STUDENT' ? c.section : '',
    }));
  };

  const validate = () => {
    if (lines.length === 0) return 'Add at least one item';
    if (discountInvalid) return 'Discount cannot be negative or more than the subtotal';
    const name = customer.name.trim();
    if (!name) return customer.type === 'OTHER' ? 'Enter the customer details' : 'Enter the customer name';
    if (customer.type !== 'OTHER' && !customer.department) return 'Select a department';
    if (customer.type === 'STUDENT') {
      if (!customer.year) return 'Select the year';
      if (!customer.section.trim()) return 'Enter the section';
    }
    return null;
  };

  const openReview = () => {
    const err = validate();
    if (err) return toast.error(err);
    setReviewOpen(true);
  };

  const buildPayload = () => {
    const base = {
      customerType: customer.type,
      customerName: customer.name.trim(),
      items: lines.map((l) => ({ itemId: l.item.id, quantity: l.qty })),
      discount: discountInvalid ? 0 : discountNum,
      paymentMethod: payment,
      paymentRef: payment === 'CASH' ? null : paymentRef.trim() || null,
    };
    if (customer.type === 'STUDENT') {
      return {
        ...base,
        rollNo: customer.rollNo.trim() || null,
        department: customer.department,
        year: customer.year,
        section: customer.section.trim().toUpperCase(),
      };
    }
    if (customer.type === 'STAFF') return { ...base, department: customer.department };
    return base;
  };

  const confirmSale = async () => {
    try {
      const sale = await onCreateSale(buildPayload());
      setCompleted(sale);
      setReviewOpen(false);
      setCart({});
      setCustomer(EMPTY_CUSTOMER);
      setDiscount('');
      setPaymentRef('');
    } catch {
      setReviewOpen(false); 
    }
  };

  const customerLine = (c) => {
    if (c.customerType === 'STUDENT') {
      return [c.customerName, 'Student', c.department, yearLabel(c.year), c.section && `Sec ${c.section}`].filter(Boolean).join(' | ');
    }
    if (c.customerType === 'STAFF') return [c.customerName, 'Staff', c.department].filter(Boolean).join(' | ');
    return c.customerName;
  };

  const reviewCustomer = {
    customerType: customer.type,
    customerName: customer.name.trim(),
    department: customer.department,
    year: customer.year,
    section: customer.section.trim().toUpperCase(),
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* ================= ITEM GRID ================= */}
      <div className={`${cardCls} lg:col-span-2 overflow-hidden`}>
        <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={filterCls}>
              <option value="">All Categories</option>
              {categories.filter((c) => c.isActive).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="p-4">
          {shown.length === 0 ? (
            <p className="text-center text-slate-500 py-12 text-sm">
              {sellable.length === 0 ? 'No active items. Add items in Products & Stock first.' : 'No items match your search.'}
            </p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {shown.map((item) => {
                const inCart = cart[item.id] || 0;
                const out = item.stock <= 0;
                const maxed = inCart >= item.stock;
                const low = !out && item.stock <= item.lowStockAt;
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={out || maxed}
                    onClick={() => addItem(item)}
                    className={`relative text-left rounded-2xl border p-3 transition-all ${
                      out
                        ? 'opacity-50 cursor-not-allowed border-slate-200 dark:border-white/10'
                        : maxed
                          ? 'border-primary-300 dark:border-primary-500/40 cursor-not-allowed'
                          : 'border-slate-200 dark:border-white/10 hover:border-primary-400 hover:shadow-md'
                    }`}
                  >
                    {inCart > 0 && (
                      <span className="absolute top-2 right-2 z-10 min-w-[1.5rem] h-6 px-1.5 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shadow">
                        {inCart}
                      </span>
                    )}
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-28 object-cover rounded-xl mb-2 border border-slate-100 dark:border-white/10" />
                    ) : (
                      <div className="w-full h-28 rounded-xl mb-2 bg-primary-50 dark:bg-primary-500/10 text-primary-500 flex items-center justify-center">
                        <Package className="w-8 h-8" />
                      </div>
                    )}
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{item.name}</p>
                    <p className="text-xs text-slate-500 truncate">{item.category || 'Uncategorized'}</p>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">{inr(item.price)}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        out ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                        : low ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
                        {out ? 'Out of stock' : `${item.stock} left`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ================= SALE PANEL ================= */}
      <div className={`${cardCls} p-4 space-y-4 self-start lg:sticky lg:top-4`}>
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary-600" />
          <h3 className="font-bold text-slate-900 dark:text-white">Current Sale</h3>
          {lines.length > 0 && (
            <button type="button" onClick={() => setCart({})} className="ml-auto text-xs text-rose-500 hover:underline">Clear</button>
          )}
        </div>

        {/* lines */}
        {lines.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4 border border-dashed border-slate-300 dark:border-white/20 rounded-xl">
            Click items to add them here.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {lines.map(({ item, qty, lineTotal }) => (
              <div key={item.id} className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-white/5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">{inr(item.price)} each</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setQty(item, qty - 1)} disabled={qty <= 1}
                    className="p-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 disabled:opacity-40">
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <input
                    type="number" min="1" max={item.stock} value={qty}
                    onChange={(e) => setQty(item, e.target.value)}
                    className="w-12 text-center py-1 text-sm bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-lg text-slate-900 dark:text-white outline-none"
                  />
                  <button type="button" onClick={() => setQty(item, qty + 1)} disabled={qty >= item.stock}
                    className="p-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 disabled:opacity-40">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <span className="w-20 text-right text-sm font-bold text-slate-900 dark:text-white">{inr(lineTotal)}</span>
                <button type="button" onClick={() => removeLine(item.id)} className="p-1 text-slate-400 hover:text-rose-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* customer */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/10">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Customer</p>
          <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
            {TYPES.map((t) => (
              <button
                key={t.value} type="button" onClick={() => setType(t.value)}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  customer.type === t.value
                    ? 'bg-white dark:bg-white/20 text-primary-700 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </button>
            ))}
          </div>

          <div>
            <label className={labelCls}>
              {customer.type === 'OTHER' ? 'Customer details *' : 'Name *'}
            </label>
            <Input
              placeholder={customer.type === 'OTHER' ? 'e.g. Ravi - parent' : 'Type full name'}
              maxLength={customer.type === 'OTHER' ? 150 : 100}
              value={customer.name}
              onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
            />
          </div>

          {customer.type === 'STUDENT' && (
            <div>
              <label className={labelCls}>Roll No (optional)</label>
              <Input
                placeholder="e.g. 21CS045" maxLength={30}
                value={customer.rollNo}
                onChange={(e) => setCustomer({ ...customer, rollNo: e.target.value })}
              />
            </div>
          )}

          {customer.type !== 'OTHER' && (
            <div>
              <label className={labelCls}>Department *</label>
              <select value={customer.department} onChange={(e) => setCustomer({ ...customer, department: e.target.value })} className={selectCls}>
                <option value="">Select department</option>
                {departments.map((d) => <option key={d.id} value={d.name}>{d.name} ({d.code})</option>)}
              </select>
            </div>
          )}

          {customer.type === 'STUDENT' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Year *</label>
                <select value={customer.year} onChange={(e) => setCustomer({ ...customer, year: e.target.value })} className={selectCls}>
                  <option value="">Select</option>
                  {YEARS.map((y) => <option key={y.value} value={y.value}>{y.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Section *</label>
                <Input
                  placeholder="e.g. A" maxLength={20}
                  value={customer.section}
                  onChange={(e) => setCustomer({ ...customer, section: e.target.value.toUpperCase() })}
                />
              </div>
            </div>
          )}
        </div>

        {/* payment + totals */}
        <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-white/10">
          <div>
            <label className={labelCls}>Discount (₹, optional)</label>
            <Input
              type="number" min="0" step="0.01" placeholder="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              error={discountInvalid ? 'Cannot be negative or more than the subtotal' : undefined}
            />
          </div>

          <div>
            <label className={labelCls}>Payment method</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl">
              {PAYMENTS.map((p) => (
                <button
                  key={p.value} type="button" onClick={() => setPayment(p.value)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                    payment === p.value
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {payment !== 'CASH' && (
            <div>
              <label className={labelCls}>{payment === 'UPI' ? 'UPI reference / transaction ID' : 'Card slip / reference'} (optional)</label>
              <Input maxLength={100} value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} />
            </div>
          )}

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Discount</span><span>- {inr(discountInvalid ? 0 : discountNum)}</span>
            </div>
            <div className="flex justify-between text-lg font-extrabold text-slate-900 dark:text-white pt-1 border-t border-slate-100 dark:border-white/10">
              <span>Total</span><span>{inr(total)}</span>
            </div>
          </div>

          <Button type="button" onClick={openReview} disabled={lines.length === 0} className="w-full">
            Review & Generate Bill
          </Button>
        </div>
      </div>

      {/* ================= REVIEW MODAL ================= */}
      <Modal isOpen={reviewOpen} onClose={() => !isCreating && setReviewOpen(false)} title="Confirm Sale" maxWidth="max-w-lg">
        <div className="space-y-4">
          <div className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/5 rounded-xl p-3">
            <span className="text-xs font-bold text-slate-500 uppercase block mb-0.5">Customer</span>
            {customerLine(reviewCustomer)}
            {customer.type === 'STUDENT' && customer.rollNo.trim() && <span className="block text-xs text-slate-500">Roll No: {customer.rollNo.trim()}</span>}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200 dark:border-white/10">
                <th className="py-1.5">Item</th><th className="py-1.5 text-right">Qty</th><th className="py-1.5 text-right">Price</th><th className="py-1.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {lines.map(({ item, qty, lineTotal }) => (
                <tr key={item.id} className="text-slate-800 dark:text-slate-200">
                  <td className="py-1.5">{item.name}</td>
                  <td className="py-1.5 text-right">{qty}</td>
                  <td className="py-1.5 text-right">{inr(item.price)}</td>
                  <td className="py-1.5 text-right font-semibold">{inr(lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="text-sm space-y-1">
            <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400"><span>Discount</span><span>- {inr(discountInvalid ? 0 : discountNum)}</span></div>
            <div className="flex justify-between text-lg font-extrabold text-slate-900 dark:text-white"><span>Total to collect</span><span>{inr(total)}</span></div>
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Payment</span>
              <span>{PAYMENTS.find((p) => p.value === payment)?.label}{payment !== 'CASH' && paymentRef.trim() ? ` (${paymentRef.trim()})` : ''}</span>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
            <strong>Check before confirming:</strong> a bill cannot be cancelled or edited once generated.
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <Button type="button" variant="outline" onClick={() => setReviewOpen(false)} disabled={isCreating}>Go back</Button>
            <Button type="button" onClick={confirmSale} isLoading={isCreating}>Confirm & Generate Bill</Button>
          </div>
        </div>
      </Modal>

      {/* ================= BILL ================= */}
      <StoreBillModal sale={completed} isNew onClose={() => setCompleted(null)} />
      
    </div>
  );
}