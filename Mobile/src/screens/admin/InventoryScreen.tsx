import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrowDownRight, ArrowRightLeft, ArrowUpRight, Download, Edit2, History, Package, Plus, RotateCcw, Tag, Trash2 } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useInventory } from '../../hooks/useInventory';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SearchBar, useDebouncedValue } from '../../components/ui/SearchBar';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Pagination } from '../../components/ui/Pagination';
import { SheetModal } from '../../components/ui/SheetModal';
import { ExcelUploadButton } from '../../components/ui/ExcelUploadButton';
import { toast } from '../../utils/toast';
import { saveBase64File } from '../../components/ui/ExcelUploadButton';
import { fontSize, fontWeight } from '../../theme/typography';


const IMPORT_FIELDS = [
  { name: 'Item_Name', required: true, example: 'A4 Ruled Notebook' },
  { name: 'Item_Code', example: 'STAT-001' },
  { name: 'Category', example: 'Stationery' },
  { name: 'Opening_Stock', example: '100' },
  { name: 'Department_Location', example: 'Science Block Lab 2' },
  { name: 'Unit_of_Measure', example: 'Boxes' },
  { name: 'Reorder_Level', example: '15' },
  { name: 'Vendor_Name', example: 'National Paper Mills' },
  { name: 'Purchase_Date', example: '2026-08-15' },
  { name: 'Warranty_Expiry', example: '2027-08-15' },
  { name: 'Asset_Tag_No', example: 'AST-2026-89' },
  { name: 'Remarks', example: 'Store in dry place' },
];
const INBOUND_REASONS = ['Purchase', 'Supplier Delivery', 'Return to Stock', 'Opening Stock', 'Manual Adjustment'];
const OUTBOUND_REASONS = ['Department Issue', 'Internal Consumption', 'Damaged / Expired', 'Lost / Missing', 'Manual Adjustment'];

const blankItem = { name: '', sku: '', categoryId: '', quantity: '0', departmentLocation: '', unitOfMeasure: '', reorderLevel: '', vendorName: '', assetTagNo: '', remarks: '' };
const blankCategory = { name: '', code: '', description: '', isActive: true };
const blankMovement = { inventoryItemId: '', movementType: 'INBOUND', quantity: '1', reason: 'Purchase', notes: '' };

type Tab = 'products' | 'categories' | 'audit-logs';

/** Web: pages/admin/inventory/InventoryDashboard.jsx */
export default function InventoryScreen() {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [auditSubTab, setAuditSubTab] = useState('ALL');
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [categorySearch, setCategorySearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditCategory, setAuditCategory] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pg, setPg] = useState({ products: 1, categories: 1, audit: 1 });
  const [pageSize, setPageSize] = useState(10);
  const setPageFor = (k: 'products' | 'categories' | 'audit') => (n: number) => setPg((p) => ({ ...p, [k]: n }));
  const page = (arr: any[], k: 'products' | 'categories' | 'audit') => arr.slice((pg[k] - 1) * pageSize, pg[k] * pageSize);
  const pager = (total: number, k: 'products' | 'categories' | 'audit') => (
    <Pagination totalItems={total} currentPage={pg[k]} pageSize={pageSize} onPageChange={setPageFor(k)} onPageSizeChange={(n) => { setPageSize(n); setPg({ products: 1, categories: 1, audit: 1 }); }} />
  );

  const dProduct = useDebouncedValue(productSearch, 400);
  const dAudit = useDebouncedValue(auditSearch, 400);

  const inv = useInventory(
    {
      categoryId: categoryFilter || undefined,
      search: dProduct || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      includeArchived: statusFilter === 'all' ? true : undefined,
      auditLogs: { movementType: auditSubTab === 'ALL' ? undefined : auditSubTab, categoryId: auditCategory || undefined, search: dAudit || undefined },
    },
    activeTab,
  );
  const { items, categories, auditLogs } = inv;

  const [itemOpen, setItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState<any>(blankItem);
  const [catOpen, setCatOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [catForm, setCatForm] = useState<any>(blankCategory);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveForm, setMoveForm] = useState<any>(blankMovement);

  const setI = (k: string) => (v: string) => setItemForm((p: any) => ({ ...p, [k]: v }));
  const setC = (k: string) => (v: any) => setCatForm((p: any) => ({ ...p, [k]: v }));
  const setM = (k: string) => (v: string) => setMoveForm((p: any) => ({ ...p, [k]: v }));

  const openItem = (item: any = null) => {
    setEditingItem(item);
    setItemForm(item ? {
      name: item.name, sku: item.sku || '', categoryId: item.categoryId || '', quantity: String(item.quantity ?? 0),
      departmentLocation: item.departmentLocation || '', unitOfMeasure: item.unitOfMeasure || '',
      reorderLevel: item.reorderLevel !== null && item.reorderLevel !== undefined ? String(item.reorderLevel) : '',
      vendorName: item.vendorName || '', assetTagNo: item.assetTagNo || '', remarks: item.remarks || '',
    } : blankItem);
    setItemOpen(true);
  };
  const submitItem = async () => {
    if (!itemForm.name.trim()) { toast.error('Item name is required'); return; }
    const payload = { ...itemForm, categoryId: itemForm.categoryId || null, quantity: Number(itemForm.quantity) || 0, reorderLevel: itemForm.reorderLevel ? Number(itemForm.reorderLevel) : null };
    try {
      if (editingItem) await inv.updateItem({ id: editingItem.id, ...payload });
      else await inv.createItem(payload);
      setItemOpen(false);
      setEditingItem(null);
    } catch { /* toast shown */ }
  };
  const removeItem = async (item: any) => {
    if (await confirm({ title: 'Remove Product', message: `Remove '${item.name}'? If it has stock movements it will be archived to preserve audit records.`, confirmText: 'Remove', isDestructive: true })) {
      await inv.deleteItem(item.id).catch(() => {});
    }
  };
  const restoreItem = async (item: any) => {
    if (await confirm({ title: 'Restore Product', message: `Restore '${item.name}' back to active inventory?`, confirmText: 'Restore', isDestructive: false })) {
      await inv.updateItem({ id: item.id, isArchived: false, isActive: true }).catch(() => {});
    }
  };

  const openCat = (cat: any = null) => {
    setEditingCat(cat);
    setCatForm(cat ? { name: cat.name, code: cat.code, description: cat.description || '', isActive: cat.isActive !== false } : blankCategory);
    setCatOpen(true);
  };
  const submitCat = async () => {
    if (!catForm.name.trim() || !catForm.code.trim()) { toast.error('Category name and code are required'); return; }
    try {
      if (editingCat) await inv.updateCategory({ id: editingCat.id, ...catForm });
      else await inv.createCategory(catForm);
      setCatOpen(false);
      setEditingCat(null);
    } catch { /* toast shown */ }
  };
  const removeCat = async (cat: any) => {
    if (await confirm({ title: 'Delete Category', message: `Delete category '${cat.name}'?`, confirmText: 'Delete', isDestructive: true })) {
      await inv.deleteCategory(cat.id).catch(() => {});
    }
  };

  const openMove = (item: any = null, type = 'INBOUND') => {
    setMoveForm({ inventoryItemId: item ? item.id : items[0]?.id || '', movementType: type, quantity: '1', reason: type === 'INBOUND' ? 'Purchase' : 'Department Issue', notes: '' });
    setMoveOpen(true);
  };
  const submitMove = async () => {
    if (!moveForm.inventoryItemId) { toast.error('Select a product'); return; }
    if (!(Number(moveForm.quantity) > 0)) { toast.error('Quantity must be greater than 0'); return; }
    try {
      await inv.recordMovement({ ...moveForm, quantity: Number(moveForm.quantity) });
      setMoveOpen(false);
    } catch { /* toast shown */ }
  };

  const exportAudit = async () => {
    if (!auditLogs.length) { toast.error('No audit log records available to export.'); return; }
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const XLSX = require('xlsx');
      const rowsOut = auditLogs.map((log: any) => ({
        Log_ID: log.id, Date_Time: new Date(log.createdAt).toLocaleString(), Movement_Type: log.movementType,
        Quantity: log.movementType === 'INBOUND' ? `+${log.quantity}` : `-${log.quantity}`,
        Product_Name: log.inventoryItem?.name || 'Deleted Item', SKU: log.inventoryItem?.sku || '',
        Category: log.category?.name || '', Reason: log.reason || '', Notes: log.notes || '',
        Performed_By: log.performedBy?.name || log.performedBy?.email || log.createdBy?.name || '',
      }));
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rowsOut), 'Audit Logs');
      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      await saveBase64File(`inventory_audit_logs_${new Date().toISOString().slice(0, 10)}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', base64);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export audit logs');
    }
  };

  const catOptions = [{ value: '', label: 'All Categories' }, ...categories.map((c: any) => ({ value: c.id, label: `${c.name} (${c.code})` }))];
  const filteredCats = categories.filter((c: any) => !categorySearch.trim() || `${c.name} ${c.code}`.toLowerCase().includes(categorySearch.trim().toLowerCase()));

  const Pill = ({ active, label, onPress, icon: Icon, count }: any) => (
    <Pressable onPress={onPress} style={[styles.pill, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}>
      {Icon ? <Icon size={14} color={active ? colors.onPrimary : colors.textMuted} /> : null}
      <Text style={{ color: active ? colors.onPrimary : colors.textMuted, fontSize: 12, fontWeight: fontWeight.bold, marginLeft: Icon ? 6 : 0 }}>{label}{count !== undefined ? ` (${count})` : ''}</Text>
    </Pressable>
  );

  const loader = <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => { setIsRefreshing(true); await inv.refetch(); setIsRefreshing(false); }}>
      <Text style={[styles.title, { color: colors.text }]}>Inventory Management</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Track products, categories and stock movements.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll} contentContainerStyle={styles.rowContent}>
        <Pill active={activeTab === 'products'} label="Products & Stock" icon={Package} count={items.length} onPress={() => setActiveTab('products')} />
        <Pill active={activeTab === 'categories'} label="Categories" icon={Tag} count={categories.length} onPress={() => setActiveTab('categories')} />
        <Pill active={activeTab === 'audit-logs'} label="Audit Logs" icon={History} onPress={() => setActiveTab('audit-logs')} />
      </ScrollView>

      {activeTab === 'products' ? (
        <>
          <View style={styles.actions}>
            <Button title="Add Item" size="sm" fullWidth={false} icon={Plus} onPress={() => openItem()} />
            <ExcelUploadButton label="Import" title="Import Products into Inventory" fields={IMPORT_FIELDS} sampleFileName="inventory_import_template.xlsx" onUpload={inv.bulkImport} isLoading={inv.isImporting} />
          </View>
          <View style={styles.actions}>
            <Button title="Inbound" size="sm" fullWidth={false} variant="outline" icon={ArrowDownRight} onPress={() => openMove(null, 'INBOUND')} />
            <Button title="Outbound" size="sm" fullWidth={false} variant="outline" icon={ArrowUpRight} onPress={() => openMove(null, 'OUTBOUND')} />
          </View>
          <SearchBar value={productSearch} onChangeText={setProductSearch} placeholder="Search products by name, SKU, vendor..." style={styles.search} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll} contentContainerStyle={styles.rowContent}>
            {[['active', 'Active'], ['archived', 'Archived'], ['all', 'All']].map(([v, l]) => (
              <Pill key={v} active={statusFilter === v} label={l} onPress={() => setStatusFilter(v)} />
            ))}
          </ScrollView>
          <Select value={categoryFilter} onChange={setCategoryFilter} options={catOptions} placeholder="All Categories" />

          {inv.isLoading ? loader : items.length === 0 ? (
            <EmptyState icon={Package} title="No products found" message="Add a product or change the filters." />
          ) : (
            page(items, 'products').map((item: any) => {
              const low = item.quantity <= (item.reorderLevel || 5);
              return (
                <Card key={item.id} style={styles.card}>
                  <View style={styles.top}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
                      <Text style={[styles.meta, { color: colors.textSubtle }]} numberOfLines={1}>{item.sku || '-'}{item.departmentLocation ? ` • ${item.departmentLocation}` : ''}</Text>
                    </View>
                    <Badge label={`${item.quantity} ${item.unitOfMeasure || 'units'}`} tone={item.isArchived ? 'neutral' : low ? 'danger' : 'success'} />
                  </View>
                  <View style={styles.badgeRow}>
                    <Badge label={item.productCategory?.name || item.category || 'Uncategorized'} tone="info" small />
                    {item.isArchived ? <Badge label="Archived" tone="neutral" small /> : null}
                  </View>
                  <View style={styles.cardActions}>
                    {item.isArchived ? (
                      <Pressable onPress={() => restoreItem(item)} style={[styles.actionBtn, { borderColor: colors.border }]}><RotateCcw size={15} color={colors.success} /><Text style={[styles.actionText, { color: colors.text }]}>Restore</Text></Pressable>
                    ) : (
                      <>
                        <Pressable onPress={() => openMove(item, 'INBOUND')} style={[styles.actionBtn, { borderColor: colors.border }]}><ArrowRightLeft size={15} color={colors.info} /><Text style={[styles.actionText, { color: colors.text }]}>Stock</Text></Pressable>
                        <Pressable onPress={() => openItem(item)} style={[styles.actionBtn, { borderColor: colors.border }]}><Edit2 size={15} color={colors.primary} /><Text style={[styles.actionText, { color: colors.text }]}>Edit</Text></Pressable>
                        <Pressable onPress={() => removeItem(item)} style={[styles.actionBtn, { borderColor: colors.border }]}><Trash2 size={15} color={colors.danger} /><Text style={[styles.actionText, { color: colors.text }]}>Delete</Text></Pressable>
                      </>
                    )}
                  </View>
                </Card>
              );
            })
          )}
          {!inv.isLoading && items.length > 0 ? pager(items.length, 'products') : null}
        </>
      ) : null}

      {activeTab === 'categories' ? (
        <>
          <View style={styles.actions}><Button title="Add Category" size="sm" fullWidth={false} icon={Plus} onPress={() => openCat()} /></View>
          <SearchBar value={categorySearch} onChangeText={setCategorySearch} placeholder="Search categories..." style={styles.search} />
          {inv.isCategoriesLoading ? loader : filteredCats.length === 0 ? (
            <EmptyState icon={Tag} title="No categories" message="Create a category to organise your products." />
          ) : (
            page(filteredCats, 'categories').map((cat: any) => (
              <Card key={cat.id} style={styles.card}>
                <View style={styles.top}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{cat.name}</Text>
                    <Text style={[styles.meta, { color: colors.textSubtle }]}>{cat.code} • {cat.itemCount ?? 0} items</Text>
                  </View>
                  <Badge label={cat.isActive ? 'Active' : 'Inactive'} tone={cat.isActive ? 'success' : 'neutral'} small />
                </View>
                {cat.description ? <Text style={[styles.meta, { color: colors.textMuted, marginTop: 8 }]} numberOfLines={2}>{cat.description}</Text> : null}
                <View style={styles.cardActions}>
                  <Pressable onPress={() => openCat(cat)} style={[styles.actionBtn, { borderColor: colors.border }]}><Edit2 size={15} color={colors.primary} /><Text style={[styles.actionText, { color: colors.text }]}>Edit</Text></Pressable>
                  <Pressable onPress={() => removeCat(cat)} style={[styles.actionBtn, { borderColor: colors.border }]}><Trash2 size={15} color={colors.danger} /><Text style={[styles.actionText, { color: colors.text }]}>Delete</Text></Pressable>
                </View>
              </Card>
            ))
          )}
          {!inv.isCategoriesLoading && filteredCats.length > 0 ? pager(filteredCats.length, 'categories') : null}
        </>
      ) : null}

      {activeTab === 'audit-logs' ? (
        <>
          <View style={styles.actions}>
            <Button title="Record Movement" size="sm" fullWidth={false} icon={ArrowRightLeft} onPress={() => openMove()} />
            <Button title={`Export (${auditLogs.length})`} size="sm" fullWidth={false} variant="outline" icon={Download} disabled={!auditLogs.length} onPress={exportAudit} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll} contentContainerStyle={styles.rowContent}>
            {[['ALL', 'All'], ['INBOUND', 'Inbound'], ['OUTBOUND', 'Outbound']].map(([v, l]) => (
              <Pill key={v} active={auditSubTab === v} label={l} onPress={() => setAuditSubTab(v)} />
            ))}
          </ScrollView>
          <SearchBar value={auditSearch} onChangeText={setAuditSearch} placeholder="Search product, reason..." style={styles.search} />
          <Select value={auditCategory} onChange={setAuditCategory} options={catOptions} placeholder="All Categories" />
          {inv.isAuditLogsLoading ? loader : auditLogs.length === 0 ? (
            <EmptyState icon={History} title="No audit movements" message="No audit movements recorded yet." />
          ) : (
            page(auditLogs, 'audit').map((log: any) => {
              const inbound = log.movementType === 'INBOUND';
              return (
                <Card key={log.id} style={styles.card}>
                  <View style={styles.top}>
                    <View style={[styles.moveIcon, { backgroundColor: inbound ? colors.successSoft : colors.dangerSoft }]}>
                      {inbound ? <ArrowDownRight size={16} color={colors.success} /> : <ArrowUpRight size={16} color={colors.danger} />}
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{log.inventoryItem?.name || 'Deleted Item'}</Text>
                      <Text style={[styles.meta, { color: colors.textSubtle }]}>{new Date(log.createdAt).toLocaleString()}</Text>
                    </View>
                    <Text style={{ color: inbound ? colors.success : colors.danger, fontWeight: fontWeight.extrabold, fontSize: fontSize.md }}>{inbound ? '+' : '-'}{log.quantity}</Text>
                  </View>
                  <Text style={[styles.meta, { color: colors.textMuted, marginTop: 8 }]} numberOfLines={2}>
                    {[log.category?.name, log.reason, log.notes].filter(Boolean).join(' • ') || '-'}
                  </Text>
                </Card>
              );
            })
          )}
          {!inv.isAuditLogsLoading && auditLogs.length > 0 ? pager(auditLogs.length, 'audit') : null}
        </>
      ) : null}

      {/* Product sheet */}
      <SheetModal
        visible={itemOpen} onClose={() => setItemOpen(false)} title={editingItem ? 'Edit Product' : 'Add Product'} tall
        footer={<View style={styles.footer}><Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={() => setItemOpen(false)} /><View style={{ width: 10 }} /><Button title={editingItem ? 'Save Changes' : 'Add Product'} loading={inv.isCreating || inv.isUpdating} style={{ flex: 1 }} onPress={submitItem} /></View>}>
        <Input label="Item Name" required value={itemForm.name} onChangeText={setI('name')} placeholder="e.g. A4 Ruled Notebook" />
        <Input label="SKU / Item Code" value={itemForm.sku} onChangeText={setI('sku')} />
        <Select label="Category" value={itemForm.categoryId} onChange={setI('categoryId')} placeholder="Select Category (Optional)" options={[{ value: '', label: 'No Category' }, ...categories.map((c: any) => ({ value: c.id, label: c.name }))]} />
        <Input label="Quantity" value={itemForm.quantity} onChangeText={(x) => setI('quantity')(x.replace(/\D/g, ''))} keyboardType="number-pad" />
        <Input label="Department / Location" value={itemForm.departmentLocation} onChangeText={setI('departmentLocation')} />
        <Input label="Unit of Measure" value={itemForm.unitOfMeasure} onChangeText={setI('unitOfMeasure')} placeholder="Pcs, Boxes..." />
      </SheetModal>

      {/* Category sheet */}
      <SheetModal
        visible={catOpen} onClose={() => setCatOpen(false)} title={editingCat ? 'Edit Category' : 'Add Category'}
        footer={<View style={styles.footer}><Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={() => setCatOpen(false)} /><View style={{ width: 10 }} /><Button title={editingCat ? 'Save Changes' : 'Add Category'} loading={inv.isCreatingCategory || inv.isUpdatingCategory} style={{ flex: 1 }} onPress={submitCat} /></View>}>
        <Input label="Category Name" required value={catForm.name} onChangeText={setC('name')} />
        <Input label="Code" required value={catForm.code} onChangeText={(x) => setC('code')(x.toUpperCase())} autoCapitalize="characters" placeholder="e.g. STAT" />
        <Input label="Description" multiline value={catForm.description} onChangeText={setC('description')} />
        <Select label="Status" value={catForm.isActive ? 'true' : 'false'} onChange={(v) => setC('isActive')(v === 'true')} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />
      </SheetModal>

      {/* Stock movement sheet */}
      <SheetModal
        visible={moveOpen} onClose={() => setMoveOpen(false)} title="Record Stock Movement"
        footer={<View style={styles.footer}><Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={() => setMoveOpen(false)} /><View style={{ width: 10 }} /><Button title="Record" loading={inv.isRecordingMovement} style={{ flex: 1 }} onPress={submitMove} /></View>}>
        <Select label="Product" required value={moveForm.inventoryItemId} onChange={setM('inventoryItemId')} placeholder="Select product" searchable options={items.map((i: any) => ({ value: i.id, label: `${i.name}${i.sku ? ` (${i.sku})` : ''} - ${i.quantity} in stock` }))} />
        <Select
          label="Movement Type" value={moveForm.movementType}
          onChange={(v) => setMoveForm((p: any) => ({ ...p, movementType: v, reason: v === 'INBOUND' ? 'Purchase' : 'Department Issue' }))}
          options={[{ value: 'INBOUND', label: 'Inbound (+ Add Stock)' }, { value: 'OUTBOUND', label: 'Outbound (- Issue/Deduct)' }]}
        />
        <Input label="Quantity" required value={moveForm.quantity} onChangeText={(x) => setM('quantity')(x.replace(/\D/g, ''))} keyboardType="number-pad" />
        <Select label="Reason" required value={moveForm.reason} onChange={setM('reason')} options={(moveForm.movementType === 'INBOUND' ? INBOUND_REASONS : OUTBOUND_REASONS).map((r) => ({ value: r, label: r }))} />
        <Input label="Notes" multiline value={moveForm.notes} onChangeText={setM('notes')} />
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, marginTop: 3, marginBottom: 12, lineHeight: 19 },
  rowScroll: { flexGrow: 0, marginBottom: 10 },
  rowContent: { gap: 8, paddingVertical: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, height: 38 },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'center' },
  search: { marginBottom: 10 },
  loader: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  card: { marginTop: 10, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  meta: { fontSize: 11, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 10 },
  moveIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, minHeight: 36, gap: 5 },
  actionText: { fontSize: 11, fontWeight: fontWeight.bold },
  footer: { flexDirection: 'row', marginTop: 6 },
});