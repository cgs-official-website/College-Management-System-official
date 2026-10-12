import React, { useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Path, Text as SvgText } from 'react-native-svg';
import { Building2, Users } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';

export const STAFF_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4', '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#dc2626', '#0284c7', '#d946ef'];
const ceil3 = (v: number) => Math.max(3, Math.ceil(v / 3) * 3);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** Web: modules/reports/StaffOverviewChart.jsx  (departments / total staff header, coloured bars, legend chips) */
export default function StaffOverviewChart({ deptData = [] }: { deptData?: any[] }) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  if (!deptData.length) {
    return <View style={styles.empty}><Text style={{ color: colors.textMuted }}>No staff data available</Text></View>;
  }

  const totalStaff = deptData.reduce((a, d) => a + (d.count || 0), 0);
  const SLOT = 46, mL = 30, mR = 10, mT = 22, plotH = 190, mB = 130;
  const H = mT + plotH + mB;
  const chartW = Math.max(w, mL + mR + deptData.length * SLOT);
  const plotW = chartW - mL - mR;
  const maxV = ceil3(Math.max(1, ...deptData.map((d) => d.count || 0)));
  const ticks = [0, 1, 2, 3, 4].map((i) => Math.round((maxV / 4) * i));
  const slot = plotW / deptData.length;
  const barW = Math.min(20, slot * 0.5);

  return (
    <View onLayout={onLayout}>
      <View style={styles.meta}>
        <View style={styles.metaItem}><Building2 size={14} color={colors.textMuted} /><Text style={[styles.metaText, { color: colors.textMuted }]}>{deptData.length} Departments</Text></View>
        <View style={styles.metaItem}><Users size={14} color="#10b981" /><Text style={[styles.metaText, { color: '#10b981' }]}>{totalStaff} Total Faculty & Staff</Text></View>
      </View>

      {w > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={chartW} height={H}>
            {ticks.map((t) => {
              const y = mT + plotH - (t / maxV) * plotH;
              return (
                <G key={t}>
                  <Line x1={mL} x2={chartW - mR} y1={y} y2={y} stroke={colors.border} strokeWidth={1} strokeDasharray="3 3" />
                  <SvgText x={mL - 8} y={y + 4} fontSize={12} fill={colors.textMuted} textAnchor="end">{t}</SvgText>
                </G>
              );
            })}
            {deptData.map((d, i) => {
              const h = ((d.count || 0) / maxV) * plotH;
              const cx = mL + slot * i + slot / 2;
              const x = cx - barW / 2;
              const y = mT + plotH - h;
              const r = barW / 2;
              const color = STAFF_COLORS[i % STAFF_COLORS.length];
              const ly = mT + plotH + 14;
              return (
                <G key={`${d.name}-${i}`}>
                  <Path d={`M${x},${y + h} L${x},${y + r} A${r},${r} 0 0 1 ${x + barW},${y + r} L${x + barW},${y + h} Z`} fill={color} />
                  <SvgText x={cx} y={y - 6} fontSize={11} fill={colors.textMuted} textAnchor="middle">{d.count}</SvgText>
                  <SvgText x={cx + 4} y={ly} fontSize={11} fill={colors.textMuted} textAnchor="end" transform={`rotate(-45 ${cx + 4} ${ly})`}>{clip(String(d.name), 22)}</SvgText>
                </G>
              );
            })}
          </Svg>
        </ScrollView>
      ) : null}

      <View style={[styles.chips, { borderTopColor: colors.border }]}>
        {deptData.map((d, i) => (
          <View key={`${d.name}-${i}`} style={[styles.chip, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}>
            <View style={[styles.dot, { backgroundColor: STAFF_COLORS[i % STAFF_COLORS.length] }]} />
            <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>{d.name}</Text>
            <View style={[styles.count, { backgroundColor: colors.card }]}><Text style={[styles.countText, { color: colors.text }]}>{d.count}</Text></View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { height: 140, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, fontWeight: fontWeight.medium },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, paddingTop: 14, borderTopWidth: 1 },
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, paddingLeft: 10, paddingRight: 6, paddingVertical: 6, maxWidth: '100%' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  chipText: { flexShrink: 1, fontSize: 12, fontWeight: fontWeight.medium, marginRight: 8 },
  count: { minWidth: 22, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, alignItems: 'center' },
  countText: { fontSize: 11, fontWeight: fontWeight.bold },
});