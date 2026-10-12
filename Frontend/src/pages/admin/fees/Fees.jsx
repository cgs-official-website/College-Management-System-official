import React, { useState } from 'react';
import { Plus, Search, Filter, IndianRupee, Clock, CheckCircle, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useFees } from '../../../hooks/useFees';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { FeeFormModal } from './FeeFormModal';
import { useConfirm } from '../../../contexts/ConfirmContext';

export default function Fees() {
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { fees, isLoading, addFee, updateFee, deleteFee, isAdding, isUpdating } = useFees(collegeId);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null);

  const filteredFees = fees.filter(fee => 
    fee.studentName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fee.feeType?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingFee(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (fee) => {
    setEditingFee(fee);
    setIsFormOpen(true);
  };

  const handleDelete = async (id) => {
    if (await confirm({ message: "Are you sure you want to delete this fee record?" })) {
      await deleteFee(id);
    }
  };

  const handleSubmit = async (data) => {
    try {
      if (editingFee) {
        await updateFee({ id: editingFee.id, data });
      } else {
        await addFee(data);
      }
      setIsFormOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'paid': return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max"><CheckCircle className="w-3 h-3"/> Paid</span>;
      case 'pending': return <span className="px-2.5 py-1 bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max"><Clock className="w-3 h-3"/> Pending</span>;
      case 'overdue': return <span className="px-2.5 py-1 bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 w-max"><AlertCircle className="w-3 h-3"/> Overdue</span>;
      default: return null;
    }
  };

  // Calculate summary stats
  const totalCollected = fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
  const totalPending = fees.filter(f => f.status === 'pending').reduce((sum, f) => sum + f.amount, 0);
  const totalOverdue = fees.filter(f => f.status === 'overdue').reduce((sum, f) => sum + f.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Fee Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Track tuition, manage payments, and monitor dues.</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Create Fee Record
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Collected</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">₹{totalCollected.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10">
              <IndianRupee className="w-6 h-6 text-emerald-500" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Pending Dues</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">₹{totalPending.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-50 dark:bg-amber-500/10">
              <Clock className="w-6 h-6 text-amber-500" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Overdue Amount</p>
              <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2 text-red-500">₹{totalOverdue.toLocaleString()}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-50 dark:bg-red-500/10">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-white dark:bg-[#0A0F1C] p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <Input 
            placeholder="Search by student name or fee type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 mb-0"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="px-4">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="p-4 pl-6">Student details</th>
                <th className="p-4">Fee Description</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Due Date</th>
                <th className="p-4">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {isLoading ? (
                [1, 2, 3].map(n => (
                  <tr key={n} className="animate-pulse">
                    <td className="p-4 pl-6"><div className="h-10 w-48 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4"><div className="h-6 w-32 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4"><div className="h-6 w-24 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4"><div className="h-6 w-24 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4"><div className="h-6 w-20 bg-slate-100 dark:bg-white/5 rounded-lg"></div></td>
                    <td className="p-4 pr-6"></td>
                  </tr>
                ))
              ) : filteredFees.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500 dark:text-slate-400">
                    No fee records found matching your search.
                  </td>
                </tr>
              ) : (
                filteredFees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-slate-900 dark:text-white text-sm">{fee.studentName}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Class {fee.studentClass}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-700 dark:text-slate-300 font-medium">{fee.feeType}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">₹{fee.amount.toLocaleString()}</p>
                      {fee.paymentMethod && <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">via {fee.paymentMethod}</p>}
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">{fee.dueDate}</p>
                    </td>
                    <td className="p-4">
                      {getStatusBadge(fee.status)}
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2 transition-opacity">
                        <button onClick={() => handleOpenEdit(fee)} className="p-2 text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-lg shadow-sm">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(fee.id)} className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-lg shadow-sm">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <FeeFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleSubmit}
        initialData={editingFee}
        isLoading={isAdding || isUpdating}
      />
    </div>
  );
}
