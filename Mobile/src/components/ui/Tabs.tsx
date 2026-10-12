import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (key: string) => void;
}

/** Horizontal scrollable pill tabs. */
export function Tabs({ tabs, active, onChange }: TabsProps) {
  const { colors } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.row}>
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={[
              styles.tab,
              { backgroundColor: isActive ? colors.primary : colors.card, borderColor: isActive ? colors.primary : colors.border },
            ]}>
            <Text style={{ color: isActive ? colors.onPrimary : colors.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>
              {t.label}
            </Text>
            {typeof t.count === 'number' ? (
              <View style={[styles.count, { backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : colors.cardAlt }]}>
                <Text style={{ color: isActive ? colors.onPrimary : colors.textMuted, fontSize: 10, fontWeight: fontWeight.bold }}>{t.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  row: { paddingVertical: 4 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 38, borderRadius: 999, borderWidth: 1, marginRight: 8 },
  count: { marginLeft: 8, paddingHorizontal: 6, minWidth: 20, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
}); 