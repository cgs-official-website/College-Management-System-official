import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bell, LifeBuoy, Menu, Moon, RefreshCw, Search, Sun } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';

export interface ScreenHeaderProps {
  onMenuPress?: () => void;
  onSearchPress?: () => void;
  onRefresh?: () => void;
  onNotificationsPress?: () => void;
  /** shows the amber support (lifebuoy) button when provided */
  onSupportPress?: () => void;
  onProfilePress?: () => void;
  unreadCount?: number;
  avatarText?: string;
}

export function ScreenHeader({
  onMenuPress,
  onSearchPress,
  onRefresh,
  onNotificationsPress,
  onSupportPress,
  onProfilePress,
  unreadCount = 0,
  avatarText = 'U',
}: ScreenHeaderProps) {
  const { colors, isDark, toggleTheme } = useTheme();
  return (
    <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <View style={styles.left}>
        <Pressable onPress={onMenuPress} hitSlop={10} style={styles.iconButton}>
          <Menu size={23} color={colors.text} />
        </Pressable>
        <Pressable onPress={onSearchPress} hitSlop={10} style={styles.iconButton}>
          <Search size={21} color={colors.textMuted} />
        </Pressable>
      </View>
      <View style={styles.right}>
        <Pressable onPress={onRefresh} hitSlop={10} style={styles.iconButton}>
          <RefreshCw size={20} color={colors.textMuted} />
        </Pressable>
        {onSupportPress ? (
          <Pressable onPress={onSupportPress} hitSlop={10} style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(245,158,11,0.15)' : '#fff7e0' }]} accessibilityLabel="Support">
            <LifeBuoy size={20} color={isDark ? '#fbbf24' : '#d97706'} />
          </Pressable>
        ) : null}
        <Pressable onPress={onNotificationsPress} hitSlop={10} style={styles.iconButton}>
          <Bell size={20} color={colors.textMuted} />
          {unreadCount > 0 ? <View style={[styles.dot, { backgroundColor: colors.danger }]} /> : null}
        </Pressable>
        <Pressable onPress={toggleTheme} hitSlop={10} style={styles.iconButton} accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
          {isDark ? <Sun size={20} color={colors.textMuted} /> : <Moon size={20} color={colors.textMuted} />}
        </Pressable>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Pressable onPress={onProfilePress} style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{avatarText}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.pageHeader}>
      <View style={styles.pageCopy}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      </View>
      {action ? <View style={styles.action}>{action}</View> : null}
    </View>
  );
}

export { PageHeader as default };

const styles = StyleSheet.create({
  header: { height: 64, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconButton: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  divider: { width: 1, height: 28, marginHorizontal: 2 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  dot: { position: 'absolute', right: 6, top: 5, width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: '#fff' },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 12 },
  pageCopy: { flex: 1 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 4 },
  action: { maxWidth: 180 },
});