import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowUpRight, Briefcase, Building, Calendar, CheckCircle2 } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { useStudentPlacements } from '../../hooks/useStudentPortal';
import { formatDate } from '../../utils/format';
import { fontSize, fontWeight } from '../../theme/typography';

/** driveDate is free-form JSON on the backend: format when it is a real date, else show as typed */
const driveDateText = (v?: string | null) => {
  if (!v) return null;
  const f = formatDate(v);
  return f === '-' ? String(v) : f;
};

/** Web: pages/student/StudentPlacements.jsx */
export default function StudentPlacementsScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isRefreshing, refetch } = useStudentPlacements();
  const drives: any[] = Array.isArray(data) ? data : [];
  const upcoming = drives.filter((d) => d.status === 'upcoming').length;

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefreshing} onRefresh={refetch}>
      <Text style={[styles.title, { color: colors.text }]}>Placement Drives</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Explore campus recruitment opportunities, company CTC packages, and eligibility criteria.
      </Text>

      {isLoading ? (
        <Loader label="Loading drives..." />
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard compact title="Campus Drives" value={drives.length} icon={Briefcase} tone="primary" />
            <StatCard compact title="Upcoming Drives" value={upcoming} icon={Calendar} tone="success" />
            <StatCard compact title="Eligible Status" value="Verified" icon={CheckCircle2} tone="info" />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Recruitment Opportunities</Text>
            <Badge label={`${drives.length} Listed`} tone="neutral" />
          </View>

          {drives.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No Active Drives"
              message="Upcoming campus placements organized by the training & placement cell will be posted here."
            />
          ) : (
            drives.map((drive) => {
              const date = driveDateText(drive.driveDate);
              return (
                <Card key={drive.id} style={styles.card}>
                  <View style={styles.row}>
                    <View style={[styles.iconBox, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
                      <Building size={22} color={colors.primary} />
                    </View>
                    <View style={styles.body}>
                      <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                        {drive.companyName}
                      </Text>
                      <View style={{ marginTop: 4 }}>
                        <Badge label={String(drive.ctc)} tone="success" small />
                      </View>
                    </View>
                  </View>

                  <Text style={[styles.role, { color: colors.text }]}>
                    Role: <Text style={{ color: colors.textMuted, fontWeight: fontWeight.semibold }}>{drive.role}</Text>
                  </Text>
                  <Text style={[styles.meta, { color: colors.textMuted }]}>Eligibility: {drive.eligibilityCriteria}</Text>

                  <View style={[styles.footer, { borderTopColor: colors.border }]}>
                    <View style={styles.inline}>
                      <Calendar size={14} color={colors.textMuted} />
                      <Text style={[styles.date, { color: colors.text }]}>
                        {date ? `Drive Date: ${date}` : 'Date Announced Soon'}
                      </Text>
                    </View>
                    <View style={styles.inline}>
                      <Text style={[styles.apply, { color: colors.primary }]}>Open for Application</Text>
                      <ArrowUpRight size={13} color={colors.primary} />
                    </View>
                  </View>
                </Card>
              );
            })
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  subtitle: { fontSize: fontSize.sm, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginRight: 8 },
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  body: { flex: 1 },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  role: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginTop: 12 },
  meta: { fontSize: fontSize.xs, marginTop: 4, lineHeight: 17 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  date: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  apply: { fontSize: 11, fontWeight: fontWeight.bold },
});