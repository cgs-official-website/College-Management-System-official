import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ArrowLeft, GraduationCap, User } from 'lucide-react-native';

import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/layout/ScreenHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { useStudent } from '../../hooks/useStudents';
import { fontSize, fontWeight } from '../../theme/typography';
import { formatDate, initials } from '../../utils/format';

const Field = ({ label, value }: { label: string; value?: string | null }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.fieldValue, { color: colors.text }]}>{value || '-'}</Text>
    </View>
  );
};

/** Web: pages/admin/students/StudentDetail.jsx ("Student Profile"). */
export default function StudentDetailScreen({ studentId, onBack }: { studentId: string; onBack: () => void }) {
  const { colors } = useTheme();
  const { data: student, isLoading, error } = useStudent(studentId);

  if (isLoading) return <Loader label="Loading student details..." fullScreen />;
  if (error || !student) {
    return (
      <Screen edges={['left', 'right', 'bottom']}>
        <EmptyState title="Student not found" message="Error loading student or student not found." actionLabel="Back" onAction={onBack} />
      </Screen>
    );
  }

  const fullName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.name;
  const isActive = student.status === 'active';

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <PageHeader title="Student Profile" subtitle="Detailed view of student information." />
      <View style={{ marginBottom: 14 }}>
        <Button title="Back to Students" variant="outline" size="sm" icon={ArrowLeft} onPress={onBack} fullWidth={false} />
      </View>

      <Card style={styles.profile}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>{initials(fullName)}</Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]}>{fullName}</Text>
        <Text style={[styles.admission, { color: colors.primary }]}>{student.admissionNo}</Text>
        <View style={{ marginTop: 10 }}>
          <Badge label={isActive ? 'Active' : 'Inactive'} tone={isActive ? 'success' : 'neutral'} />
        </View>
      </Card>

      <Card style={styles.block}>
        <View style={styles.blockTitle}>
          <User size={18} color={colors.primary} />
          <Text style={[styles.blockTitleText, { color: colors.text }]}>Personal Information</Text>
        </View>
        <Field label="Email" value={student.email} />
        <Field label="Phone" value={student.phone} />
        <Field label="Date of Birth" value={student.dob ? formatDate(student.dob) : ''} />
        <Field label="Gender" value={student.gender ? String(student.gender).replace(/^\w/, (c: string) => c.toUpperCase()) : ''} />
        <Field label="Address" value={student.address} />
      </Card>

      <Card style={styles.block}>
        <View style={styles.blockTitle}>
          <GraduationCap size={18} color={colors.primary} />
          <Text style={[styles.blockTitleText, { color: colors.text }]}>Academic Information</Text>
        </View>
        <Field label="Class" value={student.class} />
        <Field label="Section" value={student.section} />
        <Field label="Department" value={student.department} />
        <Field label="Residence Type" value={student.residenceType} />
      </Card>

      <Card style={styles.block}>
        <View style={styles.blockTitle}>
          <User size={18} color={colors.primary} />
          <Text style={[styles.blockTitleText, { color: colors.text }]}>Parent / Guardian</Text>
        </View>
        <Field label="Name" value={student.parentName} />
        <Field label="Phone" value={student.parentPhone} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { alignItems: 'center', marginBottom: 14 },
  avatar: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: fontWeight.extrabold },
  name: { fontSize: fontSize.xl, fontWeight: fontWeight.extrabold, textAlign: 'center' },
  admission: { fontSize: fontSize.md, fontWeight: fontWeight.medium, marginTop: 4 },
  block: { marginBottom: 14 },
  blockTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  blockTitleText: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  field: { marginBottom: 12 },
  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  fieldValue: { fontSize: fontSize.md, fontWeight: fontWeight.bold, marginTop: 2 },
});