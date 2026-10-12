import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SheetModal } from '../../components/ui/SheetModal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useCourses } from '../../hooks/useCourses';
import { useSections } from '../../hooks/useSections';
import { fontSize, fontWeight } from '../../theme/typography';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void | Promise<void>;
  initialData?: any | null;
  isLoading?: boolean;
}

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  admissionNumber: string;
  studentRegNo: string;
  phone: string;
  dob: string;
  gender: string;
  courseId: string;
  sectionId: string;
  parentName: string;
  parentPhone: string;
  address: string;
  residenceType: string;
};

const toDateInput = (v: any): string => {
  if (!v) return '';
  if (typeof v === 'string') return v.split('T')[0];
  try {
    return new Date(v).toISOString().split('T')[0];
  } catch {
    return '';
  }
};

/** Same field mapping as web StudentFormModal.getInitialValues */
const getInitialValues = (d: any): FormValues => ({
  firstName: d?.firstName || '',
  lastName: d?.lastName || '',
  email: d?.email || '',
  admissionNumber: d?.admissionNumber || d?.admissionNo || '',
  studentRegNo: d?.studentRegNo || d?.registerNumber || '',
  phone: d?.phone || d?.studentMobile || '',
  dob: d?.dob || toDateInput(d?.dateOfBirth),
  gender: d?.gender || '',
  courseId: d?.courseId || '',
  sectionId: d?.sectionId || '',
  parentName: d?.parentName || d?.fatherName || '',
  parentPhone: d?.parentPhone || d?.parentMobile || '',
  address: d?.address || '',
  residenceType: d?.residenceType || 'Day Scholar',
});

const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const digits = (s: string) => s.replace(/\D/g, '').slice(0, 10);

export function StudentFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }: Props) {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const { courses } = useCourses();

  const [values, setValues] = useState<FormValues>(getInitialValues(initialData));
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});

  useEffect(() => {
    if (isOpen) {
      setValues(getInitialValues(initialData));
      setErrors({});
    }
  }, [isOpen, initialData]);

  const { sections } = useSections(values.courseId || null, { enabled: !!values.courseId });

  const set = (key: keyof FormValues) => (v: string) => {
    setValues((prev) => ({ ...prev, [key]: v }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const courseOptions = useMemo(() => courses.map((c: any) => ({ value: c.id, label: c.name })), [courses]);
  const sectionOptions = useMemo(() => sections.map((s: any) => ({ value: s.id, label: s.name })), [sections]);

  const validate = () => {
    const e: Partial<Record<keyof FormValues, string>> = {};
    if (!values.firstName.trim()) e.firstName = 'First name is required';
    if (!values.lastName.trim()) e.lastName = 'Last name is required';
    if (!values.email.trim()) e.email = 'Email Address is required.';
    else if (!EMAIL_RE.test(values.email.trim())) e.email = 'Invalid email address';
    if (!values.admissionNumber.trim()) e.admissionNumber = 'Admission ID / Number is required';
    if (values.phone && !/^[0-9]{10}$/.test(values.phone)) e.phone = 'Phone number must be exactly 10 digits.';
    if (!values.dob) e.dob = 'Date of Birth is required';
    if (!values.gender) e.gender = 'Gender is required';
    if (!values.courseId) e.courseId = 'Course is required';
    if (!values.parentName.trim()) e.parentName = 'Parent name is required';
    if (!values.parentPhone) e.parentPhone = 'Parent phone is required';
    else if (!/^[0-9]{10}$/.test(values.parentPhone)) e.parentPhone = 'Parent phone must be exactly 10 digits.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    // Strip null/undefined values to avoid Zod validation errors (same as web)
    const sanitized = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== null && v !== undefined));
    onSubmit({ ...sanitized, collegeId: userData?.collegeId || 'default_college_id' });
  };

  const Section = ({ title }: { title: string }) => (
    <Text style={[styles.section, { color: colors.text, borderBottomColor: colors.border }]}>{title}</Text>
  );

  return (
    <SheetModal
      visible={isOpen}
      onClose={onClose}
      tall
      title={initialData ? 'Edit Student' : 'Add New Student'}
      footer={
        <View style={styles.footer}>
          <Button title="Cancel" variant="outline" onPress={onClose} style={styles.flex} disabled={isLoading} />
          <View style={{ width: 12 }} />
          <Button title={initialData ? 'Save Changes' : 'Add Student'} onPress={submit} loading={isLoading} style={styles.flex} />
        </View>
      }>
      <Section title="Personal Information" />
      <Input label="First Name" required value={values.firstName} onChangeText={set('firstName')} error={errors.firstName} />
      <Input label="Last Name" required value={values.lastName} onChangeText={set('lastName')} error={errors.lastName} />
      <Input
        label="Email Address"
        required
        placeholder="student@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        value={values.email}
        onChangeText={set('email')}
        error={errors.email}
      />
      <Input
        label="Admission ID / Number"
        required
        value={values.admissionNumber}
        onChangeText={set('admissionNumber')}
        error={errors.admissionNumber}
      />
      <Input
        label="Student Reg No / Unique ID"
        value={values.studentRegNo}
        onChangeText={set('studentRegNo')}
        autoCapitalize="characters"
      />
      <Input
        label="Phone Number"
        placeholder="e.g. 9876543210"
        keyboardType="number-pad"
        maxLength={10}
        value={values.phone}
        onChangeText={(t) => set('phone')(digits(t))}
        error={errors.phone}
      />
      <Input label="Date of Birth" required placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" maxLength={10} value={values.dob} onChangeText={set('dob')} error={errors.dob} />
      <Select
        label="Gender"
        required
        placeholder="Select Gender"
        value={values.gender}
        onChange={set('gender')}
        error={errors.gender}
        options={[
          { value: 'male', label: 'Male' },
          { value: 'female', label: 'Female' },
          { value: 'other', label: 'Other' },
        ]}
      />

      <Section title="Academic Information" />
      <Select
        label="Class / Course"
        required
        placeholder="Select a course"
        value={values.courseId}
        onChange={(v) => setValues((p) => ({ ...p, courseId: v, sectionId: '' }))}
        error={errors.courseId}
        options={courseOptions}
      />
      <Select
        label="Section"
        placeholder="Select a section"
        value={values.sectionId}
        onChange={set('sectionId')}
        disabled={!values.courseId}
        options={sectionOptions}
      />

      <Section title="Parent/Guardian Information" />
      <Input label="Parent/Guardian Name" required value={values.parentName} onChangeText={set('parentName')} error={errors.parentName} />
      <Input
        label="Parent Phone"
        required
        placeholder="e.g. 9876543210"
        keyboardType="number-pad"
        maxLength={10}
        value={values.parentPhone}
        onChangeText={(t) => set('parentPhone')(digits(t))}
        error={errors.parentPhone}
      />
      <Input label="Home Address" value={values.address} onChangeText={set('address')} />
      <Select
        label="Residence Type"
        value={values.residenceType}
        onChange={set('residenceType')}
        options={[
          { value: 'Day Scholar', label: 'Day Scholar' },
          { value: 'Hosteller', label: 'Hosteller' },
        ]}
      />
      <View style={{ height: 8 }} />
    </SheetModal>
  );
}

export default StudentFormModal;

const styles = StyleSheet.create({
  section: { fontSize: fontSize.md, fontWeight: fontWeight.bold, paddingBottom: 8, marginBottom: 14, marginTop: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  footer: { flexDirection: 'row' },
  flex: { flex: 1 },
});