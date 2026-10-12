import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Download, Eye, FileText, Files, GraduationCap, ShieldCheck, User } from 'lucide-react-native';

import { api } from '../../api/client';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Tabs } from '../../components/ui/Tabs';
import { StatCard } from '../../components/ui/StatCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { Pagination } from '../../components/ui/Pagination';
import { EmptyState } from '../../components/ui/EmptyState';
import { Loader } from '../../components/ui/Loader';
import { ListItem } from '../../components/ui/ListItem';
import { SheetModal } from '../../components/ui/SheetModal';
import { PageHeader } from '../../components/layout/ScreenHeader';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';
import { formatDateTime } from '../../utils/format';
import { toast } from '../../utils/toast';

const PAGE_SIZE = 8;

/** Web: pages/admin/students/AdminStudentDocuments.jsx */
export default function AdminStudentDocumentsScreen() {
  const { colors } = useTheme();
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    try {
      const res = await api.get<any>('/students/all-documents');
      const raw = res?.data ?? res;
      setDocuments(Array.isArray(raw) ? raw : []);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load documents.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleDownload = async (doc: any) => {
    if (doc.fileUrl && /^https?:\/\//i.test(doc.fileUrl)) {
      try {
        await Linking.openURL(doc.fileUrl);
        toast.success(`Opening ${doc.fileName}...`);
      } catch {
        toast.error('Unable to open this document.');
      }
    } else if (doc.fileUrl && doc.fileUrl.startsWith('data:')) {
      toast.info('This file is stored inline. Download it from the web portal.');
    } else {
      toast.success(`Accessing verified document: ${doc.fileName}...`);
    }
  };

  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return documents.filter((d) => {
      const type = (d.documentType || '').toLowerCase();
      const matchesSearch =
        (d.studentName || '').toLowerCase().includes(q) ||
        (d.admissionNumber || '').toLowerCase().includes(q) ||
        (d.fileName || '').toLowerCase().includes(q) ||
        (d.department || '').toLowerCase().includes(q) ||
        type.includes(q);
      if (categoryFilter === 'marksheet') return matchesSearch && type.includes('marksheet');
      if (categoryFilter === 'id') return matchesSearch && (type.includes('aadhaar') || type.includes('id') || type.includes('certificate'));
      if (categoryFilter === 'personal') return matchesSearch && d.isPersonal === true;
      return matchesSearch;
    });
  }, [documents, searchTerm, categoryFilter]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const personalCount = documents.filter((d) => d.isPersonal).length;
  const marksheetsCount = documents.filter((d) => (d.documentType || '').toLowerCase().includes('marksheet')).length;
  const uniqueStudents = new Set(documents.filter((d) => d.studentId).map((d) => d.studentId)).size;
  const val = (n: number) => (isLoading ? '...' : n);

  const row = (label: string, value?: string) => (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: colors.textSubtle }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value || '-'}</Text>
    </View>
  );

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        title="Student Personal Documents"
        subtitle="Access, verify, and download student personal documents, academic marksheets, and official credentials."
      />

      <View style={styles.row}>
        <StatCard title="Total Documents" value={val(documents.length)} icon={Files} tone="primary" />
        <View style={styles.gap} />
        <StatCard title="Personal Uploads" value={val(personalCount)} icon={ShieldCheck} tone="success" />
      </View>
      <View style={[styles.row, { marginTop: 12 }]}>
        <StatCard title="Marksheets" value={val(marksheetsCount)} icon={GraduationCap} tone="info" />
        <View style={styles.gap} />
        <StatCard title="Students" value={val(uniqueStudents)} icon={User} tone="warning" />
      </View>

      <View style={{ marginTop: 16, marginBottom: 8 }}>
        <SearchBar
          value={searchTerm}
          onChangeText={(t) => {
            setSearchTerm(t);
            setPage(1);
          }}
          placeholder="Search student, admission no, document..."
        />
      </View>
      <Tabs
        tabs={[
          { key: 'all', label: 'All Documents' },
          { key: 'personal', label: 'Personal Uploads' },
          { key: 'marksheet', label: 'Marksheets' },
          { key: 'id', label: 'Identity / Certificates' },
        ]}
        active={categoryFilter}
        onChange={(k) => {
          setCategoryFilter(k);
          setPage(1);
        }}
      />

      <View style={{ marginTop: 12 }}>
        {isLoading ? (
          <Loader label="Loading student documents..." />
        ) : paginated.length === 0 ? (
          <EmptyState icon={Files} title="No documents found" message="No documents found matching the filter criteria." />
        ) : (
          paginated.map((doc) => (
            <Card key={doc.id} style={styles.card}>
              <ListItem
                left={
                  <View style={[styles.fileIcon, { backgroundColor: colors.primarySoft }]}>
                    <FileText size={18} color={colors.primary} />
                  </View>
                }
                title={doc.fileName}
                subtitle={`${doc.studentName} • ${doc.admissionNumber}`}
                meta={`${doc.documentType || 'Personal Document'} • ${doc.department || ''}${doc.section ? ` • Sec ${doc.section}` : ''}`}
                onPress={() => setSelectedDoc(doc)}
              />
              <View style={styles.cardActions}>
                <Button size="sm" variant="outline" icon={Eye} title="View" onPress={() => setSelectedDoc(doc)} fullWidth={false} />
                <Button size="sm" variant="secondary" icon={Download} title="Download" onPress={() => handleDownload(doc)} fullWidth={false} />
              </View>
            </Card>
          ))
        )}
      </View>

      <Pagination totalItems={filtered.length} currentPage={page} pageSize={PAGE_SIZE} onPageChange={setPage} />

      <SheetModal
        visible={!!selectedDoc}
        onClose={() => setSelectedDoc(null)}
        title="Document Details"
        footer={
          <View style={{ flexDirection: 'row' }}>
            <Button title="Close" variant="outline" onPress={() => setSelectedDoc(null)} style={{ flex: 1 }} />
            <View style={{ width: 12 }} />
            <Button title="Download" icon={Download} onPress={() => selectedDoc && handleDownload(selectedDoc)} style={{ flex: 1 }} />
          </View>
        }>
        {selectedDoc ? (
          <View>
            <Text style={[styles.docName, { color: colors.text }]}>{selectedDoc.fileName}</Text>
            <View style={[styles.detailBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              {row('Student Name', selectedDoc.studentName)}
              {row('Admission ID', selectedDoc.admissionNumber)}
              {row('Department', selectedDoc.department)}
              {row('Document Type', selectedDoc.documentType)}
              {row('File Size', selectedDoc.fileSize)}
              {row('Uploaded Date', selectedDoc.uploadedAt ? formatDateTime(selectedDoc.uploadedAt) : '-')}
            </View>
          </View>
        ) : null}
      </SheetModal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  gap: { width: 12 },
  card: { padding: 0, marginBottom: 12, overflow: 'hidden' },
  fileIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 14 },
  docName: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold, marginBottom: 12 },
  detailBox: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 12 },
  detailLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  detailValue: { flex: 1, textAlign: 'right', fontSize: fontSize.xs, fontWeight: fontWeight.bold },
});