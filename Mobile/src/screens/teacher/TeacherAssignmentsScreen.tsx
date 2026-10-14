import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Clock, FileBarChart, Plus, Save, Trash2 } from 'lucide-react-native';

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
import { SheetModal } from '../../components/ui/SheetModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const todayStr = () => new Date().toISOString().split('T')[0];
const EMPTY = { title: '', description: '', courseId: '', dueDate: '', maxScore: '100' };

/** Web: pages/teacher/TeacherAssignments.jsx (GET /courses/my-classes, GET/POST /assignments, DELETE /assignments/:id) */
export default function TeacherAssignmentsScreen() {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const confirm = useConfirm();

  const [assignments, setAssignments] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!userData?.collegeId) {
      setLoading(false);
      return;
    }
    try {
      const coursesRes = await api.get<any>('/courses/my-classes');
      setCourses(Array.isArray(coursesRes?.data) ? coursesRes.data : Array.isArray(coursesRes) ? coursesRes : []);

      const assignRes = await api.get<any>('/assignments');
      const list: any[] = Array.isArray(assignRes?.data) ? assignRes.data : Array.isArray(assignRes) ? assignRes : [];
      setAssignments([...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [userData?.collegeId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load, userData?.uid]);

  // Same as web: the option value is the course's courseId (what POST /assignments expects)
  const courseOptions = useMemo(
    () => courses.map((c) => ({ value: String(c.courseId), label: String(c.name) })),
    [courses],
  );

  const set = (k: keyof typeof EMPTY) => (v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: '' }));
  };

  const closeModal = () => {
    setOpen(false);
    setErrors({});
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.courseId) e.courseId = 'Please select a class';
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.description.trim()) e.description = 'Description is required';
    if (!isDate(form.dueDate)) e.dueDate = 'Use YYYY-MM-DD';
    else if (form.dueDate < todayStr()) e.dueDate = 'Due date cannot be in the past';
    if (!(Number(form.maxScore) >= 1)) e.maxScore = 'Min 1';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;

    const ok = await confirm({
      title: 'Publish Assignment',
      message: `Are you sure you want to publish "${form.title}" to the students?`,
      confirmText: 'Publish',
      isDestructive: false,
    });
    if (!ok) return;

    setSaving(true);
    try {
      await api.post('/assignments', {
        courseId: form.courseId,
        title: form.title,
        description: form.description,
        dueDate: form.dueDate,
        maxScore: Number(form.maxScore),
      });
      toast.success('Assignment published successfully!');
      setOpen(false);
      setForm({ ...EMPTY });
      await load();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create assignment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: 'Delete Assignment',
      message: 'Are you sure you want to delete this assignment? Students will no longer see it.',
      confirmText: 'Delete',
      isDestructive: true,
    });
    if (!ok) return;

    try {
      await api.delete(`/assignments/${id}`);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      toast.success('Assignment deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete assignment');
    }
  };

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}>
      <PageHeader
        title="Assignments"
        subtitle="Create and manage class assignments and coursework."
        action={<Button title="Create Assignment" icon={Plus} onPress={() => setOpen(true)} />}
      />

      {loading ? (
        <Loader label="Loading assignments..." />
      ) : assignments.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileBarChart}
            title="No Assignments Created"
            message="You haven't posted any assignments for your classes yet."
            actionLabel="Create Your First Assignment"
            onAction={() => setOpen(true)}
          />
        </Card>
      ) : (
        assignments.map((a) => (
          <Card key={a.id} style={styles.card}>
            <View style={styles.top}>
              <View style={styles.flex}>
                <Badge label={String(a.courseName || 'Class')} tone="neutral" />
                <Text style={[styles.name, { color: colors.text }]}>{a.title}</Text>
              </View>
              <Pressable
                onPress={() => handleDelete(a.id)}
                hitSlop={8}
                style={[styles.del, { backgroundColor: colors.dangerSoft }]}
                accessibilityLabel="Delete assignment">
                <Trash2 size={17} color={colors.danger} />
              </Pressable>
            </View>

            <Text style={[styles.desc, { color: colors.textMuted }]} numberOfLines={3}>
              {a.description}
            </Text>

            <View style={[styles.foot, { borderTopColor: colors.border }]}>
              <View style={styles.due}>
                <Clock size={15} color={colors.warning} />
                <Text style={[styles.dueText, { color: colors.warning }]}>
                  Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '—'}
                </Text>
              </View>
              <Text style={[styles.pts, { color: colors.text }]}>{a.maxScore} Pts</Text>
            </View>
          </Card>
        ))
      )}

      <SheetModal
        visible={open}
        onClose={closeModal}
        title="Create Assignment"
        tall
        footer={
          <View style={styles.footerRow}>
            <View style={styles.flex}>
              <Button title="Cancel" variant="outline" onPress={closeModal} />
            </View>
            <View style={styles.flex}>
              <Button title="Publish" icon={Save} loading={saving} onPress={handleCreate} />
            </View>
          </View>
        }>
        <Select
          label="Class / Subject"
          required
          value={form.courseId}
          options={courseOptions}
          onChange={set('courseId')}
          placeholder="Select a class"
          error={errors.courseId}
        />
        <Input label="Assignment Title" required placeholder="e.g. Chapter 3 Quiz" value={form.title} onChangeText={set('title')} error={errors.title} />
        <Input
          label="Description"
          required
          multiline
          placeholder="Provide instructions..."
          value={form.description}
          onChangeText={set('description')}
          error={errors.description}
        />
        <View style={styles.footerRow}>
          <View style={styles.flex}>
            <Input
              label="Due Date"
              required
              placeholder="2026-10-31"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              value={form.dueDate}
              onChangeText={set('dueDate')}
              error={errors.dueDate}
            />
          </View>
          <View style={styles.flex}>
            <Input
              label="Max Score"
              required
              keyboardType="numeric"
              value={form.maxScore}
              onChangeText={(v) => set('maxScore')(v.replace(/[^0-9]/g, ''))}
              error={errors.maxScore}
            />
          </View>
        </View>
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 4, marginBottom: 16 },
  card: { marginBottom: 14 },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  name: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginTop: 10 },
  del: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  desc: { fontSize: fontSize.sm, lineHeight: 20, marginBottom: 14 },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1 },
  due: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dueText: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  pts: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  footerRow: { flexDirection: 'row', gap: 12 },
});