import React, { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Package, Plus, Edit2, Trash2, Search, Filter, RotateCcw, ImagePlus, X, Tag,
  Layers, CheckCircle2, XCircle, ArrowDownRight, SlidersHorizontal, History,
  ShoppingCart, Receipt
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useStore } from '../../hooks/useStore';
import { StockModal, StockHistoryModal } from './StoreStockModals';
import { ExcelUploadButton } from '../../components/ui/ExcelUploadButton';
import StoreNewSale from './StoreNewSale';
import StoreSalesHistory from './StoreSalesHistory';

const STORE_IMPORT_FIELDS = [
  { name: 'Item_Name', required: true, type: 'String', description: 'Item name', example: 'Uniform Shirt' },
  { name: 'Category', required: false, type: 'String', description: 'Existing category name or code (create it first)', example: 'Uniforms' },
  { name: 'Price', required: true, type: 'Number', description: 'Selling price in rupees (>= 0)', example: '450' },
  { name: 'Opening_Stock', required: false, type: 'Integer', description: 'Units on hand (>= 0)', example: '20' },
  { name: 'Low_Stock_Alert', required: false, type: 'Integer', description: 'Warn when stock is at or below this (default 5)', example: '5' },
];

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const EMPTY_FORM = { name: '', categoryId: '', price: '', stock: '', lowStockAt: '5' };
const EMPTY_CAT_FORM = { name: '', code: '', description: '', isActive: true };

const stockStyle = (item) => {
  if (item.stock <= 0) return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400';
  if (item.stock <= item.lowStockAt) return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400';
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400';
};

const inr = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const selectCls = 'w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white text-sm';
const filterSelectCls = 'px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 text-sm outline-none focus:ring-2 focus:ring-primary-500';
const searchCls = 'w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white text-sm';
const tabCls = (on) => `flex items-center gap-2 pb-3 px-4 font-semibold text-sm transition-colors ${
  on ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
     : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`;
const countCls = 'ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-medium';
const labelCls = 'block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1';
const cardCls = 'bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden';
const thCls = 'px-6 py-4 text-xs font-bold text-slate-500 uppercase';

export default function StoreDashboard() {
  const [activeTab, setActiveTab] = useState('products'); 

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categorySearch, setCategorySearch] = useState('');

  const {
    items, isLoading,
    uploadImage, isUploading,
    createItem, isCreating,
    updateItem, isUpdating,
    deleteItem, isDeleting,
    categories, isCategoriesLoading,
    createCategory, isCreatingCategory,
    updateCategory, isUpdatingCategory,
    deleteCategory, isDeletingCategory,
    restockItem, isRestocking,
    adjustStock, isAdjusting,
    bulkImport, isImporting,
    departments, createSale, isCreatingSale,
  } = useStore();

  // ---- item modal ----
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  // ---- category modal ----
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState(EMPTY_CAT_FORM);
  const [catToDelete, setCatToDelete] = useState(null);

  // ---- stock modals ----
  const [stockModal, setStockModal] = useState(null);   
  const [historyItem, setHistoryItem] = useState(null);

  useEffect(() => () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  const activeCategories = useMemo(() => categories.filter((c) => c.isActive), [categories]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (statusFilter === 'active' && !i.isActive) return false;
      if (statusFilter === 'inactive' && i.isActive) return false;
      if (categoryFilter && i.categoryId !== categoryFilter) return false;
      if (q && !`${i.name} ${i.category || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, statusFilter, categoryFilter]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    return categories.filter((c) =>
      !q || `${c.name} ${c.code} ${c.description || ''}`.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  const activeCount = items.filter((i) => i.isActive).length;

  // ================= item handlers =================
  const openModal = (item = null) => {
    setEditingItem(item);
    setForm(item ? {
      name: item.name,
      categoryId: item.categoryId || '',
      price: String(item.price),
      stock: String(item.stock),
      lowStockAt: String(item.lowStockAt),
    } : EMPTY_FORM);
    setImageFile(null);
    setRemoveImage(false);
    setImagePreview(item?.imageUrl || null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (isCreating || isUpdating || isUploading) return;
    setIsModalOpen(false);
    setEditingItem(null);
  };

  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) return toast.error('Only JPG, PNG or WebP images are allowed');
    if (file.size > MAX_IMAGE_BYTES) return toast.error('Image must be 2 MB or smaller');
    setImageFile(file);
    setRemoveImage(false);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const price = Number(form.price);
    const lowStockAt = form.lowStockAt === '' ? 5 : Number(form.lowStockAt);
    if (Number.isNaN(price) || price < 0) return toast.error('Enter a valid price');
    if (!Number.isInteger(lowStockAt) || lowStockAt < 0) return toast.error('Low-stock level must be a whole number');

    const payload = {
      name: form.name.trim(),
      categoryId: form.categoryId || null,
      price,
      lowStockAt,
    };

    try {
      if (imageFile) {
        const up = await uploadImage(imageFile);
        payload.imageUrl = up.imageUrl;
        payload.imagePublicId = up.imagePublicId;
      } else if (removeImage && editingItem) {
        payload.imageUrl = null;
        payload.imagePublicId = null;
      }

      if (editingItem) {
        await updateItem({ id: editingItem.id, ...payload });
      } else {
        const stock = form.stock === '' ? 0 : Number(form.stock);
        if (!Number.isInteger(stock) || stock < 0) return toast.error('Opening stock must be a whole number');
        await createItem({ ...payload, stock });
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch { /* toasts shown by hook */ }
  };

  const handleRestore = async (item) => {
    try { await updateItem({ id: item.id, isActive: true }); } catch { /* toast shown */ }
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    try { await deleteItem(itemToDelete.id); } catch { /* toast shown */ }
    setItemToDelete(null);
  };

  // ================= category handlers =================
  const openCatModal = (cat = null) => {
    setEditingCat(cat);
    setCatForm(cat ? {
      name: cat.name, code: cat.code, description: cat.description || '', isActive: cat.isActive,
    } : EMPTY_CAT_FORM);
    setIsCatModalOpen(true);
  };

  const handleCatSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: catForm.name.trim(),
      code: catForm.code.trim(),
      description: catForm.description.trim() || null,
      isActive: catForm.isActive,
    };
    try {
      if (editingCat) await updateCategory({ id: editingCat.id, ...payload });
      else await createCategory(payload);
      setIsCatModalOpen(false);
      setEditingCat(null);
    } catch { /* toast shown */ }
  };

  const handleConfirmCatDelete = async () => {
    if (!catToDelete) return;
    try { await deleteCategory(catToDelete.id); } catch { /* toast shown */ }
    setCatToDelete(null);
  };

  // ================= stock handler =================
  const handleStockSubmit = async ({ itemId, quantity, newStock, note }) => {
    try {
      if (stockModal.mode === 'restock') await restockItem({ id: itemId, quantity, note });
      else await adjustStock({ id: itemId, newStock, note });
      setStockModal(null);
    } catch { /* toast shown by hook */ }
  };

  const saving = isUploading || isCreating || isUpdating;

  const dropdownCategories = useMemo(() => {
    const current = editingItem?.categoryId && categories.find((c) => c.id === editingItem.categoryId);
    return current && !current.isActive ? [...activeCategories, current] : activeCategories;
  }, [activeCategories, categories, editingItem]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Campus Store</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage store items, categories, stock, and sales for uniforms, books, and merchandise.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeTab === 'products' && (
            <>
            <ExcelUploadButton
                onUpload={bulkImport}
                isLoading={isImporting}
                title="Import Store Items"
                description="Upload an Excel (.xlsx, .xls) or CSV file. Categories must already exist."
                fields={STORE_IMPORT_FIELDS}
                sampleFileName="store_import_template.xlsx"
              />
              <Button
                variant="outline"
                onClick={() => setStockModal({ mode: 'restock', item: null })}
                className="flex items-center gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
              >
                <ArrowDownRight className="w-4 h-4" />
                Restock
              </Button>
              <Button onClick={() => openModal()} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </>
          )}
          {activeTab === 'categories' && (
            <Button onClick={() => openCatModal()} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-white/10 gap-2">
        <button onClick={() => setActiveTab('products')} className={tabCls(activeTab === 'products')}>
          <Package className="w-4 h-4" />
          Products & Stock
          <span className={countCls}>{activeCount}</span>
        </button>
        <button onClick={() => setActiveTab('sale')} className={tabCls(activeTab === 'sale')}>
          <ShoppingCart className="w-4 h-4" />
          New Sale
        </button>
        <button onClick={() => setActiveTab('history')} className={tabCls(activeTab === 'history')}>
          <Receipt className="w-4 h-4" />
          Sales History
        </button>
        <button onClick={() => setActiveTab('categories')} className={tabCls(activeTab === 'categories')}>
          <Tag className="w-4 h-4" />
          Product Categories
          <span className={countCls}>{categories.length}</span>
        </button>
      </div>

      {/* ===================== PRODUCTS TAB ===================== */}
      {activeTab === 'products' && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={cardCls}>
          <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by name or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={searchCls}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${filterSelectCls} font-medium`}>
                <option value="active">Active Products</option>
                <option value="inactive">Inactive Products</option>
                <option value="all">All Products</option>
              </select>

              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-slate-400" />
                <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={filterSelectCls}>
                  <option value="">All Categories</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <th className={thCls}>Item Name</th>
                  <th className={thCls}>Category</th>
                  <th className={thCls}>Price</th>
                  <th className={thCls}>Current Stock</th>
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {isLoading ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Loading store items...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">
                    {items.length === 0 ? 'No store items yet. Create a category, then click "Add Item".' : 'No items match your filters.'}
                  </td></tr>
                ) : (
                  filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-white/10" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4" />
                            </div>
                          )}
                          <span className="font-bold text-slate-900 dark:text-white">{item.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {item.category ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/40">
                            <Tag className="w-3 h-3" />
                            {item.category}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Uncategorized</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-800 dark:text-slate-200 text-sm">{inr(item.price)}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center font-bold px-2.5 py-1 rounded-full text-xs ${stockStyle(item)}`}>
                          {item.stock <= 0 ? 'Out of stock' : `${item.stock} ${item.stock === 1 ? 'unit' : 'units'}`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {!item.isActive ? (
                            <>
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-500 mr-2">INACTIVE</span>
                              <button
                                onClick={() => setHistoryItem(item)}
                                title="Stock history"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                              >
                                <History className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRestore(item)}
                                title="Make active again"
                                className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors flex items-center gap-1 text-xs font-semibold"
                              >
                                <RotateCcw className="w-4 h-4" />
                                Restore
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setStockModal({ mode: 'restock', item })}
                                title="Restock"
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                              >
                                <ArrowDownRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setStockModal({ mode: 'adjust', item })}
                                title="Adjust stock"
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                              >
                                <SlidersHorizontal className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setHistoryItem(item)}
                                title="Stock history"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                              >
                                <History className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openModal(item)}
                                title="Edit Item"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setItemToDelete(item)}
                                title="Delete or Deactivate Item"
                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {activeTab === 'sale' && (
        <StoreNewSale
          items={items}
          categories={categories}
          departments={departments}
          onCreateSale={createSale}
          isCreating={isCreatingSale}
        />
      )}

      {activeTab === 'history' && <StoreSalesHistory departments={departments} />}

      {/* ===================== CATEGORIES TAB ===================== */}
      {activeTab === 'categories' && (
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className={cardCls}>
          <div className="p-4 border-b border-slate-200 dark:border-white/10">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search categories by name or code..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className={searchCls}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <th className={thCls}>Category</th>
                  <th className={thCls}>Code</th>
                  <th className={thCls}>Description</th>
                  <th className={thCls}>Products Assigned</th>
                  <th className={thCls}>Status</th>
                  <th className={`${thCls} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {isCategoriesLoading ? (
                  <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">Loading categories...</td></tr>
                ) : filteredCategories.length === 0 ? (
                  <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    No categories found. Click "Add Category" to create one.
                  </td></tr>
                ) : (
                  filteredCategories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <Tag className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-slate-900 dark:text-white">{cat.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-lg bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-slate-200">
                          {cat.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {cat.description || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                          <Layers className="w-3 h-3" />
                          {cat.itemCount} items
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {cat.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                            <XCircle className="w-3.5 h-3.5" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openCatModal(cat)}
                            title="Edit Category"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCatToDelete(cat)}
                            title="Delete Category"
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
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
      )}

      {/* ===================== ADD / EDIT ITEM MODAL ===================== */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingItem ? 'Edit Store Item' : 'Add New Store Item'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Item Image</label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-24 h-24 rounded-xl object-cover border border-slate-200 dark:border-white/10" />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    title="Remove image"
                    className="absolute -top-2 -right-2 p-1 rounded-full bg-rose-500 text-white shadow"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 dark:border-white/20 flex items-center justify-center text-slate-400">
                  <ImagePlus className="w-7 h-7" />
                </div>
              )}
              <div>
                <label className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 cursor-pointer transition-colors">
                  <ImagePlus className="w-4 h-4" />
                  {imagePreview ? 'Change image' : 'Choose image'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleFilePick} className="hidden" />
                </label>
                <p className="text-xs text-slate-500 mt-1.5">JPG, PNG or WebP, up to 2 MB.</p>
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Item Name *</label>
            <Input
              required
              placeholder="e.g. Uniform Shirt, Record Notebook"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className={selectCls}
              >
                <option value="">Select Category</option>
                {dropdownCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code}){c.isActive ? '' : ' - Inactive'}
                  </option>
                ))}
              </select>
              {categories.length === 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  No categories yet. Close this and create one in the "Product Categories" tab.
                </p>
              )}
              {editingItem && !editingItem.categoryId && editingItem.category && (
                <p className="text-xs text-slate-500 mt-1">Old category text: "{editingItem.category}". Pick a category to replace it.</p>
              )}
            </div>
            <div>
              <label className={labelCls}>Price (₹) *</label>
              <Input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{editingItem ? 'Current Stock' : 'Opening Stock'}</label>
              {editingItem ? (
                <>
                  <Input disabled readOnly value={form.stock} />
                  <p className="text-xs text-slate-500 mt-1">Change stock using Restock or Adjust in the table.</p>
                </>
              ) : (
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                />
              )}
            </div>
            <div>
              <label className={labelCls}>Low-stock Alert Level</label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.lowStockAt}
                onChange={(e) => setForm({ ...form, lowStockAt: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <Button type="button" variant="outline" onClick={closeModal} disabled={saving}>Cancel</Button>
            <Button type="submit" isLoading={saving}>{editingItem ? 'Update Item' : 'Create Item'}</Button>
          </div>
        </form>
      </Modal>

      {/* ===================== ADD / EDIT CATEGORY MODAL ===================== */}
      <Modal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        title={editingCat ? 'Edit Product Category' : 'Add New Category'}
      >
        <form onSubmit={handleCatSubmit} className="space-y-4">
          <div>
            <label className={labelCls}>Category Name *</label>
            <Input
              required
              placeholder="e.g. Uniform, Stationery, Textbooks"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Category Code * (Unique)</label>
            <Input
              required
              placeholder="e.g. UNI, STAT, BOOK"
              value={catForm.code}
              onChange={(e) => setCatForm({ ...catForm, code: e.target.value.toUpperCase() })}
            />
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea
              rows="3"
              placeholder="Brief description of this category..."
              value={catForm.description}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              className={selectCls}
            />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="storeCatActive"
              checked={catForm.isActive}
              onChange={(e) => setCatForm({ ...catForm, isActive: e.target.checked })}
              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300"
            />
            <label htmlFor="storeCatActive" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Active Category (Available for product assignment)
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <Button type="button" variant="outline" onClick={() => setIsCatModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={isCreatingCategory || isUpdatingCategory}>
              {editingCat ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ===================== DELETE ITEM MODAL ===================== */}
      <Modal
        isOpen={!!itemToDelete}
        onClose={() => !isDeleting && setItemToDelete(null)}
        title="Remove Store Item"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800/30">
            <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{itemToDelete?.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Stock: {itemToDelete?.stock ?? 0} units • {itemToDelete ? inr(itemToDelete.price) : ''}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to remove <strong>"{itemToDelete?.name}"</strong>?
          </p>
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
            <strong>Note:</strong> If this item has been sold before, it will be deactivated (hidden from sales) so old bills stay correct. Items that were never sold are deleted permanently.
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <Button type="button" variant="outline" onClick={() => setItemToDelete(null)} disabled={isDeleting}>Cancel</Button>
            <Button type="button" onClick={handleConfirmDelete} isLoading={isDeleting} className="bg-rose-600 hover:bg-rose-700 text-white">
              Confirm Remove
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===================== DELETE CATEGORY MODAL ===================== */}
      <Modal
        isOpen={!!catToDelete}
        onClose={() => !isDeletingCategory && setCatToDelete(null)}
        title="Delete Product Category"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800/30">
            <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">{catToDelete?.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Code: {catToDelete?.code} • {catToDelete?.itemCount || 0} item(s) assigned
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to delete category <strong>"{catToDelete?.name}"</strong>?
          </p>
          {catToDelete?.itemCount > 0 && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl p-3 text-xs text-rose-800 dark:text-rose-300">
              <strong>Warning:</strong> {catToDelete.itemCount} item(s) use this category. Reassign or remove them first, or mark the category Inactive instead.
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <Button type="button" variant="outline" onClick={() => setCatToDelete(null)} disabled={isDeletingCategory}>Cancel</Button>
            <Button
              type="button"
              onClick={handleConfirmCatDelete}
              isLoading={isDeletingCategory}
              disabled={catToDelete?.itemCount > 0}
              className="bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
            >
              Delete Category
            </Button>
          </div>
        </div>
      </Modal>

      {/* ===================== STOCK MODALS ===================== */}
      <StockModal
        isOpen={!!stockModal}
        mode={stockModal?.mode}
        item={stockModal?.item}
        items={items.filter((i) => i.isActive)}
        onClose={() => setStockModal(null)}
        onSubmit={handleStockSubmit}
        isLoading={isRestocking || isAdjusting}
      />
      <StockHistoryModal item={historyItem} onClose={() => setHistoryItem(null)} />
    </div>
  );
}