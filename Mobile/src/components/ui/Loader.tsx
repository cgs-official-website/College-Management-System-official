import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize } from '../../theme/typography';

interface LoaderProps {
  label?: string;
  fullScreen?: boolean;
  size?: 'small' | 'large';
}

export function Loader({ label, fullScreen = false, size = 'large' }: LoaderProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, fullScreen && { flex: 1, backgroundColor: colors.bg }]}>
      <ActivityIndicator size={size} color={colors.primary} />
      {label ? <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: 24 },
  label: { marginTop: 12, fontSize: fontSize.sm },
});
