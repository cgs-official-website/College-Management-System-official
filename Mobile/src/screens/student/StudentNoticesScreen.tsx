import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Calendar, Megaphone } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { useStudentNotices } from '../../hooks/useStudentPortal';
import { formatDate } from '../../utils/format';
import { fontSize, fontWeight } from '../../theme/typography';

/** Web: pages/student/StudentNoticesDashboard.jsx */
export default function StudentNoticesScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isRefreshing, refetch } = useStudentNotices();
  const notices: any[] = Array.isArray(data) ? data : [];

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefreshing} onRefresh={refetch}>
      <Text style={[styles.title, { color: colors.text }]}>Notice Board</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Official circulars, academic notices, and important campus announcements.
      </Text>

      {isLoading ? (
        <Loader label="Loading notices..." />
      ) : notices.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No Active Notices"
          message="Campus announcements published by the administration will appear here."
        />
      ) : (
        notices.map((notice) => {
          const isHigh = notice.priority === 'high' || notice.priority === 'urgent';
          return (
            <Card
              key={notice.id}
              style={[styles.card, isHigh && { borderColor: colors.dangerBorder }]}>
              <View style={styles.top}>
                <View
                  style={[
                    styles.iconBox,
                    {
                      backgroundColor: isHigh ? colors.dangerSoft : colors.primarySoft,
                      borderColor: isHigh ? colors.dangerBorder : colors.border,
                    },
                  ]}>
                  <Megaphone size={22} color={isHigh ? colors.danger : colors.primary} />
                </View>
                <View style={styles.body}>
                  <Text style={[styles.noticeTitle, { color: colors.text }]}>{notice.title}</Text>
                  <View style={styles.dateRow}>
                    <Calendar size={13} color={colors.textSubtle} />
                    <Text style={[styles.dateText, { color: colors.textSubtle }]}>{formatDate(notice.createdAt)}</Text>
                    {isHigh ? (
                      <View style={styles.badgeWrap}>
                        <Badge label="IMPORTANT" tone="danger" small />
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
              {notice.content ? (
                <Text style={[styles.content, { color: colors.textMuted }]}>{notice.content}</Text>
              ) : null}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  subtitle: { fontSize: fontSize.sm, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  card: { marginBottom: 12 },
  top: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  body: { flex: 1 },
  noticeTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  dateText: { fontSize: fontSize.xs },
  badgeWrap: { marginLeft: 6 },
  content: { fontSize: fontSize.sm, lineHeight: 21, marginTop: 12 },
});