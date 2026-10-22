import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SheetModal } from '../../components/ui/SheetModal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useCourses } from '../../hooks/useCourses';
import { useDepartments } from '../../hooks/useDepartments';

/** Web: pages/admin/exams/ExamFormModal.jsx */
const PRESET_EXAM_TYPES = [
  'Midterm Exam',
  'Internal Assessment 1',
  'Internal Assessment 2',
  'Semester Exam',
  'Final Exam / Semester End',
  'Unit Test',
  'Model Examination',
  'Practical / Lab Exam',
  'Quiz / Class Test',
  'Viva Voce',
];

const parseExamType = (rawType?: string | null) => {
  if (!rawType) return { isPreset: true, value: 'Midterm Exam', custom: '' };
  const str = String(rawType).trim();

  // Direct match
  const direct = PRESET_EXAM_TYPES.find((p) => p.toLowerCase() === str.toLowerCase());
  if (direct) return { isPreset: true, value: direct, custom: '' };

  const lower = str.toLowerCase();
  if (lower === 'midterm' || lower.includes('mid-term') || lower.includes('midterm')) {
    return { isPreset: true, value: 'Midterm Exam', custom: '' };
  }
  if (lower === 'internal 1' || lower.includes('assessment 1') || lower.includes('cat-1') || lower.includes('cat 1')) {
    return { isPreset: true, value: 'Internal Assessment 1', custom: '' };
  }
  if (lower === 'internal 2' || lower.includes('assessment 2') || lower.includes('cat-2') || lower.includes('cat 2')) {
    return { isPreset: true, value: 'Internal Assessment 2', custom: '' };
  }
  if (lower === 'internal' || lower.includes('internal assessment')) {
    return { isPreset: true, value: 'Internal Assessment 1', custom: '' };
  }
  if (lower.includes('unit test') || lower.includes('unit-test') || lower === 'unit') {
    return { isPreset: true, value: 'Unit Test', custom: '' };
  }
  if (lower.includes('model')) {
    return { isPreset: true, value: 'Model Examination', custom: '' };
  }
  if (lower.includes('viva')) {
    return { isPreset: true, value: 'Viva Voce', custom: '' };
  }
  if (lower === 'final' || lower.includes('end semester') || lower.includes('end sem')) {
    return { isPreset: true, value: 'Final Exam / Semester End', custom: '' };
  }
  if (lower === 'semester' || lower.includes('semester exam') || lower.includes('sem exam')) {
    return { isPreset: true, value: 'Semester Exam', custom: '' };
  }
  if (lower === 'quiz' || lower.includes('quiz') || lower.includes('class test')) {
    return { isPreset: true, value: 'Quiz / Class Test', custom: '' };
  }
  if (lower === 'practical' || lower.includes('practical') || lower.includes('lab exam')) {
    return { isPreset: true, value: 'Practical / Lab Exam', custom: '' };
  }

  return { isPreset: false, value: 'CUSTOM', custom: str };
};

const today = () => new Date().toISOString().split('T')[0];

const parseDateString = (rawDate?: any) => {
  if (!rawDate) return today();
  try {
    const raw = String(rawDate).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
    const d = new Date(raw);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  } catch {
    // fallback
  }
  return today();
};

const blank = () => ({
  title: '',
  departmentId: '',
  courseId: '',
  subject: '',
  examDate: today(),
  startTime: '09:00',
  endTime: '12:00',
  room: '',
  totalMarks: '100',
  type: 'Midterm Exam',
  customType: '',
});

export default function ExamFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading, embedded = false }: any) {
  const { courses = [] } = useCourses();
  const { departments = [] } = useDepartments();
  const [v, setV] = useState<any>(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    if (initialData) {
      const typeInfo = parseExamType(initialData.type);
      setV({
        title: initialData.title || initialData.name || '',
        departmentId: initialData.departmentId || '',
        courseId: initialData.courseId || '',
        subject: initialData.subject || initialData.name || '',
        examDate: parseDateString(initialData.date || initialData.examDate),
        startTime: initialData.startTime || '09:00',
        endTime: initialData.endTime || '12:00',
        room: initialData.room || initialData.hall || '',
        totalMarks: String(initialData.maxMarks || initialData.totalMarks || 100),
        type: typeInfo.value,
        customType: typeInfo.custom,
      });
    } else {
      setV(blank());
    }
  }, [isOpen, initialData]);

  const set = (k: string) => (x: string) => {
    setV((p: any) => ({ ...p, [k]: x, ...(k === 'departmentId' ? { courseId: '' } : {}) }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }));
  };

  const filteredCourses = useMemo(
    () => (v.departmentId ? courses.filter((c: any) => c.departmentId === v.departmentId) : courses),
    [courses, v.departmentId],
  );

  const submit = () => {
    const e: Record<string, string> = {};
    if (!v.title.trim()) e.title = 'Title is required';
    if (!v.departmentId) e.departmentId = 'Department is required';
    if (!v.subject.trim()) e.subject = 'Subject is required';
    if (!v.examDate) e.examDate = 'Exam date is required';
    if (!v.startTime) e.startTime = 'Start time is required';
    if (!v.endTime) e.endTime = 'End time is required';
    if (v.type === 'CUSTOM' && !v.customType.trim()) e.customType = 'Enter custom exam type';
    setErrors(e);
    if (Object.keys(e).length) return;

    const dept: any = departments.find((d: any) => d.id === v.departmentId);
    const course: any = courses.find((c: any) => c.id === v.courseId);
    const examType = v.type === 'CUSTOM' ? v.customType.trim() || 'Custom Exam' : v.type;
    const marks = Number(v.totalMarks) || 100;
    const roomStr = (v.room || '').trim();

    onSubmit({
      ...v,
      name: v.title,
      date: v.examDate,
      maxMarks: marks,
      totalMarks: marks,
      type: examType,
      room: roomStr,
      hall: roomStr,
      departmentId: v.departmentId || (course ? course.departmentId : null),
      departmentName: dept ? dept.name : course?.department?.name || 'General',
      departmentCode: dept ? dept.code : course?.department?.code || null,
      courseId: v.courseId || null,
      courseName: course ? course.name : v.subject || dept?.name || 'General Program',
    });
  };

  const content = (
    <>
      <Input label="Exam Title" required placeholder="e.g. First Internal Assessment" value={v.title} onChangeText={set('title')} error={errors.title} />
      <Select
        label="Department" required placeholder="Select department..." value={v.departmentId} onChange={set('departmentId')} error={errors.departmentId}
        options={departments.map((d: any) => ({ value: d.id, label: d.code ? `${d.name} (${d.code})` : d.name }))}
      />
      <Select
        label="Course / Program" placeholder="Select an option" value={v.courseId} onChange={set('courseId')}
        options={[{ value: '', label: 'Select an option' }, ...filteredCourses.map((c: any) => ({ value: c.id, label: c.code ? `${c.name} (${c.code})` : c.name }))]}
      />
      <Input label="Subject / Paper Name" required placeholder="e.g. Data Structures & Algorithms" value={v.subject} onChangeText={set('subject')} error={errors.subject} />
      <Select
        label="Exam Type" required value={v.type} onChange={set('type')}
        options={[...PRESET_EXAM_TYPES.map((t) => ({ value: t, label: t })), { value: 'CUSTOM', label: '+ Custom (Type your own)...' }]}
      />
      {v.type === 'CUSTOM' ? (
        <Input label="Custom Exam Type" required placeholder="e.g. Surprise Test" value={v.customType} onChangeText={set('customType')} error={errors.customType} />
      ) : null}
      <Input label="Total Marks" keyboardType="number-pad" value={String(v.totalMarks)} onChangeText={(x) => set('totalMarks')(x.replace(/\D/g, ''))} />
      <Input label="Exam Date (YYYY-MM-DD)" required placeholder="2026-10-12" value={v.examDate} onChangeText={set('examDate')} error={errors.examDate} />
      <View style={styles.row}>
        <View style={{ flex: 1 }}><Input label="Start Time" required placeholder="09:00" value={v.startTime} onChangeText={set('startTime')} error={errors.startTime} /></View>
        <View style={{ width: 10 }} />
        <View style={{ flex: 1 }}><Input label="End Time" required placeholder="12:00" value={v.endTime} onChangeText={set('endTime')} error={errors.endTime} /></View>
      </View>
      <Input label="Room / Examination Hall" placeholder="e.g. Main Auditorium Hall 2" value={v.room} onChangeText={set('room')} />
    </>
  );

  const footer = (
    <View style={styles.footer}>
      <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
      <View style={{ width: 10 }} />
      <Button title={initialData ? 'Save Changes' : 'Schedule Exam'} loading={isLoading} onPress={submit} style={{ flex: 1 }} />
    </View>
  );

  if (embedded) return <View>{content}{footer}</View>;
  return (
    <SheetModal visible={isOpen} onClose={onClose} title={initialData ? 'Edit Exam Schedule' : 'Schedule New Exam'} tall footer={footer}>
      {content}
    </SheetModal>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row' }, footer: { flexDirection: 'row', marginTop: 6 } });