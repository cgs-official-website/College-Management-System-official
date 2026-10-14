import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Lock, Moon, Palette, Sun, User } from 'lucide-react-native';

import { api } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Screen } from '../../components/ui/Screen';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from '../../utils/toast';
import { fontSize, fontWeight } from '../../theme/typography';

const PW_BLANK = { currentPassword: '', newPassword: '', confirmPassword: '' };

/** Web: pages/teacher/TeacherSettings.jsx (PUT /users/profile) */
export default function TeacherSettingsScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { userData, updateUserData } = useAuth();
  const ud: any = userData || {};

  const [formData, setFormData] = useState({
    firstName: ud.firstName || '',
    lastName: ud.lastName || '',
    phone: ud.phone || '',
    designation: ud.designation || '',
  });
  const [passwords, setPasswords] = useState(PW_BLANK);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const handleProfileSave = async () => {
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }
    setSavingProfile(true);
    try {
      await api.put('/users/profile', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        designation: formData.designation,
      });
      updateUserData({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        designation: formData.designation,
      } as any);
      toast.success('Profile updated successfully');
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSave = async () => {
    if (!passwords.currentPassword) {
      toast.error('Current password is required');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSavingPassword(true);
    try {
      await api.put('/users/profile', {
        newPassword: passwords.newPassword,
        currentPassword: passwords.currentPassword,
      });
      toast.success('Password updated successfully');
      setPasswords(PW_BLANK);
    } catch {
      toast.error('Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <Text style={[styles.title, { color: colors.text }]}>Account Settings</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>Manage your personal profile and security preferences.</Text>

      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={[styles.headIcon, { backgroundColor: colors.primarySoft }]}>
            <User size={20} color={colors.primary} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Personal Information</Text>
        </View>
        <Input label="Email Address" value={ud.email || ''} editable={false} hint="Email cannot be changed as it is linked to your institution." />
        <Input label="First Name" required value={formData.firstName} onChangeText={(v) => setFormData((p) => ({ ...p, firstName: v }))} />
        <Input label="Last Name" required value={formData.lastName} onChangeText={(v) => setFormData((p) => ({ ...p, lastName: v }))} />
        <Input label="Phone Number" keyboardType="phone-pad" value={formData.phone} onChangeText={(v) => setFormData((p) => ({ ...p, phone: v }))} />
        <Input
          label="Designation / Department"
          placeholder="e.g. Head of Computer Science"
          value={formData.designation}
          onChangeText={(v) => setFormData((p) => ({ ...p, designation: v }))}
        />
        <Button title={savingProfile ? 'Saving...' : 'Save Profile'} loading={savingProfile} onPress={handleProfileSave} />
      </Card>

      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={[styles.headIcon, { backgroundColor: colors.warningSoft }]}>
            <Lock size={20} color={colors.warning} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Security</Text>
        </View>
        <Input label="Current Password" isPassword required value={passwords.currentPassword} onChangeText={(v) => setPasswords((p) => ({ ...p, currentPassword: v }))} />
        <Input label="New Password" isPassword required value={passwords.newPassword} onChangeText={(v) => setPasswords((p) => ({ ...p, newPassword: v }))} />
        <Input label="Confirm Password" isPassword required value={passwords.confirmPassword} onChangeText={(v) => setPasswords((p) => ({ ...p, confirmPassword: v }))} />
        <Button title={savingPassword ? 'Updating...' : 'Update Password'} loading={savingPassword} onPress={handlePasswordSave} />
      </Card>

      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={[styles.headIcon, { backgroundColor: colors.infoSoft }]}>
            <Palette size={20} color={colors.info} />
          </View>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Appearance</Text>
        </View>
        <Button
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          variant="outline"
          icon={isDark ? Sun : Moon}
          onPress={toggleTheme}
        />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.extrabold, letterSpacing: -0.5 },
  subtitle: { fontSize: fontSize.sm, lineHeight: 20, marginTop: 4, marginBottom: 16 },
  card: { marginBottom: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  headIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.bold },
});