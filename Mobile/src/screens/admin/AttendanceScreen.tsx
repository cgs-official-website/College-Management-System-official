import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Calendar, CheckCheck, Clock3, ChevronDown, UserCheck, UserX } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useStudents } from '../../hooks/useStudents';
import { useAttendance } from '../../hooks/useAttendance';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { StatCard } from '../../components/ui/StatCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { fontSize, fontWeight } from '../../theme/typography';
import { ScrollView } from 'react-native-gesture-handler';

const toDisplayDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}-${m}-${y}` : iso;
};

const toApiDate = (display: string) => {
  const match = display.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : display;
};

export default function AttendanceScreen() {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';
  const { students, isLoading: studentsLoading } = useStudents(collegeId);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dateText, setDateText] = useState(toDisplayDate(new Date().toISOString().split('T')[0]));
  const [selectedClass, setSelectedClass] = useState('ALL');
  const { attendanceRecords, isLoading, isSaving, markAttendance, markAll } = useAttendance(collegeId, null, date);

  const classOptions = useMemo(
    () => [{ value: 'ALL', label: 'All Classes' }, ...Array.from(new Set(students.map((s) => s.class).filter(Boolean))).map((c) => ({ value: String(c), label: String(c) }))],
    [students],
  );
  const filtered = useMemo(() => selectedClass === 'ALL' ? students : students.filter((s) => String(s.class) === selectedClass), [students, selectedClass]);
  const present = filtered.filter((s) => attendanceRecords[s.id] === 'present').length;
  const late = filtered.filter((s) => attendanceRecords[s.id] === 'late').length;
  const absent = filtered.filter((s) => attendanceRecords[s.id] === 'absent').length;

  const applyDate = (text: string) => {
    setDateText(text);
    const apiDate = toApiDate(text);
    if (/^\d{4}-\d{2}-\d{2}$/.test(apiDate)) setDate(apiDate);
  };

  const setStatus = async (studentId: string, status: 'present' | 'absent' | 'late') => {
    await markAttendance({ studentId, date, status });
  };
  const markAllStatus = async (status: 'present' | 'absent') => {
    await markAll({ date, records: filtered.map((s) => ({ studentId: s.id, status })) });
  };

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isLoading || studentsLoading}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.text }]}>Daily Attendance</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Record, monitor, and sync student presence in real time.</Text>
        </View>
        <Button title="Mark All Present" size="sm" fullWidth={false} icon={CheckCheck} loading={isSaving} onPress={() => markAllStatus('present')} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsRow}>
        <View style={styles.statCard}><StatCard title="Total Students" value={filtered.length} icon={UserCheck} tone="primary" /></View>
        <View style={styles.gap} />
        <View style={styles.statCard}><StatCard title="Present" value={present} icon={UserCheck} tone="success" /></View>
        <View style={styles.gap} />
        <View style={styles.statCard}><StatCard title="Late Entry" value={late} icon={Clock3} tone="warning" /></View>
        <View style={styles.gap} />
        <View style={styles.statCard}><StatCard title="Absent / Rate" value={`${absent} (${filtered.length ? Math.round(((present + late) / filtered.length) * 100) : 0}%)`} icon={UserX} tone="danger" /></View>
      </ScrollView>

      <View style={[styles.filterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.filterLabel, { color: colors.text }]}>Attendance Date</Text>
        <View style={[styles.dateField, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Calendar size={18} color={colors.primary} />
          <Text style={[styles.datePrefix, { color: colors.textMuted }]}>Date</Text>
          <TextInputDate value={dateText} onChangeText={applyDate} color={colors.text} placeholderColor={colors.placeholder} />
        </View>
        <View style={styles.filterGap} />
        <Text style={[styles.filterLabel, { color: colors.text }]}>Filter by Class</Text>
        <Select value={selectedClass} onChange={setSelectedClass} options={classOptions} placeholder="All Classes" />
      </View>

      <View style={[styles.rosterHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View>
          <Text style={[styles.rosterTitle, { color: colors.text }]}>Class Roster ({filtered.length} Students)</Text>
          <Text style={[styles.rosterSub, { color: colors.textMuted }]}>{filtered.filter((s) => !attendanceRecords[s.id]).length} unmarked</Text>
        </View>
        <Button title="Mark All Absent" size="sm" fullWidth={false} variant="outline" loading={isSaving} onPress={() => markAllStatus('absent')} />
      </View>

      {isLoading || studentsLoading ? (
        <View style={styles.loader}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserX} title="No students found" message="No students match the selected class." />
      ) : (
        filtered.map((student) => {
          const status = attendanceRecords[student.id];
          const name = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Student';
          return (
            <Card key={student.id} style={styles.studentCard}>
              <View style={styles.studentCopy}>
                <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{name.charAt(0).toUpperCase()}</Text></View>
                <View style={styles.studentText}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{name}</Text>
                  <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={2}>{student.admissionNumber || student.admissionNo || student.rollNumber || 'N/A'} · {student.class || 'Class not assigned'}{student.section ? ` (${student.section})` : ''}</Text>
                </View>
              </View>
              <View style={styles.statusActions}>
                <StatusButton active={status === 'present'} label="P" color={colors.success} onPress={() => setStatus(student.id, 'present')} />
                <StatusButton active={status === 'late'} label="L" color={colors.warning} onPress={() => setStatus(student.id, 'late')} />
                <StatusButton active={status === 'absent'} label="A" color={colors.danger} onPress={() => setStatus(student.id, 'absent')} />
              </View>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

function TextInputDate({ value, onChangeText, color, placeholderColor }: { value: string; onChangeText: (text: string) => void; color: string; placeholderColor: string }) {
  return <TextInput value={value} onChangeText={onChangeText} placeholder="dd-mm-YYYY" placeholderTextColor={placeholderColor} keyboardType="number-pad" maxLength={10} style={{ flex: 1, color, fontSize: fontSize.md, fontWeight: fontWeight.semibold, padding: 0 }} />;
}

function StatusButton({ active, label, color, onPress }: { active: boolean; label: string; color: string; onPress: () => void }) {
  return <Pressable onPress={onPress} style={[styles.statusBtn, { borderColor: color, backgroundColor: active ? color : 'transparent' }]}><Text style={{ color: active ? '#fff' : color, fontWeight: fontWeight.extrabold, fontSize: fontSize.sm }}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
  headerCopy: { flex: 1, paddingRight: 10 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, lineHeight: 19, marginTop: 4 },
  statsRow: { flexDirection: 'row', paddingBottom: 2, marginBottom: 14 },
  statCard: { width: 154 },
  gap: { width: 7 },
  filterCard: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 12 },
  filterLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginBottom: 7 },
  dateField: { height: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
  datePrefix: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, marginHorizontal: 8 },
  filterGap: { height: 6 },
  rosterHeader: { borderWidth: 1, borderRadius: 16, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  rosterTitle: { fontSize: fontSize.md, fontWeight: fontWeight.extrabold },
  rosterSub: { fontSize: fontSize.xs, marginTop: 2 },
  loader: { minHeight: 190, alignItems: 'center', justifyContent: 'center' },
  studentCard: { marginBottom: 10, padding: 12, flexDirection: 'row', alignItems: 'center' },
  studentCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', marginRight: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  studentText: { flex: 1 },
  name: { fontSize: fontSize.sm, fontWeight: fontWeight.extrabold },
  meta: { fontSize: 10, lineHeight: 14, marginTop: 3 },
  statusActions: { flexDirection: 'row', gap: 6 },
  statusBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
});
