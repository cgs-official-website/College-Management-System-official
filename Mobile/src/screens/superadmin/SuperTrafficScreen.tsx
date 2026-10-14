import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Activity,
  AlertTriangle,
  Building2,
  Clock,
  Globe,
  Radio,
  RefreshCw,
  Scale,
  Server,
  ShieldCheck,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react-native';

import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Tabs } from '../../components/ui/Tabs';
import { Badge, toneForStatus } from '../../components/ui/Badge';
import { SearchBar } from '../../components/ui/SearchBar';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { HorizontalBars, RadarCompare, TrafficAreaChart } from '../../components/charts/TrafficCharts';
import { useTheme } from '../../contexts/ThemeContext';
import { useTraffic, TrafficRange, CollegeAnalysis } from '../../hooks/useTraffic';
import { formatNumber } from '../../utils/format';
import { fontSize, fontWeight } from '../../theme/typography';

const RANGES: { key: TrafficRange; label: string }[] = [
  { key: '24h', label: '24H' },
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '90d', label: '90D' },
];

const TABS = [
  { key: 'traffic', label: 'Traffic' },
  { key: 'monitoring', label: 'Colleges' },
  { key: 'comparison', label: 'Compare' },
];

const STATUS_FILTERS = ['all', 'active', 'trial', 'pending', 'suspended'];
const AUTO_REFRESH_MS = 12000;

const scoreTone = (n: number) => (n >= 80 ? 'success' : n >= 50 ? 'info' : n >= 25 ? 'warning' : 'danger');

/** Web: SuperAdminLayout -> /super/traffic -> <SuperTraffic/> ("Traffic & College Monitoring"). Same API; layout is mobile-first. */
export default function SuperTrafficScreen() {
  const { colors } = useTheme();
  const [range, setRange] = useState<TrafficRange>('7d');
  const [tab, setTab] = useState('traffic');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { data, isLoading, isRefetching, isFallback, error, refetch } = useTraffic(range);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [idA, setIdA] = useState('');
  const [idB, setIdB] = useState('');

  // Auto-refresh (traffic tab only) - same 12s cadence as web.
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  useEffect(() => {
    if (!autoRefresh || tab !== 'traffic') return;
    const id = setInterval(() => { refetchRef.current(); }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, tab]);

  const colleges = data?.collegeAnalysis ?? [];

  // Default the two comparison pickers once colleges arrive.
  useEffect(() => {
    if (!colleges.length) return;
    if (!colleges.some((c) => c.id === idA)) setIdA(colleges[0].id);
    if (!colleges.some((c) => c.id === idB)) setIdB((colleges[1] || colleges[0]).id);
  }, [colleges, idA, idB]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return colleges.filter((c) => {
      const matchQ = !q || c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q);
      const matchS = statusFilter === 'all' || c.status === statusFilter;
      return matchQ && matchS;
    });
  }, [colleges, search, statusFilter]);

  const collegeA = colleges.find((c) => c.id === idA) || colleges[0];
  const collegeB = colleges.find((c) => c.id === idB) || colleges[1] || colleges[0];
  const single = !collegeA || !collegeB || collegeA.id === collegeB.id;

  if (isLoading && !data) return <Loader label="Loading traffic..." />;
  if (!data) {
    return (
      <Screen edges={['left', 'right', 'bottom']} refreshing={isRefetching} onRefresh={refetch}>
        <EmptyState icon={AlertTriangle} title="Couldn't load traffic" message={error || 'Pull down to try again.'} actionLabel="Retry" onAction={() => refetch()} />
      </Screen>
    );
  }

  const m = data.monitoring;
  const s = data.summary;
  const val = (n: number) => formatNumber(n);

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefetching} onRefresh={refetch}>
      {/* Banner */}
      <View style={[styles.banner, { backgroundColor: colors.primary }]}>
        <View style={styles.bannerTop}>
          <View style={styles.bannerTitleRow}>
            <Activity size={22} color="#ffffff" />
            <Text style={styles.bannerTitle}>Traffic & Monitoring</Text>
          </View>
          <Pressable onPress={() => refetch()} style={styles.glassBtn} accessibilityLabel="Refresh">
            <RefreshCw size={18} color="#ffffff" />
          </Pressable>
        </View>
        <Text style={styles.bannerDesc}>Platform traffic, college activity and module adoption across the Zuna ecosystem.</Text>
        <View style={styles.rangeRow}>
          {RANGES.map((r) => {
            const on = r.key === range;
            return (
              <Pressable key={r.key} onPress={() => setRange(r.key)} style={[styles.rangeChip, on && styles.rangeChipOn]}>
                <Text style={[styles.rangeText, on && { color: colors.primaryDark }]}>{r.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isFallback || error ? (
        <View style={[styles.notice, { backgroundColor: colors.warningSoft, borderColor: colors.warning }]}>
          <AlertTriangle size={18} color={colors.warning} />
          <Text style={[styles.noticeText, { color: colors.text }]}>
            {isFallback
              ? 'Traffic stats are unavailable right now. Showing the college directory only; traffic and module figures will appear once /traffic/stats responds.'
              : error}
          </Text>
        </View>
      ) : null}

      {/* KPIs */}
      <View style={styles.row}>
        <StatCard title="Colleges" value={val(m.colleges.total)} subtitle={`${m.colleges.active} active · ${m.colleges.activeRatePct}%`} icon={Building2} tone="info" />
        <StatCard title="Global users" value={val(m.users.total)} subtitle={`${m.users.students} students · ${m.users.teachers} faculty`} icon={Users} tone="success" />
      </View>
      <View style={styles.row}>
        <StatCard title="College admins" value={val(m.admins.total)} subtitle={`${m.admins.active} active`} icon={ShieldCheck} tone="primary" />
        <StatCard title="Avg latency" value={`${s.avgLatencyMs} ms`} subtitle={`${s.liveActiveSessions} live sessions`} icon={Radio} tone="danger" />
      </View>

      <View style={{ marginTop: 14 }}>
        <Tabs tabs={TABS} active={tab} onChange={setTab} />
      </View>

      {/* ---------------- TAB 1: Traffic ---------------- */}
      {tab === 'traffic' ? (
        <View style={styles.section}>
          <Card>
            <View style={styles.cardHead}>
              <View style={styles.titleRow}>
                <TrendingUp size={18} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.text }]}>Traffic Volume & Visitors</Text>
              </View>
              <Pressable onPress={() => setAutoRefresh((v) => !v)} style={[styles.livePill, { backgroundColor: autoRefresh ? colors.successSoft : colors.cardAlt }]}>
                <View style={[styles.liveDot, { backgroundColor: autoRefresh ? colors.success : colors.textSubtle }]} />
                <Text style={[styles.liveText, { color: autoRefresh ? colors.success : colors.textMuted }]}>{autoRefresh ? 'Live' : 'Paused'}</Text>
              </Pressable>
            </View>

            <View style={[styles.hud, { backgroundColor: colors.cardAlt }]}>
              {[
                { icon: Zap, label: 'Requests', value: val(s.totalRequests), fg: colors.info },
                { icon: Users, label: 'Visitors', value: val(s.totalUniqueVisitors), fg: colors.success },
                { icon: Clock, label: 'Latency', value: `${s.avgLatencyMs} ms`, fg: colors.primary },
                { icon: Radio, label: 'Bandwidth', value: `${s.totalBandwidthGB} GB`, fg: colors.warning },
              ].map((h) => {
                const Icon = h.icon;
                return (
                  <View key={h.label} style={styles.hudItem}>
                    <Icon size={15} color={h.fg} />
                    <Text style={[styles.hudValue, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{h.value}</Text>
                    <Text style={[styles.hudLabel, { color: colors.textMuted }]}>{h.label}</Text>
                  </View>
                );
              })}
            </View>

            <TrafficAreaChart data={data.timeline} />

            <View style={[styles.healthRow, { borderTopColor: colors.border }]}>
              <Text style={[styles.healthText, { color: colors.textMuted }]}>Error rate {s.errorRatePct}%</Text>
              <Badge label={s.healthStatus} tone={s.healthStatus === 'Optimal' ? 'success' : 'neutral'} small />
            </View>
          </Card>

          <Card style={styles.gap}>
            <View style={styles.titleRow}>
              <Radio size={18} color={colors.success} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Request Pipeline</Text>
            </View>
            {data.liveLogs.length ? (
              <View style={{ marginTop: 12, gap: 8 }}>
                {data.liveLogs.slice(0, 6).map((log, i) => (
                  <View key={log.id || i} style={[styles.logRow, { backgroundColor: colors.cardAlt }]}>
                    <View style={styles.logTop}>
                      <Badge label={log.method || 'GET'} tone={log.method === 'POST' ? 'success' : 'info'} small />
                      <Text style={[styles.logPath, { color: colors.text }]} numberOfLines={1}>{log.path || '-'}</Text>
                    </View>
                    <Text style={[styles.logMeta, { color: colors.textMuted }]} numberOfLines={1}>
                      {[log.collegeName, log.status, log.latencyMs != null ? `${log.latencyMs}ms` : null, log.timestamp].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.muted, { color: colors.textMuted }]}>No live request events reported yet.</Text>
            )}
          </Card>

          <Card style={styles.gap}>
            <View style={styles.titleRow}>
              <Server size={18} color={colors.info} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Tenant College Request Share</Text>
            </View>
            <View style={{ marginTop: 14 }}>
              <HorizontalBars
                data={data.collegeTrafficLeaderboard.map((c) => ({ label: c.name, value: c.requests }))}
              />
            </View>
          </Card>

          <Card style={styles.gap}>
            <View style={styles.titleRow}>
              <Globe size={18} color={colors.success} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Client Environment</Text>
            </View>
            {data.devices.length || data.browsers.length ? (
              <>
                <Text style={[styles.sub, { color: colors.textSubtle }]}>DEVICES</Text>
                <View style={{ gap: 10 }}>
                  {data.devices.map((d) => (
                    <View key={d.name}>
                      <View style={styles.barHead}>
                        <Text style={[styles.barLabel, { color: colors.text }]}>{d.name}</Text>
                        <Text style={[styles.barVal, { color: colors.text }]}>{d.value}%</Text>
                      </View>
                      <View style={[styles.track, { backgroundColor: colors.cardAlt }]}>
                        <View style={{ width: `${Math.min(100, d.value)}%`, height: '100%', borderRadius: 4, backgroundColor: d.color || colors.primary }} />
                      </View>
                    </View>
                  ))}
                </View>
                <Text style={[styles.sub, { color: colors.textSubtle, marginTop: 16 }]}>BROWSERS</Text>
                <View style={styles.chipWrap}>
                  {data.browsers.map((b) => (
                    <View key={b.name} style={[styles.browser, { backgroundColor: colors.cardAlt }]}>
                      <Text style={[styles.barLabel, { color: colors.textMuted }]}>{b.name}</Text>
                      <Text style={[styles.barVal, { color: colors.text }]}>{b.percentage}%</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text style={[styles.muted, { color: colors.textMuted }]}>No device or browser data reported yet.</Text>
            )}
          </Card>
        </View>
      ) : null}

      {/* ---------------- TAB 2: Colleges ---------------- */}
      {tab === 'monitoring' ? (
        <View style={styles.section}>
          <SearchBar value={search} onChangeText={setSearch} placeholder="Search college name or slug..." />
          <View style={styles.chipWrap}>
            {STATUS_FILTERS.map((f) => {
              const on = f === statusFilter;
              return (
                <Pressable
                  key={f}
                  onPress={() => setStatusFilter(f)}
                  style={[styles.filter, { backgroundColor: on ? colors.primary : colors.card, borderColor: on ? colors.primary : colors.border }]}>
                  <Text style={{ color: on ? colors.onPrimary : colors.textMuted, fontSize: fontSize.sm, fontWeight: fontWeight.bold, textTransform: 'capitalize' }}>{f}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.count, { color: colors.textSubtle }]}>Showing {filtered.length} of {colleges.length} colleges</Text>

          {filtered.length === 0 ? (
            <EmptyState icon={Building2} title="No registered colleges found" message="Only colleges onboarded in this project appear here." />
          ) : (
            filtered.map((c) => <CollegeCard key={c.id} college={c} />)
          )}
        </View>
      ) : null}

      {/* ---------------- TAB 3: Comparison ---------------- */}
      {tab === 'comparison' ? (
        <View style={styles.section}>
          {!collegeA ? (
            <EmptyState icon={Scale} title="No colleges to compare" message="Onboard a college first to see comparative benchmarks." />
          ) : (
            <>
              <Card>
                <View style={styles.titleRow}>
                  <Scale size={18} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Cross-College Comparison</Text>
                </View>
                <View style={{ marginTop: 12 }}>
                  <Select label="College A" value={idA} options={colleges.map((c) => ({ value: c.id, label: `${c.name} (${c.slug})` }))} onChange={setIdA} />
                  <Select label="College B" value={idB} options={colleges.map((c) => ({ value: c.id, label: `${c.name} (${c.slug})` }))} onChange={setIdB} />
                </View>
              </Card>

              <Card style={styles.gap}>
                <View style={styles.titleRow}>
                  <Activity size={18} color={colors.primary} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Performance Radar</Text>
                </View>
                <RadarCompare
                  axes={['Engagement', 'Adoption', 'Users', 'Attendance', 'Finance', 'LMS']}
                  nameA={collegeA.name}
                  nameB={single ? undefined : collegeB.name}
                  a={radarValues(collegeA)}
                  b={single ? undefined : radarValues(collegeB)}
                />
              </Card>

              <Card style={styles.gap}>
                <View style={styles.titleRow}>
                  <Scale size={18} color={colors.info} />
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Head-to-Head Benchmarks</Text>
                </View>
                <View style={{ marginTop: 8 }}>
                  {benchmarkRows(collegeA, collegeB).map((row, i, arr) => {
                    const leader = single ? null : row.a > row.b ? 'A' : row.b > row.a ? 'B' : 'tie';
                    return (
                      <View key={row.name} style={[styles.bench, i < arr.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
                        <Text style={[styles.benchName, { color: colors.textMuted }]}>{row.name}</Text>
                        <View style={styles.benchVals}>
                          <Text style={[styles.benchVal, { color: leader === 'A' ? '#3b82f6' : colors.text }]}>{row.fa}</Text>
                          {!single ? <Text style={[styles.benchVal, { color: leader === 'B' ? '#a855f7' : colors.text }]}>{row.fb}</Text> : null}
                        </View>
                      </View>
                    );
                  })}
                  {!single ? (
                    <View style={styles.legendNote}>
                      <Text style={{ color: '#3b82f6', fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>A: {collegeA.name}</Text>
                      <Text style={{ color: '#a855f7', fontSize: fontSize.xs, fontWeight: fontWeight.bold }}>B: {collegeB.name}</Text>
                    </View>
                  ) : null}
                </View>
              </Card>
            </>
          )}
        </View>
      ) : null}
    </Screen>
  );
}

/** Same scoring as the web radar. */
function radarValues(c: CollegeAnalysis): number[] {
  return [
    c.activityScore,
    c.moduleAdoptionRate,
    Math.min(100, Math.round((c.users.total / 150) * 100)),
    c.moduleUsage.attendance?.isActive ? 90 : 20,
    c.moduleUsage.fees?.isActive ? 85 : 15,
    c.moduleUsage.assignments?.isActive ? 80 : 10,
  ];
}

function benchmarkRows(a: CollegeAnalysis, b: CollegeAnalysis) {
  const n = (x: CollegeAnalysis, k: string) => x.moduleUsage[k]?.count ?? 0;
  const rows: { name: string; a: number; b: number; fa?: string; fb?: string }[] = [
    { name: 'Total users', a: a.users.total, b: b.users.total },
    { name: 'College admins', a: a.users.admins, b: b.users.admins },
    { name: 'Students', a: a.users.students, b: b.users.students },
    { name: 'Faculty', a: a.users.teachers, b: b.users.teachers },
    { name: 'Module adoption', a: a.moduleAdoptionRate, b: b.moduleAdoptionRate, fa: `${a.moduleAdoptionRate}%`, fb: `${b.moduleAdoptionRate}%` },
    { name: 'Active modules', a: a.activeModuleCount, b: b.activeModuleCount, fa: `${a.activeModuleCount}/${a.totalModules}`, fb: `${b.activeModuleCount}/${b.totalModules}` },
    { name: 'Attendance records', a: n(a, 'attendance'), b: n(b, 'attendance') },
    { name: 'Fee invoices', a: n(a, 'fees'), b: n(b, 'fees') },
    { name: 'LMS tasks', a: n(a, 'assignments'), b: n(b, 'assignments') },
    { name: 'Exams created', a: n(a, 'exams'), b: n(b, 'exams') },
    { name: 'Activity score', a: a.activityScore, b: b.activityScore, fa: `${a.activityScore}/100`, fb: `${b.activityScore}/100` },
  ];
  return rows.map((r) => ({ ...r, fa: r.fa ?? formatNumber(r.a), fb: r.fb ?? formatNumber(r.b) }));
}

function CollegeCard({ college: c }: { college: CollegeAnalysis }) {
  const { colors } = useTheme();
  const tone = scoreTone(c.activityScore);
  return (
    <Card style={styles.gap}>
      <View style={styles.collegeTop}>
        <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>{c.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.collegeName, { color: colors.text }]} numberOfLines={1}>{c.name}</Text>
          <Text style={[styles.slug, { color: colors.textSubtle }]} numberOfLines={1}>slug: {c.slug}</Text>
        </View>
        <Badge label={c.status.charAt(0).toUpperCase() + c.status.slice(1)} tone={toneForStatus(c.status)} />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: colors.text }]}>{formatNumber(c.users.total)}</Text>
          <Text style={[styles.statCap, { color: colors.textMuted }]}>Users</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNum, { color: colors.text }]}>{c.moduleAdoptionRate}%</Text>
          <Text style={[styles.statCap, { color: colors.textMuted }]}>{c.activeModuleCount}/{c.totalModules} modules</Text>
        </View>
        <View style={styles.statBox}>
          <Badge label={`${c.activityScore}/100`} tone={tone} />
          <Text style={[styles.statCap, { color: colors.textMuted }]}>{c.activityLevel}</Text>
        </View>
      </View>

      <Text style={[styles.userSplit, { color: colors.textMuted }]}>
        {c.users.admins} Admins · {c.users.students} Students · {c.users.teachers} Faculty
      </Text>

      <View style={styles.chipWrap}>
        {Object.entries(c.moduleUsage).map(([k, mod]) => (
          <View key={k} style={[styles.modChip, { backgroundColor: mod.isActive ? colors.cardAlt : 'transparent', borderColor: colors.border }]}>
            <Text
              style={{
                fontSize: 10,
                fontWeight: fontWeight.semibold,
                color: mod.isActive ? colors.text : colors.textSubtle,
                textDecorationLine: mod.isActive ? 'none' : 'line-through',
              }}>
              {mod.name}{mod.isActive ? ` · ${formatNumber(mod.count)}` : ''}
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  banner: { borderRadius: 22, padding: 20 },
  bannerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  bannerTitle: { color: '#ffffff', fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  glassBtn: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  bannerDesc: { color: 'rgba(255,255,255,0.88)', fontSize: fontSize.sm, lineHeight: 21, marginTop: 12 },
  rangeRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  rangeChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(255,255,255,0.16)' },
  rangeChipOn: { backgroundColor: '#ffffff', borderColor: '#ffffff' },
  rangeText: { color: '#ffffff', fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  notice: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 14 },
  noticeText: { flex: 1, fontSize: fontSize.sm, lineHeight: 19 },
  row: { flexDirection: 'row', gap: 12, marginTop: 12 },
  section: { marginTop: 12, gap: 12 },
  gap: { marginTop: 0 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold, flexShrink: 1 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  liveText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  hud: { flexDirection: 'row', borderRadius: 14, paddingVertical: 10, marginBottom: 12 },
  hudItem: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 4 },
  hudValue: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  hudLabel: { fontSize: 10, fontWeight: fontWeight.bold, textTransform: 'uppercase' },
  healthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, marginTop: 10, paddingTop: 10 },
  healthText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  logRow: { borderRadius: 10, padding: 10, gap: 4 },
  logTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logPath: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  logMeta: { fontSize: fontSize.xs },
  muted: { fontSize: fontSize.sm, marginTop: 10 },
  sub: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, letterSpacing: 0.6, marginTop: 14, marginBottom: 8 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },
  barVal: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  browser: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '48%', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
  filter: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  count: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  collegeTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  collegeName: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  slug: { fontSize: fontSize.xs, marginTop: 2 },
  statsRow: { flexDirection: 'row', marginTop: 14 },
  statBox: { flex: 1, gap: 4, alignItems: 'flex-start' },
  statNum: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  statCap: { fontSize: fontSize.xs },
  userSplit: { fontSize: fontSize.xs, marginTop: 12, marginBottom: 10 },
  modChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  bench: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11 },
  benchName: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  benchVals: { flexDirection: 'row', gap: 18 },
  benchVal: { minWidth: 56, textAlign: 'right', fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  legendNote: { gap: 2, marginTop: 10 },
});
