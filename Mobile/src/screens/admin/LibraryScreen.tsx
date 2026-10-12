import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Book, BookOpen, Edit, Library as LibIcon, Plus, Trash2 } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { DEFAULT_LIBRARY_SETTINGS, getLibraryStudentSummary, searchLibraryStudents, useLibrary, useLibraryCirculation, useLibrarySettings } from '../../hooks/useLibrary';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { SearchBar } from '../../components/ui/SearchBar';
import { Badge, toneForStatus } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { SheetModal } from '../../components/ui/SheetModal';
import { ExcelUploadButton } from '../../components/ui/ExcelUploadButton';
import { BookFormModal } from '../../features/library/BookFormModal';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

const IMPORT_FIELDS = [
  { name: 'Book_Title', required: true, example: 'Introduction to Algorithms' },
  { name: 'No_of_Copies', required: true, example: '5' },
  { name: 'Author', example: 'Thomas H. Cormen' },
  { name: 'ISBN', example: '978-0262033848' },
  { name: 'Category', example: 'Textbook' },
  { name: 'Edition', example: '3rd' },
  { name: 'Price', example: '850' },
  { name: 'Rack_No', example: 'A-3' },
  { name: 'Vendor_Name', example: 'Campus Books' },
  { name: 'Purchase_Date', example: '2026-08-15' },
];
const TABS = [{ id: 'inventory', label: 'Inventory' }, { id: 'circulation', label: 'Book Circulation' }, { id: 'settings', label: 'Settings' }] as const;
const LOAN_FILTERS: Array<{ id: 'active' | 'overdue' | 'returned' | 'all'; label: string }> = [
  { id: 'active', label: 'Active' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'returned', label: 'Returned' },
  { id: 'all', label: 'All History' },
];
const fmtDate = (d: any) => (d ? new Date(d).toLocaleDateString() : '-');
const studentLabel = (s: any) => s?.user?.name || s?.name || s?.user?.email || s?.rollNumber || 'Student';

/** Web: pages/admin/library/Library.jsx (Inventory / Book Circulation / Settings) */
export default function LibraryScreen() {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { books, isLoading, addBook, updateBook, deleteBook, isAdding, isUpdating, isImporting, bulkImport, refetch } = useLibrary(collegeId);

  const [tab, setTab] = useState<'inventory' | 'circulation' | 'settings'>('inventory');
  const lib = useLibrarySettings(tab === 'settings');

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [loanFilter, setLoanFilter] = useState<'active' | 'overdue' | 'returned' | 'all'>('active');
  const circ = useLibraryCirculation(loanFilter, tab === 'circulation');

  // issue book popup
  const [issueOpen, setIssueOpen] = useState(false);
  const [studentQ, setStudentQ] = useState('');
  const [bookQ, setBookQ] = useState('');
  const [pickedStudent, setPickedStudent] = useState<any>(null);
  const [pickedBook, setPickedBook] = useState<any>(null);

  // settings form
  const [sForm, setSForm] = useState<any>({ ...DEFAULT_LIBRARY_SETTINGS });
  useEffect(() => {
    const s = lib.settings || DEFAULT_LIBRARY_SETTINGS;
    setSForm({ loanDays: String(s.loanDays), maxBooksPerStudent: String(s.maxBooksPerStudent), maxRenewals: String(s.maxRenewals), graceDays: String(s.graceDays), finePerDay: String(s.finePerDay) });
  }, [lib.settings]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return books;
    return books.filter((b: any) => (b.title || '').toLowerCase().includes(q) || (b.author || '').toLowerCase().includes(q) || (b.isbn || '').toLowerCase().includes(q));
  }, [books, searchTerm]);
  const rows = filtered.slice((page - 1) * size, page * size);

  const openIssue = (book: any = null) => {
    setPickedStudent(null); setSummary(null); setStudentQ(''); setBookQ(''); setPickedBook(book);
    setIssueOpen(true);
  };
  const [studentMatches, setStudentMatches] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  useEffect(() => {
    const q = studentQ.trim();
    if (q.length < 2) { setStudentMatches([]); return; }
    const t = setTimeout(async () => setStudentMatches(await searchLibraryStudents(q)), 350);
    return () => clearTimeout(t);
  }, [studentQ]);
  const chooseStudent = async (s: any) => {
    setPickedStudent(s);
    setSummary(null);
    setSummary(await getLibraryStudentSummary(s.id));
  };
  const bookMatches = useMemo(() => {
    const q = bookQ.trim().toLowerCase();
    return books.filter((b: any) => (b.availableCopies ?? 0) > 0 && (!q || `${b.title} ${b.author || ''} ${b.isbn || ''}`.toLowerCase().includes(q))).slice(0, 8);
  }, [books, bookQ]);

  const submitIssue = async () => {
    if (!pickedStudent || !pickedBook) return;
    try {
      await circ.issueBook({ studentId: pickedStudent.id, bookId: pickedBook.id });
      setIssueOpen(false);
      await refetch();
    } catch { /* toast shown */ }
  };

  const handleDelete = async (id: string) => {
    if (await confirm({ title: 'Remove Book', message: 'Are you sure you want to remove this book from the library?', confirmText: 'Remove', isDestructive: true })) {
      await deleteBook(id).catch(() => {});
    }
  };
  const handleSubmit = async (data: any) => {
    try {
      if (editingBook) await updateBook({ id: editingBook.id, data });
      else await addBook(data);
      setIsFormOpen(false);
    } catch { /* toast shown */ }
  };

  const loansShown = useMemo(() => {
    return circ.loans; // already filtered server-side (status / overdue)
  }, [circ.loans]);

  const saveSettings = async () => {
    const data = {
      loanDays: Number(sForm.loanDays) || 0, maxBooksPerStudent: Number(sForm.maxBooksPerStudent) || 0,
      maxRenewals: Number(sForm.maxRenewals) || 0, graceDays: Number(sForm.graceDays) || 0, finePerDay: Number(sForm.finePerDay) || 0,
    };
    if (data.loanDays < 1) { toast.error('Loan period must be at least 1 day'); return; }
    await lib.saveSettings(data).catch(() => {});
  };
  const num = (k: string) => (v: string) => setSForm((p: any) => ({ ...p, [k]: v.replace(/[^0-9.]/g, '') }));
  const dueExample = new Date(Date.now() + (Number(sForm.loanDays) || 0) * 86400000).toLocaleDateString();
  const lateFine = Math.max(0, 5 - (Number(sForm.graceDays) || 0)) * (Number(sForm.finePerDay) || 0);

  const Pill = ({ active, label, onPress }: any) => (
    <Pressable onPress={onPress} style={[styles.pill, { backgroundColor: active ? colors.primary : colors.card, borderColor: active ? colors.primary : colors.border }]}>
      <Text style={{ color: active ? colors.onPrimary : colors.textMuted, fontSize: 12, fontWeight: fontWeight.bold }}>{label}</Text>
    </Pressable>
  );

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => { setIsRefreshing(true); await Promise.all([refetch(), tab === 'circulation' ? circ.refetch() : Promise.resolve()]); setIsRefreshing(false); }}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Library Management</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Manage physical book inventory and track borrowing.</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button title="Add New Book" size="sm" fullWidth={false} icon={Plus} onPress={() => { setEditingBook(null); setIsFormOpen(true); }} />
        <ExcelUploadButton
          label="Import" title="Import Books" description="Upload an Excel (.xlsx, .xls) or CSV file of library books."
          fields={IMPORT_FIELDS} sampleFileName="library_import_template.xlsx" onUpload={bulkImport} isLoading={isImporting}
        />
      </View>

      <View style={[styles.tabsRow, { borderColor: colors.border }]}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <Pressable key={t.id} onPress={() => setTab(t.id)} style={[styles.tab, active && { borderBottomColor: colors.primary }]}>
              <Text style={{ color: active ? colors.primary : colors.textMuted, fontSize: 13, fontWeight: fontWeight.bold }} numberOfLines={1}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {tab === 'inventory' ? (
        <>
          <SearchBar value={searchTerm} onChangeText={(t) => { setSearchTerm(t); setPage(1); }} placeholder="Search by title, author, or ISBN..." style={styles.search} />
          {isLoading ? (
            <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
          ) : filtered.length === 0 ? (
            <EmptyState icon={LibIcon} title="No books found" message="Add some books to your library inventory." />
          ) : (
            <>
              {rows.map((book: any) => {
                const none = (book.availableCopies ?? 0) <= 0;
                return (
                  <Card key={book.id} style={styles.card}>
                    <View style={styles.top}>
                      <View style={[styles.bookIcon, { backgroundColor: colors.primarySoft }]}><Book size={18} color={colors.primary} /></View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>{book.title}</Text>
                        <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>by {book.author || 'Unknown'}</Text>
                      </View>
                      <Text style={[styles.price, { color: colors.text }]}>{book.price != null ? `₹${Number(book.price).toFixed(2)}` : '-'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <Badge label={book.category || 'N/A'} tone="info" />
                      <Text style={[styles.meta, { color: colors.textSubtle }]}>ISBN: {book.isbn || 'N/A'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={[styles.avail, { color: none ? colors.danger : colors.success }]}>{book.availableCopies ?? 0}</Text>
                        <Text style={[styles.meta, { color: colors.textMuted }]}> / {book.totalCopies ?? 0} available</Text>
                      </View>
                      {book.location ? <Text style={[styles.meta, { color: colors.textSubtle }]}>{book.location}</Text> : null}
                    </View>
                    <View style={styles.cardActions}>
                      <Pressable disabled={none} onPress={() => openIssue(book)} style={[styles.actionBtn, { borderColor: colors.border, opacity: none ? 0.4 : 1 }]}><BookOpen size={15} color={colors.info} /><Text style={[styles.actionText, { color: colors.text }]}>Issue</Text></Pressable>
                      <Pressable onPress={() => { setEditingBook(book); setIsFormOpen(true); }} style={[styles.actionBtn, { borderColor: colors.border }]}><Edit size={15} color={colors.primary} /><Text style={[styles.actionText, { color: colors.text }]}>Edit</Text></Pressable>
                      <Pressable onPress={() => handleDelete(book.id)} style={[styles.actionBtn, { borderColor: colors.border }]}><Trash2 size={15} color={colors.danger} /><Text style={[styles.actionText, { color: colors.text }]}>Delete</Text></Pressable>
                    </View>
                  </Card>
                );
              })}
              <Pagination totalItems={filtered.length} currentPage={page} pageSize={size} onPageChange={setPage} onPageSizeChange={(s) => { setSize(s); setPage(1); }} />
            </>
          )}
        </>
      ) : null}

      {tab === 'circulation' ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.rowScroll} contentContainerStyle={styles.rowContent}>
            {LOAN_FILTERS.map((f) => <Pill key={f.id} active={loanFilter === f.id} label={f.label} onPress={() => setLoanFilter(f.id)} />)}
          </ScrollView>
          <View style={styles.actions}><Button title="Issue Book" size="sm" fullWidth={false} icon={BookOpen} onPress={() => openIssue()} /></View>
          {circ.isLoading ? (
            <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
          ) : loansShown.length === 0 ? (
            <EmptyState icon={BookOpen} title="No records" message="Nothing matches this filter yet." />
          ) : (
            loansShown.map((l: any) => {
              const returned = l.status !== 'ISSUED';
              const overdue = !returned && !!l.isOverdue;
              const status = returned ? String(l.status || 'returned').toLowerCase() : overdue ? 'overdue' : 'active';
              const fine = returned ? Number(l.fineAmount || 0) : Number(l.accruingFine || 0);
              return (
                <Card key={l.id} style={styles.card}>
                  <View style={styles.top}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{studentLabel(l.student)}</Text>
                      <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>{l.book?.title || 'Book'}</Text>
                    </View>
                    <Badge label={status.toUpperCase()} tone={status === 'overdue' ? 'danger' : toneForStatus(status === 'active' ? 'pending' : status)} small />
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.meta, { color: colors.textSubtle }]}>Issued: {fmtDate(l.issueDate)}</Text>
                    <Text style={[styles.meta, { color: colors.textSubtle }]}>Due: {fmtDate(l.dueDate)}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={[styles.meta, { color: fine > 0 ? colors.danger : colors.textSubtle }]}>Fine: ₹{fine.toFixed(2)}</Text>
                    {!returned ? (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {!overdue ? (
                          <Pressable disabled={circ.isBusy} onPress={() => circ.renewBook(l.id).catch(() => {})} style={[styles.returnBtn, { backgroundColor: colors.infoSoft }]}>
                            <Text style={{ color: colors.info, fontSize: 12, fontWeight: fontWeight.extrabold }}>Renew</Text>
                          </Pressable>
                        ) : null}
                        <Pressable disabled={circ.isBusy} onPress={async () => { if (await confirm({ title: 'Return Book', message: 'Mark this book as returned?', confirmText: 'Return', isDestructive: false })) { await circ.returnBook(l.id).catch(() => {}); await refetch(); } }} style={[styles.returnBtn, { backgroundColor: colors.successSoft }]}>
                          <Text style={{ color: colors.success, fontSize: 12, fontWeight: fontWeight.extrabold }}>Return</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                </Card>
              );
            })
          )}
        </>
      ) : null}

      {tab === 'settings' ? (
        lib.isLoading ? (
          <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <>
            <Card style={styles.settingsCard}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Circulation Rules</Text>
              <Text style={[styles.meta, { color: colors.textMuted, marginBottom: 12 }]}>These rules apply to your college only.</Text>
              <Input label="Loan period (days)" value={String(sForm.loanDays)} onChangeText={num('loanDays')} keyboardType="number-pad" hint="How long a student can keep a book before it is due." />
              <Input label="Max books per student" value={String(sForm.maxBooksPerStudent)} onChangeText={num('maxBooksPerStudent')} keyboardType="number-pad" hint="Books one student can hold at the same time." />
              <Input label="Max renewals per loan" value={String(sForm.maxRenewals)} onChangeText={num('maxRenewals')} keyboardType="number-pad" hint="Set 0 to turn renewals off." />
              <Input label="Grace days" value={String(sForm.graceDays)} onChangeText={num('graceDays')} keyboardType="number-pad" hint="Late days that are not charged after the due date." />
              <Input label="Fine per day (₹)" value={String(sForm.finePerDay)} onChangeText={num('finePerDay')} keyboardType="decimal-pad" hint="Charged for each late day. Set 0 for no fines." />
              <Button title="Save Settings" loading={lib.isSaving} onPress={saveSettings} />
            </Card>
            <Card style={styles.settingsCard}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Preview</Text>
              <Text style={[styles.meta, { color: colors.textMuted, lineHeight: 18 }]}>A book issued today is due on <Text style={{ color: colors.text, fontWeight: fontWeight.extrabold }}>{dueExample}</Text>.</Text>
              <Text style={[styles.meta, { color: colors.textMuted, lineHeight: 18, marginTop: 6 }]}>Returned 5 days late, the fine is <Text style={{ color: colors.text, fontWeight: fontWeight.extrabold }}>₹{lateFine.toFixed(2)}</Text>.</Text>
            </Card>
          </>
        )
      ) : null}

      <BookFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleSubmit} initialData={editingBook} isLoading={isAdding || isUpdating} />

      {/* Issue Book popup */}
      <SheetModal
        visible={issueOpen} onClose={() => setIssueOpen(false)} title="Issue Book" tall
        footer={<View style={styles.footer}><Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={() => setIssueOpen(false)} /><View style={{ width: 10 }} /><Button title="Issue Book" loading={circ.isBusy} disabled={!pickedStudent || !pickedBook || summary?.canBorrow === false} style={{ flex: 1 }} onPress={submitIssue} /></View>}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Student</Text>
        {pickedStudent ? (
          <Pressable onPress={() => setPickedStudent(null)} style={[styles.picked, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Text style={{ color: colors.text, fontWeight: fontWeight.bold, flex: 1 }} numberOfLines={1}>{studentLabel(pickedStudent)}</Text>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: fontWeight.bold }}>Change</Text>
          </Pressable>
        ) : (
          <>
            <SearchBar value={studentQ} onChangeText={setStudentQ} placeholder="Search by name, roll number or admission number..." />
            {studentMatches.map((s: any) => (
              <Pressable key={s.id} onPress={() => chooseStudent(s)} style={[styles.option, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text, fontWeight: fontWeight.semibold }} numberOfLines={1}>{studentLabel(s)}</Text>
                <Text style={[styles.meta, { color: colors.textSubtle }]}>{[s.rollNumber, s.admissionNumber, s.department?.name].filter(Boolean).join(' • ')}</Text>
              </Pressable>
            ))}
          </>
        )}

        {pickedStudent && summary?.blockedReason ? (
          <Text style={[styles.meta, { color: colors.danger, marginTop: 6, fontWeight: fontWeight.bold }]}>{summary.blockedReason} ({summary.activeLoans?.length || 0}/{summary.limit})</Text>
        ) : null}
        {pickedStudent && summary && Number(summary.pendingFines) > 0 ? (
          <Text style={[styles.meta, { color: colors.warning, marginTop: 4 }]}>Pending fines: ₹{Number(summary.pendingFines).toFixed(2)}</Text>
        ) : null}

        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 14 }]}>2. Book</Text>
        {pickedBook ? (
          <Pressable onPress={() => setPickedBook(null)} style={[styles.picked, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <Text style={{ color: colors.text, fontWeight: fontWeight.bold, flex: 1 }} numberOfLines={2}>{pickedBook.title}</Text>
            <Text style={{ color: colors.primary, fontSize: 11, fontWeight: fontWeight.bold }}>Change</Text>
          </Pressable>
        ) : (
          <>
            <SearchBar value={bookQ} onChangeText={setBookQ} placeholder="Search available books by title, author or ISBN..." />
            {bookMatches.map((b: any) => (
              <Pressable key={b.id} onPress={() => setPickedBook(b)} style={[styles.option, { borderColor: colors.border, flexDirection: 'row', alignItems: 'center' }]}>
                <Text style={{ color: colors.text, fontWeight: fontWeight.semibold, flex: 1 }} numberOfLines={2}>{b.title}</Text>
                <Text style={[styles.meta, { color: colors.textMuted, marginLeft: 8 }]}>{b.availableCopies} available</Text>
              </Pressable>
            ))}
          </>
        )}
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, marginTop: 3, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'center' },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1, marginBottom: 12 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent', marginBottom: -1 },
  rowScroll: { flexGrow: 0, marginBottom: 10 },
  rowContent: { gap: 8, paddingVertical: 2 },
  pill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, height: 36, alignItems: 'center', justifyContent: 'center' },
  search: { marginBottom: 12 },
  loader: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: 10, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'center' },
  bookIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  meta: { fontSize: 11 },
  price: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold, marginLeft: 8 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  avail: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 10, minHeight: 36, gap: 5 },
  actionText: { fontSize: 11, fontWeight: fontWeight.bold },
  returnBtn: { borderRadius: 10, paddingHorizontal: 14, height: 32, alignItems: 'center', justifyContent: 'center' },
  settingsCard: { padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold, marginBottom: 8 },
  footer: { flexDirection: 'row', marginTop: 6 },
  picked: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, padding: 12 },
  option: { borderBottomWidth: 1, paddingVertical: 10, paddingHorizontal: 4 },
});