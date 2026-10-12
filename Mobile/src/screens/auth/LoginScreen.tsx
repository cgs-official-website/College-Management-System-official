import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { Building2, ChevronRight, GraduationCap, Lock, Mail } from 'lucide-react-native';

import { AuthShell } from '../../components/layout/AuthShell';
import { Banner } from '../../components/layout/Banner';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';
import type { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;
type FormValues = { email: string; password: string };

const mapLoginError = (err: any): string => {
  const code = err?.code;
  const status = err?.status;
  if (code === 'ACCOUNT_PENDING_APPROVAL') return 'Your account is pending administrator approval. Please contact your college admin.';
  if (code === 'COLLEGE_PENDING_APPROVAL') return 'Your college registration is still waiting for Super Admin approval. Please try again later.';
  if (code === 'COLLEGE_REJECTED') return 'Your college registration was rejected. Please contact support.';
  if (code === 'INVALID_CREDENTIALS' || status === 401) return 'Invalid email address or password.';
  if (status === 429) return 'Too many failed attempts. Please try again later.';
  return err?.message || 'Failed to sign in. Please check your credentials and try again.';
};

/**
 * Same flow as the web Login page:
 *  - email + password only
 *  - college slug comes from the deep link (zuna://login?college=xyz), exactly like web "?college=xyz"
 *  - footer: "New student?" when a college slug is present, otherwise "New organization?"
 */
export default function LoginScreen({ navigation, route }: Props) {
  const { login } = useAuth();
  const { colors } = useTheme();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const collegeSlug = route.params?.college?.trim().toLowerCase() || '';
  const successMessage = route.params?.successMessage;

  const { control, handleSubmit, formState: { errors } } = useForm<FormValues>({ defaultValues: { email: '', password: '' } });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setError('');
    try {
      await login(data.email.toLowerCase().trim(), data.password, collegeSlug || null);
    } catch (err: any) {
      setError(mapLoginError(err));
      setLoading(false);
    }
  };

  return (
    <AuthShell
      bare
      title="Welcome Back"
      subtitle="Authenticate to access your Zuna Ecosystem.">
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {successMessage ? <Banner type="success" message={successMessage} /> : null}
        {error ? <Banner type="error" message={error} /> : null}

        <Controller
          control={control}
          name="email"
          rules={{
            required: 'Email is required',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Please enter a valid email address' },
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              icon={Mail}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="Email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              error={errors.email?.message}
            />
          )}
        />

        <View style={styles.passwordHead}>
          <Text style={[styles.passwordLabel, { color: colors.text }]}>Password</Text>
          <Pressable onPress={() => navigation.navigate('ForgotPassword')} hitSlop={10}>
            <Text style={[styles.forgot, { color: colors.primary }]}>Forgot password?</Text>
          </Pressable>
        </View>
        <Controller
          control={control}
          name="password"
          rules={{ required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              icon={Lock}
              isPassword
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              placeholder="••••••••"
              autoCapitalize="none"
              autoComplete="password"
              error={errors.password?.message}
              containerStyle={styles.passwordInput}
              onSubmitEditing={() => void handleSubmit(onSubmit)()}
            />
          )}
        />

        <Pressable
          onPress={() => void handleSubmit(onSubmit)()}
          disabled={loading}
          style={({ pressed }) => [
            styles.submit,
            { backgroundColor: colors.primary, shadowColor: colors.primary, opacity: loading ? 0.6 : pressed ? 0.9 : 1 },
          ]}>
          {loading ? <ActivityIndicator size="small" color="#FFFFFF" style={styles.submitSpinner} /> : null}
          <Text style={styles.submitText}>{loading ? 'Authenticating...' : 'Secure Login'}</Text>
          {!loading ? <ChevronRight size={20} color="#FFFFFF" style={styles.submitIcon} /> : null}
        </Pressable>

        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {collegeSlug ? (
            <View style={[styles.footerBox, { backgroundColor: colors.successSoft, borderColor: colors.successBorder }]}>
              <GraduationCap size={17} color={colors.primary} />
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                New student? <Text style={[styles.footerLink, { color: colors.primary }]}>Register here</Text> using your college link
              </Text>
            </View>
          ) : (
            <View style={[styles.footerBox, { backgroundColor: colors.primarySoft, borderColor: colors.successBorder }]}>
              <Building2 size={17} color={colors.primary} />
              <Text style={[styles.footerText, { color: colors.textMuted }]}>
                New organization? <Text style={[styles.footerLink, { color: colors.primary }]}>Register here</Text>
              </Text>
            </View>
          )}
        </View>
      </View>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 26,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
  },
  passwordHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  passwordLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold },
  forgot: { fontSize: fontSize.xs + 1, fontWeight: fontWeight.semibold },
  passwordInput: { marginBottom: 20 },
  submit: {
    height: 54,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  submitText: { color: '#FFFFFF', fontSize: fontSize.md, fontWeight: fontWeight.bold },
  submitIcon: { marginLeft: 6 },
  submitSpinner: { marginRight: 10 },
  footer: { marginTop: 24, paddingTop: 22, borderTopWidth: 1 },
  footerBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 12, gap: 8 },
  footerText: { fontSize: fontSize.sm, flexShrink: 1, textAlign: 'center' },
  footerLink: { fontWeight: fontWeight.bold },
});