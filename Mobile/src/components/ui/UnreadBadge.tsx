import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useUnreadNotificationCount } from '../../hooks/useUnreadNotificationCount';

/** Red unread-count pill shown on the "Settings" module card. Renders nothing when there are no unread notifications. */
export function UnreadBadge() {
  const { colors } = useTheme();
  const { count } = useUnreadNotificationCount();
  if (!count) return null;
  return (
    <View style={[styles.pill, { backgroundColor: colors.danger }]}>
      <Text style={styles.text}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  text: { color: '#ffffff', fontSize: 10, fontWeight: '800' },
});

export default UnreadBadge;