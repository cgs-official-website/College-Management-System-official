import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SheetModal } from '../../components/ui/SheetModal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useCourses } from '../../hooks/useCourses';
import { useStaff } from '../../hooks/useStaff';
import { useAuth } from '../../contexts/AuthContext';

/** Web: pages/admin/timetable/TimetableFormModal.jsx */
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const blank = () => ({ subject: '', courseId: '', teacherId: '', dayOfWeek: 'Monday', startTime: '09:00', endTime: '10:00', room: '' });
const staffName = (s: any) => s?.name || `${s?.firstName || ''} ${s?.lastName || ''}`.trim() || s?.email || 'Unnamed Teacher';

export default function TimetableFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading, embedded = false }: any) {
  const { userData } = useAuth();
  const { courses = [] } = useCourses();
  const { staff = [] } = useStaff(userData?.collegeId);
  const [v, setV] = useState<any>(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setV(initialData ? { ...blank(), ...initialData, subject: initialData.subject || initialData.courseName || '', teacherId: initialData.teacherId || '', room: initialData.room || '' } : blank());
  }, [isOpen, initialData]);

  const set = (k: string) => (x: string) => {
    setV((p: any) => ({ ...p, [k]: x }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: '' }));
  };

  const courseOptions = useMemo(() => courses.map((c: any) => ({ value: c.id, label: c.code ? `${c.name} (${c.code})` : c.name || 'Unnamed Course' })), [courses]);
  const teacherOptions = useMemo(() => staff.map((t: any) => ({ value: t.id, label: staffName(t) })), [staff]);

  const submit = () => {
    const e: Record<string, string> = {};
    if (!v.subject.trim()) e.subject = 'Subject is required';
    if (!v.courseId) e.courseId = 'Course is required';
    if (!v.teacherId) e.teacherId = 'Teacher is required';
    if (!v.room.trim()) e.room = 'Room is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    const course: any = courses.find((c: any) => c.id === v.courseId);
    const teacher: any = staff.find((s: any) => s.id === v.teacherId);
    onSubmit({ ...v, courseName: course ? course.name : 'Unknown Course', teacherName: teacher ? staffName(teacher) : 'TBA' });
  };

  const content = (
    <>
      <Input label="Subject Name" required placeholder="e.g. Advanced Calculus" value={v.subject} onChangeText={set('subject')} error={errors.subject} />
      <Select label="Course / Program" required placeholder={courses.length ? 'Select course / program...' : 'No courses/programs available'} value={v.courseId} onChange={set('courseId')} options={courseOptions} error={errors.courseId} />
      <Select label="Assign Teacher" required placeholder={staff.length ? 'Select teacher...' : 'No teachers available'} value={v.teacherId} onChange={set('teacherId')} options={teacherOptions} error={errors.teacherId} />
      <Input label="Room / Lab" required placeholder="e.g. Room 302" value={v.room} onChangeText={set('room')} error={errors.room} />
      <Select label="Day of Week" value={v.dayOfWeek} onChange={set('dayOfWeek')} options={DAYS.map((d) => ({ value: d, label: d }))} />
      <View style={styles.row}>
        <View style={{ flex: 1 }}><Input label="Start Time" placeholder="09:00" value={v.startTime} onChangeText={set('startTime')} /></View>
        <View style={{ width: 10 }} />
        <View style={{ flex: 1 }}><Input label="End Time" placeholder="10:00" value={v.endTime} onChangeText={set('endTime')} /></View>
      </View>
    </>
  );

  const footer = (
    <View style={styles.footer}>
      <Button title="Cancel" variant="outline" onPress={onClose} style={{ flex: 1 }} />
      <View style={{ width: 10 }} />
      <Button title={initialData ? 'Save Changes' : 'Schedule Class'} loading={isLoading} onPress={submit} style={{ flex: 1 }} />
    </View>
  );

  if (embedded) return <View>{content}{footer}</View>;
  return (
    <SheetModal visible={isOpen} onClose={onClose} title={initialData ? 'Edit Class Schedule' : 'Schedule New Class'} tall footer={footer}>
      {content}
    </SheetModal>
  );
}

const styles = StyleSheet.create({ row: { flexDirection: 'row' }, footer: { flexDirection: 'row', marginTop: 6 } });