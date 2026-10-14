import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle, BookOpen, ChevronRight, Clock, Users } from 'lucide-react-native';

import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDrawerNav } from '../../components/layout/DrawerContent';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

/** Web: pages/teacher/TeacherClasses.jsx (GET /courses/my-classes) */
export default function TeacherClassesScreen() {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const nav = useDrawerNav();

  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!userData?.collegeId) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.get<any>('/courses/my-classes');
      setCourses(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  }, [userData?.collegeId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}>
      <Text style={[styles.title, { color: colors.text }]}>My Classes</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Manage the classes and subjects you are currently teaching.</Text>

      {loading ? (
        <Loader label="Loading classes..." />
      ) : courses.length === 0 ? (
        <Card>
          <EmptyState
            icon={AlertCircle}
            title="No Classes Assigned"
            message="You have not been assigned to any classes for this semester yet."
          />
        </Card>
      ) : (
        courses.map((course: any) => (
          <Card key={course.id} style={styles.card}>
            <View style={styles.top}>
              <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
                <BookOpen size={22} color={colors.primary} />
              </View>
              <Badge label={String(course.code || 'CODE').toUpperCase()} tone="neutral" />
            </View>

            <Text style={[styles.name, { color: colors.text }]}>{course.name}</Text>
            <Text style={[styles.dept, { color: colors.textMuted }]}>{course.department || 'General'} Department</Text>

            <View style={styles.metaRow}>
              <Users size={15} color={colors.textMuted} />
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>{course.enrolledCount ?? 0}</Text> Students Enrolled
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Clock size={15} color={colors.textMuted} />
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {course.credits} Credits / {course.semester} Semesters
              </Text>
            </View>

            <View style={[styles.actions, { borderTopColor: colors.border }]}>
              <View style={styles.flex}>
                <Button title="Attendance" variant="outline" size="sm" onPress={() => nav.navigate('attendance')} />
              </View>
              <View style={styles.flex}>
                <Button title="Assignments" variant="secondary" size="sm" icon={ChevronRight} onPress={() => nav.navigate('assignments')} />
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 4, marginBottom: 16 },
  card: { marginBottom: 14 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  icon: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  dept: { fontSize: fontSize.sm, marginTop: 2, marginBottom: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  meta: { fontSize: fontSize.sm },
  actions: { flexDirection: 'row', gap: 10, marginTop: 8, paddingTop: 14, borderTopWidth: 1 },
});