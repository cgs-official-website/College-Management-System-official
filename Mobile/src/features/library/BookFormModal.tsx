import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SheetModal } from '../../components/ui/SheetModal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';

const blank = () => ({ title: '', author: '', isbn: '', category: 'Textbook', totalCopies: '1', location: '' });

/** Web: pages/admin/library/BookFormModal.jsx */
export function BookFormModal({ isOpen, onClose, onSubmit, initialData = null, isLoading }: any) {
  const [v, setV] = useState<any>(blank());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) return;
    setErrors({});
    setV(
      initialData
        ? { ...blank(), ...initialData, isbn: initialData.isbn || '', location: initialData.location || '', totalCopies: String(initialData.totalCopies ?? 1) }
        : blank(),
    );
  }, [isOpen, initialData]);

  const set = (k: string) => (x: string) => setV((p: any) => ({ ...p, [k]: x }));

  const submit = () => {
    const e: Record<string, string> = {};
    if (!v.title.trim()) e.title = 'Title is required';
    if (!v.author.trim()) e.author = 'Author is required';
    if (!(Number(v.totalCopies) >= 1)) e.totalCopies = 'Total copies is required';
    setErrors(e);
    if (Object.keys(e).length) return;

    const total = Number(v.totalCopies);
    // same rule as web: when editing, keep borrowed copies by adjusting available with the difference
    const available = initialData ? (initialData.availableCopies ?? 0) + (total - (initialData.totalCopies ?? 0)) : total;
    onSubmit({
      title: v.title.trim(), author: v.author.trim(), isbn: v.isbn, category: v.category, location: v.location,
      totalCopies: total, availableCopies: available,
    });
  };

  const footer = (
    <View style={styles.footer}>
      <Button title="Cancel" variant="outline" onPress={onClose} style={styles.flex} />
      <View style={{ width: 10 }} />
      <Button title={initialData ? 'Save Changes' : 'Add Book'} loading={isLoading} onPress={submit} style={styles.flex} />
    </View>
  );

  return (
    <SheetModal visible={isOpen} onClose={onClose} title={initialData ? 'Edit Book Details' : 'Add New Book'} tall footer={footer}>
      <Input label="Book Title" required placeholder="e.g. Introduction to Algorithms" value={v.title} onChangeText={set('title')} error={errors.title} />
      <Input label="Author" required placeholder="e.g. Thomas H. Cormen" value={v.author} onChangeText={set('author')} error={errors.author} />
      <Input label="ISBN Number" placeholder="e.g. 978-0262033848" value={v.isbn} onChangeText={set('isbn')} />
      <Select
        label="Category" value={v.category} onChange={set('category')}
        options={[
          { value: 'Textbook', label: 'Textbook' }, { value: 'Reference', label: 'Reference' }, { value: 'Fiction', label: 'Fiction' },
          { value: 'Journal', label: 'Journal / Magazine' }, { value: 'Other', label: 'Other' },
        ]}
      />
      <Input label="Total Copies" required value={String(v.totalCopies)} onChangeText={(x) => set('totalCopies')(x.replace(/\D/g, ''))} keyboardType="number-pad" error={errors.totalCopies} />
      <Input label="Shelf Location" placeholder="e.g. Section A, Row 3" value={v.location} onChangeText={set('location')} />
    </SheetModal>
  );
}

export default BookFormModal;

const styles = StyleSheet.create({ flex: { flex: 1 }, footer: { flexDirection: 'row', marginTop: 6 } });