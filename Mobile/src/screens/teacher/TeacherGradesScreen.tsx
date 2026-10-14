import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { AlertCircle, FileBarChart, Save, Users } from 'lucide-react-native';

import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/layout/ScreenHeader';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';
import { radius } from '../../theme/spacing';

const EXAM_TYPES = [
  { value: 'Assignment 1', label: 'Assignment 1' },
  { value: 'Assignment 2', label: 'Assignment 2' },
  { value: 'Midterm', label: 'Midterm Examination' },
  { value: 'Final', label: 'Final Examination' },
  { value: 'Practical', label: 'Practical / Lab' },
];

/** Web: pages/teacher/TeacherGrades.jsx (GET /courses/my-classes, GET /students?sectionId=, POST /exams/batch-marks) */
export default function TeacherGradesScreen() {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const confirm = useConfirm();

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [examType, setExamType] = useState('Midterm');
  const [maxMarks, setMaxMarks] = useState('100');

  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const max = Number(maxMarks) || 0;

  useEffect(() => {
    if (!userData?.collegeId) return;
    (async () => {
      try {
        const res = await api.get<any>('/courses/my-classes');
        setCourses(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
      } catch (err) {
        console.error('Error fetching courses:', err);
      }
    })();
  }, [userData?.collegeId]);

  useEffect(() => {
    if (!selectedCourse || !userData?.collegeId) {
      setStudents([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<any>(`/students?sectionId=${selectedCourse}`);
        const list: any[] = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (cancelled) return;
        setStudents(list);
        const initial: Record<string, string> = {};
        list.forEach((s) => {
          initial[s.id] = '';
        });
        setMarks(initial);
      } catch (err) {
        console.error('Error fetching students:', err);
        if (!cancelled) toast.error('Failed to load students');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedCourse, userData?.collegeId]);

  const courseOptions = useMemo(
    () => courses.map((c) => ({ value: String(c.id), label: `${c.name} (${c.code})` })),
    [courses],
  );

  const entered = useMemo(() => students.filter((s) => marks[s.id] !== '' && marks[s.id] !== undefined).length, [students, marks]);

  const handleMarkChange = (studentId: string, raw: string) => {
    const value = raw.replace(/[^0-9.]/g, '');
    const num = Number(value);
    if (value === '' || (num >= 0 && num <= max)) {
      setMarks((prev) => ({ ...prev, [studentId]: value }));
    } else {
      toast.error(`Marks must be between 0 and ${max}`);
    }
  };

  const handleSave = async () => {
    if (!selectedCourse) return toast.error('Please select a class first');
    if (!examType) return toast.error('Please select a course and an exam');
    if (!(max >= 1)) return toast.error('Maximum marks must be at least 1');

    const unentered = students.filter((s) => marks[s.id] === '');
    if (unentered.length > 0) {
      const ok = await confirm({
        title: 'Missing marks',
        message: `There are ${unentered.length} students without marks. Submit anyway?`,
        confirmText: 'Submit',
        isDestructive: false,
      });
      if (!ok) return;
    }

    const records = Object.entries(marks)
      .filter(([, v]) => v !== '')
      .map(([studentId, v]) => ({ studentId, obtainedMarks: Number(v) }));

    if (records.length === 0) return toast.error('No marks entered to save');

    setSaving(true);
    try {
      const selectedClass = courses.find((c) => String(c.id) === selectedCourse);
      await api.post('/exams/batch-marks', {
        courseId: selectedClass?.courseId,
        examType,
        maxMarks: max,
        records,
      });
      toast.success('Marks saved successfully');
    } catch (err: any) {
      console.error(err);
      if (err?.status === 422 || String(err?.message || '').includes('422')) {
        toast.error('Marks exceed the maximum allowed for this exam');
      } else {
        toast.error('Failed to save marks');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <PageHeader
        title="Marks & Grading"
        subtitle="Input scores for assignments and examinations."
        action={
          <Button
            title={saving ? 'Submitting...' : 'Submit Grades'}
            icon={Save}
            loading={saving}
            disabled={saving || students.length === 0}
            onPress={handleSave}
          />
        }
      />

      <Card style={styles.block}>
        <Select
          label="Class / Subject"
          value={selectedCourse}
          options={courseOptions}
          onChange={setSelectedCourse}
          placeholder="-- Choose a Class --"
        />
        <Select label="Examination Type" icon={FileBarChart} value={examType} options={EXAM_TYPES} onChange={setExamType} />
        <Input
          label="Maximum Marks"
          keyboardType="numeric"
          value={maxMarks}
          onChangeText={(v) => setMaxMarks(v.replace(/[^0-9]/g, ''))}
          containerStyle={{ marginBottom: 0 }}
        />
      </Card>

      {selectedCourse ? (
        <Card padded={false} style={styles.block}>
          <View style={[styles.listHead, { backgroundColor: colors.cardAlt, borderBottomColor: colors.border }]}>
            <Users size={18} color={colors.primary} />
            <Text style={[styles.listTitle, { color: colors.text }]}>Grading Roster ({students.length})</Text>
            <Badge label={`Entered: ${entered} / ${students.length}`} tone={entered === students.length && students.length > 0 ? 'success' : 'neutral'} />
          </View>

          {loading ? (
            <Loader label="Loading roster..." />
          ) : students.length === 0 ? (
            <EmptyState icon={AlertCircle} title="No Students Found" message="There are no students enrolled in this class yet." />
          ) : (
            students.map((student, idx) => {
              const has = marks[student.id] !== '' && marks[student.id] !== undefined;
              return (
                <View key={student.id} style={[styles.row, idx > 0 && { borderTopColor: colors.border, borderTopWidth: 1 }]}>
                  <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
                    <Text style={[styles.avatarText, { color: colors.primary }]}>
                      {String(student.firstName || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                      {student.firstName} {student.lastName}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                      {student.rollNumber || `R-${idx + 100}`}
                      {student.email ? ` · ${student.email}` : ''}
                    </Text>
                  </View>
                  <View style={styles.scoreBox}>
                    <TextInput
                      value={marks[student.id] ?? ''}
                      onChangeText={(v) => handleMarkChange(student.id, v)}
                      placeholder="-"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="numeric"
                      maxLength={6}
                      style={[
                        styles.scoreInput,
                        {
                          backgroundColor: colors.inputBg,
                          borderColor: has ? colors.success : colors.border,
                          color: has ? colors.success : colors.text,
                        },
                      ]}
                    />
                    <Text style={[styles.outOf, { color: colors.textSubtle }]}>/ {max}</Text>
                  </View>
                </View>
              );
            })
          )}
        </Card>
      ) : courses.length === 0 && !loading ? (
        <Card>
          <EmptyState icon={AlertCircle} title="No Classes Assigned" message="You have not been assigned to any classes yet." />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 4, marginBottom: 16 },
  headerBtn: { marginBottom: 16 },
  block: { marginBottom: 16 },
  listHead: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderBottomWidth: 1, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  listTitle: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  meta: { fontSize: fontSize.xs, marginTop: 2 },
  scoreBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreInput: {
    width: 64,
    height: 44,
    textAlign: 'center',
    borderWidth: 1.5,
    borderRadius: radius.md,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    padding: 0,
  },
  outOf: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, minWidth: 30 },
});