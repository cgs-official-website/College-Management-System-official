import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, Clock, Edit, Megaphone, Plus, Trash2 } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useNotices } from '../../hooks/useNotices';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SearchBar } from '../../components/ui/SearchBar';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { NoticeFormModal } from '../../features/notices/NoticeFormModal';
import { fontSize, fontWeight } from '../../theme/typography';

const priorityTone = (p?: string): BadgeTone => (p === 'high' ? 'danger' : p === 'low' ? 'neutral' : 'success');

/** Web: pages/admin/notices/NoticeBoard.jsx */
export default function NoticeBoardScreen() {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { notices, isLoading, addNotice, updateNotice, deleteNotice, isAdding, isUpdating, refresh } = useNotices(collegeId);

  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNotice, setEditingNotice] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredNotices = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return notices.filter((n: any) => (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q));
  }, [notices, searchTerm]);
  const paginated = filteredNotices.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDelete = async (id: string) => {
    if (await confirm({ message: 'Are you sure you want to delete this notice?', confirmText: 'Delete', isDestructive: true })) {
      await deleteNotice(id);
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editingNotice) await updateNotice({ id: editingNotice.id, data });
      else await addNotice(data);
      setIsFormOpen(false);
    } catch {
      // toast already shown by the hook
    }
  };

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => { setIsRefreshing(true); await refresh(); setIsRefreshing(false); }}>
      <View style={styles.headingRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Notice Board</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Broadcast announcements to students and staff.</Text>
        </View>
      </View>
      <View style={styles.actions}>
        <Button title="Create Notice" size="sm" fullWidth={false} icon={Plus} onPress={() => { setEditingNotice(null); setIsFormOpen(true); }} />
      </View>

      <SearchBar value={searchTerm} onChangeText={(t) => { setSearchTerm(t); setCurrentPage(1); }} placeholder="Search notices..." style={styles.search} />

      {isLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : filteredNotices.length === 0 ? (
        <EmptyState icon={Megaphone} title="No notices found" message='Tap "Create Notice" to broadcast your first announcement.' />
      ) : (
        <>
          {paginated.map((notice: any) => (
            <Card key={notice.id} style={styles.card}>
              <View style={styles.top}>
                <View style={styles.priorityRow}>
                  {notice.priority === 'high' ? <AlertCircle size={13} color={colors.danger} style={{ marginRight: 4 }} /> : null}
                  <Badge label={String(notice.priority || 'normal').toUpperCase()} tone={priorityTone(notice.priority)} small />
                </View>
                <View style={{ flex: 1 }} />
                <Pressable onPress={() => { setEditingNotice(notice); setIsFormOpen(true); }} hitSlop={8} style={[styles.iconBtn, { backgroundColor: colors.cardAlt }]}>
                  <Edit size={15} color={colors.primary} />
                </Pressable>
                <Pressable onPress={() => handleDelete(notice.id)} hitSlop={8} style={[styles.iconBtn, { backgroundColor: colors.cardAlt, marginLeft: 8 }]}>
                  <Trash2 size={15} color={colors.danger} />
                </Pressable>
              </View>

              <Text style={[styles.noticeTitle, { color: colors.text }]} numberOfLines={2}>{notice.title}</Text>
              <Text style={[styles.content, { color: colors.textMuted }]} numberOfLines={4}>{notice.content}</Text>

              <View style={[styles.bottom, { borderTopColor: colors.border }]}>
                <View style={styles.dateRow}>
                  <Clock size={13} color={colors.textSubtle} />
                  <Text style={[styles.date, { color: colors.textMuted }]}>{notice.createdAt ? new Date(notice.createdAt).toLocaleDateString() : 'Just now'}</Text>
                </View>
                <View style={[styles.audience, { backgroundColor: colors.cardAlt }]}>
                  <Text style={[styles.audienceText, { color: colors.text }]}>{notice.targetAudience === 'all' ? 'EVERYONE' : String(notice.targetAudience || '').toUpperCase()}</Text>
                </View>
              </View>
            </Card>
          ))}
          <Pagination totalItems={filteredNotices.length} currentPage={currentPage} pageSize={pageSize} pageSizeOptions={[10, 20, 50, 100]} onPageChange={setCurrentPage} onPageSizeChange={(s) => { setPageSize(s); setCurrentPage(1); }} />
        </>
      )}

      <NoticeFormModal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} onSubmit={handleSubmit} initialData={editingNotice} isLoading={isAdding || isUpdating} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, marginTop: 3, lineHeight: 19 },
  actions: { flexDirection: 'row', marginBottom: 12 },
  search: { marginBottom: 12 },
  loader: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  card: { marginBottom: 10, padding: 14 },
  top: { flexDirection: 'row', alignItems: 'center' },
  priorityRow: { flexDirection: 'row', alignItems: 'center' },
  iconBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  noticeTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, marginTop: 12 },
  content: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 6 },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, marginTop: 14, paddingTop: 12 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  date: { fontSize: 11, fontWeight: fontWeight.medium },
  audience: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  audienceText: { fontSize: 10, fontWeight: fontWeight.extrabold, letterSpacing: 0.4 },
});