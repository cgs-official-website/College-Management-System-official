import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, ChevronRight, LifeBuoy, MessageSquare, Plus, Send } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';
import { SheetModal } from './SheetModal';
import { Button } from './Button';
import { Input } from './Input';
import { Select } from './Select';
import { Badge } from './Badge';

/** Web: components/ui/RaiseTicketModal.jsx  (backend: modules/tickets -> GET/POST /tickets, POST /tickets/:id/reply) */
interface Props {
  visible: boolean;
  onClose: () => void;
  collegeName?: string;
}

const PRIORITIES = [
  { value: 'low', label: 'Low Priority' },
  { value: 'medium', label: 'Medium Priority' },
  { value: 'high', label: 'High Priority' },
  { value: 'urgent', label: 'Urgent Priority' },
];

const REPLY_MARK = /\n\n--- Reply from (.+?) \((.*?)\) ---\n/;

/** Backend appends replies into `description` as "--- Reply from <author> (<date>) ---"; split them back into messages. */
const splitTicket = (t: any) => {
  const raw: string = t?.description || '';
  const parts = raw.split(REPLY_MARK); // [body, author, date, text, author, date, text...]
  const body = parts[0] || '';
  const replies: { author: string; date: string; text: string; isAgent: boolean }[] = [];
  for (let i = 1; i + 2 < parts.length + 0; i += 3) {
    const author = parts[i];
    replies.push({ author, date: parts[i + 1], text: (parts[i + 2] || '').trim(), isAgent: /zuna support desk/i.test(author) });
  }
  return { body, replies };
};

const statusMeta = (s: string): { label: string; tone: any } => {
  switch (s) {
    case 'resolved': return { label: 'Resolved', tone: 'success' };
    case 'in-progress': return { label: 'In Progress', tone: 'warning' };
    case 'closed': return { label: 'Closed', tone: 'neutral' };
    default: return { label: 'Open', tone: 'info' };
  }
};

export function RaiseTicketModal({ visible, onClose, collegeName = 'College Administrator' }: Props) {
  const { colors, isDark } = useTheme();
  const accent = isDark ? '#f59e0b' : '#d97706';
  const accentSoft = isDark ? 'rgba(245,158,11,0.15)' : '#fffbeb';

  const [tab, setTab] = useState<'raise' | 'history'>('raise');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<any>('/tickets');
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setTickets(list);
      setSelected((cur: any) => (cur ? list.find((x: any) => x.id === cur.id) || cur : cur));
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load support tickets');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    setTab('raise');
    setSelected(null);
    setErrors({});
    void fetchTickets();
  }, [visible, fetchTickets]);

  const submit = async () => {
    const e: Record<string, string> = {};
    if (!subject.trim()) e.subject = 'Subject is required';
    if (!description.trim()) e.description = 'Description is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    setSubmitting(true);
    try {
      const res = await api.post<any>('/tickets', { subject: subject.trim(), description: description.trim(), priority });
      if (res?.data) setTickets((prev) => [res.data, ...prev]);
      toast.success('Ticket submitted! Zuna SuperAdmin will reply shortly.');
      setSubject('');
      setDescription('');
      setPriority('medium');
      setTab('history');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selected) return;
    setSending(true);
    try {
      await api.post(`/tickets/${selected.id}/reply`, { text: replyText.trim() });
      setReplyText('');
      await fetchTickets();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const TabBtn = ({ id, label, icon: Icon }: any) => {
    const active = tab === id;
    return (
      <Pressable
        onPress={() => { setTab(id); if (id === 'raise') setSelected(null); }}
        style={[styles.tab, { borderBottomColor: active ? accent : 'transparent', backgroundColor: active ? colors.card : 'transparent' }]}>
        <Icon size={15} color={active ? accent : colors.textMuted} />
        <Text style={{ color: active ? accent : colors.textMuted, fontSize: 12, fontWeight: fontWeight.bold, marginLeft: 6 }}>{label}</Text>
      </Pressable>
    );
  };

  const showReplyBar = tab === 'history' && !!selected;
  const footer = tab === 'raise' ? (
    <View style={styles.footerRow}>
      <Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={onClose} />
      <View style={{ width: 10 }} />
      <Pressable disabled={submitting} onPress={submit} style={[styles.submitBtn, { backgroundColor: accent, opacity: submitting ? 0.7 : 1 }]}>
        {submitting ? <ActivityIndicator color="#fff" /> : <><Send size={14} color="#fff" /><Text style={styles.submitText}>Submit to Zuna Admin</Text></>}
      </Pressable>
    </View>
  ) : showReplyBar ? (
    <View style={styles.footerRow}>
      <View style={{ flex: 1 }}>
        <Input placeholder="Write reply..." value={replyText} onChangeText={setReplyText} containerStyle={{ marginBottom: 0 }} />
      </View>
      <Pressable disabled={sending || !replyText.trim()} onPress={sendReply} style={[styles.replyBtn, { backgroundColor: accent, opacity: sending || !replyText.trim() ? 0.6 : 1 }]}>
        {sending ? <ActivityIndicator color="#fff" /> : <Send size={16} color="#fff" />}
      </Pressable>
    </View>
  ) : undefined;

  const detail = selected ? splitTicket(selected) : null;

  return (
    <SheetModal visible={visible} onClose={onClose} title="Zuna Central Support" tall footer={footer}>
      <View style={styles.subRow}>
        <View style={[styles.logo, { backgroundColor: accentSoft, borderColor: isDark ? 'rgba(245,158,11,0.35)' : '#fde68a' }]}><LifeBuoy size={20} color={accent} /></View>
        <Text style={[styles.subText, { color: colors.textMuted }]}>Direct support desk for College Administrators</Text>
      </View>

      <View style={[styles.tabs, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
        <TabBtn id="raise" label="Raise New Ticket" icon={Plus} />
        <TabBtn id="history" label={`My Tickets (${tickets.length})`} icon={MessageSquare} />
      </View>

      {tab === 'raise' ? (
        <>
          <Input label="Issue Subject" required placeholder="e.g. Admission Portal Fee Sync Issue" value={subject} onChangeText={setSubject} error={errors.subject} />
          <Select label="Priority" value={priority} onChange={setPriority} options={PRIORITIES} />
          <Input label="Product" editable={false} value="College Management" />
          <Input label="Detailed Description" required multiline placeholder="Describe the issue..." value={description} onChangeText={setDescription} error={errors.description} style={{ minHeight: 110, textAlignVertical: 'top' }} />
        </>
      ) : !selected ? (
        loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={accent} /><Text style={[styles.hint, { color: colors.textMuted }]}>Loading support tickets...</Text></View>
        ) : tickets.length === 0 ? (
          <Text style={[styles.empty, { color: colors.textSubtle }]}>No support tickets found.</Text>
        ) : (
          tickets.map((t: any) => {
            const m = statusMeta(t.status);
            const { body } = splitTicket(t);
            return (
              <Pressable key={t.id} onPress={() => setSelected(t)} style={[styles.ticket, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.ticketTop}>
                    <Text style={{ color: accent, fontSize: 12, fontWeight: fontWeight.extrabold }}>#{String(t.id).substring(0, 8)}</Text>
                    <View style={{ marginLeft: 8 }}><Badge label={m.label} tone={m.tone} small /></View>
                    <Text style={[styles.date, { color: colors.textSubtle }]}>{t.createdAt ? new Date(t.createdAt).toLocaleDateString() : 'Recently'}</Text>
                  </View>
                  <Text style={[styles.ticketTitle, { color: colors.text }]} numberOfLines={1}>{t.subject}</Text>
                  <Text style={[styles.hint, { color: colors.textMuted }]} numberOfLines={1}>{body}</Text>
                </View>
                <ChevronRight size={18} color={colors.textSubtle} />
              </Pressable>
            );
          })
        )
      ) : (
        <>
          <View style={styles.backRow}>
            <Pressable onPress={() => setSelected(null)} style={styles.backBtn}>
              <ArrowLeft size={14} color={accent} /><Text style={{ color: accent, fontSize: 12, fontWeight: fontWeight.bold, marginLeft: 4 }}>Back to My Tickets</Text>
            </Pressable>
            <Text style={{ color: colors.textSubtle, fontSize: 12, fontWeight: fontWeight.extrabold, marginRight: 8 }}>#{String(selected.id).substring(0, 8)}</Text>
            <Badge label={statusMeta(selected.status).label} tone={statusMeta(selected.status).tone} small />
          </View>
          <View style={[styles.bubbleTicket, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
            <Text style={[styles.hint, { color: colors.textMuted, fontWeight: fontWeight.bold }]}>Subject: {selected.subject}</Text>
            <Text style={[styles.bubbleText, { color: colors.text }]}>{detail?.body}</Text>
          </View>
          {(detail?.replies || []).map((r, i) => (
            <View key={i} style={{ alignItems: r.isAgent ? 'flex-start' : 'flex-end', marginBottom: 8 }}>
              <View style={[styles.bubble, r.isAgent ? { backgroundColor: accent } : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
                <View style={styles.bubbleHead}>
                  <Text style={{ color: r.isAgent ? '#fff' : colors.textMuted, fontSize: 10, fontWeight: fontWeight.bold, opacity: 0.85 }}>{r.isAgent ? 'Zuna SuperAdmin Support' : r.author || collegeName}</Text>
                  <Text style={{ color: r.isAgent ? '#fff' : colors.textMuted, fontSize: 10, opacity: 0.85, marginLeft: 12 }}>{r.date}</Text>
                </View>
                <Text style={{ color: r.isAgent ? '#fff' : colors.text, fontSize: 12, lineHeight: 18 }}>{r.text}</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </SheetModal>
  );
}

export default RaiseTicketModal;

const styles = StyleSheet.create({
  subRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  logo: { width: 40, height: 40, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  subText: { flex: 1, fontSize: 12, fontWeight: fontWeight.semibold },
  tabs: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, paddingHorizontal: 6, paddingTop: 6, marginBottom: 16 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderBottomWidth: 2, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  submitBtn: { flex: 2, height: 46, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  submitText: { color: '#fff', fontSize: 13, fontWeight: fontWeight.bold },
  replyBtn: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  center: { alignItems: 'center', paddingVertical: 36 },
  hint: { fontSize: 11, marginTop: 4 },
  empty: { textAlign: 'center', fontSize: fontSize.sm, fontWeight: fontWeight.bold, paddingVertical: 40 },
  ticket: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 10 },
  ticketTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  date: { marginLeft: 'auto', fontSize: 11 },
  ticketTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  backRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  backBtn: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  bubbleTicket: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 },
  bubbleText: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  bubble: { maxWidth: '88%', borderRadius: 14, padding: 12 },
  bubbleHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
});