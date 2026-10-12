import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Inbox, LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';
import { Button } from './Button';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title = 'Nothing here yet', message, icon: Icon = Inbox, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.iconWrap, { backgroundColor: colors.cardAlt }]}>
        <Icon size={28} color={colors.textSubtle} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {message ? <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: 16 }}>
          <Button title={actionLabel} onPress={onAction} fullWidth={false} size="sm" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 24 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'center' },
  message: { fontSize: fontSize.sm, textAlign: 'center', marginTop: 6, lineHeight: 20 },
});
