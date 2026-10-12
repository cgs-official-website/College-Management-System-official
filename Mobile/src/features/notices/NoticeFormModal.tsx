import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SheetModal } from '../../components/ui/SheetModal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

const blank = () => ({ title: '', content: '', targetAudience: 'all', priority: 'normal' });

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'Everyone (Students & Staff)' },
  { value: 'students', label: 'Students Only' },
  { value: 'staff', label: 'Staff & Teachers Only' },
];
const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low (Informational)' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High (Urgent)' },
];

/** Web: pages/admin/notices/NoticeFormModal.jsx */
export function NoticeFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }: any) {
  const [v, setV] = useState<any>(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setV(initialData
      ? { title: initialData.title || '', content: initialData.content || '', targetAudience: initialData.targetAudience || 'all', priority: initialData.priority || 'normal' }
      : blank());
  }, [isOpen, initialData]);

  const set = (k: string) => (x: string) => { setV((p: any) => ({ ...p, [k]: x })); setErrors((p) => ({ ...p, [k]: '' })); };

  const submit = () => {
    const e: Record<string, string> = {};
    if (!v.title.trim()) e.title = 'Title is required';
    if (!v.content.trim()) e.content = 'Content is required';
    setErrors(e);
    if (Object.keys(e).length) return;
    onSubmit({ title: v.title.trim(), content: v.content.trim(), targetAudience: v.targetAudience, priority: v.priority });
  };

  const footer = (
    <View style={styles.footer}>
      <Button title="Cancel" variant="outline" onPress={onClose} style={styles.flex} />
      <View style={{ width: 10 }} />
      <Button title={initialData ? 'Save Changes' : 'Publish Notice'} loading={isLoading} onPress={submit} style={styles.flex} />
    </View>
  );

  return (
    <SheetModal visible={isOpen} onClose={onClose} title={initialData ? 'Edit Notice' : 'Create New Notice'} tall footer={footer}>
      <Input label="Notice Title" required placeholder="e.g. End of Semester Examinations" value={v.title} onChangeText={set('title')} error={errors.title} />
      <Input label="Notice Content" required placeholder="Write the full announcement here..." multiline value={v.content} onChangeText={set('content')} error={errors.content} style={{ minHeight: 120 }} />
      <Select label="Target Audience" value={v.targetAudience} onChange={set('targetAudience')} options={AUDIENCE_OPTIONS} />
      <Select label="Priority Level" value={v.priority} onChange={set('priority')} options={PRIORITY_OPTIONS} />
    </SheetModal>
  );
}

export default NoticeFormModal;

const styles = StyleSheet.create({ flex: { flex: 1 }, footer: { flexDirection: 'row', marginTop: 6 } });