import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Award, BookOpen, Calendar, CheckCircle2, ClipboardList } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Tabs } from '../../components/ui/Tabs';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { useStudentExams, useStudentResults } from '../../hooks/useStudentPortal';
import { formatDate } from '../../utils/format';
import { fontSize, fontWeight } from '../../theme/typography';

const percentTone = (p: number): BadgeTone => (p >= 75 ? 'success' : p >= 40 ? 'warning' : 'danger');

/** Web: pages/student/StudentExamsDashboard.jsx */
export default function StudentExamsScreen() {
  const { colors } = useTheme();
  const examsQ = useStudentExams();
  const resultsQ = useStudentResults();
  const [tab, setTab] = useState<'upcoming' | 'results'>('upcoming');

  const exams: any[] = Array.isArray(examsQ.data) ? examsQ.data : [];
  const results: any[] = Array.isArray(resultsQ.data) ? resultsQ.data : [];

  const loading = examsQ.isLoading || resultsQ.isLoading;
  const refetchAll = async () => {
    await Promise.all([examsQ.refetch(), resultsQ.refetch()]);
  };

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={examsQ.isRefreshing || resultsQ.isRefreshing}
      onRefresh={refetchAll}>
      <Text style={[styles.title, { color: colors.text }]}>Exams & Results</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        View scheduled examinations, hall schedules, and published academic report cards.
      </Text>

      {loading ? (
        <Loader label="Loading exams..." />
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard compact title="Scheduled Exams" value={exams.length} icon={Calendar} tone="primary" />
            <StatCard compact title="Published Results" value={results.length} icon={Award} tone="success" />
            <StatCard compact title="Academic Standing" value="Good" icon={CheckCircle2} tone="info" />
          </View>

          <Tabs
            tabs={[
              { key: 'upcoming', label: 'Exam Schedule', count: exams.length },
              { key: 'results', label: 'Marks & Report Card', count: results.length },
            ]}
            active={tab}
            onChange={(k) => setTab(k as 'upcoming' | 'results')}
          />

          <View style={styles.list}>
            {tab === 'upcoming' ? (
              exams.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No Upcoming Exams"
                  message="Midterm and end-semester examination timetables will appear here once published by the examination cell."
                />
              ) : (
                exams.map((exam) => (
                  <Card key={exam.id} style={styles.card}>
                    <View style={styles.row}>
                      <View style={[styles.iconBox, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
                        <Calendar size={20} color={colors.primary} />
                      </View>
                      <View style={styles.body}>
                        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                          {exam.title || exam.name}
                        </Text>
                        <View style={styles.inline}>
                          <BookOpen size={13} color={colors.textMuted} />
                          <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                            {exam.course?.name || 'General Course'}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={[styles.footer, { borderTopColor: colors.border }]}>
                      <Badge label={exam.type || 'Written Examination'} tone="neutral" small />
                      <View style={styles.footerRight}>
                        <Text style={[styles.date, { color: colors.text }]}>{exam.date ? formatDate(exam.date) : 'TBA'}</Text>
                        <Text style={[styles.meta, { color: colors.textMuted }]}>Max Marks: {exam.maxMarks || 100}</Text>
                      </View>
                    </View>
                  </Card>
                ))
              )
            ) : results.length === 0 ? (
              <EmptyState
                icon={Award}
                title="No Results Published"
                message="Evaluated marks and grade cards will be displayed here once released by the examination committee."
              />
            ) : (
              results.map((res) => {
                const max = Number(res.exam?.maxMarks) || 100;
                const hasScore = typeof res.score === 'number';
                const pct = hasScore ? Math.round((res.score / max) * 100) : null;
                return (
                  <Card key={res.id} style={styles.card}>
                    <View style={styles.row}>
                      <View style={styles.body}>
                        <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                          {res.exam?.title || 'Academic Assessment'}
                        </Text>
                        <Text style={[styles.meta, { color: colors.textMuted, marginTop: 4 }]} numberOfLines={1}>
                          {res.exam?.course?.name || 'Subject'}
                        </Text>
                      </View>
                      <View style={styles.scoreWrap}>
                        <Text style={styles.scoreLine}>
                          <Text style={[styles.score, { color: pct === null ? colors.textMuted : colors.success }]}>
                            {hasScore ? res.score : 'N/A'}
                          </Text>
                          <Text style={[styles.meta, { color: colors.textMuted }]}> / {max}</Text>
                        </Text>
                        {pct !== null ? (
                          <View style={{ marginTop: 4 }}>
                            <Badge label={`${pct}%`} tone={percentTone(pct)} small />
                          </View>
                        ) : null}
                      </View>
                    </View>
                    {res.remarks ? (
                      <Text style={[styles.remarks, { color: colors.textMuted, borderTopColor: colors.border }]}>
                        Remarks: {res.remarks}
                      </Text>
                    ) : null}
                  </Card>
                );
              })
            )}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  subtitle: { fontSize: fontSize.sm, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  list: { marginTop: 14 },
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  body: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  meta: { fontSize: fontSize.xs },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  footerRight: { alignItems: 'flex-end' },
  date: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  scoreWrap: { alignItems: 'flex-end' },
  scoreLine: { textAlign: 'right' },
  score: { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold },
  remarks: { fontSize: fontSize.xs, marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth },
});