import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Bus, CheckCircle2, Clock } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { useStudentTransport } from '../../hooks/useStudentPortal';
import { fontSize, fontWeight } from '../../theme/typography';

/** Web: pages/student/StudentTransport.jsx */
export default function StudentTransportScreen() {
  const { colors } = useTheme();
  const { data: transport, isLoading, isRefreshing, refetch } = useStudentTransport();

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefreshing} onRefresh={refetch}>
      <Text style={[styles.title, { color: colors.text }]}>Transport & Bus Routes</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        View your assigned college transit route and pickup stop.
      </Text>

      {isLoading ? (
        <Loader label="Loading transport details..." />
      ) : transport?.transportRequired === 'Yes' ? (
        <>
          <Card style={styles.card}>
            <View style={styles.head}>
              <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
                <Bus size={24} color={colors.primary} />
              </View>
              <View style={styles.headBody}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Active Bus Pass</Text>
                <View style={styles.inline}>
                  <CheckCircle2 size={14} color={colors.success} />
                  <Text style={[styles.active, { color: colors.success }]}>Allocated Route</Text>
                </View>
              </View>
            </View>
            <View style={styles.detail}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Route Name</Text>
              <Text style={[styles.value, { color: colors.text }]}>{transport.route}</Text>
            </View>
            <View style={[styles.detail, { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Pickup / Drop Point</Text>
              <Text style={[styles.value, { color: colors.text }]}>{transport.pickupPoint}</Text>
            </View>
          </Card>

          <Card style={styles.card}>
            <View style={styles.head}>
              <View style={[styles.iconBox, { backgroundColor: colors.successSoft }]}>
                <Clock size={24} color={colors.success} />
              </View>
              <View style={styles.headBody}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Transit Schedule</Text>
                <Text style={[styles.meta, { color: colors.textMuted }]}>Daily campus arrival & departure</Text>
              </View>
            </View>
            <Text style={[styles.para, { color: colors.textMuted }]}>
              Buses arrive at campus by 8:45 AM and depart at 4:30 PM. Please be at your designated pickup point 10
              minutes prior to scheduled departure.
            </Text>
          </Card>
        </>
      ) : (
        <EmptyState
          icon={Bus}
          title="No Transport Subscription"
          message="You do not currently have an active bus route subscription. To subscribe for college transport service, contact the transport desk or submit an inquiry via Helpdesk."
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
  para: { fontSize: fontSize.sm, lineHeight: 21 },
});