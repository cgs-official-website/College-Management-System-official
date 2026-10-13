import React, { useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Line, Path, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';

export const STATUS_COLORS: Record<string, string> = { PAID: '#10b981', PENDING: '#f59e0b', OVERDUE: '#f43f5e', PARTIAL: '#3b82f6', UNKNOWN: '#9ca3af' };
const polar = (cx: number, cy: number, r: number, a: number) => ({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
const donutSlice = (cx: number, cy: number, rO: number, rI: number, a0: number, a1: number) => {
  const sweep = Math.min(a1 - a0, Math.PI * 2 - 0.0001);
  const e = a0 + sweep;
  const large = sweep > Math.PI ? 1 : 0;
  const o0 = polar(cx, cy, rO, a0), o1 = polar(cx, cy, rO, e), i1 = polar(cx, cy, rI, e), i0 = polar(cx, cy, rI, a0);
  return `M${o0.x},${o0.y} A${rO},${rO} 0 ${large} 1 ${o1.x},${o1.y} L${i1.x},${i1.y} A${rI},${rI} 0 ${large} 0 ${i0.x},${i0.y} Z`;
};
const ceil4 = (v: number) => {
  if (v <= 4) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)) - 1);
  return Math.ceil(v / 4 / p) * p * 4;
};
const short = (n: number) => (n >= 10000000 ? `${+(n / 10000000).toFixed(1)}Cr` : n >= 100000 ? `${+(n / 100000).toFixed(1)}L` : n >= 1000 ? `${+(n / 1000).toFixed(1)}k` : String(Math.round(n)));
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** Web: modules/reports/FinancialSummaryChart.jsx  ("Amount by Fee Category" + "Collection Status Distribution") */
export default function FinancialChart({ statusData = [], typeData = [] }: { statusData?: any[]; typeData?: any[] }) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  if (!statusData.length && !typeData.length) {
    return <View style={styles.empty}><Text style={{ color: colors.textMuted }}>No financial data available</Text></View>;
  }

  const SLOT = 64, mL = 50, mR = 10, mT = 12, plotH = 190, mB = 40;
  const H = mT + plotH + mB;
  const chartW = Math.max(w, mL + mR + typeData.length * SLOT);
  const plotW = chartW - mL - mR;
  const maxV = ceil4(Math.max(1, ...typeData.map((d) => d.amount || 0)));
  const ticks = [0, 1, 2, 3, 4].map((i) => (maxV / 4) * i);
  const slot = typeData.length ? plotW / typeData.length : SLOT;
  const barW = Math.min(22, slot * 0.4);

  const total = statusData.reduce((a, d) => a + (d.value || 0), 0) || 1;
  const pad = statusData.length > 1 ? (4 * Math.PI) / 180 : 0;
  let acc = -Math.PI / 2;
  const slices = statusData.map((d) => {
    const sweep = ((d.value || 0) / total) * Math.PI * 2;
    const a0 = acc + pad / 2, a1 = acc + sweep - pad / 2;
    acc += sweep;
    return { key: d.name, d: donutSlice(100, 100, 90, 70, a0, Math.max(a1, a0 + 0.01)), color: STATUS_COLORS[String(d.name).toUpperCase()] || '#9ca3af' };
  });

  const Card = ({ title, subtitle, children }: any) => (
    <View style={[styles.card, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.cardSub, { color: colors.textMuted }]}>{subtitle}</Text>
      {children}
    </View>
  );

  return (
    <View onLayout={onLayout}>
      <Card title="Amount by Fee Category" subtitle="Breakdown across fee streams">
        {w > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Svg width={chartW} height={H}>
              {ticks.map((t) => {
                const y = mT + plotH - (t / maxV) * plotH;
                return (
                  <G key={t}>
                    <Line x1={mL} x2={chartW - mR} y1={y} y2={y} stroke={colors.border} strokeWidth={1} strokeDasharray="3 3" />
                    <SvgText x={mL - 8} y={y + 4} fontSize={11} fill={colors.textMuted} textAnchor="end">{`₹${short(t)}`}</SvgText>
                  </G>
                );
              })}
              {typeData.map((d, i) => {
                const h = ((d.amount || 0) / maxV) * plotH;
                const cx = mL + slot * i + slot / 2;
                const x = cx - barW / 2;
                const y = mT + plotH - h;
                const r = Math.min(4, h, barW / 2);
                return (
                  <G key={`${d.name}-${i}`}>
                    <Path d={`M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + barW - r},${y} Q${x + barW},${y} ${x + barW},${y + r} L${x + barW},${y + h} Z`} fill="#f59e0b" />
                    <SvgText x={cx} y={mT + plotH + 18} fontSize={11} fill={colors.textMuted} textAnchor="middle">{clip(String(d.name), 11)}</SvgText>
                  </G>
                );
              })}
            </Svg>
          </ScrollView>
        ) : null}
      </Card>

      <Card title="Collection Status Distribution" subtitle="Total volume by payment status">
        <View style={styles.donutWrap}>
          <Svg width={200} height={200}>
            {slices.map((s) => <Path key={s.key} d={s.d} fill={s.color} />)}
          </Svg>
        </View>
        <View style={styles.legend}>
          {statusData.map((d) => (
            <View key={d.name} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: STATUS_COLORS[String(d.name).toUpperCase()] || '#9ca3af' }]} />
              <Text style={[styles.legendText, { color: colors.textMuted }]}>{String(d.name).toUpperCase()}</Text>
            </View>
          ))}
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { height: 140, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 12 },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  cardSub: { fontSize: 12, marginTop: 2, marginBottom: 10 },
  donutWrap: { alignItems: 'center' },
  legend: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, marginRight: 6 },
  legendText: { fontSize: 13, fontWeight: fontWeight.medium },
});