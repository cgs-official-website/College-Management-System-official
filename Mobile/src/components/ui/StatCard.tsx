import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  tone?: 'primary' | 'info' | 'warning' | 'danger' | 'success';
  onPress?: () => void;
  /** smaller padding / value size for dense layouts */
  compact?: boolean;
}

export function StatCard({ title, value, subtitle, icon: Icon, tone = 'primary', onPress, compact = false }: StatCardProps) {
  const { colors } = useTheme();
  const tones = {
    primary: { bg: colors.primarySoft, fg: colors.primary },
    info: { bg: colors.infoSoft, fg: colors.info },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    success: { bg: colors.successSoft, fg: colors.success },
  } as const;
  const t = tones[tone];

  return (
    <Card onPress={onPress} style={compact ? styles.cardCompact : styles.card}>
      {compact ? (
        <>
          {Icon ? (
            <View style={[styles.icon, styles.iconCompact, { backgroundColor: t.bg, marginLeft: 0 }]}>
              <Icon size={14} color={t.fg} />
            </View>
          ) : null}
          <Text style={[styles.value, styles.valueCompact, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {value}
          </Text>
          <Text style={[styles.titleCompact, { color: colors.textMuted }]} numberOfLines={2}>
            {title}
          </Text>
        </>
      ) : (
      <>
      <View style={styles.top}>
        <Text style={[styles.title, { color: colors.textMuted }]} numberOfLines={1}>
          {title}
        </Text>
        {Icon ? (
          <View style={[styles.icon, compact && styles.iconCompact, { backgroundColor: t.bg }]}>
            <Icon size={compact ? 14 : 16} color={t.fg} />
          </View>
        ) : null}
      </View>
      <Text style={[styles.value, compact && styles.valueCompact, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      {subtitle ? <Text style={[styles.sub, { color: colors.textSubtle }]}>{subtitle}</Text> : null}
      </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: 140 },
  cardCompact: { flex: 1, minWidth: 0, padding: 10 },
  titleCompact: { fontSize: 11, fontWeight: fontWeight.bold, marginTop: 2, lineHeight: 14 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { flex: 1, fontSize: fontSize.xs, fontWeight: fontWeight.bold, textTransform: 'uppercase', letterSpacing: 0.5 },
  icon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  iconCompact: { width: 26, height: 26, borderRadius: 8 },
  valueCompact: { fontSize: 20, marginTop: 4 },
  value: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, marginTop: 10 },
  sub: { fontSize: fontSize.xs, marginTop: 4 },
});