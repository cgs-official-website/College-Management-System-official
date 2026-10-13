import React, { useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Path, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { fontWeight } from '../../theme/typography';

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);
const topRounded = (x: number, y: number, bw: number, h: number) => {
  const r = Math.min(3, h, bw / 2);
  return `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + bw - r},${y} Q${x + bw},${y} ${x + bw},${y + r} L${x + bw},${y + h} Z`;
};

export interface AttendanceBar { label: string; present: number; absent: number }

/** Web: Attendance Overview chart - grouped bars (Present % blue / Absent % red), Daily or By Class */
export default function AttendanceChart({ data = [], rotateLabels = false }: { data?: AttendanceBar[]; rotateLabels?: boolean }) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  if (!data.length) {
    return <View style={styles.empty}><Text style={{ color: colors.textMuted, fontWeight: fontWeight.medium }}>No attendance data for this range</Text></View>;
  }

  const SLOT = rotateLabels ? 56 : 72, mL = 40, mR = 10, mT = 10, plotH = 200, mB = rotateLabels ? 100 : 34;
  const H = mT + plotH + mB;
  const chartW = Math.max(w, mL + mR + data.length * SLOT);
  const plotW = chartW - mL - mR;
  const slot = plotW / data.length;
  const barW = Math.min(18, slot * 0.28);
  const ticks = [0, 25, 50, 75, 100];
  const yOf = (v: number) => mT + plotH - (Math.min(100, Math.max(0, v)) / 100) * plotH;

  return (
    <View onLayout={onLayout} style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#ef4444' }]} /><Text style={[styles.legendText, { color: colors.textMuted }]}>Absent %</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#3b82f6' }]} /><Text style={[styles.legendText, { color: colors.textMuted }]}>Present %</Text></View>
      </View>
      {w > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Svg width={chartW} height={H}>
            {ticks.map((t) => (
              <G key={t}>
                <Line x1={mL} x2={chartW - mR} y1={yOf(t)} y2={yOf(t)} stroke={colors.border} strokeWidth={1} strokeDasharray="3 3" />
                <SvgText x={mL - 8} y={yOf(t) + 4} fontSize={11} fill={colors.textMuted} textAnchor="end">{`${t}%`}</SvgText>
              </G>
            ))}
            {data.map((d, i) => {
              const cx = mL + slot * i + slot / 2;
              const hp = (Math.min(100, Math.max(0, d.present)) / 100) * plotH;
              const ha = (Math.min(100, Math.max(0, d.absent)) / 100) * plotH;
              const ly = mT + plotH + 16;
              return (
                <G key={`${d.label}-${i}`}>
                  <Path d={topRounded(cx - barW - 1, mT + plotH - hp, barW, hp)} fill="#3b82f6" />
                  <Path d={topRounded(cx + 1, mT + plotH - ha, barW, ha)} fill="#ef4444" />
                  {rotateLabels ? (
                    <SvgText x={cx + 4} y={ly} fontSize={11} fill={colors.textMuted} textAnchor="end" transform={`rotate(-45 ${cx + 4} ${ly})`}>{clip(d.label, 18)}</SvgText>
                  ) : (
                    <SvgText x={cx} y={ly + 4} fontSize={12} fill={colors.textMuted} textAnchor="middle">{d.label}</SvgText>
                  )}
                </G>
              );
            })}
          </Svg>
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { height: 140, alignItems: 'center', justifyContent: 'center' },
  wrap: { borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 8, marginTop: 12 },
  legend: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16, paddingRight: 8, marginBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, marginRight: 6 },
  legendText: { fontSize: 13, fontWeight: fontWeight.medium },
});