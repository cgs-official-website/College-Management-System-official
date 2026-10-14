import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Building, Camera } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { api } from '../../api/client';
import { Screen } from '../../components/ui/Screen';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Tabs } from '../../components/ui/Tabs';
import { types } from '@react-native-documents/picker';
import { pickAsDataUrl } from '../../utils/filePicker';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';


const TABS = [
  { key: 'profile', label: 'College Profile' },
  { key: 'security', label: 'Security' },
];
const PROFILE_BLANK = {
  name: '', contactEmail: '', contactPhone: '', address: '', website: '',
  academicYear: '', affiliationCode: '', aicteNumber: '', ugcCode: '',
};
const PW_BLANK = { current: '', new: '', confirm: '' };

/** Web: pages/admin/settings/Settings.jsx  (GET/PUT /colleges/:id, PUT /users/change-password) */
export default function SettingsScreen() {
  const { colors } = useTheme();
  const { userData, updateUserData } = useAuth();
  const collegeId = userData?.collegeId || 'default_college_id';

  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(collegeId !== 'default_college_id');
  const [profile, setProfile] = useState<any>(PROFILE_BLANK);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [logoBase64, setLogoBase64] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [passwordData, setPasswordData] = useState<any>(PW_BLANK);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadCollege = useCallback(async () => {
    if (collegeId === 'default_college_id') { setIsLoading(false); return; }
    try {
      const res = await api.get<any>(`/colleges/${collegeId}`);
      const col = res?.data?.data || res?.data || res;
      setProfile({
        name: col.name || '', contactEmail: col.contactEmail || '', contactPhone: col.contactPhone || '',
        address: col.address || '', website: col.website || '', academicYear: col.academicYear || '',
        affiliationCode: col.affiliationCode || '', aicteNumber: col.aicteNumber || '', ugcCode: col.ugcCode || '',
      });
      setLogoBase64(col.logoUrl || col.logoBase64 || '');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load college settings');
    } finally {
      setIsLoading(false);
    }
  }, [collegeId]);

  useEffect(() => { void loadCollege(); }, [loadCollege]);

  const setP = (k: string) => (x: string) => { setProfile((p: any) => ({ ...p, [k]: x })); setProfileErrors((p) => ({ ...p, [k]: '' })); };

  const handleLogoUpload = async () => {
    const file = await pickAsDataUrl({
      types: [types.images],
      allowedMimes: ['image/jpeg', 'image/png', 'image/webp'],
      maxBytes: 2 * 1024 * 1024,
      typeError: 'Unsupported format. Allowed: JPEG, PNG, WebP',
    });
    if (file) setLogoBase64(file.dataUrl);
  };

  const handleProfileSubmit = async () => {
    if (!profile.name.trim()) { setProfileErrors({ name: 'College Name is required' }); return; }
    setIsSavingProfile(true);
    try {
      const response = await api.put<any>(`/colleges/${collegeId}`, { ...profile, logoUrl: logoBase64 });
      const collegeObj = response?.data?.data || response?.data || response;
      if (collegeObj?.name) updateUserData({ collegeName: collegeObj.name, collegeLogo: collegeObj.logoUrl });
      toast.success('College profile updated successfully!');
      await loadCollege();
    } catch (err: any) {
      toast.error(err?.data?.error?.message || err?.data?.message || err?.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const setPw = (k: string) => (x: string) => { setPasswordData((p: any) => ({ ...p, [k]: x })); setPasswordErrors((p) => ({ ...p, [k]: '' })); };

  const handlePasswordSubmit = async () => {
    const errs: Record<string, string> = {};
    if (!passwordData.current) errs.current = 'Current password is required';
    if (!passwordData.new) errs.new = 'New password is required';
    else if (passwordData.new.length < 6) errs.new = 'Password must be at least 6 characters';
    if (!passwordData.confirm) errs.confirm = 'Confirm password is required';
    else if (passwordData.new !== passwordData.confirm) errs.confirm = 'New password and confirm password do not match';
    if (Object.keys(errs).length) {
      setPasswordErrors(errs);
      if (errs.confirm && passwordData.new && passwordData.confirm && passwordData.new !== passwordData.confirm) toast.error('New password and confirm password do not match');
      else if (errs.new && passwordData.new && passwordData.new.length < 6) toast.error('Password must be at least 6 characters');
      else toast.error('Please fill in all required password fields');
      return;
    }
    setPasswordErrors({});
    setIsChangingPassword(true);
    try {
      const res = await api.put<any>('/users/change-password', {
        currentPassword: passwordData.current, newPassword: passwordData.new, confirmPassword: passwordData.confirm,
      });
      toast.success(res?.message || 'Password updated successfully.');
      setPasswordData(PW_BLANK);
    } catch (err: any) {
      toast.error(err?.data?.error?.message || err?.message || 'Unable to update password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <Screen edges={['left', 'right', 'bottom']} contentContainerStyle={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textMuted, marginTop: 12 }}>Loading settings...</Text>
      </Screen>
    );
  }

  return (
    <Screen
      edges={['left', 'right', 'bottom']}
      refreshing={isRefreshing}
      onRefresh={async () => { setIsRefreshing(true); await loadCollege(); setIsRefreshing(false); }}>
      <View style={{ marginBottom: 12 }}>
        <Text style={[styles.title, { color: colors.text }]}>Environment Setup</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Configure your college's environment and settings.</Text>
      </View>

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {activeTab === 'profile' ? (
        <Card style={styles.card}>
          <View style={[styles.logoRow, { borderBottomColor: colors.border }]}>
            <Pressable onPress={handleLogoUpload} style={[styles.logoBox, { backgroundColor: colors.cardAlt, borderColor: colors.border }]}>
              {logoBase64 ? <Image source={{ uri: logoBase64 }} style={styles.logoImg} resizeMode="contain" /> : <Building size={30} color={colors.textSubtle} />}
              <View style={[styles.camBadge, { backgroundColor: colors.card, borderColor: colors.border }]}><Camera size={14} color={colors.primary} /></View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={[styles.section, { color: colors.text }]}>College Logo</Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>Upload your institution's logo. Max size 2MB.</Text>
            </View>
          </View>

          <View style={{ marginTop: 16 }}>
            <Input label="College Name" required value={profile.name} onChangeText={setP('name')} error={profileErrors.name} />
            <Input label="Contact Email" keyboardType="email-address" autoCapitalize="none" value={profile.contactEmail} onChangeText={setP('contactEmail')} />
            <Input label="Contact Phone" keyboardType="phone-pad" value={profile.contactPhone} onChangeText={setP('contactPhone')} />
            <Input label="Address" value={profile.address} onChangeText={setP('address')} />
            <Input label="Website" placeholder="https://example.edu" autoCapitalize="none" keyboardType="url" value={profile.website} onChangeText={setP('website')} />
            <Input label="Current Academic Year" placeholder="e.g. 2024-2025" value={profile.academicYear} onChangeText={setP('academicYear')} />
            <Input label="Affiliation Code" value={profile.affiliationCode} onChangeText={setP('affiliationCode')} />
            <Input label="AICTE Number" value={profile.aicteNumber} onChangeText={setP('aicteNumber')} />
            <Input label="UGC Code" value={profile.ugcCode} onChangeText={setP('ugcCode')} />
            <Button title="Save Environment Settings" loading={isSavingProfile} onPress={handleProfileSubmit} />
          </View>
        </Card>
      ) : (
        <Card style={styles.card}>
          <Text style={[styles.section, { color: colors.text, paddingBottom: 14 }]}>Change Password</Text>
          <Input label="Current Password" isPassword autoCapitalize="none" value={passwordData.current} onChangeText={setPw('current')} error={passwordErrors.current} />
          <Input label="New Password" isPassword autoCapitalize="none" value={passwordData.new} onChangeText={setPw('new')} error={passwordErrors.new} />
          <Input label="Confirm New Password" isPassword autoCapitalize="none" value={passwordData.confirm} onChangeText={setPw('confirm')} error={passwordErrors.confirm} />
          <Button title={isChangingPassword ? 'Updating...' : 'Update Password'} loading={isChangingPassword} onPress={handlePasswordSubmit} />
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, marginTop: 3, lineHeight: 19 },
  card: { marginTop: 12, padding: 14 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  logoBox: { width: 84, height: 84, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  logoImg: { width: '100%', height: '100%', borderRadius: 18 },
  camBadge: { position: 'absolute', right: -8, bottom: -8, width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: fontSize.lg, fontWeight: fontWeight.extrabold },
  meta: { fontSize: 11, marginTop: 4, lineHeight: 16 },
});