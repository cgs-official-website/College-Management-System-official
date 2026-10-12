import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';
import { radius } from '../../theme/spacing';

interface PaginationProps {
  totalItems?: number;
  currentPage?: number;
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

/** Same layout as the web table footer: "Showing 1 to 10 of 20 entries", Rows per page, « ‹ 1 2 › » */
export function Pagination({
  totalItems = 0,
  currentPage = 1,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const { colors } = useTheme();
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(Math.max(1, currentPage), totalPages);
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  if (totalItems === 0) return null;

  // window of up to 5 page numbers around the current page
  const windowSize = Math.min(5, totalPages);
  let first = Math.max(1, page - Math.floor(windowSize / 2));
  if (first + windowSize - 1 > totalPages) first = totalPages - windowSize + 1;
  const pages = Array.from({ length: windowSize }, (_, i) => first + i);

  const Btn = ({ disabled, onPress, children, active }: { disabled?: boolean; onPress: () => void; children: React.ReactNode; active?: boolean }) => (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.btn,
        {
          borderColor: active ? colors.primary : colors.border,
          backgroundColor: active ? colors.primary : colors.card,
          opacity: disabled ? 0.35 : 1,
        },
      ]}>
      {children}
    </Pressable>
  );

  const icon = (I: any) => <I size={16} color={colors.text} />;

  return (
    <View style={[styles.wrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Text style={[styles.info, { color: colors.textMuted }]}>
        Showing <Text style={[styles.bold, { color: colors.text }]}>{start}</Text> to{' '}
        <Text style={[styles.bold, { color: colors.text }]}>{end}</Text> of{' '}
        <Text style={[styles.bold, { color: colors.text }]}>{totalItems}</Text> entries
      </Text>

      {onPageSizeChange && pageSizeOptions.length > 1 ? (
        <View style={styles.sizeRow}>
          <Text style={[styles.info, { color: colors.textMuted, marginBottom: 0, marginRight: 8 }]}>Rows per page:</Text>
          {pageSizeOptions.map((s) => {
            const active = s === pageSize;
            return (
              <Pressable
                key={s}
                onPress={() => onPageSizeChange(s)}
                style={[styles.sizeChip, { backgroundColor: active ? colors.primary : colors.cardAlt, borderColor: active ? colors.primary : colors.border }]}>
                <Text style={{ color: active ? colors.onPrimary : colors.text, fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>{s}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.controls}>
        <Btn disabled={page <= 1} onPress={() => onPageChange(1)}>{icon(ChevronsLeft)}</Btn>
        <Btn disabled={page <= 1} onPress={() => onPageChange(page - 1)}>{icon(ChevronLeft)}</Btn>
        {pages.map((p) => (
          <Btn key={p} active={p === page} onPress={() => onPageChange(p)}>
            <Text style={{ color: p === page ? colors.onPrimary : colors.text, fontSize: fontSize.sm, fontWeight: fontWeight.bold }}>{p}</Text>
          </Btn>
        ))}
        <Btn disabled={page >= totalPages} onPress={() => onPageChange(page + 1)}>{icon(ChevronRight)}</Btn>
        <Btn disabled={page >= totalPages} onPress={() => onPageChange(totalPages)}>{icon(ChevronsRight)}</Btn>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: radius.lg, padding: 12, marginTop: 12, marginBottom: 8, alignItems: 'center' },
  info: { fontSize: fontSize.xs, marginBottom: 10 },
  bold: { fontWeight: fontWeight.bold },
  sizeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sizeChip: { minWidth: 40, height: 30, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, marginHorizontal: 3, alignItems: 'center', justifyContent: 'center' },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6 },
  btn: { minWidth: 36, height: 36, paddingHorizontal: 6, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});