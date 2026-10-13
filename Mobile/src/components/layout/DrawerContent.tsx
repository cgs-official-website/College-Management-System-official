import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Building2, ChevronDown, LogOut, X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';

export type DrawerLink = { key: string; name: string; icon: LucideIcon };
export type DrawerGroup = { key: string; name: string; icon: LucideIcon; children: DrawerLink[] };
export type DrawerItem = DrawerLink | DrawerGroup;

export type DrawerNav = {
  active: string;
  params: Record<string, any>;
  navigate: (key: string, params?: Record<string, any>) => void;
  openDrawer: () => void;
  closeDrawer: () => void;
};

export const DrawerNavContext = React.createContext<DrawerNav | null>(null);
export const useDrawerNav = (): DrawerNav => {
  const ctx = React.useContext(DrawerNavContext);
  if (!ctx) throw new Error('useDrawerNav must be used inside <DrawerNavContext.Provider>');
  return ctx;
};

const isGroup = (item: DrawerItem): item is DrawerGroup => Array.isArray((item as DrawerGroup).children);

export function DrawerContent({
  links = [],
  items,
  activeKey,
  onSelect,
  onClose,
  orgName,
  orgRole,
  userName,
  userRole,
  onLogout,
  sheet = false,
}: {
  links?: DrawerLink[];
  items?: DrawerItem[];
  activeKey: string;
  onSelect: (key: string) => void;
  onClose?: () => void;
  orgName?: string;
  orgRole?: string;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
  sheet?: boolean;
}) {
  const { colors } = useTheme();
  const renderedItems = items || links;
  const activeGroupKeys = useMemo(() => renderedItems.filter(isGroup).filter((g) => g.children.some((c) => c.key === activeKey)).map((g) => g.key), [renderedItems, activeKey]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activeGroupKeys.length) {
      setOpenGroups((prev) => ({ ...prev, ...Object.fromEntries(activeGroupKeys.map((key) => [key, true])) }));
    }
  }, [activeGroupKeys]);

  return (
    <View style={[styles.root, { backgroundColor: colors.card, borderRightColor: colors.border }, sheet && { borderRightWidth: 0, flex: 0, flexShrink: 1 }]}>
      <View style={styles.brandRow}>
        <View style={[styles.logoBox, { backgroundColor: colors.primarySoft }]}>
          <Building2 size={20} color={colors.primary} />
        </View>
        <View style={styles.brandCopy}>
          <Text style={[styles.orgName, { color: colors.text }]} numberOfLines={1}>{orgName || 'Zuna'}</Text>
          <Text style={[styles.orgRole, { color: colors.textMuted }]} numberOfLines={1}>{orgRole || 'ROLE'}</Text>
        </View>
        {onClose ? <Pressable onPress={onClose} hitSlop={10}><X size={20} color={colors.textMuted} /></Pressable> : null}
      </View>

      <ScrollView style={sheet ? { flexGrow: 0 } : undefined} contentContainerStyle={styles.links} showsVerticalScrollIndicator={false}>
        {renderedItems.map((item) => {
          if (!isGroup(item)) {
            const Icon = item.icon;
            const active = item.key === activeKey;
            return (
              <Pressable key={item.key} onPress={() => onSelect(item.key)} style={({ pressed }) => [styles.link, active && { backgroundColor: colors.primarySoft, borderColor: colors.border }, pressed && { opacity: 0.8 }]}>
                <Icon size={20} color={active ? colors.primary : colors.textMuted} />
                <Text style={[styles.linkText, { color: active ? colors.primary : colors.text }, active && { fontWeight: fontWeight.extrabold }]}>{item.name}</Text>
              </Pressable>
            );
          }

          const GroupIcon = item.icon;
          const open = !!openGroups[item.key];
          const childActive = item.children.some((child) => child.key === activeKey);
          return (
            <View key={item.key}>
              <Pressable
                onPress={() => setOpenGroups((prev) => ({ ...prev, [item.key]: !open }))}
                style={({ pressed }) => [styles.link, childActive && { backgroundColor: colors.primarySoft, borderColor: colors.border }, pressed && { opacity: 0.8 }]}>
                <GroupIcon size={20} color={childActive ? colors.primary : colors.textMuted} />
                <Text style={[styles.linkText, { color: childActive ? colors.primary : colors.text }, childActive && { fontWeight: fontWeight.extrabold }]}>{item.name}</Text>
                <ChevronDown size={17} color={childActive ? colors.primary : colors.textMuted} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
              </Pressable>
              {open ? (
                <View style={[styles.children, { borderLeftColor: colors.border }]}>
                  {item.children.map((child) => {
                    const ChildIcon = child.icon;
                    const active = child.key === activeKey;
                    return (
                      <Pressable key={child.key} onPress={() => onSelect(child.key)} style={({ pressed }) => [styles.childLink, active && { backgroundColor: colors.primarySoft, borderColor: colors.border }, pressed && { opacity: 0.8 }]}>
                        <View style={[styles.childRail, { backgroundColor: active ? colors.primary : colors.border }]} />
                        <ChildIcon size={17} color={active ? colors.primary : colors.textMuted} />
                        <Text style={[styles.childText, { color: active ? colors.primary : colors.text }, active && { fontWeight: fontWeight.extrabold }]}>{child.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{(userName || 'U').slice(0, 1).toUpperCase()}</Text></View>
        <View style={styles.footerCopy}>
          <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>{userName || 'User'}</Text>
          <Text style={[styles.userRole, { color: colors.textMuted }]} numberOfLines={1}>{userRole || 'USER'}</Text>
        </View>
        {onLogout ? <Pressable onPress={onLogout} hitSlop={10}><LogOut size={19} color={colors.textMuted} /></Pressable> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, borderRightWidth: 1 },
  brandRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 10 },
  logoBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  brandCopy: { flex: 1 },
  orgName: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  orgRole: { fontSize: 10, fontWeight: fontWeight.bold, letterSpacing: 0.8, marginTop: 2 },
  links: { paddingHorizontal: 12, paddingTop: 8, paddingBottom: 12, gap: 4 },
  link: { flexDirection: 'row', alignItems: 'center', minHeight: 46, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', gap: 12 },
  linkText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  children: { marginLeft: 18, borderLeftWidth: 1, paddingLeft: 8, paddingVertical: 2 },
  childLink: { flexDirection: 'row', alignItems: 'center', minHeight: 40, paddingVertical: 8, paddingHorizontal: 9, borderRadius: 10, borderWidth: 1, borderColor: 'transparent', gap: 9 },
  childRail: { width: 2, height: 22, borderRadius: 1 },
  childText: { flex: 1, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  footer: { borderTopWidth: 1, minHeight: 68, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  footerCopy: { flex: 1 },
  userName: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  userRole: { fontSize: 10, marginTop: 2 },
});
