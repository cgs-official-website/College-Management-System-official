import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, Edit2, Trash2, Search } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useInventory } from '../../../hooks/useInventory';
import { ExcelUploadButton } from '../../../components/ui/ExcelUploadButton';

export default function InventoryDashboard() {
  const { items, isLoading, createItem, updateItem, deleteItem, isCreating, isUpdating, isDeleting, bulkImport, isImporting } = useInventory();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    quantity: 0,
    unitPrice: 0.0
  });

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (i.sku && i.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (i.category && i.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        sku: item.sku || '',
        category: item.category || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice
      });
    } else {
      setEditingItem(null);
      setFormData({ name: '', sku: '', category: '', quantity: 0, unitPrice: 0.0 });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      quantity: Number(formData.quantity),
      unitPrice: Number(formData.unitPrice)
    };

    if (editingItem) {
      await updateItem({ id: editingItem.id, ...payload });
    } else {
      await createItem(payload);
    }
    handleCloseModal();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      await deleteItem(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Inventory Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage office supplies, equipment, and assets.</p>
        </div>
        <div className="flex gap-2">
          <ExcelUploadButton 
            onUpload={bulkImport} 
            isLoading={isImporting} 
          />
          <Button onClick={() => handleOpenModal()} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="p-4 border-b border-slate-200 dark:border-white/10">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Item</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">SKU</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Category</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Quantity</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Unit Price</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">Loading inventory...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">No items found.</td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400 flex items-center justify-center shrink-0">
                          <Package className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.sku || '-'}</td>
                    <td className="px-6 py-4">
                      {item.category ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                          {item.category}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${item.quantity <= 5 ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">₹{item.unitPrice.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(item)}
                          className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={isDeleting}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                        >
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
      </motion.div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingItem ? "Edit Inventory Item" : "Add Inventory Item"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input 
            label="Item Name" 
            value={formData.name} 
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required 
          />
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="SKU / Barcode" 
              value={formData.sku} 
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
            <Input 
              label="Category" 
              value={formData.category} 
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input 
              label="Quantity" 
              type="number" 
              min="0"
              value={formData.quantity} 
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              required 
            />
            <Input 
              label="Unit Price (₹)" 
              type="number" 
              step="0.01"
              min="0"
              value={formData.unitPrice} 
              onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
              required 
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseModal}>Cancel</Button>
            <Button type="submit" isLoading={isCreating || isUpdating}>
              {editingItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
