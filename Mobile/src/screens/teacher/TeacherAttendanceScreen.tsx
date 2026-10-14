import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, Calendar, CheckCircle2, Clock, Save, Users, XCircle } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/layout/ScreenHeader';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SearchBar } from '../../components/ui/SearchBar';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

type Status = 'present' | 'late' | 'absent';

const todayStr = () => new Date().toISOString().split('T')[0];
const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Web: pages/teacher/TeacherAttendance.jsx (GET /courses/my-classes, GET /students?sectionId=, POST /attendance/batch-mark) */
export default function TeacherAttendanceScreen() {
  const { colors } = useTheme();
  const { userData } = useAuth();

  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [date, setDate] = useState(todayStr());
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Status>>({});
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Courses assigned to the teacher
  useEffect(() => {
    if (!userData?.collegeId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await api.get<any>('/courses/my-classes');
        setCourses(Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [userData?.collegeId]);

  // Students of the selected class (default everyone Present)
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
        const initial: Record<string, Status> = {};
        list.forEach((s) => {
          initial[s.id] = 'present';
        });
        setAttendance(initial);
      } catch (err) {
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

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      `${s.firstName || ''} ${s.lastName || ''} ${s.email || ''} ${s.rollNumber || ''}`.toLowerCase().includes(q),
    );
  }, [students, search]);

  const counts = useMemo(() => {
    const c = { present: 0, late: 0, absent: 0 };
    students.forEach((s) => {
      const st = attendance[s.id];
      if (st) c[st] += 1;
    });
    return c;
  }, [students, attendance]);

  const mark = useCallback((id: string, status: Status) => {
    setAttendance((prev) => ({ ...prev, [id]: status }));
  }, []);

  const markAll = (status: Status) => {
    const next: Record<string, Status> = {};
    students.forEach((s) => {
      next[s.id] = status;
    });
    setAttendance(next);
  };

  const handleSave = async () => {
    if (!selectedCourse) return toast.error('Please select a class first');
    if (students.length === 0) return toast.error('No students to mark');
    if (!isDate(date)) return toast.error('Use date format YYYY-MM-DD');

    setSaving(true);
    try {
      const records = students.map((s) => ({ studentId: s.id, status: (attendance[s.id] || 'present').toLowerCase() }));
      await api.post('/attendance/batch-mark', {
        courseId: selectedCourse, // sectionId, same as web
        date,
        records,
      });
      toast.success('Attendance saved successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const options: { status: Status; label: string; icon: LucideIcon; fg: string; bg: string }[] = [
    { status: 'present', label: 'Present', icon: CheckCircle2, fg: colors.success, bg: colors.successSoft },
    { status: 'late', label: 'Late', icon: Clock, fg: colors.warning, bg: colors.warningSoft },
    { status: 'absent', label: 'Absent', icon: XCircle, fg: colors.danger, bg: colors.dangerSoft },
  ];

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <PageHeader
        title="Daily Attendance"
        subtitle="Mark student attendance for your assigned classes."
        action={
          <Button
            title={saving ? 'Saving...' : 'Save Records'}
            icon={Save}
            loading={saving}
            disabled={saving || students.length === 0}
            onPress={handleSave}
          />
        }
      />

      <Card style={styles.block}>
        <Select
          label="Select Class / Subject"
          value={selectedCourse}
          options={courseOptions}
          onChange={setSelectedCourse}
          placeholder="-- Choose a Class --"
        />
        <Input
          label="Date (YYYY-MM-DD)"
          icon={Calendar}
          value={date}
          onChangeText={setDate}
          placeholder="2026-10-13"
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          containerStyle={{ marginBottom: 0 }}
        />
      </Card>

      {selectedCourse ? (
        <Card padded={false} style={styles.block}>
          <View style={[styles.listHead, { backgroundColor: colors.cardAlt, borderBottomColor: colors.border }]}>
            <Users size={18} color={colors.primary} />
            <Text style={[styles.listTitle, { color: colors.text }]}>Student List ({students.length})</Text>
          </View>

          {loading ? (
            <Loader label="Loading students..." />
          ) : students.length === 0 ? (
            <EmptyState icon={AlertCircle} title="No Students Found" message="There are no students enrolled in this class yet." />
          ) : (
            <View style={styles.listBody}>
              <SearchBar value={search} onChangeText={setSearch} placeholder="Search student..." style={{ marginBottom: 12 }} />

              <View style={styles.summaryRow}>
                {options.map((o) => (
                  <Pressable
                    key={o.status}
                    onPress={() => markAll(o.status)}
                    style={[styles.summaryChip, { backgroundColor: o.bg }]}
                    accessibilityLabel={`Mark all ${o.label}`}>
                    <Text style={[styles.summaryNum, { color: o.fg }]}>{counts[o.status]}</Text>
                    <Text style={[styles.summaryLbl, { color: o.fg }]}>{o.label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={[styles.hint, { color: colors.textSubtle }]}>Tap a count to mark everyone with that status.</Text>

              {visible.length === 0 ? (
                <Text style={[styles.noMatch, { color: colors.textMuted }]}>No students match your search.</Text>
              ) : (
                visible.map((student, idx) => {
                  const current = attendance[student.id];
                  return (
                    <View key={student.id} style={[styles.row, { borderTopColor: colors.border }]}>
                      <View style={styles.who}>
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
                      </View>

                      <View style={styles.statusRow}>
                        {options.map((o) => {
                          const active = current === o.status;
                          const Icon = o.icon;
                          return (
                            <Pressable
                              key={o.status}
                              onPress={() => mark(student.id, o.status)}
                              style={[
                                styles.statusBtn,
                                {
                                  backgroundColor: active ? o.bg : colors.cardAlt,
                                  borderColor: active ? o.fg : 'transparent',
                                },
                              ]}>
                              <Icon size={15} color={active ? o.fg : colors.textMuted} />
                              <Text style={{ fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: active ? o.fg : colors.textMuted }}>
                                {o.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </Card>
      ) : loading ? (
        <Loader label="Loading classes..." />
      ) : courses.length === 0 ? (
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
  listTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  listBody: { padding: 14 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryChip: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14 },
  summaryNum: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  summaryLbl: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
  hint: { fontSize: fontSize.xs, marginTop: 8, marginBottom: 4, textAlign: 'center' },
  noMatch: { textAlign: 'center', paddingVertical: 20, fontSize: fontSize.sm },
  row: { paddingVertical: 12, borderTopWidth: 1 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  meta: { fontSize: fontSize.xs, marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1.5,
  },
});