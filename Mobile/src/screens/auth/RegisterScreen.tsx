import React, { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Controller, useForm } from 'react-hook-form';
import { pick, keepLocalCopy, types, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';
import { Building2, ChevronRight, FileText, Mail, Upload, User, BadgeCheck, Lock } from 'lucide-react-native';

import { AuthShell } from '../../components/layout/AuthShell';
import { Banner } from '../../components/layout/Banner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { fontSize, fontWeight } from '../../theme/typography';
import type { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

type FormValues = {
  name: string;
  email: string;
  password: string;
  collegeName: string;
  affiliationType: 'AUTONOMOUS' | 'UNIVERSITY';
  aicteCode: string;
  ugcCode: string;
  affiliationCode: string;
  pan: string;
  tan: string;
};

const MAX_STEPS = 3;
const STEP_TITLES = ['Account Setup', 'Basic Info', 'Statutory & Affiliation'];
const MAX_LOGO_BYTES = 2 * 1024 * 1024; // backend accepts 10mb JSON; keep the logo small

// Same rules as the web Register page (frontend/src/pages/auth/Register.jsx)
const EMAIL_RE = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const AICTE_RE = /^[A-Za-z0-9]{15,20}$/;
const UGC_RE = /^[A-Za-z0-9]+$/;
const AFFILIATION_RE = /^[A-Za-z0-9]{10,15}$/;
const PAN_RE = /^[A-Za-z]{5}[0-9]{4}[A-Za-z]{1}$/;
const TAN_RE = /^[A-Za-z]{4}[0-9]{5}[A-Za-z]{1}$/;

const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  1: ['name', 'email', 'password'],
  2: ['collegeName'],
  3: ['affiliationType', 'aicteCode', 'ugcCode', 'affiliationCode', 'pan', 'tan'],
};

const AFFILIATION_OPTIONS = [
  { label: 'Autonomous', value: 'AUTONOMOUS' },
  { label: 'Affiliated to University', value: 'UNIVERSITY' },
];

const mimeFromName = (name = '', fallback = '') => {
  if (fallback.startsWith('image/')) return fallback;
  const ext = name.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  return 'image/jpeg';
};

export default function RegisterScreen({ navigation }: Props) {
  const { register: registerUser } = useAuth();
  const { colors } = useTheme();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [logoBase64, setLogoBase64] = useState('');
  const [logoName, setLogoName] = useState('');

  const { control, handleSubmit, trigger, watch, setValue, getValues, formState: { errors } } = useForm<FormValues>({
    mode: 'onTouched',
    defaultValues: {
      name: '', email: '', password: '', collegeName: '',
      affiliationType: 'AUTONOMOUS', aicteCode: '', ugcCode: '', affiliationCode: '', pan: '', tan: '',
    },
  });

  const affiliationType = watch('affiliationType');

  const pickLogo = async () => {
    try {
      const results = await pick({ type: [types.images], allowMultiSelection: false, copyTo: 'cachesDirectory' });
      const file: any = results?.[0];
      if (!file?.uri) return;

      let localUri: string = file.fileCopyUri || file.uri;
      if (localUri.startsWith('content://')) {
        const copied = await keepLocalCopy({
          files: [{ uri: file.uri, fileName: file.name || `logo_${Date.now()}.png` }],
          destination: 'cachesDirectory',
        });
        const r: any = copied?.[0];
        if (!r || r.status !== 'success' || !r.localUri) throw new Error('Could not read the selected image.');
        localUri = r.localUri;
      }
      const path = localUri.startsWith('file://') ? localUri.replace(/^file:\/\//, '') : localUri;
      const decoded = decodeURIComponent(path);

      const stat = await RNFS.stat(decoded);
      if (Number(stat.size) > MAX_LOGO_BYTES) {
        Alert.alert('Logo too large', 'Please choose an image smaller than 2 MB.');
        return;
      }

      const base64 = await RNFS.readFile(decoded, 'base64');
      setLogoBase64(`data:${mimeFromName(file.name, file.type)};base64,${base64}`);
      setLogoName(file.name || 'logo');
    } catch (err: any) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      Alert.alert('Logo error', err?.message || 'Could not choose the image.');
    }
  };

  const goNext = async () => {
    setError('');
    const ok = await trigger(STEP_FIELDS[step]);
    if (ok) setStep((s) => Math.min(s + 1, MAX_STEPS));
  };

  const goBack = () => {
    setError('');
    if (step === 1) navigation.goBack();
    else setStep((s) => s - 1);
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    setError('');
    try {
      await registerUser(data.email.toLowerCase().trim(), data.password, {
        role: 'admin',
        name: data.name.trim(),
        collegeName: data.collegeName.trim(),
        affiliationType: data.affiliationType,
        aicteCode: data.aicteCode.trim(),
        ugcCode: data.affiliationType === 'UNIVERSITY' ? data.ugcCode.trim() : '',
        affiliationCode: data.affiliationCode.trim(),
        pan: data.pan.trim().toUpperCase(),
        tan: data.tan.trim().toUpperCase(),
        logoBase64,
      });
      // On success AuthContext stores the session and RootNavigator switches to the
      // "Pending Approval" screen automatically (college status = pending).
    } catch (err: any) {
      const msg = String(err?.message || '');
      if (msg.toLowerCase().includes('already')) {
        setError('This email is already registered. Please sign in or use another email.');
      } else {
        setError(msg || 'Failed to create account. Please check your network and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const submitCurrent = () => {
    if (step < MAX_STEPS) void goNext();
    else void handleSubmit(onSubmit)();
  };

  return (
    <AuthShell
      title="Register College"
      subtitle="Create a new college account to get started."
      onBack={goBack}>
      {/* step indicator */}
      <View style={styles.stepHead}>
        <Text style={[styles.stepLabel, { color: colors.primary }]}>STEP {step} OF {MAX_STEPS}</Text>
        <Text style={[styles.stepTitle, { color: colors.textMuted }]}>{STEP_TITLES[step - 1]}</Text>
      </View>
      <View style={styles.bars}>
        {Array.from({ length: MAX_STEPS }).map((_, i) => (
          <View key={i} style={[styles.bar, { backgroundColor: i + 1 <= step ? colors.primary : colors.border }]} />
        ))}
      </View>

      {error ? <Banner type="error" message={error} /> : null}

      {step === 1 ? (
        <>
          <Controller
            control={control}
            name="name"
            rules={{ required: 'Name is required' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Admin Full Name" required icon={User} value={value} onChangeText={onChange} onBlur={onBlur}
                placeholder="John Doe" autoCapitalize="words" error={errors.name?.message} />
            )}
          />
          <Controller
            control={control}
            name="email"
            rules={{
              required: 'Email is required',
              pattern: { value: EMAIL_RE, message: 'Please enter a valid email address with a valid domain (e.g. .com, .edu, .in)' },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Email Address" required icon={Mail} value={value} onChangeText={onChange} onBlur={onBlur}
                placeholder="address@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
                autoComplete="email" error={errors.email?.message} />
            )}
          />
          <Controller
            control={control}
            name="password"
            rules={{ required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Password" required icon={Lock} isPassword value={value} onChangeText={onChange} onBlur={onBlur}
                placeholder="••••••••" autoCapitalize="none" autoComplete="new-password" error={errors.password?.message}
                onSubmitEditing={submitCurrent} />
            )}
          />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Controller
            control={control}
            name="collegeName"
            rules={{ required: 'College Name is required for admins', minLength: { value: 2, message: 'College name must be at least 2 characters' } }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="College Name" required icon={Building2} value={value} onChangeText={onChange} onBlur={onBlur}
                placeholder="ABC Institute of Technology" autoCapitalize="words" error={errors.collegeName?.message}
                onSubmitEditing={submitCurrent} />
            )}
          />

          <Text style={[styles.fieldLabel, { color: colors.text }]}>College Logo (optional)</Text>
          <Pressable
            onPress={pickLogo}
            style={[styles.logoBtn, { borderColor: colors.border, backgroundColor: colors.cardAlt }]}>
            <Upload size={18} color={colors.primary} />
            <Text style={[styles.logoBtnText, { color: colors.text }]} numberOfLines={1}>
              {logoName || 'Choose an image (max 2 MB)'}
            </Text>
          </Pressable>
          {logoBase64 ? (
            <View style={styles.logoPreviewRow}>
              <Image source={{ uri: logoBase64 }} style={[styles.logoPreview, { borderColor: colors.border }]} resizeMode="contain" />
              <Pressable onPress={() => { setLogoBase64(''); setLogoName(''); }} hitSlop={8}>
                <Text style={{ color: colors.danger, fontSize: fontSize.sm, fontWeight: fontWeight.semibold }}>Remove</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}

      {step === 3 ? (
        <>
          <Controller
            control={control}
            name="affiliationType"
            rules={{ required: 'Affiliation type is required' }}
            render={({ field: { value } }) => (
              <Select
                label="Affiliation Type"
                required
                value={value}
                options={AFFILIATION_OPTIONS}
                onChange={(v) => {
                  setValue('affiliationType', v as FormValues['affiliationType'], { shouldValidate: true });
                  if (v === 'AUTONOMOUS') setValue('ugcCode', '');
                }}
                error={errors.affiliationType?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="aicteCode"
            rules={{ required: 'AICTE Code is required', pattern: { value: AICTE_RE, message: 'Must be 15-20 alphanumeric characters' } }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="AICTE Code" required icon={FileText} value={value} onChangeText={onChange} onBlur={onBlur}
                placeholder="AICTE Code (15-20 chars)" autoCapitalize="none" autoCorrect={false} error={errors.aicteCode?.message} />
            )}
          />
          {affiliationType === 'UNIVERSITY' ? (
            <Controller
              control={control}
              name="ugcCode"
              rules={{
                validate: (v) => {
                  if (getValues('affiliationType') !== 'UNIVERSITY') return true;
                  if (!v?.trim()) return 'UGC Code is required for affiliated universities';
                  return UGC_RE.test(v.trim()) || 'Must be alphanumeric';
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label="UGC Code" required icon={BadgeCheck} value={value} onChangeText={onChange} onBlur={onBlur}
                  placeholder="UGC Code" autoCapitalize="none" autoCorrect={false} error={errors.ugcCode?.message} />
              )}
            />
          ) : null}
          <Controller
            control={control}
            name="affiliationCode"
            rules={{ required: 'Affiliation Code is required', pattern: { value: AFFILIATION_RE, message: 'Must be 10-15 alphanumeric characters' } }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Affiliation Code" required icon={Building2} value={value} onChangeText={onChange} onBlur={onBlur}
                placeholder="Affiliation Code (10-15 chars)" autoCapitalize="none" autoCorrect={false} error={errors.affiliationCode?.message} />
            )}
          />
          <Controller
            control={control}
            name="pan"
            rules={{ required: 'PAN is required', pattern: { value: PAN_RE, message: 'Invalid PAN format (e.g. ABCDE1234F)' } }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="PAN" required icon={FileText} value={value} onChangeText={(t) => onChange(t.toUpperCase())} onBlur={onBlur}
                placeholder="ABCDE1234F" autoCapitalize="characters" autoCorrect={false} maxLength={10} error={errors.pan?.message} />
            )}
          />
          <Controller
            control={control}
            name="tan"
            rules={{ required: 'TAN is required', pattern: { value: TAN_RE, message: 'Invalid TAN format (e.g. ABCD12345E)' } }}
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="TAN" required icon={FileText} value={value} onChangeText={(t) => onChange(t.toUpperCase())} onBlur={onBlur}
                placeholder="ABCD12345E" autoCapitalize="characters" autoCorrect={false} maxLength={10} error={errors.tan?.message}
                onSubmitEditing={submitCurrent} />
            )}
          />
        </>
      ) : null}

      <View style={styles.actions}>
        {step > 1 ? (
          <Button title="Back" variant="outline" onPress={goBack} style={styles.backBtn} disabled={loading} />
        ) : null}
        <Button
          title={step < MAX_STEPS ? 'Continue' : 'Register College'}
          icon={ChevronRight}
          onPress={submitCurrent}
          loading={loading}
          disabled={loading}
          style={styles.nextBtn}
        />
      </View>

      <Pressable onPress={() => navigation.navigate('Login')} hitSlop={8} style={styles.signin}>
        <Text style={[styles.signinText, { color: colors.textMuted }]}>
          Already have an account? <Text style={{ color: colors.primary, fontWeight: fontWeight.bold }}>Sign in here</Text>
        </Text>
      </Pressable>
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  stepHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stepLabel: { fontSize: 11, fontWeight: fontWeight.bold, letterSpacing: 0.8 },
  stepTitle: { fontSize: fontSize.xs + 1, fontWeight: fontWeight.semibold },
  bars: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  bar: { flex: 1, height: 5, borderRadius: 3 },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.bold, marginBottom: 8 },
  logoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, minHeight: 50,
  },
  logoBtnText: { flex: 1, fontSize: fontSize.sm },
  logoPreviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  logoPreview: { width: 72, height: 72, borderRadius: 10, borderWidth: 1 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  backBtn: { flex: 1 },
  nextBtn: { flex: 2 },
  signin: { alignItems: 'center', marginTop: 18 },
  signinText: { fontSize: fontSize.sm },
});