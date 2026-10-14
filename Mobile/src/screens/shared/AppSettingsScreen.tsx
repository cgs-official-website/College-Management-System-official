import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, CheckCheck, LifeBuoy, Moon, Palette, Plus, Sun } from 'lucide-react-native';
import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';
import { formatDateTime } from '../../utils/format';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Tabs } from '../../components/ui/Tabs';
import { PageHeader } from '../../components/layout/ScreenHeader';
import { RaiseTicketModal } from '../../components/ui/RaiseTicketModal';
import { useUnreadNotificationCount } from '../../hooks/useUnreadNotificationCount';

/**
 * Settings module (all roles).
 *  - Appearance     : Light / Dark toggle (all roles)
 *  - Notifications  : bell list + unread badge (all roles)
 *  - Support        : Raise Support Ticket (college ADMIN only)
 * Web equivalent: pages/shared/AppSettings.jsx
 */

const asRows = (res: any): any[] => [res?.data?.data, res?.data, res?.items, res].find(Array.isArray) || [];

function AppearanceTab() {
  const { colors, isDark, setMode } = useTheme();
  const options = [
    { key: 'light' as const, label: 'Light', desc: 'Bright interface for daytime use.', Icon: Sun, active: !isDark },
    { key: 'dark' as const, label: 'Dark', desc: 'Easy on the eyes in low light.', Icon: Moon, active: isDark },
  ];
  return (
    <View style={{ gap: 12 }}>
      {options.map(({ key, label, desc, Icon, active }) => (
        <Pressable
          key={key}
          onPress={() => setMode(key)}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          style={[
            styles.option,
            { backgroundColor: active ? colors.primarySoft : colors.card, borderColor: active ? colors.primary : colors.border },
          ]}>
          <View style={[styles.optionIcon, { backgroundColor: key === 'dark' ? '#0f172a' : '#fffbeb' }]}>
            <Icon size={20} color={key === 'dark' ? '#fcd34d' : '#f59e0b'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.optionTitle, { color: colors.text }]}>{label}</Text>
            <Text style={[styles.muted, { color: colors.textMuted }]}>{desc}</Text>
          </View>
          {active ? <Badge label="Active" tone="success" /> : null}
        </Pressable>
      ))}
    </View>
  );
}

function NotificationsTab({ onCountChange }: { onCountChange: (n: number) => void }) {
  const { colors } = useTheme();
  const [filter, setFilter] = useState<'unread' | 'all'>('unread');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.get(`/notifications?page=1&limit=50${filter === 'unread' ? '&unreadOnly=true' : ''}`);
      const rows = asRows(res);
      setItems(filter === 'unread' ? rows.filter((n) => !n.isRead) : rows);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const unread = items.filter((n) => !n.isRead).length;

  const markRead = async (n: any) => {
    if (n.isRead) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
    try {
      await api.patch(`/notifications/${n.id}/read`);
    } catch {
      /* next poll will reconcile */
    }
    onCountChange(-1);
  };

  const markAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    try {
      await api.patch('/notifications/read-all');
    } catch {
      /* next poll will reconcile */
    }
    onCountChange(0);
    if (filter === 'unread') setItems([]);
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.rowBetween}>
        <View style={styles.pills}>
          {(['unread', 'all'] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.pill, { backgroundColor: filter === f ? colors.primary : colors.cardAlt }]}>
              <Text style={{ color: filter === f ? colors.onPrimary : colors.textMuted, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>
                {f === 'unread' ? 'Unread' : 'All'}
              </Text>
            </Pressable>
          ))}
        </View>
        {unread > 0 ? (
          <Pressable onPress={() => void markAll()} style={styles.markAll} hitSlop={8}>
            <CheckCheck size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>Mark all read</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Bell size={34} color={colors.textSubtle} />
          <Text style={[styles.optionTitle, { color: colors.text, marginTop: 10 }]}>
            {filter === 'unread' ? "You're all caught up!" : 'No notifications yet'}
          </Text>
          <Text style={[styles.muted, { color: colors.textMuted }]}>
            {filter === 'unread' ? 'No new notifications right now.' : 'Notifications will show up here.'}
          </Text>
        </View>
      ) : (
        items.map((n) => (
          <Pressable
            key={n.id}
            onPress={() => void markRead(n)}
            style={[styles.notif, { borderColor: colors.border, backgroundColor: n.isRead ? colors.card : colors.primarySoft }]}>
            <View style={[styles.dot, { backgroundColor: n.isRead ? 'transparent' : colors.danger }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.notifTitle, { color: colors.text }]}>{n.title || 'Notification'}</Text>
              {n.message ? <Text style={[styles.muted, { color: colors.textMuted }]}>{n.message}</Text> : null}
              {n.createdAt ? <Text style={[styles.date, { color: colors.textSubtle }]}>{formatDateTime(n.createdAt)}</Text> : null}
            </View>
          </Pressable>
        ))
      )}
    </View>
  );
}

function SupportTab() {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const [open, setOpen] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await api.get('/tickets');
      setTickets(asRows(res));
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const ud: any = userData || {};
  return (
    <View style={{ gap: 12 }}>
      <Button title="Raise Support Ticket" onPress={() => setOpen(true)} icon={Plus} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : tickets.length === 0 ? (
        <View style={styles.center}>
          <LifeBuoy size={34} color={colors.textSubtle} />
          <Text style={[styles.optionTitle, { color: colors.text, marginTop: 10 }]}>No tickets raised yet</Text>
          <Text style={[styles.muted, { color: colors.textMuted }]}>Need help? Raise your first support ticket.</Text>
        </View>
      ) : (
        tickets.map((t) => (
          <Card key={t.id} onPress={() => setOpen(true)}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={[styles.notifTitle, { color: colors.text }]} numberOfLines={1}>{t.subject}</Text>
                {t.createdAt ? <Text style={[styles.date, { color: colors.textSubtle }]}>{formatDateTime(t.createdAt)}</Text> : null}
              </View>
              <Badge label={String(t.status || 'open')} tone={t.status === 'resolved' ? 'success' : t.status === 'closed' ? 'neutral' : t.status === 'in-progress' ? 'warning' : 'info'} />
            </View>
          </Card>
        ))
      )}
      <RaiseTicketModal
        visible={open}
        onClose={() => {
          setOpen(false);
          void load();
        }}
        collegeName={ud.collegeName || ud.college?.name || 'College Admin'}
      />
    </View>
  );
}

export default function AppSettingsScreen() {
  const { userRole } = useAuth();
  const { count, setCount, refresh } = useUnreadNotificationCount();
  // Raise Support Ticket is for the college ADMIN only.
  const canRaiseTicket = userRole === 'admin';
  const [tab, setTab] = useState('appearance');

  const tabs = [
    { key: 'appearance', label: 'Appearance' },
    { key: 'notifications', label: 'Notifications', count: count > 0 ? count : undefined },
    ...(canRaiseTicket ? [{ key: 'support', label: 'Support' }] : []),
  ];

  const onCountChange = (n: number) => {
    if (n === 0) setCount(0);
    else setCount((c) => Math.max(0, c + n));
    void refresh();
  };

  return (
    <Screen>
      <PageHeader title="Settings" subtitle={`Appearance, notifications${canRaiseTicket ? ' and support' : ''}.`} />
      <Tabs tabs={tabs} active={tab} onChange={setTab} />
      <View style={{ marginTop: 14 }}>
        {tab === 'appearance' && <AppearanceTab />}
        {tab === 'notifications' && <NotificationsTab onCountChange={onCountChange} />}
        {tab === 'support' && canRaiseTicket ? <SupportTab /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderRadius: 18, padding: 14 },
  optionIcon: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  muted: { fontSize: fontSize.xs, lineHeight: 18, marginTop: 3 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12 },
  markAll: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  center: { minHeight: 200, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notif: { borderWidth: 1, borderRadius: 15, padding: 13, flexDirection: 'row', gap: 9 },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 6 },
  notifTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  date: { fontSize: 10, marginTop: 8 },
});