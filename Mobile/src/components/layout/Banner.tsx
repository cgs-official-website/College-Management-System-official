import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';

interface BannerProps {
  type: 'error' | 'success' | 'info';
  message: string;
}

/** Inline message box (error / success / info). */
export function Banner({ type, message }: BannerProps) {
  const { colors } = useTheme();
  const map = {
    error: { bg: colors.dangerSoft, border: colors.dangerBorder, fg: colors.danger, Icon: AlertCircle },
    success: { bg: colors.successSoft, border: colors.successBorder, fg: colors.success, Icon: CheckCircle2 },
    info: { bg: colors.infoSoft, border: colors.infoSoft, fg: colors.info, Icon: Info },
  } as const;
  const c = map[type];
  return (
    <View style={[styles.box, { backgroundColor: c.bg, borderColor: c.border }]}>
      <c.Icon size={18} color={c.fg} style={{ marginTop: 1 }} />
      <Text style={[styles.text, { color: c.fg }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 16 },
  text: { flex: 1, marginLeft: 10, fontSize: fontSize.sm, fontWeight: fontWeight.medium, lineHeight: 19 },
});
