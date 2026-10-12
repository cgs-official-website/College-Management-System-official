import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { pick, keepLocalCopy, saveDocuments, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import { Upload } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { SheetModal } from './SheetModal';
import { Button } from './Button';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';


/**
 * Same picker/save approach as the working Students import:
 * @react-native-documents/picker + react-native-fs (no custom native module).
 */
export const pickExcelFile = async (): Promise<{ name: string; base64: string } | null> => {
  try {
    const results = await pick({
      type: [types.xlsx, types.xls, types.csv],
      allowMultiSelection: false,
      copyTo: 'cachesDirectory',
    });
    const file: any = results?.[0];
    if (!file?.uri) {
      Alert.alert('File Error', 'The selected file has no valid URI.');
      return null;
    }
    let localUri: string = file.fileCopyUri || file.uri;
    if (localUri.startsWith('content://')) {
      const copied = await keepLocalCopy({
        files: [{ uri: file.uri, fileName: file.name || `import_${Date.now()}.xlsx` }],
        destination: 'cachesDirectory',
      });
      const r: any = copied?.[0];
      if (!r || r.status !== 'success' || !r.localUri) throw new Error('Could not copy the selected file to app storage.');
      localUri = r.localUri;
    }
    const filePath = localUri.startsWith('file://') ? localUri.replace(/^file:\/\//, '') : localUri;
    const base64 = await RNFS.readFile(filePath, 'base64');
    return { name: file.name || 'import.xlsx', base64 };
  } catch (err: any) {
    if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return null;
    Alert.alert('File Picker Error', err?.message || 'Could not choose or read the file.');
    return null;
  }
};

export const saveBase64File = async (fileName: string, mimeType: string, base64Data: string) => {
  const safeName = fileName.replace(/[\\/:*?"<>|]/g, '_');
  const temporaryPath = `${RNFS.CachesDirectoryPath}/${safeName}`;
  try {
    await RNFS.writeFile(temporaryPath, base64Data, 'base64');
    await saveDocuments({ sourceUris: [`file://${temporaryPath}`], fileName: safeName, mimeType });
  } catch (err: any) {
    Alert.alert('Save File Error', err?.message || 'Could not save the generated file.');
  }
};

let xlsxModule: any;
const getXLSX = () => {
  if (xlsxModule) return xlsxModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    xlsxModule = require('xlsx');
    return xlsxModule;
  } catch {
    throw new Error('Excel support is not installed in this build. Please install the xlsx package.');
  }
};

export interface ExcelField {
  name: string;
  required?: boolean;
  type?: string;
  description?: string;
  example?: string;
}

interface Props {
  onUpload: (rows: any[]) => Promise<any> | any;
  isLoading?: boolean;
  label?: string;
  title?: string;
  description?: string;
  fields?: ExcelField[];
  sampleFileName?: string;
  /** full width button (default false) */
  fullWidth?: boolean;
}

/** Mobile version of web ExcelUploadButton: pick file -> parse -> preview -> onUpload(rows). */
export function ExcelUploadButton({
  onUpload,
  isLoading = false,
  label = 'Import',
  title = 'Import Excel Data',
  description = 'Upload an Excel (.xlsx, .xls) or CSV file.',
  fields = [],
  sampleFileName = 'import_template.xlsx',
  fullWidth = false,
}: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const reset = () => {
    setFile(null);
    setRows([]);
    setErrors([]);
  };

  const close = () => {
    if (isLoading) return;
    setOpen(false);
    reset();
  };

  const downloadTemplate = async () => {
    try {
      const XLSX = getXLSX();
      const headers: Record<string, string> = {};
      fields.forEach((f) => {
        headers[f.name + (f.required ? '*' : '')] = f.example || '';
      });
      const ws = XLSX.utils.json_to_sheet([headers]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Template');
      const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
      await saveBase64File(sampleFileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', base64);
    } catch (err: any) {
      Alert.alert('Template Error', err?.message || 'Could not generate the template.');
    }
  };

  const choose = async () => {
    try {
      const picked = await pickExcelFile();
      if (!picked?.base64) return;
      const XLSX = getXLSX();
      const wb = XLSX.read(picked.base64, { type: 'base64' });
      const sheetName = wb.SheetNames.find((n: string) => n.toLowerCase() !== 'instructions') || wb.SheetNames[0];
      const data: any[] = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: '' });
      if (!data.length) {
        toast.error('No data found in the selected file.');
        return;
      }
      const errs: string[] = [];
      const headersInFile = Object.keys(data[0] || {}).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
      fields
        .filter((f) => f.required)
        .forEach((f) => {
          const key = f.name.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!headersInFile.some((h) => h === key || h.includes(key))) errs.push(`Missing required column: "${f.name}"`);
        });
      // drop the trailing "*" from template headers so the backend gets the plain column names
      const cleaned = data.map((row) => {
        const out: Record<string, any> = {};
        Object.keys(row).forEach((k) => {
          out[k.replace(/\*+$/, '').trim()] = row[k];
        });
        return out;
      });
      setFile(picked);
      setRows(cleaned);
      setErrors(errs);
      if (!errs.length) toast.success(`Loaded ${cleaned.length} row(s)`);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to read the Excel file.');
    }
  };

  const confirm = async () => {
    if (!rows.length) {
      toast.error('Please select a valid Excel file with data.');
      return;
    }
    try {
      await onUpload(rows);
      setOpen(false);
      reset();
    } catch {
      // the hook already shows the error toast; keep the sheet open
    }
  };

  const footer = (
    <View style={styles.footer}>
      <Button title="Cancel" variant="outline" size="sm" onPress={close} style={styles.flex} />
      <View style={{ width: 10 }} />
      <Button title="Import Data" size="sm" icon={Upload} loading={isLoading} disabled={!rows.length || errors.length > 0} onPress={confirm} style={styles.flex} />
    </View>
  );

  return (
    <>
      <Button title={label} variant="outline" size="sm" fullWidth={fullWidth} icon={Upload} loading={isLoading} onPress={() => { reset(); setOpen(true); }} />
      <SheetModal visible={open} onClose={close} title={title} footer={footer}>
        <Text style={[styles.desc, { color: colors.textMuted }]}>{description}</Text>

        {fields.length > 0 ? (
          <View style={[styles.guide, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
            <Text style={[styles.guideTitle, { color: colors.text }]}>
              Columns ({fields.filter((f) => f.required).length} required, {fields.filter((f) => !f.required).length} optional)
            </Text>
            {fields.map((f) => (
              <Text key={f.name} style={[styles.guideRow, { color: colors.textMuted }]}>
                <Text style={{ color: colors.text, fontWeight: fontWeight.bold }}>{f.name}{f.required ? ' *' : ''}</Text>
                {f.example ? `  e.g. ${f.example}` : ''}
              </Text>
            ))}
            <Pressable onPress={downloadTemplate} style={styles.templateBtn}>
              <Text style={[styles.templateText, { color: colors.primary }]}>Download Template (.xlsx)</Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          onPress={choose}
          style={[styles.drop, { borderColor: file ? colors.primary : colors.border, backgroundColor: file ? colors.primarySoft : colors.cardAlt }]}>
          <Upload size={28} color={colors.primary} />
          <Text style={[styles.dropTitle, { color: colors.text }]}>{file ? file.name : 'Tap to choose an Excel / CSV file'}</Text>
          <Text style={[styles.dropSub, { color: colors.textMuted }]}>
            {file ? `${rows.length} row(s) ready to import` : 'Supports .xlsx, .xls and .csv'}
          </Text>
        </Pressable>

        {errors.map((e) => (
          <Text key={e} style={[styles.error, { color: colors.danger }]}>{e}</Text>
        ))}
      </SheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { flexDirection: 'row', marginTop: 6 },
  desc: { fontSize: fontSize.sm, lineHeight: 19, marginBottom: 12 },
  guide: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  guideTitle: { fontSize: 12, fontWeight: fontWeight.extrabold, marginBottom: 6 },
  guideRow: { fontSize: 11, lineHeight: 17 },
  templateBtn: { marginTop: 8, alignSelf: 'flex-start' },
  templateText: { fontSize: 12, fontWeight: fontWeight.extrabold },
  drop: { minHeight: 130, borderWidth: 2, borderStyle: 'dashed', borderRadius: 16, alignItems: 'center', justifyContent: 'center', padding: 16 },
  dropTitle: { fontSize: 12, fontWeight: fontWeight.extrabold, textAlign: 'center', marginTop: 8 },
  dropSub: { fontSize: 11, marginTop: 4 },
  error: { fontSize: 12, fontWeight: fontWeight.bold, marginTop: 8 },
});