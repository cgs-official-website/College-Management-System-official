import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Award, BookOpen, Clock, Layers } from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { useStudentCourses } from '../../hooks/useStudentPortal';
import { fontSize, fontWeight } from '../../theme/typography';

/** Web: pages/student/StudentCoursesDashboard.jsx */
export default function StudentCoursesScreen() {
  const { colors } = useTheme();
  const { data, isLoading, isRefreshing, refetch } = useStudentCourses();
  const courses: any[] = Array.isArray(data) ? data : [];

  const totalCredits = courses.reduce((acc, c) => acc + (c.credits || 3), 0);

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefreshing} onRefresh={refetch}>
      <Text style={[styles.title, { color: colors.text }]}>My Courses</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        View your enrolled subjects, course credits, and curriculum details.
      </Text>

      {isLoading ? (
        <Loader label="Loading courses..." />
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard compact title="Enrolled Courses" value={courses.length} icon={BookOpen} tone="primary" />
            <StatCard compact title="Total Credits" value={totalCredits} icon={Award} tone="success" />
            <StatCard compact title="Department" value={courses[0]?.department?.code || 'Academic'} icon={Layers} tone="info" />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Curriculum Subjects</Text>
            <Badge label={`${courses.length} Registered`} tone="primary" />
          </View>

          {courses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No Courses Enrolled"
              message="Your department course allocations will appear here once academic registration is finalized."
            />
          ) : (
            courses.map((course) => (
              <Card key={course.id} style={styles.courseCard}>
                <View style={styles.courseTop}>
                  <View style={[styles.codeBox, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
                    <Text style={[styles.codeText, { color: colors.primary }]}>{(course.code || 'CRS').slice(0, 3)}</Text>
                  </View>
                  <View style={styles.courseBody}>
                    <Text style={[styles.courseName, { color: colors.text }]} numberOfLines={2}>
                      {course.name}
                    </Text>
                    <View style={[styles.codePill, { backgroundColor: colors.cardAlt }]}>
                      <Text style={[styles.codePillText, { color: colors.textMuted }]}>{course.code}</Text>
                    </View>
                  </View>
                </View>

                <Text style={[styles.desc, { color: colors.textMuted }]} numberOfLines={2}>
                  {course.description || `Official course syllabus for ${course.name}.`}
                </Text>

                <View style={[styles.metaRow, { borderTopColor: colors.border }]}>
                  <View style={styles.metaItem}>
                    <Award size={15} color={colors.success} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      <Text style={[styles.metaStrong, { color: colors.text }]}>{course.credits || 3}</Text> Credits
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Clock size={15} color={colors.primary} />
                    <Text style={[styles.metaText, { color: colors.textMuted }]}>
                      Semester <Text style={[styles.metaStrong, { color: colors.text }]}>{course.semester || 1}</Text>
                    </Text>
                  </View>
                </View>
              </Card>
            ))
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
  courseCard: { marginBottom: 12 },
  courseTop: { flexDirection: 'row', alignItems: 'center' },
  codeBox: { width: 46, height: 46, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  codeText: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  courseBody: { flex: 1 },
  courseName: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  codePill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  codePillText: { fontSize: 11, fontWeight: fontWeight.medium },
  desc: { fontSize: fontSize.xs, marginTop: 10, lineHeight: 17 },
  metaRow: { flexDirection: 'row', gap: 20, marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: fontSize.xs },
  metaStrong: { fontWeight: fontWeight.extrabold },
});