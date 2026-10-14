import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Check, ChevronDown, Search } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';
import { radius } from '../../theme/spacing';
import { SheetModal } from './SheetModal';
import type { Option } from '../../types/models';

interface SelectProps {
  label?: string;
  value?: string | null;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** show a search box inside the sheet (auto on when > 8 options) */
  searchable?: boolean;
  /** optional leading icon inside the field (web parity) */
  icon?: LucideIcon;
}

export function Select({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select...',
  error,
  required,
  disabled,
  searchable,
  icon: Icon,
}: SelectProps) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find((o) => o.value === value);
  const showSearch = searchable ?? options.length > 8;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text style={[styles.label, { color: colors.text }]}>
          {label}
          {required ? <Text style={{ color: colors.danger }}> *</Text> : null}
        </Text>
      ) : null}

      <Pressable
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          { backgroundColor: colors.inputBg, borderColor: error ? colors.danger : colors.border, opacity: disabled ? 0.6 : 1 },
        ]}>
        {Icon ? <Icon size={18} color={colors.textSubtle} style={{ marginRight: 10 }} /> : null}
        <Text style={{ flex: 1, fontSize: fontSize.md, color: selected ? colors.text : colors.placeholder }} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>
        <ChevronDown size={18} color={colors.textSubtle} />
      </Pressable>
      {error ? <Text style={[styles.error, { color: colors.danger }]}>{error}</Text> : null}

      <SheetModal visible={open} onClose={close} title={label || placeholder} scroll={false}>
        {showSearch ? (
          <View style={[styles.search, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Search size={16} color={colors.textSubtle} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={colors.placeholder}
              style={[styles.searchInput, { color: colors.text }]}
            />
          </View>
        ) : null}
        <FlatList
          data={filtered}
          keyExtractor={(o) => o.value}
          style={{ maxHeight: 360 }}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.textMuted }]}>No options found</Text>}
          renderItem={({ item }) => {
            const active = item.value === value;
            return (
              <Pressable
                onPress={() => {
                  onChange(item.value);
                  close();
                }}
                style={[styles.option, { backgroundColor: active ? colors.primarySoft : 'transparent' }]}>
                <Text
                  style={{
                    flex: 1,
                    fontSize: fontSize.md,
                    fontWeight: active ? fontWeight.bold : fontWeight.medium,
                    color: active ? colors.primary : colors.text,
                  }}>
                  {item.label}
                </Text>
                {active ? <Check size={18} color={colors.primary} /> : null}
              </Pressable>
            );
          }}
        />
      </SheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 8 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 50,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  error: { marginTop: 6, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 8,
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: fontSize.md, padding: 0 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, borderRadius: radius.sm },
  empty: { textAlign: 'center', paddingVertical: 24, fontSize: fontSize.sm },
});