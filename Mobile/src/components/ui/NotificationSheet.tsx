import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Bell, CheckCheck, X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';
import { formatDateTime } from '../../utils/format';
import { api } from '../../api/client';

export interface NotificationItem {
  id: string;
  title?: string;
  message?: string;
  content?: string;
  createdAt?: string | number | Date;
  isRead?: boolean;
  readBy?: string[];
}

export interface NotificationsController {
  unreadCount: number;
  notifications: NotificationItem[];
  loading?: boolean;
  refresh: () => Promise<void> | void;
  markAsRead?: (id: string) => Promise<void> | void;
  markAllAsRead?: () => Promise<void> | void;
}

export function useNotifications(enabled = true): NotificationsController {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      const res = await api.get<any>('/notifications');
      setNotifications(Array.isArray(res?.data) ? res.data : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };
  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };
  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  useEffect(() => { if (enabled) void refresh(); }, [enabled]);
  return { notifications, unreadCount, loading, refresh, markAsRead, markAllAsRead };
}

export function NotificationSheet({ visible, onClose, controller }: { visible: boolean; onClose: () => void; controller: NotificationsController }) {
  const { colors } = useTheme();
  const items = controller.notifications || [];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.titleRow}>
              <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}><Bell size={18} color={colors.primary} /></View>
              <Text style={[styles.title, { color: colors.text }]}>Notifications</Text>
            </View>
            <View style={styles.actions}>
              {items.some((n) => !n.isRead) && controller.markAllAsRead ? <Pressable onPress={() => void controller.markAllAsRead?.()} hitSlop={10}><CheckCheck size={19} color={colors.primary} /></Pressable> : null}
              <Pressable onPress={onClose} hitSlop={10}><X size={22} color={colors.textMuted} /></Pressable>
            </View>
          </View>
          {controller.loading ? (
            <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={[styles.muted, { color: colors.textMuted }]}>Loading notifications...</Text></View>
          ) : items.length === 0 ? (
            <View style={styles.center}><Bell size={36} color={colors.textSubtle} /><Text style={[styles.emptyTitle, { color: colors.text }]}>No notifications</Text><Text style={[styles.muted, { color: colors.textMuted }]}>You are all caught up.</Text></View>
          ) : (
            <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
              {items.map((item) => (
                <Pressable key={item.id} onPress={() => void controller.markAsRead?.(item.id)} style={[styles.item, { borderColor: colors.border, backgroundColor: item.isRead ? colors.card : colors.primarySoft }]}>
                  <View style={[styles.unread, { backgroundColor: item.isRead ? 'transparent' : colors.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title || 'Notification'}</Text>
                    <Text style={[styles.itemBody, { color: colors.textMuted }]}>{item.message || item.content || ''}</Text>
                    {item.createdAt ? <Text style={[styles.itemDate, { color: colors.textSubtle }]}>{formatDateTime(item.createdAt)}</Text> : null}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { maxHeight: '78%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  header: { minHeight: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBox: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  list: { padding: 14, gap: 10 },
  item: { borderWidth: 1, borderRadius: 15, padding: 13, flexDirection: 'row', gap: 9 },
  unread: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  itemTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  itemBody: { fontSize: fontSize.xs, lineHeight: 18, marginTop: 3 },
  itemDate: { fontSize: 10, marginTop: 8 },
  center: { minHeight: 260, alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginTop: 12 },
  muted: { fontSize: fontSize.sm, marginTop: 6, textAlign: 'center' },
});
