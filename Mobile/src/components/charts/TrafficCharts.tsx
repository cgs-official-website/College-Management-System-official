import React, { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, G, Line, LinearGradient, Path, Polygon, Stop, Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';
import type { TrafficPoint } from '../../hooks/useTraffic';

const BLUE = '#3b82f6';
const GREEN = '#10b981';
const PURPLE = '#a855f7';
const INDIGO = '#6366f1';

const compact = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(Math.round(v)));
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** Smooth line through points (midpoint quadratic smoothing). */
const smooth = (pts: { x: number; y: number }[]) => {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const mx = (pts[i - 1].x + pts[i].x) / 2;
    const my = (pts[i - 1].y + pts[i].y) / 2;
    d += ` Q${pts[i - 1].x},${pts[i - 1].y} ${mx},${my}`;
  }
  const last = pts[pts.length - 1];
  return `${d} T${last.x},${last.y}`;
};

/** Web: "Traffic Volume & Visitor Inflow" area chart (Page Views blue / Unique Visitors green). Tap to inspect a point. */
export function TrafficAreaChart({ data = [], height = 220 }: { data?: TrafficPoint[]; height?: number }) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  if (!data.length) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: colors.textMuted, fontWeight: fontWeight.medium }}>No traffic data for this range</Text>
      </View>
    );
  }

  const mL = 38, mR = 8, mT = 10, mB = 26;
  const plotW = Math.max(10, w - mL - mR);
  const plotH = height - mT - mB;
  const maxV = Math.max(1, ...data.map((d) => Math.max(d.pageViews, d.uniqueVisitors)));
  const top = Math.ceil(maxV * 1.1);
  const xOf = (i: number) => mL + (data.length === 1 ? plotW / 2 : (plotW * i) / (data.length - 1));
  const yOf = (v: number) => mT + plotH - (v / top) * plotH;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => Math.round(top * t));
  const labelEvery = Math.max(1, Math.ceil(data.length / 5));

  const mk = (key: 'pageViews' | 'uniqueVisitors') => {
    const pts = data.map((d, i) => ({ x: xOf(i), y: yOf(d[key]) }));
    const line = smooth(pts);
    const area = `${line} L${pts[pts.length - 1].x},${mT + plotH} L${pts[0].x},${mT + plotH} Z`;
    return { line, area };
  };
  const pv = mk('pageViews');
  const uv = mk('uniqueVisitors');

  const pick = (x: number) => {
    const idx = Math.round(((x - mL) / plotW) * (data.length - 1));
    setSel(Math.min(data.length - 1, Math.max(0, idx)));
  };
  const s = sel !== null ? data[sel] : null;

  return (
    <View onLayout={onLayout}>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: BLUE }]} /><Text style={[styles.legendText, { color: colors.textMuted }]}>Page Views</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: GREEN }]} /><Text style={[styles.legendText, { color: colors.textMuted }]}>Unique Visitors</Text></View>
      </View>

      {s ? (
        <View style={[styles.tip, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
          <Text style={[styles.tipLabel, { color: colors.textMuted }]}>{s.label}</Text>
          <Text style={[styles.tipVal, { color: BLUE }]}>{Number(s.pageViews).toLocaleString()} views</Text>
          <Text style={[styles.tipVal, { color: GREEN }]}>{Number(s.uniqueVisitors).toLocaleString()} visitors</Text>
        </View>
      ) : (
        <Text style={[styles.hint, { color: colors.textSubtle }]}>Tap the chart to inspect a point</Text>
      )}

      {w > 0 ? (
        <Pressable onPress={(e) => pick(e.nativeEvent.locationX)} onLongPress={() => setSel(null)}>
          <Svg width={w} height={height} pointerEvents="none">
            <Defs>
              <LinearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={BLUE} stopOpacity={0.4} />
                <Stop offset="1" stopColor={BLUE} stopOpacity={0} />
              </LinearGradient>
              <LinearGradient id="uvGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={GREEN} stopOpacity={0.35} />
                <Stop offset="1" stopColor={GREEN} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            {ticks.map((t) => (
              <G key={t}>
                <Line x1={mL} x2={w - mR} y1={yOf(t)} y2={yOf(t)} stroke={colors.border} strokeWidth={1} strokeDasharray="3 3" />
                <SvgText x={mL - 6} y={yOf(t) + 4} fontSize={10} fill={colors.textMuted} textAnchor="end">{compact(t)}</SvgText>
              </G>
            ))}
            <Path d={pv.area} fill="url(#pvGrad)" />
            <Path d={uv.area} fill="url(#uvGrad)" />
            <Path d={pv.line} stroke={BLUE} strokeWidth={2.5} fill="none" />
            <Path d={uv.line} stroke={GREEN} strokeWidth={2} fill="none" />
            {data.map((d, i) =>
              i % labelEvery === 0 ? (
                <SvgText key={`${d.label}-${i}`} x={xOf(i)} y={height - 8} fontSize={10} fill={colors.textMuted} textAnchor="middle">{clip(d.label, 7)}</SvgText>
              ) : null,
            )}
            {sel !== null ? (
              <G>
                <Line x1={xOf(sel)} x2={xOf(sel)} y1={mT} y2={mT + plotH} stroke={colors.textSubtle} strokeWidth={1} strokeDasharray="4 3" />
                <Circle cx={xOf(sel)} cy={yOf(data[sel].pageViews)} r={4.5} fill={BLUE} stroke="#fff" strokeWidth={1.5} />
                <Circle cx={xOf(sel)} cy={yOf(data[sel].uniqueVisitors)} r={4.5} fill={GREEN} stroke="#fff" strokeWidth={1.5} />
              </G>
            ) : null}
          </Svg>
        </Pressable>
      ) : null}
    </View>
  );
}

export interface HBarItem { label: string; value: number }

/** Web: "Tenant College Request Share" - horizontal bars. */
export function HorizontalBars({ data = [], color = INDIGO, unit = '' }: { data?: HBarItem[]; color?: string; unit?: string }) {
  const { colors } = useTheme();
  const max = Math.max(1, ...data.map((d) => d.value));
  if (!data.length) {
    return <View style={styles.empty}><Text style={{ color: colors.textMuted, fontWeight: fontWeight.medium }}>No colleges to chart yet</Text></View>;
  }
  return (
    <View style={{ gap: 12 }}>
      {data.map((d, i) => (
        <View key={`${d.label}-${i}`}>
          <View style={styles.barHead}>
            <Text style={[styles.barLabel, { color: colors.text }]} numberOfLines={1}>{d.label}</Text>
            <Text style={[styles.barValue, { color: colors.textMuted }]}>{Number(d.value).toLocaleString()}{unit}</Text>
          </View>
          <View style={[styles.track, { backgroundColor: colors.cardAlt }]}>
            <View style={[styles.fill, { width: `${Math.max(2, (d.value / max) * 100)}%`, backgroundColor: color }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

/** Web: "Multi-Dimensional Performance Radar" (College A blue / College B purple). */
export function RadarCompare({
  axes,
  a,
  b,
  nameA,
  nameB,
  size = 260,
}: {
  axes: string[];
  a: number[];
  b?: number[];
  nameA: string;
  nameB?: string;
  size?: number;
}) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);
  const S = Math.min(size, w || size);
  const c = S / 2;
  const R = S / 2 - 38;
  const n = axes.length;
  const ang = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, v: number) => {
    const r = (Math.min(100, Math.max(0, v)) / 100) * R;
    return `${c + r * Math.cos(ang(i))},${c + r * Math.sin(ang(i))}`;
  };
  const ring = (f: number) => axes.map((_, i) => pt(i, f * 100)).join(' ');

  return (
    <View onLayout={onLayout} style={{ alignItems: 'center' }}>
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: BLUE }]} /><Text style={[styles.legendText, { color: colors.textMuted }]} numberOfLines={1}>{clip(nameA, 18)}</Text></View>
        {b && nameB ? <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: PURPLE }]} /><Text style={[styles.legendText, { color: colors.textMuted }]} numberOfLines={1}>{clip(nameB, 18)}</Text></View> : null}
      </View>
      {w > 0 ? (
        <Svg width={S} height={S}>
          {[0.25, 0.5, 0.75, 1].map((f) => (
            <Polygon key={f} points={ring(f)} fill="none" stroke={colors.border} strokeWidth={1} />
          ))}
          {axes.map((_, i) => (
            <Line key={i} x1={c} y1={c} x2={c + R * Math.cos(ang(i))} y2={c + R * Math.sin(ang(i))} stroke={colors.border} strokeWidth={1} />
          ))}
          <Polygon points={a.map((v, i) => pt(i, v)).join(' ')} fill={BLUE} fillOpacity={0.4} stroke={BLUE} strokeWidth={2} />
          {b ? <Polygon points={b.map((v, i) => pt(i, v)).join(' ')} fill={PURPLE} fillOpacity={0.35} stroke={PURPLE} strokeWidth={2} /> : null}
          {axes.map((label, i) => {
            const lx = c + (R + 18) * Math.cos(ang(i));
            const ly = c + (R + 18) * Math.sin(ang(i)) + 4;
            return <SvgText key={label} x={lx} y={ly} fontSize={10} fill={colors.textMuted} textAnchor="middle">{label}</SvgText>;
          })}
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { height: 120, alignItems: 'center', justifyContent: 'center' },
  legend: { flexDirection: 'row', justifyContent: 'flex-end', gap: 14, marginBottom: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', maxWidth: 160 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  legendText: { fontSize: 12, fontWeight: fontWeight.medium },
  hint: { fontSize: 11, textAlign: 'center', marginBottom: 6 },
  tip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6, gap: 8 },
  tipLabel: { fontSize: 12, fontWeight: fontWeight.bold },
  tipVal: { fontSize: 12, fontWeight: fontWeight.bold },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, gap: 8 },
  barLabel: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  barValue: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
});
