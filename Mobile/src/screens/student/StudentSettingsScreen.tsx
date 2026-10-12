import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { AlertCircle, Book, Camera, Lock, Mail, Phone, Save, ShieldCheck, Trash2, Upload, User } from 'lucide-react-native';
import { types } from '@react-native-documents/picker';

import { api } from '../../api/client';
import { getSession } from '../../api/session';
import { API_URL } from '../../config/env';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useConfirm } from '../../contexts/ConfirmContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Loader } from '../../components/ui/Loader';
import { useStudentProfile, useStudentProfileImage } from '../../hooks/useStudentPortal';
import { pickAsDataUrl, PickedFile } from '../../utils/filePicker';
import { syncChannel } from '../../utils/syncChannel';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function LockedBadge() {
  const { colors } = useTheme();
  return (
    <View style={[styles.locked, { backgroundColor: colors.cardAlt }]}>
      <Lock size={11} color={colors.textSubtle} />
      <Text style={[styles.lockedText, { color: colors.textMuted }]}>Locked</Text>
    </View>
  );
}

/** Web: pages/student/StudentSettings.jsx */
export default function StudentSettingsScreen() {
  const { colors } = useTheme();
  const { userData, updateUserData } = useAuth();
  const confirm = useConfirm();
  const { data: profile, isLoading, isRefreshing, refetch } = useStudentProfile();
  const { uploadProfileImage, deleteProfileImage, isUploading, isDeleting } = useStudentProfileImage();

  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [imageError, setImageError] = useState('');
  const [imageStamp, setImageStamp] = useState(() => Date.now());
  const [imageFailed, setImageFailed] = useState(false);
  const initialised = useRef(false);

  // Fill the form once from the profile (so a background refresh never wipes what the student is typing).
  useEffect(() => {
    if (initialised.current) return;
    if (profile) {
      setForm({ firstName: profile.firstName || '', lastName: profile.lastName || '', phone: profile.mobile || '' });
      initialised.current = true;
    } else if (userData && !isLoading) {
      setForm({
        firstName: (userData as any).firstName || userData.name || '',
        lastName: (userData as any).lastName || '',
        phone: (userData as any).phone || '',
      });
    }
  }, [profile, userData, isLoading]);

  const hasPhoto = Boolean(profile?.hasProfileImage);
  const token = getSession()?.accessToken;
  const remoteSource =
    hasPhoto && !imageFailed
      ? { uri: `${API_URL}/student/profile/image?t=${imageStamp}`, headers: token ? { Authorization: `Bearer ${token}` } : undefined }
      : null;
  const imageSource = picked ? { uri: picked.dataUrl } : remoteSource;

  const initials = `${profile?.firstName?.charAt(0) || (userData as any)?.firstName?.charAt(0) || 'S'}${
    profile?.lastName?.charAt(0) || (userData as any)?.lastName?.charAt(0) || ''
  }`.toUpperCase();

  const selectPhoto = async () => {
    setImageError('');
    const file = await pickAsDataUrl({
      types: [types.images],
      allowedMimes: IMAGE_MIMES,
      maxBytes: MAX_IMAGE_BYTES,
      typeError: 'Unsupported format. Allowed: JPEG, PNG, WebP',
    });
    if (file) setPicked(file);
  };

  const savePhoto = async () => {
    if (!picked) return;
    try {
      await uploadProfileImage(picked.dataUrl);
      setPicked(null);
      setImageFailed(false);
      setImageStamp(Date.now());
      syncChannel.publish('student:profile');
      refetch();
    } catch (err: any) {
      setImageError(err?.data?.error?.message || err?.message || 'Failed to upload photo');
    }
  };

  const removePhoto = async () => {
    const ok = await confirm({
      title: 'Remove photo?',
      message: 'Are you sure you want to remove your profile photo?',
      confirmText: 'Remove',
      isDestructive: true,
    });
    if (!ok) return;
    try {
      await deleteProfileImage();
      setPicked(null);
      setImageStamp(Date.now());
      syncChannel.publish('student:profile');
      refetch();
    } catch {
      // toast already shown by the hook
    }
  };

  const save = async () => {
    if (!form.firstName.trim()) {
      toast.error('First name is required');
      return;
    }
    if (form.phone && form.phone.length !== 10) {
      toast.error('Mobile Phone Number must be exactly 10 digits.');
      return;
    }
    setSaving(true);
    try {
      const payload = { firstName: form.firstName.trim(), lastName: form.lastName.trim(), phone: form.phone };
      await api.put('/users/profile', payload);
      updateUserData(payload);
      syncChannel.publish('student:profile');
      toast.success('Profile information updated successfully!');
      refetch();
    } catch (err: any) {
      toast.error('Failed to update profile. ' + (err?.data?.error?.message || err?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']} refreshing={isRefreshing} onRefresh={refetch}>
      <Text style={[styles.title, { color: colors.text }]}>Student Settings & Profile</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Manage your official student avatar, contact details, and preferences.
      </Text>

      {isLoading ? (
        <Loader label="Loading profile..." />
      ) : (
        <>
          {/* Profile photo */}
          <Card style={styles.card}>
            <View style={styles.inline}>
              <Camera size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>Profile Photo</Text>
            </View>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Upload a clear portrait photo for your student ID and academic records. Max size 2 MB (JPEG, PNG, WebP).
            </Text>

            <View style={styles.avatarWrap}>
              <View style={[styles.avatar, { backgroundColor: colors.primarySoft, borderColor: colors.border }]}>
                {imageSource ? (
                  <Image source={imageSource} style={styles.avatarImg} onError={() => !picked && setImageFailed(true)} />
                ) : (
                  <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
                )}
              </View>
            </View>

            {picked ? (
              <Text style={[styles.selected, { color: colors.success }]}>
                Selected: {picked.name} ({(picked.size / 1024).toFixed(1)} KB). Tap "Save Photo" to apply.
              </Text>
            ) : null}
            {imageError ? (
              <View style={styles.errorRow}>
                <AlertCircle size={15} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{imageError}</Text>
              </View>
            ) : null}

            <View style={styles.btnCol}>
              <Button title="Select Photo" icon={Upload} variant="outline" onPress={selectPhoto} disabled={isUploading} />
              {picked ? (
                <>
                  <Button title="Save Photo" icon={Save} loading={isUploading} onPress={savePhoto} />
                  <Button title="Cancel" variant="ghost" onPress={() => { setPicked(null); setImageError(''); }} disabled={isUploading} />
                </>
              ) : null}
              {hasPhoto && !picked ? (
                <Button title="Remove Photo" icon={Trash2} variant="danger" loading={isDeleting} onPress={removePhoto} />
              ) : null}
            </View>
          </Card>

          {/* Personal details */}
          <Card style={styles.card}>
            <Text style={[styles.cardTitle, { color: colors.text, marginBottom: 16 }]}>Personal & Academic Details</Text>

            <Input
              label="First Name"
              required
              icon={User}
              value={form.firstName}
              onChangeText={(t) => setForm((p) => ({ ...p, firstName: t }))}
            />
            <Input
              label="Last Name"
              icon={User}
              value={form.lastName}
              onChangeText={(t) => setForm((p) => ({ ...p, lastName: t }))}
            />

            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.text }]}>Registered Email Address</Text>
              <LockedBadge />
            </View>
            <Input icon={Mail} value={profile?.email || (userData as any)?.email || ''} editable={false} hint="Official tenant email is locked by administration." />

            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.text }]}>Mobile Phone Number</Text>
              <Text style={[styles.lockedText, { color: colors.textSubtle }]}>10 digits</Text>
            </View>
            <Input
              icon={Phone}
              value={form.phone}
              onChangeText={(t) => setForm((p) => ({ ...p, phone: t.replace(/\D/g, '').slice(0, 10) }))}
              keyboardType="phone-pad"
              maxLength={10}
              placeholder="Enter 10-digit mobile number"
              hint={form.phone.length > 0 && form.phone.length < 10 ? `Must be exactly 10 digits (${form.phone.length}/10 entered)` : undefined}
            />

            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.text }]}>Department</Text>
              <LockedBadge />
            </View>
            <Input icon={Book} value={profile?.department || 'Academic Department'} editable={false} />

            <View style={styles.labelRow}>
              <Text style={[styles.label, { color: colors.text }]}>Admission Number</Text>
              <LockedBadge />
            </View>
            <Input icon={ShieldCheck} value={profile?.admissionNumber || 'ADM-N/A'} editable={false} />

            <Button title="Save Information" icon={Save} loading={saving} onPress={save} />
          </Card>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold },
  subtitle: { fontSize: fontSize.sm, marginTop: 4, marginBottom: 16, lineHeight: 20 },
  card: { marginBottom: 16 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
  hint: { fontSize: fontSize.xs, lineHeight: 17, marginTop: 6 },
  avatarWrap: { alignItems: 'center', marginVertical: 18 },
  avatar: { width: 112, height: 112, borderRadius: 24, borderWidth: 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarImg: { width: '100%', height: '100%' },
  initials: { fontSize: 34, fontWeight: fontWeight.extrabold },
  selected: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, textAlign: 'center', marginBottom: 10 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginBottom: 10 },
  errorText: { flex: 1, fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  btnCol: { gap: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  label: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  locked: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  lockedText: { fontSize: 11, fontWeight: fontWeight.semibold },
});