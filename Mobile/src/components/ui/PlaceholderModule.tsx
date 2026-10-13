import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { RefreshCw } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';
import { Screen } from './Screen';
import { Button } from './Button';

interface PlaceholderModuleProps {
  title: string;
  icon: LucideIcon;
  description?: string;
  onSync?: () => void;
}

/** Web: components/ui/PlaceholderModule.jsx */
export const PlaceholderModule = ({ title, icon: Icon, description, onSync }: PlaceholderModuleProps) => {
  const { colors } = useTheme();
  return (
    <Screen edges={['left', 'right', 'bottom']} contentContainerStyle={styles.center}>
      <View style={[styles.iconBox, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
        <Icon size={38} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {description ? <Text style={[styles.desc, { color: colors.textMuted }]}>{description}</Text> : null}
      <View style={{ marginTop: 24 }}>
        <Button title="Sync Module Data" icon={RefreshCw} fullWidth={false} onPress={onSync} />
      </View>
    </Screen>
  );
};

export default PlaceholderModule;

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  iconBox: { width: 80, height: 80, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, textAlign: 'center', marginBottom: 10 },
  desc: { fontSize: fontSize.sm, lineHeight: 21, textAlign: 'center', maxWidth: 320 },
});