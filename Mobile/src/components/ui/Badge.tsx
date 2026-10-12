import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  small?: boolean;
}

export function Badge({ label, tone = 'neutral', small = false }: BadgeProps) {
  const { colors } = useTheme();
  const map: Record<BadgeTone, { bg: string; fg: string }> = {
    success: { bg: colors.successSoft, fg: colors.success },
    warning: { bg: colors.warningSoft, fg: colors.warning },
    danger: { bg: colors.dangerSoft, fg: colors.danger },
    info: { bg: colors.infoSoft, fg: colors.info },
    primary: { bg: colors.primarySoft, fg: colors.primary },
    neutral: { bg: colors.cardAlt, fg: colors.textMuted },
  };
  const c = map[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg, paddingVertical: small ? 2 : 4 }]}>
      <Text style={{ color: c.fg, fontSize: small ? 10 : fontSize.xs, fontWeight: fontWeight.bold }}>{label}</Text>
    </View>
  );
}

/** Maps common backend status strings to a tone. */
export const toneForStatus = (status?: string | null): BadgeTone => {
  switch ((status || '').toLowerCase()) {
    case 'active':
    case 'paid':
    case 'approved':
    case 'present':
    case 'completed':
    case 'resolved':
    case 'published':
      return 'success';
    case 'pending':
    case 'partial':
    case 'trial':
    case 'open':
    case 'in_progress':
      return 'warning';
    case 'rejected':
    case 'overdue':
    case 'absent':
    case 'suspended':
    case 'inactive':
    case 'failed':
    case 'cancelled':
      return 'danger';
    default:
      return 'neutral';
  }
};

const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, borderRadius: 999 },
});
