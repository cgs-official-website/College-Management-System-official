import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize } from '../../theme/typography';
import { radius } from '../../theme/spacing';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search...', style }: SearchBarProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
      <Search size={18} color={colors.textSubtle} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={[styles.input, { color: colors.text }]}
      />
      {value ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={10}>
          <X size={16} color={colors.textSubtle} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Debounce helper for server-side search: const debounced = useDebouncedValue(text, 400) */
export function useDebouncedValue<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    timer.current = setTimeout(() => setDebounced(value), delay);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, delay]);
  return debounced;
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 46,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
  },
  input: { flex: 1, marginHorizontal: 8, fontSize: fontSize.md, padding: 0 },
});
