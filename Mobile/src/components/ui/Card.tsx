import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { radius, shadow } from '../../theme/spacing';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, onPress, padded = true, style }: CardProps) {
  const { colors, isDark } = useTheme();
  const base: StyleProp<ViewStyle> = [
    styles.card,
    { backgroundColor: colors.card, borderColor: colors.border },
    !isDark && shadow.sm,
    padded && styles.padded,
    style,
  ];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, pressed && { opacity: 0.85 }]}>
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radius.lg },
  padded: { padding: 16 },
});
