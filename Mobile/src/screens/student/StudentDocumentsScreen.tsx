import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Download, FileText, Files, Paperclip, Plus, ShieldCheck, Trash2 } from 'lucide-react-native';
import { types } from '@react-native-documents/picker';

import { useTheme } from '../../contexts/ThemeContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { SearchBar } from '../../components/ui/SearchBar';
import { SheetModal } from '../../components/ui/SheetModal';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { useStudentDocuments } from '../../hooks/useStudentPortal';
import { pickAsDataUrl, saveDataUrl, PickedFile } from '../../utils/filePicker';
import { toast } from '../../utils/toast';
import { formatDate } from '../../utils/format';
import { Linking } from 'react-native';
import { fontSize, fontWeight } from '../../theme/typography';

const DOC_TYPES = [
  ['10th Marksheet', '10th Marksheet / Secondary Certificate'],
  ['12th Marksheet', '12th Marksheet / Higher Secondary'],
  ['Aadhaar Card', 'Aadhaar Card / National ID'],
  ['Transfer Certificate', 'Transfer Certificate (TC)'],
  ['Migration Certificate', 'Migration Certificate'],
  ['Community Certificate', 'Community / Caste Certificate'],
  ['Income Certificate', 'Income Certificate'],
  ['Birth Certificate', 'Birth Certificate'],
  ['Other', 'Other Personal Document'],
].map(([value, label]) => ({ value, label }));

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;
const emptyForm = { fileName: '', documentType: '10th Marksheet', fileSize: '1.5 MB', fileUrl: '' };

/** Web: pages/student/StudentDocumentsDashboard.jsx */
export default function StudentDocumentsScreen() {
  const { colors } = useTheme();
  const confirm = useConfirm();
  const { data, isLoading, isRefreshing, refetch, uploadDocument, deleteDocument, isUploading, isDeleting } =
    useStudentDocuments();
  const documents: any[] = Array.isArray(data) ? data : [];

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [picked, setPicked] = useState<PickedFile | null>(null);

  const personalCount = documents.filter((d) => d.isPersonal).length;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return documents;
    return documents.filter(
      (d) => (d.fileName || '').toLowerCase().includes(q) || (d.documentType || '').toLowerCase().includes(q),
    );
  }, [documents, query]);

  const closeModal = () => {
    if (isUploading) return;
    setOpen(false);
    setForm(emptyForm);
    setPicked(null);
  };

  const chooseFile = async () => {
    const file = await pickAsDataUrl({
      types: [types.pdf, types.images],
      allowedMimes: ALLOWED,
      maxBytes: MAX_BYTES,
      typeError: 'Please choose a PDF, PNG, JPG or WebP file',
    });
    if (!file) return;
    setPicked(file);
    setForm((prev) => ({
      ...prev,
      fileName: prev.fileName || file.name,
      fileUrl: file.dataUrl,
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    }));
  };

  const submit = async () => {
    if (!form.fileName.trim()) {
      toast.error('Please enter a document name');
      return;
    }
    try {
      await uploadDocument({ ...form, fileName: form.fileName.trim() });
      setOpen(false);
      setForm(emptyForm);
      setPicked(null);
    } catch {
      // toast already shown by the hook
    }
  };

  const download = async (doc: any) => {
    const url: string = doc.fileUrl || '';
    if (url.startsWith('data:')) {
      const ok = await saveDataUrl(doc.fileName, url);
      if (ok) toast.success('Document saved');
    } else if (/^https?:\/\//i.test(url)) {
      Linking.openURL(url).catch(() => toast.error('Could not open the document'));
    } else {
      toast.info(`Accessing document: ${doc.fileName}...`);
    }
  };

  const remove = async (doc: any) => {
    const ok = await confirm({
      title: 'Remove document?',
      message: `Are you sure you want to remove "${doc.fileName}"?`,
      confirmText: 'Remove',
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await deleteDocument(doc.id);
    } catch {
      // toast already shown by the hook
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefreshing} onRefresh={refetch}>
      <Text style={[styles.title, { color: colors.text }]}>Document Vault</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Access verified institutional certificates, transcripts, and upload personal identity documents.
      </Text>

      <Button title="Upload Personal Document" icon={Plus} onPress={() => setOpen(true)} style={{ marginBottom: 16 }} />

      {isLoading ? (
        <Loader label="Loading documents..." />
      ) : (
        <>
          <View style={styles.statsRow}>
            <StatCard compact title="Repository Files" value={documents.length} icon={Files} tone="primary" />
            <StatCard compact title="My Uploads" value={personalCount} icon={ShieldCheck} tone="success" />
          </View>

          <SearchBar value={query} onChangeText={setQuery} placeholder="Search documents or types..." style={{ marginBottom: 16 }} />

          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>File Repository</Text>
            <Badge label={`${documents.length} Files`} tone="neutral" />
          </View>

          {filtered.length === 0 ? (
            <EmptyState
              icon={Files}
              title="No Documents In Vault"
              message={"Official certificates and uploaded personal documents will appear here. Tap 'Upload Personal Document' to add your identity credentials."}
            />
          ) : (
            filtered.map((doc) => (
              <Card key={doc.id} style={styles.card}>
                <View style={styles.row}>
                  <View style={[styles.iconBox, { backgroundColor: colors.primarySoft }]}>
                    <FileText size={22} color={colors.primary} />
                  </View>
                  <View style={styles.body}>
                    <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
                      {doc.fileName}
                    </Text>
                    <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={1}>
                      {doc.documentType || 'Personal Document'}
                    </Text>
                  </View>
                  <View style={styles.right}>
                    <Badge label={doc.isPersonal ? 'PERSONAL' : 'INSTITUTIONAL'} tone={doc.isPersonal ? 'success' : 'primary'} small />
                    {doc.isPersonal ? (
                      <Pressable onPress={() => remove(doc)} disabled={isDeleting} hitSlop={10} style={styles.trash}>
                        <Trash2 size={16} color={colors.danger} />
                      </Pressable>
                    ) : null}
                  </View>
                </View>
                <Text style={[styles.meta, { color: colors.textSubtle, marginTop: 10 }]}>
                  Uploaded: {formatDate(doc.uploadedAt)}
                  {doc.fileSize ? ` • ${doc.fileSize}` : ''}
                </Text>
                <Button
                  title="Download Document"
                  icon={Download}
                  variant="secondary"
                  size="sm"
                  onPress={() => download(doc)}
                  style={{ marginTop: 12 }}
                />
              </Card>
            ))
          )}
        </>
      )}

      <SheetModal
        visible={open}
        onClose={closeModal}
        title="Upload Personal Document"
        tall
        footer={
          <View style={styles.footerBtns}>
            <Button title="Cancel" variant="outline" fullWidth={false} onPress={closeModal} disabled={isUploading} />
            <Button title="Upload Document" loading={isUploading} onPress={submit} style={{ flex: 1 }} />
          </View>
        }>
        <Text style={[styles.hint, { color: colors.textMuted }]}>
          Upload your identification records, academic certificates, or official proofs.
        </Text>
        <Select
          label="Document Category"
          required
          value={form.documentType}
          options={DOC_TYPES}
          onChange={(v) => setForm({ ...form, documentType: v })}
        />
        <Input
          label="Document Title / File Name"
          required
          value={form.fileName}
          onChangeText={(t) => setForm({ ...form, fileName: t })}
          placeholder="e.g. Class_10_Marksheet_Verified.pdf"
        />

        <Text style={[styles.label, { color: colors.text }]}>Select File (PDF or Image)</Text>
        <Pressable onPress={chooseFile} style={[styles.drop, { borderColor: picked ? colors.primary : colors.border, backgroundColor: colors.inputBg }]}>
          <Paperclip size={20} color={picked ? colors.primary : colors.textSubtle} />
          <Text style={[styles.dropText, { color: picked ? colors.text : colors.textMuted }]} numberOfLines={2}>
            {picked ? `${picked.name} (${(picked.size / 1024).toFixed(0)} KB)` : 'Tap to choose a file'}
          </Text>
        </Pressable>
        <Text style={[styles.meta, { color: colors.textSubtle, marginTop: 6 }]}>Max file size 10MB (PDF, PNG, JPG)</Text>
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  subtitle: { fontSize: fontSize.sm, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { flex: 1, fontSize: fontSize.lg, fontWeight: fontWeight.bold, marginRight: 8 },
  card: { marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  body: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold },
  meta: { fontSize: fontSize.xs, marginTop: 3 },
  right: { alignItems: 'flex-end' },
  trash: { marginTop: 8, padding: 2 },
  hint: { fontSize: fontSize.xs, marginBottom: 14, lineHeight: 17 },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 8 },
  drop: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, padding: 16 },
  dropText: { flex: 1, fontSize: fontSize.sm },
  footerBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});