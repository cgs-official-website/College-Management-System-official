import React, { useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Path, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';

const GENDER_COLORS: Record<string, string> = { Female: '#f43f5e', Male: '#3b82f6', Others: '#10b981' };
const FALLBACK = ['#3b82f6', '#f43f5e', '#10b981', '#f59e0b', '#8b5cf6'];
const polar = (cx: number, cy: number, r: number, a: number) => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
const donutSlice = (cx: number, cy: number, rO: number, rI: number, a0: number, a1: number) => {
  const sweep = Math.min(a1 - a0, Math.PI * 2 - 0.0001);
  const e = a0 + sweep;
  const large = sweep > Math.PI ? 1 : 0;
  const o0 = polar(cx, cy, rO, a0), o1 = polar(cx, cy, rO, e), i1 = polar(cx, cy, rI, e), i0 = polar(cx, cy, rI, a0);
  return `M${o0.x},${o0.y} A${rO},${rO} 0 ${large} 1 ${o1.x},${o1.y} L${i1.x},${i1.y} A${rI},${rI} 0 ${large} 0 ${i0.x},${i0.y} Z`;
};
const ceil4 = (v: number) => Math.max(4, Math.ceil(v / 4) * 4);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** Web: modules/reports/DemographicsChart.jsx  ("Students per Class" bars + "Gender Distribution" donut) */
export default function DemographicsChart({ classData = [], genderData = [] }: { classData?: any[]; genderData?: any[] }) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  if (!classData.length && !genderData.length) {
    return <View style={styles.empty}><Text style={{ color: colors.textMuted }}>No student data available</Text></View>;
  }

  // ---- bars (scrollable so every label stays readable) ----
  const SLOT = 46, mL = 34, mR = 10, mT = 12, plotH = 190, mB = 110;
  const H = mT + plotH + mB;
  const chartW = Math.max(w, mL + mR + classData.length * SLOT);
  const plotW = chartW - mL - mR;
  const maxV = ceil4(Math.max(1, ...classData.map((d) => d.count || 0)));
  const ticks = [0, 1, 2, 3, 4].map((i) => Math.round((maxV / 4) * i));
  const slot = classData.length ? plotW / classData.length : SLOT;
  const barW = Math.min(24, slot * 0.55);

  // ---- donut ----
  const total = genderData.reduce((a, d) => a + (d.value || 0), 0) || 1;
  const pad = genderData.length > 1 ? (5 * Math.PI) / 180 : 0;
  let acc = -Math.PI / 2;
  const colorOf = (name: string, i: number) => GENDER_COLORS[name] || FALLBACK[i % FALLBACK.length];
  const slices = genderData.map((d, i) => {
    const sweep = ((d.value || 0) / total) * Math.PI * 2;
    const a0 = acc + pad / 2, a1 = acc + sweep - pad / 2;
    acc += sweep;
    return { key: d.name, d: donutSlice(100, 100, 82, 62, a0, Math.max(a1, a0 + 0.01)), color: colorOf(d.name, i) };
  });

  return (
    <View onLayout={onLayout}>
      <Text style={[styles.heading, { color: colors.textMuted }]}>Students per Class</Text>
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
            {classData.map((d, i) => {
              const h = ((d.count || 0) / maxV) * plotH;
              const cx = mL + slot * i + slot / 2;
              const x = cx - barW / 2;
              const y = mT + plotH - h;
              const r = Math.min(4, h, barW / 2);
              const ly = mT + plotH + 14;
              return (
                <G key={`${d.name}-${i}`}>
                  <Path d={`M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${y + h} Z`} fill="#3b82f6" />
                  <SvgText x={cx + 4} y={ly} fontSize={11} fill={colors.textMuted} textAnchor="end" transform={`rotate(-45 ${cx + 4} ${ly})`}>{clip(String(d.name), 18)}</SvgText>
                </G>
              );
            })}
          </Svg>
        </ScrollView>
      ) : null}

      <Text style={[styles.heading, { color: colors.textMuted, marginTop: 20 }]}>Gender Distribution</Text>
      <View style={styles.donutWrap}>
        <Svg width={200} height={200}>
          {slices.map((s) => <Path key={s.key} d={s.d} fill={s.color} />)}
        </Svg>
      </View>
      <View style={styles.legend}>
        {genderData.map((d, i) => (
          <View key={d.name} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: colorOf(d.name, i) }]} />
            <Text style={[styles.legendText, { color: colorOf(d.name, i) }]}>{d.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { height: 140, alignItems: 'center', justifyContent: 'center' },
  heading: { fontSize: fontSize.md, fontWeight: fontWeight.semibold, textAlign: 'center', marginBottom: 8 },
  donutWrap: { alignItems: 'center' },
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 18, marginTop: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, marginRight: 6 },
  legendText: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
});