import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { History, SlidersHorizontal, ImagePlus, ArrowDownToLine, Edit2, Package, Plus, ShoppingCart, Receipt, Tag, Trash2, X } from 'lucide-react-native';
import { pick, keepLocalCopy, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useStore } from '../../hooks/useStore';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SearchBar, useDebouncedValue } from '../../components/ui/SearchBar';
import { Badge } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { SheetModal } from '../../components/ui/SheetModal';
import { ExcelUploadButton } from '../../components/ui/ExcelUploadButton';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';
const IMPORT_FIELDS = [
  { name: 'Item_Name', required: true, example: 'Uniform Shirt' },
  { name: 'Price', required: true, example: '450' },
  { name: 'Category', example: 'Uniforms' },
  { name: 'Opening_Stock', example: '50' },
  { name: 'Low_Stock_Alert', example: '5' },
];
const inr = (n: number) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE = 2 * 1024 * 1024;
const blankItem = { name: '', categoryId: '', price: '', stock: '0', lowStockAt: '5' };
const blankCat = { name: '', code: '', description: '', isActive: true };
const blankSale = { customerType: 'STUDENT', customerName: '', rollNo: '', department: '', year: '', section: '', discount: '0', paymentMethod: 'CASH', paymentRef: '' };

type Tab = 'products' | 'sale' | 'history' | 'categories';

/** Campus Store (backend: modules/store) - Products & Stock / New Sale / Sales History / Product Categories */
export default function StoreScreen() {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const [tab, setTab] = useState<Tab>('products');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [pages, setPages] = useState({ products: 1, categories: 1, history: 1 });
  const dSearch = useDebouncedValue(search, 400);

  const st = useStore({ search: dSearch || undefined, categoryId: categoryFilter || undefined, status }, tab);
  const { items, categories, sales } = st;

  const pageOf = (arr: any[], k: 'products' | 'categories' | 'history') => arr.slice((pages[k] - 1) * pageSize, pages[k] * pageSize);
  const pager = (total: number, k: 'products' | 'categories' | 'history') => (
    <Pagination totalItems={total} currentPage={pages[k]} pageSize={pageSize} onPageChange={(n) => setPages((p) => ({ ...p, [k]: n }))} onPageSizeChange={(n) => { setPageSize(n); setPages({ products: 1, categories: 1, history: 1 }); }} />
  );

  // ---- item sheet
  const [itemOpen, setItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [itemForm, setItemForm] = useState<any>(blankItem);
  const [pickedImage, setPickedImage] = useState<{ uri: string; name: string; type: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const chooseImage = async () => {
    try {
      const results: any = await pick({ type: [types.images], allowMultiSelection: false });
      const f: any = results?.[0];
      if (!f?.uri) return;
      const type = f.type || (/\.png$/i.test(f.name || '') ? 'image/png' : /\.webp$/i.test(f.name || '') ? 'image/webp' : 'image/jpeg');
      if (!IMAGE_TYPES.includes(type)) { Alert.alert('Invalid image', 'Only JPG, PNG or WebP images are allowed.'); return; }
      if (f.size && f.size > MAX_IMAGE) { Alert.alert('Image too large', 'Image must be 2 MB or smaller.'); return; }
      let uri: string = f.fileCopyUri || f.uri;
      if (uri.startsWith('content://')) {
        const copied: any = await keepLocalCopy({ files: [{ uri: f.uri, fileName: f.name || `store_${Date.now()}.jpg` }], destination: 'cachesDirectory' });
        const r = copied?.[0];
        if (!r || r.status !== 'success' || !r.localUri) throw new Error('Could not read the selected image.');
        uri = r.localUri;
      }
      setPickedImage({ uri, name: f.name || `store_${Date.now()}.jpg`, type });
    } catch (err: any) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert('Image Picker Error', err?.message || 'Could not choose the image.');
    }
  };
  const setI = (k: string) => (v: string) => setItemForm((p: any) => ({ ...p, [k]: v }));
  const openItem = (item: any = null) => {
    setEditingItem(item);
    setPickedImage(null);
    setItemForm(item ? { name: item.name, categoryId: item.categoryId || '', price: String(item.price ?? ''), stock: '0', lowStockAt: String(item.lowStockAt ?? 5) } : blankItem);
    setItemOpen(true);
  };
  const submitItem = async () => {
    if (!itemForm.name.trim()) { toast.error('Item name is required'); return; }
    if (itemForm.price === '' || Number(itemForm.price) < 0) { toast.error('Price is required'); return; }
    const payload: any = { name: itemForm.name.trim(), categoryId: itemForm.categoryId || null, price: Number(itemForm.price), lowStockAt: Number(itemForm.lowStockAt) || 0 };
    try {
      if (pickedImage) {
        setIsUploading(true);
        const up = await st.uploadImage(pickedImage);
        payload.imageUrl = up.imageUrl;
        payload.imagePublicId = up.imagePublicId;
      }
      if (editingItem) await st.updateItem({ id: editingItem.id, ...payload });
      else await st.createItem({ ...payload, stock: Number(itemForm.stock) || 0 });
      setItemOpen(false);
    } catch { /* toast shown */ } finally { setIsUploading(false); }
  };
  const removeItem = async (item: any) => {
    if (await confirm({ title: 'Remove Item', message: `Remove '${item.name}'? Items with sales history are deactivated instead of deleted.`, confirmText: 'Remove', isDestructive: true })) {
      await st.deleteItem(item.id).catch(() => {});
    }
  };

  // ---- restock / adjust sheet
  const [stockOpen, setStockOpen] = useState(false);
  const [stockForm, setStockForm] = useState<any>({ id: '', mode: 'restock', quantity: '1', newStock: '', note: '' });
  const [stockFixed, setStockFixed] = useState(false);
  const openStock = (item: any = null, mode = 'restock') => {
    setStockFixed(!!item);
    setStockForm({ id: item?.id || '', mode, quantity: '', newStock: item ? String(item.stock) : '', note: '' });
    setStockOpen(true);
  };

  // ---- stock history sheet
  const [historyItem, setHistoryItem] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const openHistory = async (item: any) => {
    setHistoryItem(item);
    setMovements([]);
    setIsHistoryLoading(true);
    setMovements(await st.getMovements(item.id));
    setIsHistoryLoading(false);
  };
  const fmtDateTime = (d: any) => {
    const x = new Date(d);
    if (isNaN(x.getTime())) return '-';
    const dd = String(x.getDate()).padStart(2, '0'), mm = String(x.getMonth() + 1).padStart(2, '0');
    let h = x.getHours(); const ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12;
    return `${dd}/${mm}/${x.getFullYear()}, ${String(h).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}:${String(x.getSeconds()).padStart(2, '0')} ${ap}`;
  };
  const moveTone = (t: string): any => (t === 'OPENING' ? 'info' : t === 'RESTOCK' ? 'success' : t === 'ADJUST' ? 'warning' : t === 'SALE' ? 'danger' : 'neutral');
  const submitStock = async () => {
    if (!stockForm.id) { toast.error('Select an item'); return; }
    try {
      if (stockForm.mode === 'restock') {
        if (!(Number(stockForm.quantity) >= 1)) { toast.error('Quantity must be at least 1'); return; }
        await st.restockItem({ id: stockForm.id, quantity: Number(stockForm.quantity), note: stockForm.note || undefined });
      } else {
        if (stockForm.newStock === '') { toast.error('Enter the counted stock'); return; }
        if (stockForm.note.trim().length < 3) { toast.error('Please give a reason (at least 3 characters)'); return; }
        await st.adjustItem({ id: stockForm.id, newStock: Number(stockForm.newStock), note: stockForm.note.trim() });
      }
      setStockOpen(false);
    } catch { /* toast shown */ }
  };

  // ---- category sheet
  const [catOpen, setCatOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [catForm, setCatForm] = useState<any>(blankCat);
  const openCat = (cat: any = null) => {
    setEditingCat(cat);
    setCatForm(cat ? { name: cat.name, code: cat.code, description: cat.description || '', isActive: cat.isActive !== false } : blankCat);
    setCatOpen(true);
  };
  const submitCat = async () => {
    if (!catForm.name.trim() || !catForm.code.trim()) { toast.error('Category name and code are required'); return; }
    try {
      if (editingCat) await st.updateCategory({ id: editingCat.id, ...catForm });
      else await st.createCategory(catForm);
      setCatOpen(false);
    } catch { /* toast shown */ }
  };
  const removeCat = async (cat: any) => {
    if (await confirm({ title: 'Delete Category', message: `Delete category '${cat.name}'?`, confirmText: 'Delete', isDestructive: true })) {
      await st.deleteCategory(cat.id).catch(() => {});
    }
  };

  // ---- new sale
  const [sale, setSale] = useState<any>(blankSale);
  const [cart, setCart] = useState<{ itemId: string; quantity: number }[]>([]);
  const [pickItem, setPickItem] = useState('');
  const [pickQty, setPickQty] = useState('1');
  const setS = (k: string) => (v: string) => setSale((p: any) => ({ ...p, [k]: v }));
  const sellable = useMemo(() => items.filter((i: any) => i.isActive !== false && i.stock > 0), [items]);
  const itemById = (id: string) => items.find((i: any) => i.id === id);
  const subtotal = cart.reduce((a, l) => a + (Number(itemById(l.itemId)?.price) || 0) * l.quantity, 0);
  const discount = Math.min(Number(sale.discount) || 0, subtotal);
  const addToCart = () => {
    const it = itemById(pickItem);
    const qty = Math.floor(Number(pickQty) || 0);
    if (!it || qty < 1) { toast.error('Select an item and quantity'); return; }
    const already = cart.find((l) => l.itemId === it.id)?.quantity || 0;
    if (already + qty > it.stock) { toast.error(`Only ${it.stock} in stock for ${it.name}`); return; }
    setCart((c) => (c.some((l) => l.itemId === it.id) ? c.map((l) => (l.itemId === it.id ? { ...l, quantity: l.quantity + qty } : l)) : [...c, { itemId: it.id, quantity: qty }]));
    setPickItem(''); setPickQty('1');
  };
  const submitSale = async () => {
    if (!cart.length) { toast.error('Add at least one item'); return; }
    const t = sale.customerType;
    if (!sale.customerName.trim()) { toast.error(t === 'OTHER' ? 'Customer details are required' : t === 'STAFF' ? 'Staff name is required' : 'Student name is required'); return; }
    if (t !== 'OTHER' && !sale.department.trim()) { toast.error('Department is required'); return; }
    if (t === 'STUDENT' && (!sale.year.trim() || !sale.section.trim())) { toast.error('Year and section are required'); return; }
    const payload: any = { customerType: t, customerName: sale.customerName.trim(), items: cart, discount, paymentMethod: sale.paymentMethod, paymentRef: sale.paymentRef || undefined };
    if (t === 'STUDENT') Object.assign(payload, { rollNo: sale.rollNo || undefined, department: sale.department.trim(), year: sale.year.trim(), section: sale.section.trim() });
    if (t === 'STAFF') payload.department = sale.department.trim();
    try {
      await st.createSale(payload);
      setSale(blankSale);
      setCart([]);
    } catch { /* toast shown */ }
  };

  const catOptions = [{ value: '', label: 'All Categories' }, ...categories.map((c: any) => ({ value: c.id, label: c.name }))];
  const loader = <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>;

  const TabBtn = ({ id, label, icon: Icon, count }: any) => {
    const active = tab === id;
    return (
      <Pressable onPress={() => setTab(id)} style={[styles.pill, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}>
        <Icon size={14} color={active ? colors.onPrimary : colors.textMuted} />
        <Text style={{ color: active ? colors.onPrimary : colors.textMuted, fontSize: 12, fontWeight: fontWeight.bold, marginLeft: 6 }}>{label}{count !== undefined ? ` (${count})` : ''}</Text>
      </Pressable>
    );
  };

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => { setIsRefreshing(true); await st.refetch(); setIsRefreshing(false); }}>
      <Text style={[styles.title, { color: colors.text }]}>Campus Store</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Manage store items, categories, stock, and sales for uniforms, books, and merchandise.</Text>

      <View style={styles.actions}>
        <ExcelUploadButton label="Import" title="Import Store Items" fields={IMPORT_FIELDS} sampleFileName="store_import_template.xlsx" onUpload={st.bulkImport} isLoading={st.isImporting} />
        <Button title="Restock" size="sm" fullWidth={false} variant="outline" icon={ArrowDownToLine} onPress={() => openStock()} />
        <Button title="Add Item" size="sm" fullWidth={false} icon={Plus} onPress={() => openItem()} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll} contentContainerStyle={styles.rowContent}>
        <TabBtn id="products" label="Products & Stock" icon={Package} count={items.length} />
        <TabBtn id="sale" label="New Sale" icon={ShoppingCart} />
        <TabBtn id="history" label="Sales History" icon={Receipt} />
        <TabBtn id="categories" label="Product Categories" icon={Tag} count={categories.length} />
      </ScrollView>

      {tab === 'products' ? (
        <>
          <SearchBar value={search} onChangeText={(t) => { setSearch(t); setPages((p) => ({ ...p, products: 1 })); }} placeholder="Search products by name or category..." style={styles.search} />
          <Select value={status} onChange={(v) => { setStatus(v as any); setPages((p) => ({ ...p, products: 1 })); }} options={[{ value: 'active', label: 'Active Products' }, { value: 'inactive', label: 'Inactive Products' }, { value: 'all', label: 'All Products' }]} />
          <Select value={categoryFilter} onChange={(v) => { setCategoryFilter(v); setPages((p) => ({ ...p, products: 1 })); }} options={catOptions} placeholder="All Categories" />
          {st.isLoading ? loader : items.length === 0 ? (
            <EmptyState icon={Package} title="No store items yet" message={'Create a category, then tap "Add Item".'} />
          ) : (
            <>
              {pageOf(items, 'products').map((item: any) => {
                const low = item.stock <= (item.lowStockAt ?? 5);
                return (
                  <Card key={item.id} style={styles.card}>
                    <View style={styles.top}>
                      {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.thumb} resizeMode="cover" /> : null}
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{item.name}</Text>
                        <Text style={[styles.meta, { color: colors.textSubtle, fontStyle: item.category ? 'normal' : 'italic' }]}>{item.category || 'Uncategorized'}</Text>
                      </View>
                      <Text style={[styles.price, { color: colors.text }]}>{inr(item.price)}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Badge label={`${item.stock} units`} tone={low ? 'danger' : 'success'} />
                      {item.isActive === false ? <Badge label="Inactive" tone="neutral" small /> : null}
                    </View>
                    <View style={styles.cardActions}>
                      <Pressable onPress={() => openStock(item, 'restock')} style={[styles.iconBtn, { borderColor: colors.border }]}><ArrowDownToLine size={16} color={colors.success} /></Pressable>
                      <Pressable onPress={() => openStock(item, 'adjust')} style={[styles.iconBtn, { borderColor: colors.border }]}><SlidersHorizontal size={16} color={colors.warning} /></Pressable>
                      <Pressable onPress={() => openHistory(item)} style={[styles.iconBtn, { borderColor: colors.border }]}><History size={16} color={colors.textMuted} /></Pressable>
                      <Pressable onPress={() => openItem(item)} style={[styles.iconBtn, { borderColor: colors.border }]}><Edit2 size={16} color={colors.primary} /></Pressable>
                      <Pressable onPress={() => removeItem(item)} style={[styles.iconBtn, { borderColor: colors.border }]}><Trash2 size={16} color={colors.danger} /></Pressable>
                    </View>
                  </Card>
                );
              })}
              {pager(items.length, 'products')}
            </>
          )}
        </>
      ) : null}

      {tab === 'sale' ? (
        <>
          <Card style={styles.formCard}>
            <Text style={[styles.section, { color: colors.text }]}>Customer</Text>
            <Select label="Customer Type" value={sale.customerType} onChange={setS('customerType')} options={[{ value: 'STUDENT', label: 'Student' }, { value: 'STAFF', label: 'Staff' }, { value: 'OTHER', label: 'Other' }]} />
            <Input label={sale.customerType === 'OTHER' ? 'Customer Details' : sale.customerType === 'STAFF' ? 'Staff Name' : 'Student Name'} required value={sale.customerName} onChangeText={setS('customerName')} />
            {sale.customerType === 'STUDENT' ? <Input label="Roll No" value={sale.rollNo} onChangeText={setS('rollNo')} /> : null}
            {sale.customerType !== 'OTHER' ? <Input label="Department" required value={sale.department} onChangeText={setS('department')} /> : null}
            {sale.customerType === 'STUDENT' ? (
              <View style={{ flexDirection: 'row' }}>
                <View style={{ flex: 1 }}><Input label="Year" required placeholder="e.g. 2" value={sale.year} onChangeText={setS('year')} /></View>
                <View style={{ width: 10 }} />
                <View style={{ flex: 1 }}><Input label="Section" required placeholder="e.g. A" value={sale.section} onChangeText={setS('section')} /></View>
              </View>
            ) : null}
          </Card>

          <Card style={styles.formCard}>
            <Text style={[styles.section, { color: colors.text }]}>Items</Text>
            <Select label="Item" value={pickItem} onChange={setPickItem} placeholder="Select item..." searchable options={sellable.map((i: any) => ({ value: i.id, label: `${i.name} - ${inr(i.price)} (${i.stock} left)` }))} />
            <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
              <View style={{ flex: 1 }}><Input label="Quantity" keyboardType="number-pad" value={pickQty} onChangeText={(x) => setPickQty(x.replace(/\D/g, ''))} /></View>
              <View style={{ width: 10 }} />
              <Button title="Add" size="sm" fullWidth={false} icon={Plus} onPress={addToCart} style={{ marginBottom: 12 }} />
            </View>
            {cart.map((l) => {
              const it = itemById(l.itemId);
              return (
                <View key={l.itemId} style={[styles.cartRow, { borderColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: fontWeight.bold, fontSize: fontSize.sm }} numberOfLines={1}>{it?.name}</Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]}>{l.quantity} × {inr(it?.price)}</Text>
                  </View>
                  <Text style={{ color: colors.text, fontWeight: fontWeight.extrabold, marginRight: 10 }}>{inr((Number(it?.price) || 0) * l.quantity)}</Text>
                  <Pressable hitSlop={8} onPress={() => setCart((c) => c.filter((x) => x.itemId !== l.itemId))}><X size={18} color={colors.danger} /></Pressable>
                </View>
              );
            })}
          </Card>

          <Card style={styles.formCard}>
            <Text style={[styles.section, { color: colors.text }]}>Payment</Text>
            <Input label="Discount (₹)" keyboardType="decimal-pad" value={sale.discount} onChangeText={(x) => setS('discount')(x.replace(/[^0-9.]/g, ''))} />
            <Select label="Payment Method" value={sale.paymentMethod} onChange={setS('paymentMethod')} options={[{ value: 'CASH', label: 'Cash' }, { value: 'UPI', label: 'UPI' }, { value: 'CARD', label: 'Card' }]} />
            {sale.paymentMethod !== 'CASH' ? <Input label="Payment Reference" value={sale.paymentRef} onChangeText={setS('paymentRef')} /> : null}
            <View style={[styles.totalBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              <Text style={[styles.meta, { color: colors.textMuted }]}>Subtotal {inr(subtotal)}  •  Discount {inr(discount)}</Text>
              <Text style={{ color: colors.primary, fontSize: fontSize.xl, fontWeight: fontWeight.extrabold, marginTop: 4 }}>Total {inr(subtotal - discount)}</Text>
            </View>
            <Button title="Record Sale" loading={st.isSelling} onPress={submitSale} />
          </Card>
        </>
      ) : null}

      {tab === 'history' ? (
        st.isSalesLoading ? loader : sales.length === 0 ? (
          <EmptyState icon={Receipt} title="No sales yet" message="Recorded sales will appear here." />
        ) : (
          <>
            {st.salesSummary ? (
              <Card style={[styles.formCard, { flexDirection: 'row', justifyContent: 'space-between' }]}>
                <View><Text style={[styles.meta, { color: colors.textMuted }]}>Sales</Text><Text style={[styles.price, { color: colors.text }]}>{st.salesSummary.count}</Text></View>
                <View><Text style={[styles.meta, { color: colors.textMuted }]}>Total Amount</Text><Text style={[styles.price, { color: colors.primary }]}>{inr(st.salesSummary.totalAmount)}</Text></View>
                <View><Text style={[styles.meta, { color: colors.textMuted }]}>Discounts</Text><Text style={[styles.price, { color: colors.text }]}>{inr(st.salesSummary.totalDiscount)}</Text></View>
              </Card>
            ) : null}
            {pageOf(sales, 'history').map((s: any) => (
              <Card key={s.id} style={styles.card}>
                <View style={styles.top}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{s.customerName}</Text>
                    <Text style={[styles.meta, { color: colors.textSubtle }]}>{s.invoiceNo} • {new Date(s.createdAt).toLocaleString()}</Text>
                  </View>
                  <Text style={[styles.price, { color: colors.primary }]}>{inr(s.total)}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Badge label={s.customerType} tone="info" small />
                  <Badge label={s.paymentMethod} tone="neutral" small />
                </View>
                <Text style={[styles.meta, { color: colors.textMuted, marginTop: 8 }]} numberOfLines={2}>{(s.items || []).map((i: any) => `${i.name} × ${i.quantity}`).join(', ')}</Text>
              </Card>
            ))}
            {pager(sales.length, 'history')}
          </>
        )
      ) : null}

      {tab === 'categories' ? (
        <>
          <View style={styles.actions}><Button title="Add Category" size="sm" fullWidth={false} icon={Plus} onPress={() => openCat()} /></View>
          {st.isCategoriesLoading ? loader : categories.length === 0 ? (
            <EmptyState icon={Tag} title="No categories" message="Create a category to organise your store items." />
          ) : (
            <>
              {pageOf(categories, 'categories').map((cat: any) => (
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
              ))}
              {pager(categories.length, 'categories')}
            </>
          )}
        </>
      ) : null}

      {/* Add / Edit item */}
      <SheetModal
        visible={itemOpen} onClose={() => setItemOpen(false)} title={editingItem ? 'Edit Store Item' : 'Add New Store Item'} tall
        footer={<View style={styles.footer}><Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={() => setItemOpen(false)} /><View style={{ width: 10 }} /><Button title={editingItem ? 'Save Changes' : 'Create Item'} loading={st.isCreating || st.isUpdating || isUploading} style={{ flex: 1 }} onPress={submitItem} /></View>}>
        <Text style={[styles.imgLabel, { color: colors.text }]}>Item Image</Text>
        <View style={styles.imgRow}>
          <Pressable onPress={chooseImage} style={[styles.imgBox, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}>
            {pickedImage || editingItem?.imageUrl ? <Image source={{ uri: pickedImage?.uri || editingItem.imageUrl }} style={styles.imgFill} resizeMode="cover" /> : <ImagePlus size={28} color={colors.textSubtle} />}
          </Pressable>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Button title={pickedImage || editingItem?.imageUrl ? 'Change image' : 'Choose image'} variant="outline" size="sm" fullWidth={false} icon={ImagePlus} onPress={chooseImage} />
            <Text style={[styles.meta, { color: colors.textSubtle, marginTop: 8 }]}>JPG, PNG or WebP, up to 2 MB.</Text>
          </View>
        </View>
        <Input label="Item Name" required placeholder="e.g. Uniform Shirt, Record Notebook" value={itemForm.name} onChangeText={setI('name')} />
        <Select label="Category" value={itemForm.categoryId} onChange={setI('categoryId')} placeholder="Select Category" options={[{ value: '', label: 'No Category' }, ...categories.filter((c: any) => c.isActive !== false).map((c: any) => ({ value: c.id, label: c.name }))]} />
        {categories.length === 0 ? <Text style={[styles.meta, { color: colors.warning, marginBottom: 10 }]}>No categories yet. Close this and create one in the "Product Categories" tab.</Text> : null}
        <Input label="Price (₹)" required keyboardType="decimal-pad" value={itemForm.price} onChangeText={(x) => setI('price')(x.replace(/[^0-9.]/g, ''))} />
        {!editingItem ? <Input label="Opening Stock" keyboardType="number-pad" placeholder="0" value={itemForm.stock} onChangeText={(x) => setI('stock')(x.replace(/\D/g, ''))} /> : null}
        <Input label="Low-stock Alert Level" keyboardType="number-pad" value={itemForm.lowStockAt} onChangeText={(x) => setI('lowStockAt')(x.replace(/\D/g, ''))} />
      </SheetModal>

      {/* Restock / adjust */}
      <SheetModal
        visible={stockOpen} onClose={() => setStockOpen(false)} title={stockForm.mode === 'restock' ? 'Restock Item' : 'Adjust Stock'}
        footer={<View style={styles.footer}><Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={() => setStockOpen(false)} /><View style={{ width: 10 }} /><Button title={stockForm.mode === 'restock' ? 'Add Stock' : 'Save Adjustment'} loading={st.isRestocking} style={{ flex: 1 }} onPress={submitStock} /></View>}>
        {stockFixed ? (
          <Input label="Item" required editable={false} value={itemById(stockForm.id)?.name || ''} />
        ) : (
          <Select label="Item" required value={stockForm.id} onChange={(v) => setStockForm((p: any) => ({ ...p, id: v, newStock: String(itemById(v)?.stock ?? '') }))} searchable placeholder="Select item" options={items.map((i: any) => ({ value: i.id, label: i.name }))} />
        )}
        {stockForm.id ? <Text style={[styles.meta, { color: colors.textMuted, marginTop: -6, marginBottom: 12 }]}>Current stock: <Text style={{ fontWeight: fontWeight.extrabold, color: colors.text }}>{itemById(stockForm.id)?.stock ?? 0}</Text></Text> : null}
        {stockForm.mode === 'restock' ? (
          <Input label="Quantity to add" required placeholder="e.g. 50" keyboardType="number-pad" value={stockForm.quantity} onChangeText={(x) => setStockForm((p: any) => ({ ...p, quantity: x.replace(/\D/g, '') }))} />
        ) : (
          <Input label="Counted stock (actual units on the shelf)" required keyboardType="number-pad" value={stockForm.newStock} onChangeText={(x) => setStockForm((p: any) => ({ ...p, newStock: x.replace(/\D/g, '') }))} />
        )}
        {stockForm.mode === 'restock' ? (
          <Input label="Note (optional)" placeholder="e.g. New batch from supplier" value={stockForm.note} onChangeText={(x) => setStockForm((p: any) => ({ ...p, note: x }))} />
        ) : (
          <Input label="Reason" required placeholder="e.g. 2 damaged, stock count correction" value={stockForm.note} onChangeText={(x) => setStockForm((p: any) => ({ ...p, note: x }))} />
        )}
      </SheetModal>

      {/* Stock history */}
      <SheetModal visible={!!historyItem} onClose={() => setHistoryItem(null)} title={`Stock History - ${historyItem?.name || ''}`} tall>
        {isHistoryLoading ? (
          <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : movements.length === 0 ? (
          <Text style={[styles.meta, { color: colors.textMuted, textAlign: 'center', marginVertical: 24 }]}>No stock movements recorded yet.</Text>
        ) : (
          movements.map((m: any) => {
            const q = Number(m.quantity) || 0;
            return (
              <View key={m.id} style={[styles.moveRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <View style={styles.moveTop}>
                  <Text style={[styles.meta, { color: colors.textMuted, flex: 1 }]}>{fmtDateTime(m.createdAt)}</Text>
                  <Badge label={String(m.type || '').toUpperCase()} tone={moveTone(m.type)} small />
                </View>
                <View style={styles.moveStats}>
                  <View style={styles.moveCell}><Text style={[styles.moveLabel, { color: colors.textSubtle }]}>CHANGE</Text><Text style={[styles.moveVal, { color: q >= 0 ? colors.success : colors.danger }]}>{q > 0 ? `+${q}` : q}</Text></View>
                  <View style={styles.moveCell}><Text style={[styles.moveLabel, { color: colors.textSubtle }]}>BALANCE</Text><Text style={[styles.moveVal, { color: colors.text }]}>{m.balanceAfter}</Text></View>
                  <View style={styles.moveCell}><Text style={[styles.moveLabel, { color: colors.textSubtle }]}>BY</Text><Text style={[styles.meta, { color: colors.text, marginTop: 4 }]} numberOfLines={1}>{m.byName || 'System'}</Text></View>
                </View>
                {m.note ? <Text style={[styles.meta, { color: colors.textMuted, marginTop: 6 }]}>{m.note}</Text> : null}
              </View>
            );
          })
        )}
      </SheetModal>

      {/* Category */}
      <SheetModal
        visible={catOpen} onClose={() => setCatOpen(false)} title={editingCat ? 'Edit Category' : 'Add Category'}
        footer={<View style={styles.footer}><Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={() => setCatOpen(false)} /><View style={{ width: 10 }} /><Button title={editingCat ? 'Save Changes' : 'Add Category'} loading={st.isSavingCategory} style={{ flex: 1 }} onPress={submitCat} /></View>}>
        <Input label="Category Name" required placeholder="e.g. Uniforms" value={catForm.name} onChangeText={(x) => setCatForm((p: any) => ({ ...p, name: x }))} />
        <Input label="Code" required placeholder="e.g. UNI" autoCapitalize="characters" value={catForm.code} onChangeText={(x) => setCatForm((p: any) => ({ ...p, code: x.toUpperCase() }))} />
        <Input label="Description" multiline value={catForm.description} onChangeText={(x) => setCatForm((p: any) => ({ ...p, description: x }))} />
        <Select label="Status" value={catForm.isActive ? 'true' : 'false'} onChange={(v) => setCatForm((p: any) => ({ ...p, isActive: v === 'true' }))} options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' }]} />
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconBtn: { flex: 1, height: 38, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moveRow: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  moveTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  moveStats: { flexDirection: 'row' },
  moveCell: { flex: 1 },
  moveLabel: { fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.5 },
  moveVal: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold, marginTop: 2 },
  imgLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 6 },
  imgRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  imgBox: { width: 84, height: 84, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  imgFill: { width: '100%', height: '100%' },
  thumb: { width: 44, height: 44, borderRadius: 10, marginRight: 10 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, marginTop: 3, marginBottom: 12, lineHeight: 19 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10, alignItems: 'center' },
  rowScroll: { flexGrow: 0, marginBottom: 10 },
  rowContent: { gap: 8, paddingVertical: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, height: 38 },
  search: { marginBottom: 10 },
  loader: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  card: { marginTop: 10, padding: 14 },
  formCard: { marginBottom: 12, padding: 14 },
  section: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold, marginBottom: 10 },
  top: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  meta: { fontSize: 11, marginTop: 2 },
  price: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold, marginLeft: 8 },
  infoRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 10 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, minHeight: 36, gap: 5 },
  actionText: { fontSize: 11, fontWeight: fontWeight.bold },
  cartRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingVertical: 10 },
  totalBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  footer: { flexDirection: 'row', marginTop: 6 },
});