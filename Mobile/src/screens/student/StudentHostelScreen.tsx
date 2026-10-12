import React from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Bed, CheckCircle2, DoorClosed, Phone } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { useStudentHostel } from '../../hooks/useStudentPortal';
import { fontSize, fontWeight } from '../../theme/typography';

/** Web: pages/student/StudentHostel.jsx */
export default function StudentHostelScreen() {
  const { colors } = useTheme();
  const { data: hostel, isLoading, isRefreshing, refetch } = useStudentHostel();

  const rows: [string, any][] = hostel?.isHosteller
    ? [
        ['Hostel Block', hostel.blockName],
        ['Room Number', hostel.roomNo],
        ...(hostel.roomType ? ([['Room Type', hostel.roomType]] as [string, any][]) : []),
        ...(hostel.floor !== null && hostel.floor !== undefined && hostel.floor !== ''
          ? ([['Floor', hostel.floor]] as [string, any][])
          : []),
        ['Residence Category', hostel.residenceType],
      ]
    : [];

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefreshing} onRefresh={refetch}>
      <Text style={[styles.title, { color: colors.text }]}>Hostel & Residence</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        View your campus residential room allocation and block details.
      </Text>

      {isLoading ? (
        <Loader label="Loading hostel details..." />
      ) : hostel?.isHosteller ? (
        <>
          <Card style={styles.card}>
            <View style={styles.head}>
              <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
                <Bed size={24} color={colors.primary} />
              </View>
              <View style={styles.headBody}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Assigned Residence</Text>
                <View style={styles.inline}>
                  <CheckCircle2 size={14} color={colors.success} />
                  <Text style={[styles.active, { color: colors.success }]}>Active Allotment</Text>
                </View>
              </View>
            </View>
            {rows.map(([label, value], i) => (
              <View key={label} style={[styles.detail, i > 0 && { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
                <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
                <Text style={[styles.value, { color: colors.text }]}>{String(value ?? '-')}</Text>
              </View>
            ))}
          </Card>

          <Card style={styles.card}>
            <View style={styles.head}>
              <View style={[styles.iconBox, { backgroundColor: colors.successSoft }]}>
                <Phone size={24} color={colors.success} />
              </View>
              <View style={styles.headBody}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Residential Office</Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>Hostel warden & support contact</Text>
              </View>
            </View>

            {hostel.wardenName ? (
              <Text style={[styles.line, { color: colors.textMuted }]}>
                Warden: <Text style={[styles.strong, { color: colors.text }]}>{hostel.wardenName}</Text>
              </Text>
            ) : null}
            {hostel.wardenPhone ? (
              <Text style={[styles.line, { color: colors.textMuted }]}>
                Phone:{' '}
                <Text
                  style={[styles.strong, { color: colors.primary }]}
                  onPress={() => Linking.openURL(`tel:${hostel.wardenPhone}`)}>
                  {hostel.wardenPhone}
                </Text>
              </Text>
            ) : null}
            <Text style={[styles.line, { color: colors.textMuted, marginTop: 6 }]}>
              For room issues, maintenance requests, or night-out passes, please contact your block resident warden or
              raise a ticket under <Text style={[styles.strong, { color: colors.text }]}>Complaints</Text>.
            </Text>
          </Card>
        </>
      ) : (
        <EmptyState
          icon={DoorClosed}
          title="Day Scholar Status"
          message="You are currently registered as a Day Scholar. If you require on-campus hostel accommodation, please contact the admissions & hostel office."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  subtitle: { fontSize: fontSize.sm, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  card: { marginBottom: 14 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headBody: { flex: 1 },
  cardTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  active: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  meta: { fontSize: fontSize.xs, marginTop: 3 },
  detail: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12 },
  label: { fontSize: fontSize.sm },
  value: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginLeft: 12, flexShrink: 1, textAlign: 'right' },
  line: { fontSize: fontSize.sm, lineHeight: 21, marginBottom: 4 },
  strong: { fontWeight: fontWeight.bold },
});