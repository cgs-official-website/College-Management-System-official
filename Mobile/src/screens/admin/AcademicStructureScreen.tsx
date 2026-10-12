
import React, { startTransition, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  pick,
  keepLocalCopy,
  saveDocuments,
  isErrorWithCode,
  errorCodes,
} from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import {
  BookOpen,
  Building2,
  GraduationCap,
  Upload,
  Users,
} from 'lucide-react-native';

import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { api } from '../../api/client';
import DepartmentsTab from './DepartmentsTab';
import CoursesTab from './CoursesTab';
import SectionsTab from './SectionsTab';
import { fontSize, fontWeight } from '../../theme/typography';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

let xlsxModule: any;

const getXLSX = () => {
  if (xlsxModule) return xlsxModule;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    xlsxModule = require('xlsx');
    return xlsxModule;
  } catch {
    throw new Error('Excel support is not installed. Please install xlsx.');
  }
};

type DepartmentItem = {
  id: string;
  name: string;
  code?: string;
};

type CourseItem = {
  id: string;
  name: string;
  code?: string;
};

type ImportKind = 'departments' | 'courses' | 'sections';

type SelectedFile = {
  name: string;
  uri: string;
  type?: string | null;
  size?: number | null;
};

const normalise = (value: any) => String(value ?? '').trim();

const normaliseHeader = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, '');

const safeFileName = (name: string) =>
  name.replace(/[\\/:*?"<>|]/g, '_');

const saveAndOpenFile = async (
  fileName: string,
  mimeType: string,
  base64Data: string,
) => {
  const safeName = safeFileName(fileName);
  const localPath = `${RNFS.CachesDirectoryPath}/${Date.now()}-${safeName}`;

  await RNFS.writeFile(localPath, base64Data, 'base64');

  await saveDocuments({
    sourceUris: [`file://${localPath}`],
    fileName: safeName,
    mimeType,
  });
};

const pickExcel = async (): Promise<SelectedFile | null> => {
  try {
    const result = await pick({
      type: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
        'text/csv',
        'text/comma-separated-values',
      ],
      allowMultiSelection: false,
    });

    const file = result?.[0];

    if (!file?.uri) {
      throw new Error('The selected file could not be accessed.');
    }

    const extension = file.name?.split('.').pop()?.toLowerCase();

    if (!['xlsx', 'xls', 'csv'].includes(extension || '')) {
      throw new Error('Choose an .xlsx, .xls or .csv file.');
    }

    return {
      name: file.name || 'import.xlsx',
      uri: file.uri,
      type: file.type,
      size: file.size,
    };
  } catch (error: any) {
    const cancelled =
      isErrorWithCode(error) &&
      error.code === errorCodes.OPERATION_CANCELED;

    if (!cancelled) {
      Alert.alert(
        'File Picker Error',
        error?.message || 'Could not choose the file.',
      );
    }

    return null;
  }
};

const readExcelRows = async (file: SelectedFile) => {
  const copiedFiles = await keepLocalCopy({
    files: [
      {
        uri: file.uri,
        fileName: safeFileName(file.name),
      },
    ],
    destination: 'cachesDirectory',
  });

  const copiedFile = copiedFiles[0];

  if (
    copiedFile?.status !== 'success' ||
    !copiedFile.localUri
  ) {
    throw new Error('Could not access the selected file. Please try again.');
  }

  const localPath = copiedFile.localUri.startsWith('file://')
    ? copiedFile.localUri.slice('file://'.length)
    : copiedFile.localUri;

  const base64 = await RNFS.readFile(localPath, 'base64');
  const XLSX = getXLSX();

  const workbook = XLSX.read(base64, {
    type: 'base64',
    raw: false,
  });

  const sheetName = workbook.SheetNames.find(
    (name: string) => name.toLowerCase() !== 'instructions',
  ) || workbook.SheetNames[0];

  if (!sheetName || !workbook.Sheets[sheetName]) {
    throw new Error('No readable worksheet was found.');
  }

  const rows = XLSX.utils.sheet_to_json(
    workbook.Sheets[sheetName],
    { defval: '' },
  );

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('The selected file contains no data rows.');
  }

  return rows;
};

export default function AcademicStructureScreen() {
  const { colors } = useTheme();

  const [activeTab, setActiveTab] =
    useState<ImportKind>('departments');

  const [visitedTabs, setVisitedTabs] =
    useState<ImportKind[]>(['departments']);

  const [selectedDepartment, setSelectedDepartment] =
    useState<DepartmentItem | null>(null);

  const [selectedCourse, setSelectedCourse] =
    useState<CourseItem | null>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [selectedFile, setSelectedFile] =
    useState<SelectedFile | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  const tabs = [
    {
      key: 'departments' as const,
      label: 'Departments',
      icon: Building2,
    },
    {
      key: 'courses' as const,
      label: 'Programs / Courses',
      icon: GraduationCap,
    },
    {
      key: 'sections' as const,
      label: 'Classes / Sections',
      icon: Users,
    },
  ];

  const changeTab = (tab: ImportKind) => {
    setActiveTab(tab);

    startTransition(() => {
      setVisitedTabs((current) =>
        current.includes(tab) ? current : [...current, tab],
      );
    });

    if (tab === 'departments') {
      setSelectedDepartment(null);
      setSelectedCourse(null);
    }
  };

  const importConfig = {
    departments: {
      title: 'Import Departments',
      description:
        'Upload an Excel (.xlsx/.xls) or CSV file containing department records.',
      headers: ['Department Name', 'Department Code'],
      sample: [
        {
          'Department Name': 'Computer Science',
          'Department Code': 'CSE',
        },
      ],
    },
    courses: {
      title: 'Import Programs / Courses',
      description:
        'Department ID is required when no department is selected.',
      headers: [
        'Course Name',
        'Course Code',
        'Semester',
        'Credits',
        'Department ID',
      ],
      sample: [
        {
          'Course Name': 'B.Sc Computer Science',
          'Course Code': 'BSC-CS',
          Semester: 8,
          Credits: 160,
          'Department ID': selectedDepartment?.id || '',
        },
      ],
    },
    sections: {
      title: 'Import Classes / Sections',
      description:
        'Course ID is required when no course is selected.',
      headers: [
        'Class / Section Name',
        'Capacity',
        'Course ID',
      ],
      sample: [
        {
          'Class / Section Name': 'A',
          Capacity: 60,
          'Course ID': selectedCourse?.id || '',
        },
      ],
    },
  }[activeTab];

  const openImport = () => {
    setSelectedFile(null);
    setImportOpen(true);
  };

  const downloadTemplate = async () => {
    if (isSavingTemplate) return;

    setIsSavingTemplate(true);

    try {
      const XLSX = getXLSX();
      const worksheet = XLSX.utils.json_to_sheet(
        importConfig.sample,
      );

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        activeTab,
      );

      const base64 = XLSX.write(workbook, {
        type: 'base64',
        bookType: 'xlsx',
      });

      await saveAndOpenFile(
        `${activeTab}_import_template.xlsx`,
        XLSX_MIME,
        base64,
      );

      Alert.alert(
        'Template Ready',
        'The Excel template has been prepared for saving.',
      );
    } catch (error: any) {
      Alert.alert(
        'Template Error',
        error?.message || 'Could not save the template.',
      );
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const runImport = async () => {
    if (!selectedFile) {
      Alert.alert(
        'File Required',
        'Please choose an Excel or CSV file first.',
      );
      return;
    }

    if (isImporting || isPicking) return;

    setIsImporting(true);

    try {
      const rows = await readExcelRows(selectedFile);
      let payload: any[] = [];

      if (activeTab === 'departments') {
        payload = rows
          .map((row: any) => ({
            name: normalise(
              row['Department Name'] ??
              row.departmentName ??
              row.name,
            ),
            code: normalise(
              row['Department Code'] ??
              row.departmentCode ??
              row.code,
            ).toUpperCase(),
          }))
          .filter((row: any) => row.name && row.code);
      }

      if (activeTab === 'courses') {
        payload = rows
          .map((row: any) => ({
            name: normalise(
              row['Course Name'] ??
              row.courseName ??
              row.name,
            ),
            code: normalise(
              row['Course Code'] ??
              row.courseCode ??
              row.code,
            ).toUpperCase(),
            semester:
              Number(row.Semester ?? row.semester) || 1,
            credits:
              Number(row.Credits ?? row.credits) || 0,
            departmentId:
              normalise(
                row['Department ID'] ?? row.departmentId,
              ) || selectedDepartment?.id || '',
          }))
          .filter(
            (row: any) =>
              row.name && row.code && row.departmentId,
          );
      }

      if (activeTab === 'sections') {
        payload = rows
          .map((row: any) => ({
            name: normalise(
              row['Class / Section Name'] ??
              row['Section Name'] ??
              row.sectionName ??
              row.name,
            ),
            capacity: Math.max(
              1,
              Number(row.Capacity ?? row.capacity) || 60,
            ),
            courseId:
              normalise(
                row['Course ID'] ?? row.courseId,
              ) || selectedCourse?.id || '',
          }))
          .filter(
            (row: any) => row.name && row.courseId,
          );
      }

      if (!payload.length) {
        throw new Error(
          `No valid ${activeTab} rows were found. Check the template column names and required values.`,
        );
      }

      const endpoint =
        activeTab === 'departments'
          ? '/departments/bulk'
          : activeTab === 'courses'
            ? '/courses/bulk'
            : '/sections/bulk';

      const response = await api.post<any>(endpoint, {
        data: payload,
      });

      const stats = response?.data || {};

      Alert.alert(
        'Import Completed',
        `Processed ${payload.length} row(s) successfully${
          stats.successful != null
            ? ` (${stats.successful} accepted)`
            : ''
        }.`,
      );

      setImportOpen(false);
      setSelectedFile(null);
    } catch (error: any) {
      Alert.alert(
        'Import Failed',
        error?.message || 'Could not import the selected file.',
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <View style={styles.header}>
        <View
          style={[
            styles.icon,
            { backgroundColor: colors.primarySoft },
          ]}
        >
          <BookOpen size={22} color={colors.primary} />
        </View>

        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.text }]}>
            Academic Structure
          </Text>

          <Text
            style={[
              styles.subtitle,
              { color: colors.textMuted },
            ]}
          >
            Configure your college departments, programs, and classes.
          </Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabs}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;

          return (
            <Pressable
              key={tab.key}
              onPress={() => changeTab(tab.key)}
              style={[
                styles.tab,
                active && { backgroundColor: colors.primary },
              ]}
            >
              <Icon
                size={15}
                color={
                  active ? colors.onPrimary : colors.textMuted
                }
              />

              <Text
                style={[
                  styles.tabText,
                  {
                    color: active
                      ? colors.onPrimary
                      : colors.textMuted,
                  },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View
        style={[
          styles.importRow,
          {
            borderColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <View style={styles.importCopy}>
          <Upload size={16} color={colors.primary} />

          <View style={{ flex: 1 }}>
            <Text
              style={[
                styles.importTitle,
                { color: colors.text },
              ]}
            >
              Excel / CSV Import
            </Text>

            <Text
              style={[
                styles.importSub,
                { color: colors.textMuted },
              ]}
            >
              Import{' '}
              {activeTab === 'departments'
                ? 'departments'
                : activeTab === 'courses'
                  ? 'programs and courses'
                  : 'classes and sections'}{' '}
              in bulk.
            </Text>
          </View>
        </View>

        <Button
          title="Import"
          size="sm"
          fullWidth={false}
          icon={Upload}
          onPress={openImport}
        />
      </View>

      <View style={styles.activeTabContent}>
        {visitedTabs.includes('departments') ? (
          <View
            style={{
              display:
                activeTab === 'departments' ? 'flex' : 'none',
            }}
          >
            <DepartmentsTab
              onSelect={(dept: DepartmentItem) => {
                setSelectedDepartment(dept);
                setSelectedCourse(null);
                changeTab('courses');
              }}
            />
          </View>
        ) : null}

        {visitedTabs.includes('courses') ? (
          <View
            style={{
              display: activeTab === 'courses' ? 'flex' : 'none',
            }}
          >
            <CoursesTab
              departmentId={selectedDepartment?.id || null}
              departmentName={selectedDepartment?.name}
              onSelect={(course: CourseItem) => {
                setSelectedCourse(course);
                changeTab('sections');
              }}
              onClearFilter={() =>
                setSelectedDepartment(null)
              }
            />
          </View>
        ) : null}

        {visitedTabs.includes('sections') ? (
          <View
            style={{
              display: activeTab === 'sections' ? 'flex' : 'none',
            }}
          >
            <SectionsTab
              courseId={selectedCourse?.id || null}
              courseName={selectedCourse?.name}
              onClearFilter={() => setSelectedCourse(null)}
            />
          </View>
        ) : null}
      </View>

      <Modal
        visible={importOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isImporting && !isPicking) {
            setImportOpen(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modal,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
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
                  <Text
                    style={[
                      styles.modalTitle,
                      { color: colors.text },
                    ]}
                  >
                    {importConfig.title}
                  </Text>

                  <Text
                    style={[
                      styles.modalSub,
                      { color: colors.textMuted },
                    ]}
                  >
                    {importConfig.description}
                  </Text>
                </View>
              </View>

              <Pressable
                disabled={isImporting || isPicking}
                onPress={() => setImportOpen(false)}
                hitSlop={10}
              >
                <Text
                  style={[
                    styles.close,
                    { color: colors.textMuted },
                  ]}
                >
                  ×
                </Text>
              </Pressable>
            </View>

            <View
              style={[
                styles.guideline,
                {
                  backgroundColor: colors.cardAlt,
                  borderColor: colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.guidelineTitle,
                  { color: colors.text },
                ]}
              >
                Template & Column Guidelines
              </Text>

              <Text
                style={[
                  styles.guidelineText,
                  { color: colors.textMuted },
                ]}
              >
                Columns: {importConfig.headers.join(', ')}
              </Text>

              <Pressable
                disabled={isSavingTemplate}
                onPress={downloadTemplate}
                style={styles.templateButton}
              >
                <Text
                  style={[
                    styles.templateText,
                    { color: colors.primary },
                  ]}
                >
                  {isSavingTemplate
                    ? 'Preparing template...'
                    : 'Download Template (.xlsx)'}
                </Text>
              </Pressable>
            </View>

            <Pressable
              disabled={isPicking || isImporting}
              onPress={async () => {
                setIsPicking(true);

                try {
                  const file = await pickExcel();

                  if (file) {
                    setSelectedFile(file);
                  }
                } finally {
                  setIsPicking(false);
                }
              }}
              style={[
                styles.dropzone,
                {
                  borderColor: selectedFile
                    ? colors.primary
                    : colors.border,
                  backgroundColor: selectedFile
                    ? colors.primarySoft
                    : colors.cardAlt,
                  opacity: isPicking ? 0.65 : 1,
                },
              ]}
            >
              <Upload size={30} color={colors.primary} />

              <Text
                style={[
                  styles.dropTitle,
                  { color: colors.text },
                ]}
              >
                {isPicking
                  ? 'Opening file picker...'
                  : selectedFile
                    ? selectedFile.name
                    : 'Tap to choose an Excel / CSV file'}
              </Text>

              <Text
                style={[
                  styles.dropSub,
                  { color: colors.textMuted },
                ]}
              >
                {selectedFile
                  ? 'File selected — ready to import'
                  : 'Supports .xlsx, .xls, and .csv files'}
              </Text>
            </Pressable>

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                variant="outline"
                size="sm"
                fullWidth={false}
                disabled={isImporting || isPicking}
                onPress={() => setImportOpen(false)}
              />

              <Button
                title="Import Data"
                size="sm"
                fullWidth={false}
                icon={Upload}
                loading={isImporting}
                disabled={!selectedFile || isPicking}
                onPress={runImport}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  activeTabContent: { width: '100%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerCopy: { flex: 1 },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.extrabold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: fontSize.sm,
    lineHeight: 19,
    marginTop: 3,
  },
  tabsScroll: { flexGrow: 0 },
  tabs: {
    gap: 8,
    paddingBottom: 8,
    alignItems: 'center',
  },
  tab: {
    minHeight: 42,
    borderRadius: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  tabText: {
    fontSize: 11,
    fontWeight: fontWeight.bold,
  },
  importRow: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  importCopy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 8,
  },
  importTitle: {
    fontSize: 12,
    fontWeight: fontWeight.extrabold,
  },
  importSub: { fontSize: 10, marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.48)',
    justifyContent: 'center',
    padding: 18,
  },
  modal: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.extrabold,
  },
  modalSub: {
    fontSize: fontSize.xs,
    lineHeight: 17,
    marginTop: 3,
  },
  close: { fontSize: 28, lineHeight: 28 },
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
  templateButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  templateText: {
    fontSize: 11,
    fontWeight: fontWeight.extrabold,
  },
  dropzone: {
    minHeight: 150,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  dropTitle: {
    fontSize: 12,
    fontWeight: fontWeight.extrabold,
    textAlign: 'center',
    marginTop: 9,
  },
  dropSub: { fontSize: 10, marginTop: 4 },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
  },
});