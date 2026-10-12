import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CheckCircle2, Clock, FileBarChart, FileText, Upload } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge, BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Tabs } from '../../components/ui/Tabs';
import { SheetModal } from '../../components/ui/SheetModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { useStudentAssignments } from '../../hooks/useStudentPortal';
import { toast } from '../../utils/toast';
import { formatDate } from '../../utils/format';
import { fontSize, fontWeight } from '../../theme/typography';

type FilterKey = 'all' | 'pending' | 'submitted' | 'graded';

const statusTone = (status?: string): BadgeTone => {
  switch (status) {
    case 'Graded':
      return 'success';
    case 'Submitted':
      return 'info';
    case 'Overdue':
      return 'danger';
    default:
      return 'warning';
  }
};

/** Web: pages/student/StudentAssignmentsDashboard.jsx */
export default function StudentAssignmentsScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isRefreshing, refetch, submitAssignment, isSubmitting } = useStudentAssignments();
  const assignments: any[] = Array.isArray(data) ? data : [];

  const [filter, setFilter] = useState<FilterKey>('all');
  const [selected, setSelected] = useState<any>(null);
  const [submissionUrl, setSubmissionUrl] = useState('');

  const pendingCount = assignments.filter((a) => a.status === 'Pending' || a.status === 'Overdue').length;
  const submittedCount = assignments.filter((a) => a.status === 'Submitted' || a.status === 'Graded').length;
  const gradedCount = assignments.filter((a) => a.status === 'Graded').length;

  const visible = useMemo(() => {
    switch (filter) {
      case 'pending':
        return assignments.filter((a) => a.status === 'Pending' || a.status === 'Overdue');
      case 'submitted':
        return assignments.filter((a) => a.status === 'Submitted');
      case 'graded':
        return assignments.filter((a) => a.status === 'Graded');
      default:
        return assignments;
    }
  }, [assignments, filter]);

  const openSubmit = (assignment: any) => {
    setSelected(assignment);
    setSubmissionUrl(assignment.submissionFileUrl || '');
  };

  const closeSubmit = () => {
    setSelected(null);
    setSubmissionUrl('');
  };

  const handleSubmit = async () => {
    const url = submissionUrl.trim();
    if (!url) {
      toast.error('Please provide a submission link or document URL');
      return;
    }
    if (!/^https?:\/\/\S+$/i.test(url)) {
      toast.error('Please enter a valid link starting with http:// or https://');
      return;
    }
    try {
      await submitAssignment({ assignmentId: selected.id, fileUrl: url });
      closeSubmit();
    } catch {
      // toast already shown by the hook
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefreshing} onRefresh={refetch}>
      <Text style={[styles.title, { color: colors.text }]}>Assignments</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Track upcoming deadlines, submit course projects, and review grading feedback.
      </Text>

      {isLoading ? (
        <Loader label="Loading assignments..." />
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard compact title="Pending" value={pendingCount} icon={Clock} tone="danger" />
            <StatCard compact title="Submitted" value={submittedCount} icon={Upload} tone="info" />
          </View>
          <View style={styles.statsRow}>
            <StatCard compact title="Graded" value={gradedCount} icon={CheckCircle2} tone="success" />
            <StatCard compact title="Total Assigned" value={assignments.length} icon={FileBarChart} tone="primary" />
          </View>

          <Tabs
            active={filter}
            onChange={(k) => setFilter(k as FilterKey)}
            tabs={[
              { key: 'all', label: 'All', count: assignments.length },
              { key: 'pending', label: 'Pending', count: pendingCount },
              { key: 'submitted', label: 'Submitted', count: assignments.filter((a) => a.status === 'Submitted').length },
              { key: 'graded', label: 'Graded', count: gradedCount },
            ]}
          />
          <View style={{ height: 12 }} />

          {visible.length === 0 ? (
            <EmptyState
              icon={FileBarChart}
              title={assignments.length === 0 ? 'No Assignments Yet' : 'Nothing in this filter'}
              message={
                assignments.length === 0
                  ? 'Assignments assigned by your professors will appear here for online submission.'
                  : 'Try another tab to see the rest of your assignments.'
              }
            />
          ) : (
            visible.map((a) => {
              const isOverdue = a.status === 'Overdue';
              const isSubmitted = a.status === 'Submitted' || a.status === 'Graded';
              const iconBg = isSubmitted ? colors.successSoft : isOverdue ? colors.dangerSoft : colors.primarySoft;
              const iconFg = isSubmitted ? colors.success : isOverdue ? colors.danger : colors.primary;

              return (
                <Card key={a.id} style={styles.card}>
                  <View style={styles.top}>
                    <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                      <FileText size={22} color={iconFg} />
                    </View>
                    <View style={styles.body}>
                      <Text style={[styles.aTitle, { color: colors.text }]} numberOfLines={2}>
                        {a.title}
                      </Text>
                      <View style={styles.pills}>
                        <View style={[styles.coursePill, { backgroundColor: colors.cardAlt }]}>
                          <Text style={[styles.courseText, { color: colors.textMuted }]} numberOfLines={1}>
                            {a.courseName}
                          </Text>
                        </View>
                        <Badge label={a.status} tone={statusTone(a.status)} small />
                      </View>
                    </View>
                  </View>

                  {a.description ? (
                    <Text style={[styles.desc, { color: colors.textMuted }]} numberOfLines={3}>
                      {a.description}
                    </Text>
                  ) : null}

                  {a.score !== null && a.score !== undefined ? (
                    <View style={[styles.gradeBox, { backgroundColor: colors.successSoft, borderColor: colors.successBorder }]}>
                      <Text style={[styles.gradeText, { color: colors.success }]}>Grade Score: {a.score} / 100</Text>
                      {a.feedback ? (
                        <Text style={[styles.feedback, { color: colors.textMuted }]}>Feedback: "{a.feedback}"</Text>
                      ) : null}
                    </View>
                  ) : null}

                  <View style={[styles.footer, { borderTopColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.due, { color: colors.text }]}>Due: {a.dueDate ? formatDate(a.dueDate) : 'No due date'}</Text>
                      {a.submittedAt ? (
                        <Text style={[styles.submittedOn, { color: colors.success }]}>Submitted on {formatDate(a.submittedAt)}</Text>
                      ) : null}
                    </View>
                    <Button
                      title={isSubmitted ? 'Update Submission' : 'Submit Assignment'}
                      variant={isSubmitted ? 'outline' : 'primary'}
                      size="sm"
                      fullWidth={false}
                      icon={Upload}
                      onPress={() => openSubmit(a)}
                    />
                  </View>
                </Card>
              );
            })
          )}
        </>
      )}

      {/* Submission sheet (web: Submit Assignment modal) */}
      <SheetModal
        visible={!!selected}
        onClose={closeSubmit}
        title="Submit Assignment"
        footer={
          <View style={styles.footerButtons}>
            <View style={{ flex: 1 }}>
              <Button title="Cancel" variant="outline" onPress={closeSubmit} />
            </View>
            <View style={{ flex: 1 }}>
              <Button title="Confirm Submission" icon={Upload} loading={isSubmitting} onPress={handleSubmit} />
            </View>
          </View>
        }>
        {selected ? (
          <>
            <Text style={[styles.modalSub, { color: colors.textMuted }]}>
              {selected.title} • {selected.courseName}
            </Text>
            <Input
              label="Document or Project URL"
              required
              value={submissionUrl}
              onChangeText={setSubmissionUrl}
              placeholder="https://drive.google.com/file/d/..."
              hint="Paste your submission link (e.g. Google Drive, GitHub repository, or Cloud document link)."
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </>
        ) : null}
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  subtitle: { fontSize: fontSize.sm, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  card: { marginBottom: 12 },
  top: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  body: { flex: 1 },
  aTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  pills: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  coursePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, maxWidth: 170 },
  courseText: { fontSize: 11, fontWeight: fontWeight.medium },
  desc: { fontSize: fontSize.xs, marginTop: 10, lineHeight: 17 },
  gradeBox: { marginTop: 10, padding: 10, borderRadius: 12, borderWidth: 1 },
  gradeText: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  feedback: { fontSize: fontSize.xs, marginTop: 4, lineHeight: 17 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, gap: 10 },
  due: { fontSize: fontSize.xs, fontWeight: fontWeight.bold },
  submittedOn: { fontSize: 11, marginTop: 2, fontWeight: fontWeight.medium },
  footerButtons: { flexDirection: 'row', gap: 10 },
  modalSub: { fontSize: fontSize.sm, marginBottom: 14 },
});