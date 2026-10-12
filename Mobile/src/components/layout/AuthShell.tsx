import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, LucideIcon } from 'lucide-react-native';
import { Screen } from '../ui/Screen';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';

interface AuthShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onBack?: () => void;
  /** optional text next to the back button, e.g. "Back to Home" */
  backLabel?: string;
  /** optional icon for the back button (default: arrow) */
  backIcon?: LucideIcon;
  bare?: boolean;
}

export function AuthShell({ title, subtitle, children, onBack, backLabel, backIcon, bare = false }: AuthShellProps) {
  const { colors } = useTheme();
  const BackIcon = backIcon || ArrowLeft;

  return (
    <Screen contentContainerStyle={styles.content} padded={false}>
      <View style={[styles.backgroundOrb, styles.orbTop, { backgroundColor: colors.primary }]} pointerEvents="none" />
      <View style={[styles.backgroundOrb, styles.orbBottom, { backgroundColor: colors.primary }]} pointerEvents="none" />

      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} style={styles.backRow}>
          <View style={[styles.back, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <BackIcon size={16} color={colors.textMuted} />
          </View>
          {backLabel ? <Text style={[styles.backLabel, { color: colors.textMuted }]}>{backLabel}</Text> : null}
        </Pressable>
      ) : null}

      <View style={styles.head}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
      </View>

      {bare ? children : <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, justifyContent: 'flex-start' },
  backgroundOrb: { position: 'absolute', zIndex: -1, width: 260, height: 260, borderRadius: 130, opacity: 0.05 },
  orbTop: { top: -100, left: -110 },
  orbBottom: { bottom: -100, right: -110 },
  backRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 14 },
  back: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  backLabel: { marginLeft: 10, fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  head: { alignItems: 'center', marginBottom: 24 },
  logo: { width: 64, height: 64, marginBottom: 14 },
  title: { fontSize: 28, fontWeight: fontWeight.extrabold, textAlign: 'center', letterSpacing: -0.6 },
  subtitle: { fontSize: fontSize.md, textAlign: 'center', marginTop: 7, lineHeight: 22, maxWidth: 330 },
  card: { borderWidth: 1, borderRadius: 28, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 22, elevation: 4 },
});