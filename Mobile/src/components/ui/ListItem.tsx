import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';
import { initials } from '../../utils/format';

interface ListItemProps {
  title: string;
  subtitle?: string;
  /** small text under the subtitle */
  meta?: string;
  /** shows a circle with initials of the title when no `left` is given */
  avatar?: boolean;
  left?: React.ReactNode;
  right?: React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
}

export function ListItem({ title, subtitle, meta, avatar = false, left, right, onPress, showChevron }: ListItemProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}>
      {left ? (
        <View style={styles.left}>{left}</View>
      ) : avatar ? (
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <Text style={{ color: colors.primary, fontWeight: fontWeight.extrabold, fontSize: fontSize.sm }}>{initials(title)}</Text>
        </View>
      ) : null}

      <View style={styles.body}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.sub, { color: colors.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={[styles.meta, { color: colors.textSubtle }]} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>

      {right}
      {showChevron || (onPress && !right) ? <ChevronRight size={18} color={colors.textSubtle} style={{ marginLeft: 6 }} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, borderRadius: 16, marginBottom: 10 },
  left: { marginRight: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  body: { flex: 1 },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  sub: { fontSize: fontSize.sm, marginTop: 2 },
  meta: { fontSize: fontSize.xs, marginTop: 2 },
});
