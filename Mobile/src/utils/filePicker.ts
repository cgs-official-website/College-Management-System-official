import { Alert } from 'react-native';
import { pick, keepLocalCopy, saveDocuments, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import { toast } from './toast';

export interface PickedFile {
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
}

interface PickOptions {
  /** picker `types` (e.g. [types.images, types.pdf]) */
  types: any[];
  /** whitelist of mime types (checked after picking). Skip to allow everything the picker returned. */
  allowedMimes?: string[];
  maxBytes?: number;
  /** shown in the toast when the file is rejected for its type */
  typeError?: string;
}

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  pdf: 'application/pdf',
};

const guessMime = (name?: string) => EXT_MIME[(name?.split('.').pop() || '').toLowerCase()] || '';

/** Opens the system picker and returns the chosen file as a data URL (same payload the web sends). */
export const pickAsDataUrl = async ({ types, allowedMimes, maxBytes, typeError }: PickOptions): Promise<PickedFile | null> => {
  try {
    const results = await pick({ type: types, allowMultiSelection: false, copyTo: 'cachesDirectory' } as any);
    const file: any = results?.[0];
    if (!file?.uri) return null;

    const mime: string = file.type || guessMime(file.name);
    if (allowedMimes && !allowedMimes.includes(mime)) {
      toast.error(typeError || 'This file type is not supported');
      return null;
    }
    if (maxBytes && file.size && file.size > maxBytes) {
      toast.error(`File must be under ${Math.round(maxBytes / (1024 * 1024))} MB`);
      return null;
    }

    let localUri: string = file.fileCopyUri || file.uri;
    if (localUri.startsWith('content://')) {
      const copied = await keepLocalCopy({
        files: [{ uri: file.uri, fileName: file.name || `file_${Date.now()}` }],
        destination: 'cachesDirectory',
      });
      const r: any = copied?.[0];
      if (!r || r.status !== 'success' || !r.localUri) throw new Error('Could not read the selected file.');
      localUri = r.localUri;
    }
    const path = localUri.startsWith('file://') ? localUri.replace(/^file:\/\//, '') : localUri;
    const base64 = await RNFS.readFile(decodeURIComponent(path), 'base64');
    const mimeType = mime || 'application/octet-stream';
    return {
      name: file.name || 'file',
      mimeType,
      size: file.size || Math.floor((base64.length * 3) / 4),
      dataUrl: `data:${mimeType};base64,${base64}`,
    };
  } catch (err: any) {
    if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return null;
    Alert.alert('File Picker Error', err?.message || 'Could not choose or read the file.');
    return null;
  }
};

/** Saves a `data:<mime>;base64,...` URL to the device (system "save as" dialog). */
export const saveDataUrl = async (fileName: string, dataUrl: string): Promise<boolean> => {
  const match = /^data:([^;,]+)?(?:;[^,]*)?;base64,(.*)$/s.exec(dataUrl);
  if (!match) {
    toast.error('This document cannot be downloaded');
    return false;
  }
  const mimeType = match[1] || 'application/octet-stream';
  const safeName = (fileName || 'document').replace(/[\\/:*?"<>|]/g, '_');
  const tempPath = `${RNFS.CachesDirectoryPath}/${Date.now()}-${safeName}`;
  try {
    await RNFS.writeFile(tempPath, match[2], 'base64');
    await saveDocuments({ sourceUris: [`file://${tempPath}`], fileName: safeName, mimeType } as any);
    return true;
  } catch (err: any) {
    if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return false;
    Alert.alert('Save File Error', err?.message || 'Could not save the file.');
    return false;
  }
};