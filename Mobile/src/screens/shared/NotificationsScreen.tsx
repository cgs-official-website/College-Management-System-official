import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Plus, RefreshCw, Trash2, FileText, Search } from 'lucide-react-native';
import { api } from '../../api/client';
import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SearchBar } from '../../components/ui/SearchBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { SheetModal } from '../../components/ui/SheetModal';

const ENDPOINT = '/notices';
const FIELDS: Array<[string, string]> = [['title', 'Notice title'], ['content', 'Notice content'], ['targetAudience', 'Target audience'], ['priority', 'Priority']];
const title = 'Notice Board';
const titleCase = (v: string) => v.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase());
const asRows = (res: any): any[] => {
  const candidates = [res?.data?.items, res?.data?.data, res?.data, res?.items, res?.results, res];
  return candidates.find(Array.isArray) || [];
};
const getTitle = (row: any) => String(row?.title || row?.name || row?.companyName || row?.vehicleNumber || row?.studentName || row?.roleName || row?.id || 'Untitled');

export default function NoticeBoardScreen() {
  const { colors } = useTheme();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try { const res = await api.get<any>(ENDPOINT); setRows(asRows(res)); setError(''); }
    catch (e: any) { setError(e?.message || 'Could not load data. Pull down to retry.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter(r => JSON.stringify(r).toLowerCase().includes(q)) : rows;
  }, [rows, query]);

  const submit = async () => {
    if (!FIELDS.length) return;
    const first = FIELDS.find(([key]) => !String(values[key] || '').trim());
    if (first) { Alert.alert('Required field', `${first[1]} is required.`); return; }
    const payload: Record<string, any> = { ...values };
    for (const key of ['totalRooms', 'occupied', 'capacity']) if (payload[key] !== undefined && payload[key] !== '') payload[key] = Number(payload[key]) || 0;
    setSaving(true);
    try {
      await api.post(ENDPOINT, payload);
      setModal(false); setValues({}); await load(true);
    } catch (e: any) { Alert.alert('Could not save', e?.message || 'Please check the fields and try again.'); }
    finally { setSaving(false); }
  };

  const remove = (row: any) => {
    if (!row?.id) { Alert.alert('Unavailable', 'This record does not include an ID for deletion.'); return; }
    Alert.alert('Delete record', `Delete “${getTitle(row)}”?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await api.delete(`${ENDPOINT}/${row.id}`); setRows(old => old.filter(x => x.id !== row.id)); }
        catch (e: any) { Alert.alert('Delete failed', e?.message || 'Please try again.'); }
      } }
    ]);
  };

  return <Screen refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(true); }}>
    <View style={styles.headingRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]}>Notice Board</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Publish and manage college notices.</Text>
      </View>
      <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}><FileText size={22} color={colors.primary} /></View>
    </View>
    <View style={styles.statsRow}>
      <Card style={styles.statCard}><Text style={[styles.statLabel, { color: colors.textMuted }]}>Total records</Text><Text style={[styles.statValue, { color: colors.text }]}>{rows.length}</Text></Card>
      <Button title="Refresh" size="sm" variant="outline" fullWidth={false} icon={RefreshCw} loading={refreshing} onPress={() => { setRefreshing(true); void load(true); }} />
    </View>
    {FIELDS.length > 0 && <View style={styles.actionRow}><Button title={`Add ${title.replace(' Management','').replace(' & Accommodation',' block').replace(' Board',' notice')}`} size="sm" fullWidth icon={Plus} onPress={() => { setValues({}); setModal(true); }} /></View>}
    <SearchBar value={query} onChangeText={setQuery} placeholder={`Search ${title.toLowerCase()}...`} style={styles.search} />
    {loading ? <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View> : filtered.length === 0 ? <EmptyState icon={FileText} title={error ? 'Unable to load records' : `No ${title.toLowerCase()} found`} message={error || (query ? 'Try a different search.' : 'Records will appear here when available in your college account.')} actionLabel={error ? 'Retry' : undefined} onAction={error ? () => void load() : undefined} /> : filtered.map((row, index) => {
      const excluded = new Set(['id','collegeId','createdAt','updatedAt','deletedAt']);
      const entries = Object.entries(row).filter(([k,v]) => !excluded.has(k) && v !== null && typeof v !== 'object').slice(0, 6);
      return <Card key={String(row.id || row._id || index)} style={styles.rowCard}>
        <View style={styles.rowHeader}><View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}><FileText size={18} color={colors.primary} /></View><View style={{ flex: 1, minWidth: 0 }}><Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={2}>{getTitle(row)}</Text><Text style={[styles.rowMeta, { color: colors.textMuted }]} numberOfLines={1}>{row.status || row.type || row.category || 'Record'}</Text></View>{row.id ? <Pressable onPress={() => remove(row)} hitSlop={10} style={styles.delete}><Trash2 size={18} color={colors.danger} /></Pressable> : null}</View>
        {entries.map(([key, value]) => <View key={key} style={styles.detailRow}><Text style={[styles.detailLabel, { color: colors.textMuted }]}>{titleCase(key)}</Text><Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={2}>{String(value)}</Text></View>)}
      </Card>;
    })}
    <SheetModal visible={modal} onClose={() => setModal(false)} title={`Add ${title}`} tall footer={<View style={styles.footer}><Button title="Cancel" variant="outline" onPress={() => setModal(false)} style={{ flex: 1 }} /><View style={{ width: 10 }} /><Button title="Save" loading={saving} onPress={submit} style={{ flex: 1 }} /></View>}>
      {FIELDS.map(([key, label]) => <Input key={key} label={label} value={values[key] || ''} onChangeText={v => setValues(old => ({ ...old, [key]: v }))} placeholder={label} keyboardType={['totalRooms','occupied','capacity'].includes(key) ? 'number-pad' : 'default'} multiline={['description','content'].includes(key)} />)}
    </SheetModal>
  </Screen>;
}

const styles = StyleSheet.create({
  headingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 12 },
  title: { fontSize: 24, fontWeight: '800' }, subtitle: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  iconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, padding: 14, marginBottom: 0 }, statLabel: { fontSize: 12 }, statValue: { fontSize: 24, fontWeight: '800', marginTop: 4 },
  actionRow: { marginBottom: 12 }, search: { marginBottom: 12 }, loader: { paddingVertical: 56, alignItems: 'center' },
  rowCard: { marginBottom: 10, padding: 14 }, rowHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, rowTitle: { fontSize: 15, fontWeight: '800' }, rowMeta: { fontSize: 12, marginTop: 3, textTransform: 'capitalize' }, delete: { padding: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DCE4EA', paddingTop: 8, marginTop: 4 }, detailLabel: { flex: 0.8, fontSize: 12 }, detailValue: { flex: 1.2, fontSize: 12, textAlign: 'right' },
  footer: { flexDirection: 'row' },
});
