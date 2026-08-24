import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  Tag,
  History,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  XCircle,
  Layers,
  ArrowRightLeft,
  Calendar,
  Download,
  RotateCcw,
  Archive
} from 'lucide-react';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useInventory } from '../../../hooks/useInventory';
import { ExcelUploadButton } from '../../../components/ui/ExcelUploadButton';

const INVENTORY_IMPORT_FIELDS = [
  { name: 'Item_Name', required: true, type: 'String', description: 'Product or item title', example: 'A4 Ruled Notebook' },
  { name: 'Item_Code', required: false, type: 'String', description: 'SKU or item identifier', example: 'STAT-001' },
  { name: 'Category', required: false, type: 'String', description: 'Category Name or Code (e.g. Stationery, STAT)', example: 'Stationery' },
  { name: 'Opening_Stock', required: false, type: 'Integer', description: 'Initial stock on hand (>= 0)', example: '100' },
  { name: 'Department_Location', required: false, type: 'String', description: 'Campus location or lab', example: 'Science Block Lab 2' },
  { name: 'Unit_of_Measure', required: false, type: 'String', description: 'Count units (Pcs, Units, Boxes)', example: 'Boxes' },
  { name: 'Reorder_Level', required: false, type: 'Integer', description: 'Minimum stock alert threshold', example: '15' },
  { name: 'Vendor_Name', required: false, type: 'String', description: 'Supplier or distributor', example: 'National Paper Mills' },
  { name: 'Purchase_Date', required: false, type: 'Date (YYYY-MM-DD)', description: 'Date item was purchased', example: '2026-08-15' },
  { name: 'Warranty_Expiry', required: false, type: 'Date (YYYY-MM-DD)', description: 'Warranty end date if applicable', example: '2027-08-15' },
  { name: 'Asset_Tag_No', required: false, type: 'String', description: 'Internal barcode or asset tag', example: 'AST-2026-89' },
  { name: 'Remarks', required: false, type: 'String', description: 'Extra specifications or notes', example: 'Store in dry place' },
];

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState('products'); // 'products' | 'categories' | 'audit-logs'
  const [auditSubTab, setAuditSubTab] = useState('ALL'); // 'ALL' | 'INBOUND' | 'OUTBOUND'

  // Search and Filter states
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('active'); // 'active' | 'archived' | 'all'
  
  const [categorySearch, setCategorySearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState('');

  // Hook instance with active filters
  const {
    items,
    isLoading,
    createItem,
    updateItem,
    deleteItem,
    isCreating,
    isUpdating,
    isDeleting,
    bulkImport,
    isImporting,

    categories,
    isCategoriesLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    isCreatingCategory,
    isUpdatingCategory,
    isDeletingCategory,

    auditLogs,
    isAuditLogsLoading,
    recordMovement,
    isRecordingMovement
  } = useInventory({
    categoryId: selectedCategoryFilter || undefined,
    search: productSearch || undefined,
    status: productStatusFilter !== 'all' ? productStatusFilter : undefined,
    includeArchived: productStatusFilter === 'all' ? true : undefined,
    auditLogs: {
      movementType: auditSubTab === 'ALL' ? undefined : auditSubTab,
      categoryId: auditCategoryFilter || undefined,
      search: auditSearch || undefined
    }
  });

  // Product Modal State
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [itemFormData, setItemFormData] = useState({
    name: '',
    sku: '',
    categoryId: '',
    quantity: 0,
    departmentLocation: '',
    unitOfMeasure: '',
    reorderLevel: '',
    vendorName: '',
    assetTagNo: '',
    remarks: ''
  });

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    code: '',
    description: '',
    isActive: true
  });

  // Stock Movement Modal State
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementFormData, setMovementFormData] = useState({
    inventoryItemId: '',
    movementType: 'INBOUND',
    quantity: 1,
    reason: 'Purchase',
    notes: '',
    referenceType: '',
    referenceId: ''
  });

  // Deletion Confirmation States (Popup Modals)
  const [itemToDelete, setItemToDelete] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // -------------------------------------------------------------
  // HANDLERS: PRODUCTS
  // -------------------------------------------------------------
  const handleOpenItemModal = (item = null) => {
    if (item) {
      setEditingItem(item);
      setItemFormData({
        name: item.name,
        sku: item.sku || '',
        categoryId: item.categoryId || '',
        quantity: item.quantity,
        departmentLocation: item.departmentLocation || '',
        unitOfMeasure: item.unitOfMeasure || '',
        reorderLevel: item.reorderLevel !== null ? String(item.reorderLevel) : '',
        vendorName: item.vendorName || '',
        assetTagNo: item.assetTagNo || '',
        remarks: item.remarks || ''
      });
    } else {
      setEditingItem(null);
      setItemFormData({
        name: '',
        sku: '',
        categoryId: '',
        quantity: 0,
        departmentLocation: '',
        unitOfMeasure: '',
        reorderLevel: '',
        vendorName: '',
        assetTagNo: '',
        remarks: ''
      });
    }
    setIsItemModalOpen(true);
  };

  const handleItemSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...itemFormData,
      categoryId: itemFormData.categoryId || null,
      quantity: Number(itemFormData.quantity) || 0,
      reorderLevel: itemFormData.reorderLevel ? Number(itemFormData.reorderLevel) : null
    };

    if (editingItem) {
      await updateItem({ id: editingItem.id, ...payload });
    } else {
      await createItem(payload);
    }
    setIsItemModalOpen(false);
    setEditingItem(null);
  };

  const handleItemDelete = async (item) => {
    const confirmMsg = `Are you sure you want to remove '${item.name}'? If it has historical stock movements, it will be safely archived to preserve audit records.`;
    if (window.confirm(confirmMsg)) {
      await deleteItem(item.id);
    }
  };

  const handleRestoreItem = async (item) => {
    if (window.confirm(`Restore '${item.name}' back to active inventory?`)) {
      await updateItem({ id: item.id, isArchived: false, isActive: true });
    }
  };

  // -------------------------------------------------------------
  // HANDLERS: CATEGORIES
  // -------------------------------------------------------------
  const handleOpenCategoryModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryFormData({
        name: cat.name,
        code: cat.code,
        description: cat.description || '',
        isActive: cat.isActive !== false
      });
    } else {
      setEditingCategory(null);
      setCategoryFormData({
        name: '',
        code: '',
        description: '',
        isActive: true
      });
    }
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    if (editingCategory) {
      await updateCategory({ id: editingCategory.id, ...categoryFormData });
    } else {
      await createCategory(categoryFormData);
    }
    setIsCategoryModalOpen(false);
    setEditingCategory(null);
  };

  // -------------------------------------------------------------
  // HANDLERS: MOVEMENTS
  // -------------------------------------------------------------
  const handleOpenMovementModal = (item = null, defaultType = 'INBOUND') => {
    setMovementFormData({
      inventoryItemId: item ? item.id : (items[0]?.id || ''),
      movementType: defaultType,
      quantity: 1,
      reason: defaultType === 'INBOUND' ? 'Purchase' : 'Department Issue',
      notes: '',
      referenceType: '',
      referenceId: ''
    });
    setIsMovementModalOpen(true);
  };

  const handleMovementSubmit = async (e) => {
    e.preventDefault();
    await recordMovement({
      ...movementFormData,
      quantity: Number(movementFormData.quantity)
    });
    setIsMovementModalOpen(false);
  };

  // -------------------------------------------------------------
  // HANDLER: EXPORT AUDIT LOGS
  // -------------------------------------------------------------
  const handleExportAuditLogs = () => {
    if (!auditLogs || auditLogs.length === 0) {
      toast.error('No audit log records available to export.');
      return;
    }

    try {
      const exportRows = auditLogs.map(log => ({
        'Log_ID': log.id,
        'Date_Time': new Date(log.createdAt).toLocaleString(),
        'Movement_Type': log.movementType,
        'Quantity': log.movementType === 'INBOUND' ? `+${log.quantity}` : `-${log.quantity}`,
        'Product_Name': log.inventoryItem?.name || 'Deleted Item',
        'SKU': log.inventoryItem?.sku || '',
        'Category': log.category?.name || '',
        'Reason': log.reason || '',
        'Notes': log.notes || '',
        'Reference_Type': log.referenceType || '',
        'Reference_ID': log.referenceId || '',
        'Performed_By': log.performedBy?.name || log.performedBy?.email || 'System'
      }));

      const ws = XLSX.utils.json_to_sheet(exportRows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Audit_Logs');
      const timeStamp = new Date().toISOString().slice(0, 10);
      const fileName = `inventory_audit_logs_${auditSubTab.toLowerCase()}_${timeStamp}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success(`Exported ${auditLogs.length} audit log record(s) to Excel!`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to export audit logs.');
    }
  };

  // Filtered categories for search
  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
    c.code.toLowerCase().includes(categorySearch.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(categorySearch.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Inventory Management</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Manage products, categories, and track inbound/outbound stock audit history.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeTab === 'products' && (
            <>
              <ExcelUploadButton 
                onUpload={bulkImport} 
                isLoading={isImporting} 
                title="Import Products into Inventory"
                description="Upload an Excel sheet (.xlsx, .xls) or CSV file. The columns below are supported for batch ingestion."
                fields={INVENTORY_IMPORT_FIELDS}
                sampleFileName="inventory_import_template.xlsx"
              />
              <Button onClick={() => handleOpenMovementModal(null, 'INBOUND')} variant="outline" className="flex items-center gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
                <ArrowDownRight className="w-4 h-4" />
                Inbound Stock
              </Button>
              <Button onClick={() => handleOpenMovementModal(null, 'OUTBOUND')} variant="outline" className="flex items-center gap-2 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10">
                <ArrowUpRight className="w-4 h-4" />
                Outbound Stock
              </Button>
              <Button onClick={() => handleOpenItemModal()} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add Item
              </Button>
            </>
          )}

          {activeTab === 'categories' && (
            <Button onClick={() => handleOpenCategoryModal()} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          )}

          {activeTab === 'audit-logs' && (
            <>
              <Button
                onClick={handleExportAuditLogs}
                variant="outline"
                disabled={isAuditLogsLoading || auditLogs.length === 0}
                className="flex items-center gap-2 border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5"
              >
                <Download className="w-4 h-4" />
                Export Logs (.xlsx)
              </Button>
              <Button onClick={() => handleOpenMovementModal()} className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4" />
                Record Movement
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex border-b border-slate-200 dark:border-white/10 gap-2">
        <button
          onClick={() => setActiveTab('products')}
          className={`flex items-center gap-2 pb-3 px-4 font-semibold text-sm transition-colors relative ${
            activeTab === 'products'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Package className="w-4 h-4" />
          Products & Stock
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-medium">
            {items.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 pb-3 px-4 font-semibold text-sm transition-colors relative ${
            activeTab === 'categories'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Tag className="w-4 h-4" />
          Product Categories
          <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 font-medium">
            {categories.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit-logs')}
          className={`flex items-center gap-2 pb-3 px-4 font-semibold text-sm transition-colors relative ${
            activeTab === 'audit-logs'
              ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-600 dark:border-primary-400'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          Audit Logs
        </button>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: PRODUCTS TABLE                                         */}
      {/* ============================================================= */}
      {activeTab === 'products' && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by name, SKU, vendor..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white text-sm"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={productStatusFilter}
                onChange={(e) => setProductStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 text-sm outline-none focus:ring-2 focus:ring-primary-500 font-medium"
              >
                <option value="active">Active Products</option>
                <option value="archived">Archived Products</option>
                <option value="all">All Products</option>
              </select>

              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({cat.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Item Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">SKU</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Current Stock</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {isLoading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">Loading inventory...</td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No inventory items found.</td>
                  </tr>
                ) : (
                  items.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400 flex items-center justify-center shrink-0 font-bold">
                            <Package className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white block">{item.name}</span>
                            {item.departmentLocation && (
                              <span className="text-xs text-slate-500">{item.departmentLocation}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono text-xs">{item.sku || '-'}</td>
                      <td className="px-6 py-4">
                        {item.productCategory ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800/40">
                            <Tag className="w-3 h-3" />
                            {item.productCategory.name}
                          </span>
                        ) : item.category ? (
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                            {item.category}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Uncategorized</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center font-bold px-2.5 py-1 rounded-full text-xs ${
                          item.quantity <= (item.reorderLevel || 5)
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        }`}>
                          {item.quantity} {item.unitOfMeasure || 'units'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.isArchived ? (
                            <>
                              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-white/10 text-slate-500 mr-2">
                                ARCHIVED
                              </span>
                              <button
                                onClick={() => handleRestoreItem(item)}
                                title="Restore to Active Stock"
                                className="p-1.5 rounded-lg text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors flex items-center gap-1 text-xs font-semibold"
                              >
                                <RotateCcw className="w-4 h-4" />
                                Restore
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleOpenMovementModal(item, 'INBOUND')}
                                title="Add Inbound Stock"
                                className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                              >
                                <ArrowDownRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenMovementModal(item, 'OUTBOUND')}
                                title="Issue Outbound Stock"
                                className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors"
                              >
                                <ArrowUpRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleOpenItemModal(item)}
                                title="Edit Item"
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setItemToDelete(item)}
                                title="Delete or Archive Item"
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

      {/* ============================================================= */}
      {/* TAB 2: CATEGORIES TABLE                                       */}
      {/* ============================================================= */}
      {activeTab === 'categories' && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="p-4 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search categories by name or code..."
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Code</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Description</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Products Assigned</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {isCategoriesLoading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">Loading categories...</td>
                  </tr>
                ) : filteredCategories.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">No categories found. Click "Add Category" to create one.</td>
                  </tr>
                ) : (
                  filteredCategories.map(cat => (
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
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400">
                            <XCircle className="w-3.5 h-3.5" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenCategoryModal(cat)}
                            title="Edit Category"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setCategoryToDelete(cat)}
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

      {/* ============================================================= */}
      {/* TAB 3: AUDIT LOGS TABLE                                       */}
      {/* ============================================================= */}
      {activeTab === 'audit-logs' && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-[#0A0F1C] border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden"
        >
          {/* Sub-nav filters */}
          <div className="p-4 border-b border-slate-200 dark:border-white/10 flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
            {/* Movement Type Toggle Pills */}
            <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl gap-1">
              <button
                onClick={() => setAuditSubTab('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  auditSubTab === 'ALL'
                    ? 'bg-white dark:bg-white/20 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                All Movements
              </button>
              <button
                onClick={() => setAuditSubTab('INBOUND')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  auditSubTab === 'INBOUND'
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" />
                Inbound (Stock Added)
              </button>
              <button
                onClick={() => setAuditSubTab('OUTBOUND')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  auditSubTab === 'OUTBOUND'
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Outbound (Stock Issued)
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search logs by item or reason..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <select
                value={auditCategoryFilter}
                onChange={(e) => setAuditCategoryFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-300 text-xs outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                onClick={handleExportAuditLogs}
                variant="outline"
                size="sm"
                disabled={isAuditLogsLoading || auditLogs.length === 0}
                className="shrink-0 flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10"
              >
                <Download className="w-3.5 h-3.5" />
                Export ({auditLogs.length})
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Date & Time</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Type</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Product Name</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Category</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Quantity</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Reason / Notes</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Performed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {isAuditLogsLoading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-500">Loading audit trail...</td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-slate-500">No audit movements recorded yet.</td>
                  </tr>
                ) : (
                  auditLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400 font-mono">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {log.movementType === 'INBOUND' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            INBOUND
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            OUTBOUND
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-900 dark:text-white block">
                          {log.inventoryItem?.name || 'Deleted Item'}
                        </span>
                        {log.inventoryItem?.sku && (
                          <span className="text-xs font-mono text-slate-400">{log.inventoryItem.sku}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {log.category ? (
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300">
                            {log.category.name}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 font-mono font-bold text-sm">
                        {log.movementType === 'INBOUND' ? (
                          <span className="text-emerald-600 dark:text-emerald-400">+{log.quantity}</span>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">-{log.quantity}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs block">
                          {log.reason || '-'}
                        </span>
                        {log.notes && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 truncate block">
                            {log.notes}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                        {log.performedBy?.name || log.performedBy?.email || 'System'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* ============================================================= */}
      {/* MODAL 1: ADD / EDIT PRODUCT ITEM                              */}
      {/* ============================================================= */}
      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
      >
        <form onSubmit={handleItemSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Item Name *
            </label>
            <Input
              required
              placeholder="e.g. A4 Notebook, HDMI Cable"
              value={itemFormData.name}
              onChange={(e) => setItemFormData({ ...itemFormData, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Item Code / SKU
              </label>
              <Input
                placeholder="e.g. STAT-001"
                value={itemFormData.sku}
                onChange={(e) => setItemFormData({ ...itemFormData, sku: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={itemFormData.categoryId}
                onChange={(e) => setItemFormData({ ...itemFormData, categoryId: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white text-sm"
              >
                <option value="">Select Category (Optional)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} ({cat.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {editingItem ? 'Quantity' : 'Opening Stock'}
            </label>
            <Input
              type="number"
              min="0"
              value={itemFormData.quantity}
              onChange={(e) => setItemFormData({ ...itemFormData, quantity: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Department / Location
              </label>
              <Input
                placeholder="e.g. Science Lab, Room 204"
                value={itemFormData.departmentLocation}
                onChange={(e) => setItemFormData({ ...itemFormData, departmentLocation: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Unit of Measure
              </label>
              <Input
                placeholder="e.g. Units, Boxes, Pcs"
                value={itemFormData.unitOfMeasure}
                onChange={(e) => setItemFormData({ ...itemFormData, unitOfMeasure: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <Button type="button" variant="outline" onClick={() => setIsItemModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating || isUpdating}>
              {editingItem ? 'Update Item' : 'Create Item'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 2: ADD / EDIT CATEGORY                                  */}
      {/* ============================================================= */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={editingCategory ? 'Edit Product Category' : 'Add New Category'}
      >
        <form onSubmit={handleCategorySubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category Name *
            </label>
            <Input
              required
              placeholder="e.g. Stationery, Laboratory Equipment"
              value={categoryFormData.name}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Category Code * (Unique)
            </label>
            <Input
              required
              placeholder="e.g. STAT, LAB, ELEC"
              value={categoryFormData.code}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, code: e.target.value.toUpperCase() })}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows="3"
              placeholder="Brief description of this category..."
              value={categoryFormData.description}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white text-sm"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveCategory"
              checked={categoryFormData.isActive}
              onChange={(e) => setCategoryFormData({ ...categoryFormData, isActive: e.target.checked })}
              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300"
            />
            <label htmlFor="isActiveCategory" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Active Category (Available for product assignment)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <Button type="button" variant="outline" onClick={() => setIsCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreatingCategory || isUpdatingCategory}>
              {editingCategory ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 3: RECORD INBOUND / OUTBOUND STOCK MOVEMENT             */}
      {/* ============================================================= */}
      <Modal
        isOpen={isMovementModalOpen}
        onClose={() => setIsMovementModalOpen(false)}
        title="Record Stock Movement"
      >
        <form onSubmit={handleMovementSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Select Product *
            </label>
            <select
              required
              value={movementFormData.inventoryItemId}
              onChange={(e) => setMovementFormData({ ...movementFormData, inventoryItemId: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white text-sm"
            >
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (Stock: {i.quantity}) {i.sku ? `- [${i.sku}]` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Movement Type *
              </label>
              <select
                value={movementFormData.movementType}
                onChange={(e) => setMovementFormData({
                  ...movementFormData,
                  movementType: e.target.value,
                  reason: e.target.value === 'INBOUND' ? 'Purchase' : 'Department Issue'
                })}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white text-sm"
              >
                <option value="INBOUND">Inbound (+ Add Stock)</option>
                <option value="OUTBOUND">Outbound (- Issue/Deduct)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Quantity *
              </label>
              <Input
                required
                type="number"
                min="1"
                value={movementFormData.quantity}
                onChange={(e) => setMovementFormData({ ...movementFormData, quantity: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Reason *
            </label>
            <select
              value={movementFormData.reason}
              onChange={(e) => setMovementFormData({ ...movementFormData, reason: e.target.value })}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-slate-900 dark:text-white text-sm mb-2"
            >
              {movementFormData.movementType === 'INBOUND' ? (
                <>
                  <option value="Purchase">Purchase</option>
                  <option value="Supplier Delivery">Supplier Delivery</option>
                  <option value="Return to Stock">Return to Stock</option>
                  <option value="Opening Stock">Opening Stock</option>
                  <option value="Manual Adjustment">Manual Adjustment</option>
                </>
              ) : (
                <>
                  <option value="Department Issue">Department Issue</option>
                  <option value="Internal Consumption">Internal Consumption</option>
                  <option value="Damaged / Expired">Damaged / Expired</option>
                  <option value="Lost / Missing">Lost / Missing</option>
                  <option value="Manual Adjustment">Manual Adjustment</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Notes & Reference (Optional)
            </label>
            <Input
              placeholder="e.g. Issued to Prof. Sharma for CS Lab 3"
              value={movementFormData.notes}
              onChange={(e) => setMovementFormData({ ...movementFormData, notes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <Button type="button" variant="outline" onClick={() => setIsMovementModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isRecordingMovement}>
              Confirm Movement
            </Button>
          </div>
        </form>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 4: REMOVE / ARCHIVE ITEM CONFIRMATION POPUP             */}
      {/* ============================================================= */}
      <Modal
        isOpen={!!itemToDelete}
        onClose={() => !isDeleting && setItemToDelete(null)}
        title="Remove Inventory Item"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800/30">
            <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {itemToDelete?.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Current Stock: {itemToDelete?.quantity || 0} {itemToDelete?.unitOfMeasure || 'units'} {itemToDelete?.sku ? `• SKU: ${itemToDelete.sku}` : ''}
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to remove <strong>"{itemToDelete?.name}"</strong> from your inventory?
          </p>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
            <strong>Note:</strong> If this product has historical stock movements, it will be safely archived and hidden from active stock to preserve ledger audit records. Items with zero audit records will be permanently deleted.
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setItemToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (itemToDelete) {
                  await deleteItem(itemToDelete.id);
                  setItemToDelete(null);
                }
              }}
              isLoading={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Confirm Remove
            </Button>
          </div>
        </div>
      </Modal>

      {/* ============================================================= */}
      {/* MODAL 5: DELETE CATEGORY CONFIRMATION POPUP                   */}
      {/* ============================================================= */}
      <Modal
        isOpen={!!categoryToDelete}
        onClose={() => !isDeletingCategory && setCategoryToDelete(null)}
        title="Delete Product Category"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-800/30">
            <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {categoryToDelete?.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Code: {categoryToDelete?.code} • {categoryToDelete?.itemCount || 0} product(s) assigned
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-600 dark:text-slate-300">
            Are you sure you want to delete category <strong>"{categoryToDelete?.name}"</strong>?
          </p>

          {categoryToDelete?.itemCount > 0 && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 rounded-xl p-3 text-xs text-rose-800 dark:text-rose-300">
              <strong>Warning:</strong> This category has {categoryToDelete.itemCount} assigned product(s). You must reassign or remove those products before this category can be deleted.
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCategoryToDelete(null)}
              disabled={isDeletingCategory}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                if (categoryToDelete) {
                  await deleteCategory(categoryToDelete.id);
                  setCategoryToDelete(null);
                }
              }}
              isLoading={isDeletingCategory}
              disabled={categoryToDelete?.itemCount > 0}
              className="bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50"
            >
              Delete Category
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
