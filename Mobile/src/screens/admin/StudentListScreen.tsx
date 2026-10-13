import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  pick,
  keepLocalCopy,
  saveDocuments,
  types,
  isErrorWithCode,
  errorCodes,
} from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import {
  GraduationCap,
  Link2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  UserPlus,
  X,
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { StudentFormModal } from '../../features/students/StudentFormModal';
import { api } from '../../api/client';
import { fontSize, fontWeight } from '../../theme/typography';

/**
 * Excel is loaded only when import/template is used.
 * This avoids loading xlsx while opening the Student Directory.
 */
let xlsxModule: any = null;

const getXLSX = () => {
  if (xlsxModule) return xlsxModule;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    xlsxModule = require('xlsx');
    return xlsxModule;
  } catch {
    throw new Error(
      'Excel support is not installed. Please install the xlsx package.',
    );
  }
};

type Student = {
  id: string;
  name?: string;
  email?: string;
  admissionNo?: string;
  admissionNumber?: string;
  gradeClass?: string;
  class?: string;
  parentName?: string;
  parentPhone?: string;
  status?: string;
};

type StudentCacheEntry = {
  data: Student[];
  updatedAt: number;
};

const studentCache = new Map<string, StudentCacheEntry>();
const STUDENT_CACHE_TTL = 30_000;

/**
 * The backend (students.controller bulkImportStudents) reads fixed column names such as
 * Admission_No, Student_Name, Department ... Excel sheets usually use other headings
 * ("Full Name", "Admission Number", "Dept" ...). Match headings ignoring case / spaces /
 * symbols and add the canonical column the backend expects (original columns are kept).
 */
const STUDENT_COLUMN_ALIASES: Record<string, string[]> = {
  Admission_No: ['admissionno', 'admissionnumber', 'admno', 'admissionid', 'studentid', 'regno', 'registerno', 'registernumber', 'studentregno', 'rollno', 'rollnumber', 'id'],
  Student_Name: ['studentname', 'fullname', 'name', 'candidatename', 'student'],
  First_Name: ['firstname'],
  Last_Name: ['lastname'],
  Department: ['department', 'departmentname', 'dept', 'branch'],
  Course: ['course', 'coursename', 'program', 'programme', 'degree', 'class', 'classname'],
  Section: ['section', 'sectionname'],
  Roll_No: ['rollno', 'rollnumber'],
  Email_ID: ['emailid', 'email', 'emailaddress'],
  Date_of_Birth: ['dateofbirth', 'dob', 'birthdate'],
  Date_of_Admission: ['dateofadmission', 'admissiondate'],
  Gender: ['gender', 'sex'],
  Blood_Group: ['bloodgroup'],
  Nationality: ['nationality'],
  Aadhaar_Number: ['aadhaarnumber', 'aadharnumber', 'aadhaar', 'aadhar'],
  Address: ['address', 'homeaddress'],
  City: ['city'],
  District: ['district'],
  State: ['state'],
  Pincode: ['pincode', 'zipcode', 'zip'],
  Student_Mobile: ['studentmobile', 'mobile', 'mobilenumber', 'phone', 'phonenumber', 'contactnumber'],
  Father_Name: ['fathername', 'parentname', 'parentguardianname', 'guardianname'],
  Mother_Name: ['mothername'],
  Parent_Mobile: ['parentmobile', 'parentphone', 'parentguardianphone', 'guardianphone', 'fathermobile', 'emergencycontact'],
  Year_of_Study: ['yearofstudy', 'batchyear', 'year', 'batch'],
  Previous_Institution: ['previousinstitution', 'previousschool', 'previouscollege'],
};
const normKey = (k: string) => String(k).toLowerCase().replace(/[^a-z0-9]/g, '');

const normalizeStudentRow = (row: any, index: number) => {
  const out: Record<string, any> = { ...row };
  const byNorm = new Map<string, any>();
  Object.keys(row).forEach((k) => {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') byNorm.set(normKey(k), v);
  });
  Object.entries(STUDENT_COLUMN_ALIASES).forEach(([canonical, aliases]) => {
    if (out[canonical] !== undefined && String(out[canonical]).trim() !== '') return;
    for (const a of aliases) {
      if (byNorm.has(a)) {
        out[canonical] = byNorm.get(a);
        return;
      }
    }
  });
  if (!out.Student_Name && (out.First_Name || out.Last_Name)) {
    out.Student_Name = `${out.First_Name || ''} ${out.Last_Name || ''}`.trim();
  }
  // keep the row importable when the sheet has no admission number column at all
  if (!out.Admission_No) {
    out.Admission_No = out.Roll_No || `ADM-${new Date().getFullYear()}-${String(index + 1).padStart(3, '0')}`;
  }
  if (!out.Department) out.Department = 'General';
  return out;
};

/**
 * Pick an Excel or CSV document and copy it to app cache.
 * RNFS reads the copied local file as base64 for XLSX.
 */
const pickExcel = async (): Promise<any | null> => {
  try {
    const results = await pick({
      type: [types.xlsx, types.xls, types.csv],
      allowMultiSelection: false,
      copyTo: 'cachesDirectory',
    });

    const file = results?.[0];

    if (!file?.uri) {
      Alert.alert('File Error', 'The selected file has no valid URI.');
      return null;
    }

    const fileCopyUri = (file as any)?.fileCopyUri;
    let localUri = fileCopyUri || file.uri;

    // Android content:// URIs should be copied to an app-accessible path.
    if (localUri.startsWith('content://')) {
      const copied = await keepLocalCopy({
        files: [
          {
            uri: file.uri,
            fileName: file.name || `students_${Date.now()}.xlsx`,
          },
        ],
        destination: 'cachesDirectory',
      });

      const copyResult = copied?.[0];

      if (
        !copyResult ||
        copyResult.status !== 'success' ||
        !copyResult.localUri
      ) {
        throw new Error('Could not copy the selected file to app storage.');
      }

      localUri = copyResult.localUri;
    }

    const filePath = localUri.startsWith('file://')
      ? localUri.replace(/^file:\/\//, '')
      : localUri;

    const base64 = await RNFS.readFile(filePath, 'base64');

    return {
      name: file.name || 'students.xlsx',
      type: file.type || '',
      uri: file.uri,
      filePath,
      base64,
      size: file.size || 0,
    };
  } catch (err: any) {
    if (
      isErrorWithCode(err) &&
      err.code === errorCodes.OPERATION_CANCELED
    ) {
      return null;
    }

    Alert.alert(
      'File Picker Error',
      err?.message || 'Could not choose or read the file.',
    );
    return null;
  }
};

/**
 * Generate a temporary Excel file, then open the Android save dialog.
 */
const saveAndOpenFile = async (
  fileName: string,
  mimeType: string,
  base64Data: string,
) => {
  const safeName = fileName.replace(/[\\/:*?"<>|]/g, '_');
  const temporaryPath = `${RNFS.CachesDirectoryPath}/${safeName}`;

  try {
    await RNFS.writeFile(temporaryPath, base64Data, 'base64');

    await saveDocuments({
      sourceUris: [`file://${temporaryPath}`],
      fileName: safeName,
      mimeType,
    });
  } catch (err: any) {
    Alert.alert(
      'Save File Error',
      err?.message || 'Could not save the generated file.',
    );
  }
};

export default function StudentListScreen() {
  const { colors } = useTheme();
  const { userData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';

  const cached = studentCache.get(collegeId);

  const [students, setStudents] = useState<Student[]>(cached?.data || []);
  const [isLoading, setIsLoading] = useState(!cached);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [tab, setTab] = useState<'all' | 'pending' | 'active'>('all');

  const [importOpen, setImportOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [isImporting, setIsImporting] = useState(false);

  const [studentOpen, setStudentOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(
    async (options: { silent?: boolean } = {}) => {
      const silent = options.silent === true;

      if (!silent && !studentCache.has(collegeId)) {
        setIsLoading(true);
      }

      try {
        const res = await api.get<any>('/students');
        const data: Student[] = Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];

        studentCache.set(collegeId, {
          data,
          updatedAt: Date.now(),
        });

        setStudents(data);
      } catch (err: any) {
        if (!studentCache.has(collegeId)) {
          Alert.alert(
            'Students',
            err?.message || 'Failed to load students.',
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [collegeId],
  );

  useEffect(() => {
    const cacheEntry = studentCache.get(collegeId);

    if (
      !cacheEntry ||
      Date.now() - cacheEntry.updatedAt >= STUDENT_CACHE_TTL
    ) {
      void load();
    }
  }, [collegeId, load]);

  const { activeCount, pendingCount } = useMemo(() => {
    let activeCount = 0;
    let pendingCount = 0;

    for (const student of students) {
      const status = String(student.status || 'active').toLowerCase();

      if (status === 'active') activeCount += 1;
      else if (status === 'pending') pendingCount += 1;
    }

    return { activeCount, pendingCount };
  }, [students]);

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();

    return students.filter((student) => {
      const status = String(student.status || 'active').toLowerCase();

      if (tab === 'active' && status !== 'active') return false;
      if (tab === 'pending' && status !== 'pending') return false;

      if (!q) return true;

      const searchable =
        `${student.name || ''} ` +
        `${student.email || ''} ` +
        `${student.admissionNo || student.admissionNumber || ''} ` +
        `${student.gradeClass || student.class || ''}`;

      return searchable.toLowerCase().includes(q);
    });
  }, [students, deferredQuery, tab]);

  // reset the page size whenever the filter changes
  useEffect(() => { setPage(1); }, [deferredQuery, tab]);

  const openStudent = (student: Student | null = null) => {
    setEditing(student);
    setStudentOpen(true);
  };

  // Receives the full web-style form data from StudentFormModal
  const saveStudent = async (data: any) => {
    setIsSaving(true);

    try {
      const payload = {
        ...data,
        name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
        admissionNo: data.admissionNumber,
        registerNumber: data.studentRegNo || undefined,
        collegeId,
      };

      const response = editing?.id
        ? await api.put<any>(`/students/${editing.id}`, payload)
        : await api.post<any>('/students', payload);

      const returned = response?.data;

      if (returned && typeof returned === 'object' && returned.id) {
        const next = editing?.id
          ? students.map((item) =>
              item.id === editing.id ? { ...item, ...payload, ...returned } : item,
            )
          : [returned, ...students];

        studentCache.set(collegeId, { data: next, updatedAt: Date.now() });
        setStudents(next);
      }
      // always re-sync so list shows exactly what the backend stored
      void load({ silent: true });

      setStudentOpen(false);
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not save the student.');
    } finally {
      setIsSaving(false);
    }
  };

  const deleteStudent = async (student: Student) => {
    Alert.alert(
      'Delete Student',
      `Delete ${student.name || 'this student'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete<any>(`/students/${student.id}`);

              const next = students.filter(
                (item) => item.id !== student.id,
              );

              studentCache.set(collegeId, {
                data: next,
                updatedAt: Date.now(),
              });

              setStudents(next);
            } catch (err: any) {
              Alert.alert(
                'Delete Failed',
                err?.message || 'Could not delete the student.',
              );
            }
          },
        },
      ],
    );
  };

  const downloadTemplate = async () => {
    try {
      const rows = [
        {
          'Full Name': 'Rahul Sharma',
          'Admission Number': 'ADM1001',
          'Date of Birth': '2012-04-15',
          Gender: 'Male',
          'Blood Group': 'O+',
          Nationality: 'Indian',
          Religion: 'Hindu',
          'Aadhar Number': '1234-5678-9012',
          'Home Address': 'Erode, Tamil Nadu',
          'Parent/Guardian Name': 'Parent Name',
          'Parent Phone': '9876543210',
          'Parent Email': 'parent@example.com',
          'Parent Occupation': 'Business',
          'Emergency Contact': '9876543210',
          'Previous School': 'Previous School',
        },
      ];

      const XLSX = getXLSX();
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(wb, ws, 'Students');

      const base64 = XLSX.write(wb, {
        type: 'base64',
        bookType: 'xlsx',
      });

      await saveAndOpenFile(
        'student_import_template.xlsx',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        base64,
      );
    } catch (err: any) {
      Alert.alert(
        'Template Error',
        err?.message || 'Could not generate the template.',
      );
    }
  };

  const runImport = async () => {
    if (!selectedFile?.base64) {
      Alert.alert(
        'File Required',
        'Please choose an Excel or CSV file first.',
      );
      return;
    }

    setIsImporting(true);

    try {
      const XLSX = getXLSX();
      const wb = XLSX.read(selectedFile.base64, { type: 'base64' });
      const firstSheet = wb.SheetNames?.[0];

      if (!firstSheet) {
        throw new Error('The selected workbook has no worksheets.');
      }

      const ws = wb.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (!rows.length) {
        throw new Error('The selected file contains no data rows.');
      }

      // Send the raw sheet rows - the backend (bulkImportStudents) already understands every
      // column alias (Student_Name*, Admission_No*, Department, Course, Section, Email_ID ...),
      // exactly like the web import. Mapping to a reduced object dropped those columns.
      const payload = rows
        .filter((row: any) =>
          Object.values(row).some((v) => String(v ?? '').trim() !== ''),
        )
        .map((row: any, i: number) => normalizeStudentRow(row, i));

      if (!payload.length) {
        throw new Error(
          'No valid student rows were found in the file.',
        );
      }

      const response = await api.post<any>('/students/bulk', {
        data: payload,
      });

      const stats = response?.data || {};
      const failed = Number(stats.failed || 0);
      const errorLines: string[] = Array.isArray(stats.errors) ? stats.errors.slice(0, 5) : [];

      Alert.alert(
        failed > 0 && !stats.successful ? 'Import Failed' : 'Import Completed',
        `Processed ${payload.length} rows: ${stats.successful ?? 0} imported, ${failed} failed.` +
          (errorLines.length ? `\n\n${errorLines.join('\n')}` : ''),
      );

      setImportOpen(false);
      setSelectedFile(null);

      await load();
    } catch (err: any) {
      Alert.alert(
        'Import Failed',
        err?.message || 'Could not import the selected file.',
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => {
        setIsRefreshing(true);
        await load({ silent: true });
        setIsRefreshing(false);
      }}
    >
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={[styles.title, { color: colors.text }]}>
            Students Directory
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Manage student records and import admissions.
          </Text>
        </View>

        <View
          style={[
            styles.headingIcon,
            { backgroundColor: colors.primarySoft },
          ]}
        >
          <GraduationCap size={22} color={colors.primary} />
        </View>
      </View>

      <View style={styles.actionsTop}>
        <Button
          title="Add Student"
          size="sm"
          fullWidth={false}
          icon={Plus}
          onPress={() => openStudent()}
        />
        <Button
          title="Reg. Link"
          variant="outline"
          size="sm"
          fullWidth={false}
          icon={Link2}
          onPress={() =>
            Alert.alert(
              'Registration Link',
              'Use your college admission registration link to share with students and parents.',
            )
          }
        />
      </View>

      <Button
        title="Import Excel"
        variant="outline"
        size="sm"
        fullWidth
        icon={Upload}
        onPress={() => {
          setSelectedFile(null);
          setImportOpen(true);
        }}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabs}
      >
        {[
          { key: 'all' as const, label: 'All Students', count: students.length },
          {
            key: 'pending' as const,
            label: 'Pending Approval',
            count: pendingCount,
          },
          { key: 'active' as const, label: 'Active', count: activeCount },
        ].map((item) => {
          const active = tab === item.key;

          return (
            <Pressable
              key={item.key}
              onPress={() => setTab(item.key)}
              style={[
                styles.tab,
                {
                  borderColor: colors.border,
                  backgroundColor: active ? colors.primary : colors.card,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? colors.onPrimary : colors.textMuted },
                ]}
              >
                {item.label}
              </Text>

              <View
                style={[
                  styles.count,
                  {
                    backgroundColor: active
                      ? 'rgba(255,255,255,0.20)'
                      : colors.cardAlt,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.countText,
                    { color: active ? colors.onPrimary : colors.textMuted },
                  ]}
                >
                  {item.count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.search,
          { backgroundColor: colors.inputBg, borderColor: colors.border },
        ]}
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search students by name or ID..."
          placeholderTextColor={colors.textSubtle}
          style={[styles.searchInput, { color: colors.text }]}
        />
      </View>

      <View style={styles.results}>
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View
          style={[
            styles.empty,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.emptyIcon,
              { backgroundColor: colors.primarySoft },
            ]}
          >
            <GraduationCap size={28} color={colors.primary} />
          </View>

          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No students found
          </Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Add a student or import your Excel sheet to populate the directory.
          </Text>
        </View>
      ) : (
        filtered.slice((page - 1) * pageSize, page * pageSize).map((student) => {
          const name = student.name || 'Unnamed Student';
          const initials =
            name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((x) => x[0])
              .join('')
              .toUpperCase() || 'ST';

          const status = String(student.status || 'active').toLowerCase();

          return (
            <View
              key={student.id}
              style={[
                styles.studentCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <View style={styles.studentTop}>
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: colors.primarySoft },
                  ]}
                >
                  <Text style={[styles.avatarText, { color: colors.primary }]}>
                    {initials}
                  </Text>
                </View>

                <View style={styles.studentCopy}>
                  <Text
                    style={[styles.studentName, { color: colors.text }]}
                    numberOfLines={1}
                  >
                    {name}
                  </Text>
                  <Text
                    style={[styles.email, { color: colors.textMuted }]}
                    numberOfLines={1}
                  >
                    {student.email || 'No email'}
                  </Text>
                  <Text
                    style={[styles.meta, { color: colors.textSubtle }]}
                    numberOfLines={1}
                  >
                    {student.admissionNo ||
                      student.admissionNumber ||
                      'No admission no.'}{' '}
                    • {student.gradeClass || student.class || 'Class not assigned'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.status,
                    {
                      backgroundColor:
                        status === 'pending' ? '#FEF3C7' : colors.primarySoft,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          status === 'pending' ? '#B45309' : colors.primary,
                      },
                    ]}
                  >
                    {status === 'pending' ? 'Pending' : 'Active'}
                  </Text>
                </View>
              </View>

              <Text style={[styles.parent, { color: colors.textMuted }]}>
                Parent/Guardian: {student.parentName || '—'}
                {student.parentPhone ? ` • ${student.parentPhone}` : ''}
              </Text>

              <View style={styles.cardActions}>
                <Pressable
                  onPress={() => openStudent(student)}
                  style={[styles.cardAction, { borderColor: colors.border }]}
                >
                  <Pencil size={15} color={colors.text} />
                  <Text
                    style={[styles.cardActionText, { color: colors.text }]}
                  >
                    Edit
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => deleteStudent(student)}
                  style={[styles.cardAction, { borderColor: colors.border }]}
                >
                  <Trash2 size={15} color={colors.danger} />
                  <Text
                    style={[styles.cardActionText, { color: colors.text }]}
                  >
                    Delete
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
      {!isLoading ? (
        <Pagination
          totalItems={filtered.length}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(n) => { setPageSize(n); setPage(1); }}
        />
      ) : null}
      </View>

      <Modal
        visible={importOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isImporting) setImportOpen(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modal,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleWrap}>
                <View
                  style={[
                    styles.modalIcon,
                    { backgroundColor: colors.primarySoft },
                  ]}
                >
                  <Upload size={19} color={colors.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    Import Excel Data
                  </Text>
                  <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                    Upload an Excel (.xlsx/.xls) or CSV file.
                  </Text>
                </View>
              </View>

              <Pressable
                disabled={isImporting}
                onPress={() => setImportOpen(false)}
              >
                <X size={21} color={colors.textMuted} />
              </Pressable>
            </View>

            <View
              style={[
                styles.guideline,
                { backgroundColor: colors.cardAlt, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.guidelineTitle, { color: colors.text }]}>
                Template & Column Guidelines
              </Text>
              <Text style={[styles.guidelineText, { color: colors.textMuted }]}>
                Recommended columns: Full Name, Admission Number, Date of Birth,
                Gender, Parent/Guardian Name, Parent Phone, Parent Email.
              </Text>

              <Pressable
                onPress={downloadTemplate}
                style={styles.templateButton}
              >
                <Text style={[styles.templateText, { color: colors.primary }]}>
                  Download Template (.xlsx)
                </Text>
              </Pressable>
            </View>

            <Pressable
              disabled={isImporting}
              onPress={async () => {
                const file = await pickExcel();
                if (file) setSelectedFile(file);
              }}
              style={[
                styles.dropzone,
                {
                  borderColor: selectedFile ? colors.primary : colors.border,
                  backgroundColor: selectedFile
                    ? colors.primarySoft
                    : colors.cardAlt,
                },
              ]}
            >
              <Upload size={30} color={colors.primary} />
              <Text style={[styles.dropTitle, { color: colors.text }]}>
                {selectedFile
                  ? selectedFile.name
                  : 'Tap to browse for an Excel file'}
              </Text>
              <Text style={[styles.dropSub, { color: colors.textMuted }]}>
                {selectedFile
                  ? 'File selected and ready to import'
                  : 'Supports .xlsx, .xls, and .csv files'}
              </Text>
            </Pressable>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                variant="outline"
                size="sm"
                fullWidth={false}
                onPress={() => setImportOpen(false)}
              />
              <Button
                title="Import Data"
                size="sm"
                fullWidth={false}
                icon={Upload}
                loading={isImporting}
                onPress={runImport}
              />
            </View>
          </View>
        </View>
      </Modal>

      <StudentFormModal
        isOpen={studentOpen}
        onClose={() => {
          if (!isSaving) setStudentOpen(false);
        }}
        onSubmit={saveStudent}
        initialData={editing}
        isLoading={isSaving}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headingCopy: { flex: 1 },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    letterSpacing: -0.5,
  },
  subtitle: { fontSize: fontSize.sm, marginTop: 3, lineHeight: 19 },
  headingIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  actionsTop: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  tabsScroll: { flexGrow: 0 },
  tabs: { gap: 8, paddingVertical: 8, alignItems: 'center' },
  results: { minHeight: 420 },
  tab: {
    minHeight: 40,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabText: { fontSize: 10, fontWeight: fontWeight.bold },
  count: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  countText: { fontSize: 9, fontWeight: fontWeight.extrabold },
  search: {
    borderWidth: 1,
    borderRadius: 13,
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: { fontSize: 12, paddingVertical: 8 },
  loader: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  studentTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: { fontSize: 13, fontWeight: fontWeight.extrabold },
  studentCopy: { flex: 1, minWidth: 0 },
  studentName: { fontSize: 14, fontWeight: fontWeight.extrabold },
  email: { fontSize: 11, marginTop: 2 },
  meta: { fontSize: 9, marginTop: 4 },
  status: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 6,
  },
  statusText: { fontSize: 9, fontWeight: fontWeight.extrabold },
  parent: { fontSize: 10, marginTop: 10, lineHeight: 16 },
  cardActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cardAction: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 34,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  cardActionText: { fontSize: 10, fontWeight: fontWeight.bold },
  empty: {
    minHeight: 220,
    borderWidth: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  emptyTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  emptyText: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginTop: 5,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.50)',
    justifyContent: 'center',
    padding: 16,
  },
  modal: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 17,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  modalSub: { fontSize: fontSize.xs, lineHeight: 17, marginTop: 3 },
  guideline: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  guidelineTitle: {
    fontSize: 12,
    fontWeight: fontWeight.extrabold,
    marginBottom: 4,
  },
  guidelineText: { fontSize: 10, lineHeight: 16 },
  templateButton: { marginTop: 8 },
  templateText: { fontSize: 11, fontWeight: fontWeight.extrabold },
  dropzone: {
    minHeight: 145,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  dropTitle: {
    fontSize: 12,
    fontWeight: fontWeight.extrabold,
    textAlign: 'center',
    marginTop: 8,
  },
  dropSub: { fontSize: 10, marginTop: 4 },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
  field: { marginBottom: 10 },
  label: { fontSize: 11, fontWeight: fontWeight.bold, marginBottom: 5 },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderRadius: 11,
    paddingHorizontal: 11,
    fontSize: 12,
  },
});