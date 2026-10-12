import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  History,
  IndianRupee,
  Info,
  Library as LibraryIcon,
  MapPin,
  RotateCcw,
} from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Tabs } from '../../components/ui/Tabs';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { SearchBar } from '../../components/ui/SearchBar';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { useStudentLibrary, useStudentMyBooks, useStudentBookHistory } from '../../hooks/useStudentPortal';
import { formatDate } from '../../utils/format';
import { fontSize, fontWeight } from '../../theme/typography';

const PAGE = 20;
const money = (n: any) => `₹${Number(n || 0).toFixed(2)}`;
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

const FINE_BADGE: Record<string, { label: string; tone: BadgeTone }> = {
  NONE: { label: 'No fine', tone: 'neutral' },
  PENDING: { label: 'Pending, pay at library', tone: 'warning' },
  PAID: { label: 'Paid', tone: 'success' },
  WAIVED: { label: 'Waived', tone: 'info' },
};

/** Book title block shared by catalog + loans */
function BookInfo({ book }: { book: any }) {
  const { colors } = useTheme();
  const rack = book?.rackNo ? `Rack: ${book.rackNo}` : book?.location;
  return (
    <>
      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
        {book?.title}
      </Text>
      {book?.author ? (
        <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
          Author: <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>{book.author}</Text>
        </Text>
      ) : null}
      {book?.isbn ? <Text style={[styles.meta, { color: colors.textMuted }]}>ISBN: {book.isbn}</Text> : null}
      <View style={styles.tagRow}>
        {book?.category ? <Badge label={book.category} tone="neutral" small /> : null}
        {rack ? (
          <View style={styles.rack}>
            <MapPin size={13} color={colors.success} />
            <Text style={[styles.meta, { color: colors.success, fontWeight: fontWeight.bold, marginTop: 0 }]}>{rack}</Text>
          </View>
        ) : null}
      </View>
    </>
  );
}

/* ------------------------------ Catalog ------------------------------ */
function CatalogView({ tabs }: { tabs: React.ReactNode }) {
  const { colors } = useTheme();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [shown, setShown] = useState(PAGE);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setShown(PAGE);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isRefreshing, refetch } = useStudentLibrary(debounced);
  const books: any[] = Array.isArray(data) ? data : [];
  const available = books.filter((b) => b.availableCopies > 0).length;

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefreshing} onRefresh={refetch}>
      <Text style={[styles.title, { color: colors.text }]}>Library Catalog</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Search the institutional book repository, check physical rack locations, and verify availability.
      </Text>

      <View style={styles.statsRow}>
        <StatCard compact title="Catalog Titles" value={books.length} icon={LibraryIcon} tone="primary" />
        <StatCard compact title="Available" value={available} icon={CheckCircle2} tone="success" />
        <StatCard compact title="Circulation" value="Open" icon={BookOpen} tone="info" />
      </View>

      {tabs}

      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search by title, author, or ISBN..."
        style={{ marginTop: 12, marginBottom: 12 }}
      />

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Books Directory</Text>
        <Badge label={`${books.length} Listed`} tone="neutral" />
      </View>

      {isLoading ? (
        <Loader label="Loading books..." />
      ) : books.length === 0 ? (
        <EmptyState
          icon={LibraryIcon}
          title="No Books Found"
          message="No library volumes match your search criteria. Try a different title or keyword."
        />
      ) : (
        <>
          {books.slice(0, shown).map((book) => {
            const ok = book.availableCopies > 0;
            return (
              <Card key={book.id} style={styles.card}>
                <View style={styles.row}>
                  <View style={[styles.iconBox, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
                    <BookOpen size={22} color={colors.primary} />
                  </View>
                  <View style={styles.body}>
                    <BookInfo book={book} />
                  </View>
                </View>
                <View style={[styles.footer, { borderTopColor: colors.border }]}>
                  <Badge
                    label={ok ? `${book.availableCopies} Copies Available` : 'Currently Checked Out'}
                    tone={ok ? 'success' : 'danger'}
                  />
                </View>
              </Card>
            );
          })}
          {shown < books.length ? (
            <Button title={`Show more (${books.length - shown} left)`} variant="outline" onPress={() => setShown((s) => s + PAGE)} />
          ) : null}
        </>
      )}
    </Screen>
  );
}

/* ------------------------------ My Books ------------------------------ */
function LoanStatus({ loan }: { loan: any }) {
  if (loan.isOverdue)
    return <Badge tone="danger" label={`Overdue by ${loan.daysOverdue} ${plural(loan.daysOverdue, 'day', 'days')}`} />;
  if (loan.isDueSoon)
    return <Badge tone="warning" label={`Due in ${loan.daysLeft} ${plural(loan.daysLeft, 'day', 'days')}`} />;
  return <Badge tone="success" label={`${loan.daysLeft} days left`} />;
}

function Notice({ tone, icon: Icon, text }: { tone: 'danger' | 'warning' | 'neutral'; icon: any; text: string }) {
  const { colors } = useTheme();
  const bg = tone === 'danger' ? colors.dangerSoft : tone === 'warning' ? colors.warningSoft : colors.cardAlt;
  const fg = tone === 'danger' ? colors.danger : tone === 'warning' ? colors.warning : colors.textMuted;
  return (
    <View style={[styles.notice, { backgroundColor: bg, borderColor: tone === 'neutral' ? colors.border : fg }]}>
      <Icon size={18} color={fg} style={{ marginTop: 1 }} />
      <Text style={[styles.noticeText, { color: tone === 'neutral' ? colors.text : fg }]}>{text}</Text>
    </View>
  );
}

function MyBooksView({ tabs }: { tabs: React.ReactNode }) {
  const { colors } = useTheme();
  const [page, setPage] = useState(1);
  const booksQ = useStudentMyBooks();
  const histQ = useStudentBookHistory(page);

  const summary = booksQ.data?.summary;
  const loans: any[] = booksQ.data?.loans || [];
  const history: any[] = histQ.data?.data || [];
  const meta = histQ.data?.meta || { page: 1, totalPages: 1, total: 0, limit: 10 };

  const refetchAll = async () => {
    await Promise.all([booksQ.refetch(), histQ.refetch()]);
  };

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={booksQ.isRefreshing || histQ.isRefreshing}
      onRefresh={refetchAll}>
      <Text style={[styles.title, { color: colors.text }]}>My Books</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Track the books issued to you, their due dates, fines and your borrowing history.
      </Text>

      {booksQ.isLoading || !summary ? (
        <>
          {tabs}
          <Loader label="Loading your books..." />
        </>
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard compact title="Borrowed" value={`${summary.borrowedCount} / ${summary.limit}`} icon={BookOpen} tone="primary" />
            <StatCard compact title="Due Soon" value={summary.dueSoonCount} icon={Clock} tone="warning" />
          </View>
          <View style={styles.statsRow}>
            <StatCard compact title="Overdue" value={summary.overdueCount} icon={AlertTriangle} tone="danger" />
            <StatCard
              compact
              title="Pending Fines"
              value={money(Number(summary.pendingFines || 0) + Number(summary.accruingFines || 0))}
              icon={IndianRupee}
              tone="success"
            />
          </View>

          {tabs}

          <View style={{ marginTop: 12 }}>
            {summary.overdueCount > 0 ? (
              <Notice
                tone="danger"
                icon={AlertTriangle}
                text={`You have ${summary.overdueCount} overdue ${plural(summary.overdueCount, 'book', 'books')}. Return ${plural(summary.overdueCount, 'it', 'them')} to the library to avoid more fines of ${money(summary.finePerDay)} per day.`}
              />
            ) : summary.dueSoonCount > 0 ? (
              <Notice
                tone="warning"
                icon={Clock}
                text={`${summary.dueSoonCount} ${plural(summary.dueSoonCount, 'book is', 'books are')} due within 3 days. Return or renew at the library desk.`}
              />
            ) : null}
            {!summary.canBorrow && summary.overdueCount === 0 ? (
              <Notice tone="neutral" icon={Info} text={`${summary.blockedReason}.`} />
            ) : null}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Currently Borrowed</Text>
            <Badge label={`${loans.length} ${plural(loans.length, 'Book', 'Books')}`} tone="neutral" />
          </View>

          {loans.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No books borrowed"
              message="Books issued to you by the library will appear here with their due dates."
            />
          ) : (
            loans.map((loan) => (
              <Card key={loan.id} style={styles.card}>
                <View style={styles.row}>
                  <View style={[styles.iconBox, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
                    <BookOpen size={22} color={colors.primary} />
                  </View>
                  <View style={styles.body}>
                    <BookInfo book={loan.book} />
                  </View>
                </View>
                <View style={{ marginTop: 12 }}>
                  <LoanStatus loan={loan} />
                </View>

                <View style={[styles.grid, { backgroundColor: colors.cardAlt }]}>
                  <View style={styles.gridCell}>
                    <View style={styles.gridLabelRow}>
                      <CalendarDays size={13} color={colors.textMuted} />
                      <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Issued on</Text>
                    </View>
                    <Text style={[styles.gridValue, { color: colors.text }]}>{formatDate(loan.issueDate)}</Text>
                  </View>
                  <View style={styles.gridCell}>
                    <View style={styles.gridLabelRow}>
                      <Clock size={13} color={colors.textMuted} />
                      <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Due date</Text>
                    </View>
                    <Text style={[styles.gridValue, { color: loan.isOverdue ? colors.danger : colors.text }]}>
                      {formatDate(loan.dueDate)}
                    </Text>
                  </View>
                  <View style={styles.gridCell}>
                    <View style={styles.gridLabelRow}>
                      <RotateCcw size={13} color={colors.textMuted} />
                      <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Renewals</Text>
                    </View>
                    <Text style={[styles.gridValue, { color: colors.text }]}>
                      {loan.renewCount} of {loan.maxRenewals} used
                    </Text>
                  </View>
                  <View style={styles.gridCell}>
                    <View style={styles.gridLabelRow}>
                      <IndianRupee size={13} color={colors.textMuted} />
                      <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Fine so far</Text>
                    </View>
                    <Text style={[styles.gridValue, { color: loan.accruingFine > 0 ? colors.danger : colors.text }]}>
                      {loan.accruingFine > 0 ? money(loan.accruingFine) : 'None'}
                    </Text>
                  </View>
                </View>

                {loan.remarks ? (
                  <Text style={[styles.meta, { color: colors.textMuted, marginTop: 10 }]}>Librarian note: {loan.remarks}</Text>
                ) : null}
                <Text style={[styles.meta, { color: colors.textSubtle, marginTop: 6 }]}>
                  To renew or return this book, visit the library desk.
                </Text>
              </Card>
            ))
          )}

          <View style={[styles.sectionHeader, { marginTop: 8 }]}>
            <View style={styles.inline}>
              <History size={18} color={colors.textMuted} />
              <Text style={[styles.sectionTitle, { color: colors.text, marginLeft: 8 }]}>Borrowing History</Text>
            </View>
          </View>

          {histQ.isLoading ? (
            <Loader size="small" />
          ) : history.length === 0 ? (
            <Card>
              <Text style={[styles.empty, { color: colors.textMuted }]}>No returned books yet.</Text>
            </Card>
          ) : (
            <>
              {history.map((h) => {
                const fine = FINE_BADGE[h.fineStatus] || FINE_BADGE.NONE;
                const outcome = h.status === 'LOST' ? 'Lost' : h.condition === 'DAMAGED' ? 'Returned (damaged)' : 'Returned';
                return (
                  <Card key={h.id} style={styles.card}>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                      {h.book?.title}
                    </Text>
                    {h.book?.author ? (
                      <Text style={[styles.meta, { color: colors.textMuted }]}>by {h.book.author}</Text>
                    ) : null}

                    <View style={[styles.grid, { backgroundColor: colors.cardAlt }]}>
                      <View style={styles.gridCell}>
                        <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Issued</Text>
                        <Text style={[styles.gridValue, { color: colors.text }]}>{formatDate(h.issueDate)}</Text>
                      </View>
                      <View style={styles.gridCell}>
                        <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Due</Text>
                        <Text style={[styles.gridValue, { color: colors.text }]}>{formatDate(h.dueDate)}</Text>
                      </View>
                      <View style={styles.gridCell}>
                        <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Returned</Text>
                        <Text style={[styles.gridValue, { color: colors.text }]}>{formatDate(h.returnDate)}</Text>
                      </View>
                      <View style={styles.gridCell}>
                        <Text style={[styles.gridLabel, { color: colors.textMuted }]}>Outcome</Text>
                        <Text style={[styles.gridValue, { color: colors.text }]}>{outcome}</Text>
                        {h.lateDays > 0 ? (
                          <Text style={[styles.meta, { color: colors.danger, marginTop: 2 }]}>
                            {h.lateDays} late {plural(h.lateDays, 'day', 'days')}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View style={[styles.footer, { borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                      <Badge label={fine.label} tone={fine.tone} small />
                      {h.fineAmount > 0 ? (
                        <Text style={[styles.gridValue, { color: colors.text, marginTop: 0 }]}>{money(h.fineAmount)}</Text>
                      ) : null}
                    </View>
                  </Card>
                );
              })}
              {meta.totalPages > 1 ? (
                <Pagination totalItems={meta.total} currentPage={meta.page} pageSize={meta.limit || 10} onPageChange={setPage} />
              ) : null}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

/** Web: pages/student/StudentLibraryDashboard.jsx + MyBooksTab.jsx */
export default function StudentLibraryScreen() {
  const [tab, setTab] = useState<'catalog' | 'mybooks'>('catalog');
  const tabs = (
    <Tabs
      tabs={[
        { key: 'catalog', label: 'Catalog' },
        { key: 'mybooks', label: 'My Books' },
      ]}
      active={tab}
      onChange={(k) => setTab(k as 'catalog' | 'mybooks')}
    />
  );
  return tab === 'catalog' ? <CatalogView tabs={tabs} /> : <MyBooksView tabs={tabs} />;
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  subtitle: { fontSize: fontSize.sm, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 12 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  inline: { flexDirection: 'row', alignItems: 'center' },
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  iconBox: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  body: { flex: 1 },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  meta: { fontSize: fontSize.xs, marginTop: 3 },
  tagRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  rack: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footer: { marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  notice: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  noticeText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold, lineHeight: 19 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 12, padding: 12, marginTop: 12, rowGap: 12 },
  gridCell: { width: '50%' },
  gridLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  gridLabel: { fontSize: 11 },
  gridValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: 3 },
  empty: { textAlign: 'center', fontSize: fontSize.sm, paddingVertical: 12 },
});