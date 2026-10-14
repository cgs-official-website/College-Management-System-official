import React, { createContext, useContext } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../contexts/ThemeContext';

/** Extra bottom padding for screens drawn under a floating bottom bar (Teacher app). Default 0 = no change. */
export const ScreenInsetContext = createContext(0);

interface ScreenProps {
  children: React.ReactNode;
  /** wrap content in a ScrollView (default true) */
  scroll?: boolean;
  /** add 16px horizontal/vertical padding (default true) */
  padded?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
}

export function Screen({
  children,
  scroll = true,
  padded = true,
  refreshing,
  onRefresh,
  edges = ['top', 'left', 'right', 'bottom'],
  style,
  contentContainerStyle,
}: ScreenProps) {
  const { colors } = useTheme();
  const bottomInset = useContext(ScreenInsetContext);

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.bg }, style]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[padded && styles.padded, styles.grow, bottomInset ? { paddingBottom: 16 + bottomInset } : null, contentContainerStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? (
                <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
              ) : undefined
            }>
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, padded && styles.padded, bottomInset ? { paddingBottom: 16 + bottomInset } : null, contentContainerStyle]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grow: { flexGrow: 1 },
  padded: { padding: 16 },
});