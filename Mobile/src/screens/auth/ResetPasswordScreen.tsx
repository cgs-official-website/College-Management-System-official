import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { KeyRound, Lock } from 'lucide-react-native';

import { AuthShell } from '../../components/layout/AuthShell';
import { Banner } from '../../components/layout/Banner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { api } from '../../api/client';
import { toast } from '../../utils/toast';
import { getUserIdFromToken } from '../../utils/jwt';
import type { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

/** Accepts either the raw token or the whole reset link from the email. */
const parseResetInput = (text: string): { token: string; id: string } => {
  const t = text.trim();
  const tokenMatch = t.match(/[?&]token=([^&#\s]+)/);
  const idMatch = t.match(/[?&](?:id|userId)=([^&#\s]+)/);
  if (tokenMatch) {
    return {
      token: decodeURIComponent(tokenMatch[1]),
      id: idMatch ? decodeURIComponent(idMatch[1]) : '',
    };
  }
  return { token: t, id: '' };
};

export default function ResetPasswordScreen({ navigation, route }: Props) {
  const paramToken = route.params?.token || '';
  const paramId = route.params?.id || route.params?.userId || '';

  const [linkInput, setLinkInput] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const parsed = paramToken ? { token: paramToken, id: paramId } : parseResetInput(linkInput);
  const token = parsed.token;
  const userId = parsed.id || getUserIdFromToken(token) || '';

  const handleSubmit = async () => {
    if (!token || !userId) {
      setError('Invalid or missing password reset token. Paste the full reset link from your email.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, userId, password });
      toast.success('Password successfully reset!');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login', params: { successMessage: 'Password reset successfully. Please sign in.' } }],
      });
    } catch (err: any) {
      const backendMsg = err?.data?.error?.message || err?.message;
      setError(backendMsg || 'Failed to reset password. The link might be expired.');
      setLoading(false);
    }
  };

  return (
    <AuthShell title="Reset Password" subtitle="Choose a new password for your account." onBack={() => navigation.goBack()}>
      {error ? <Banner type="error" message={error} /> : null}

      {!paramToken ? (
        <Input
          label="Reset link or token"
          icon={KeyRound}
          value={linkInput}
          onChangeText={setLinkInput}
          placeholder="Paste the link from your email"
          autoCapitalize="none"
          autoCorrect={false}
          multiline
        />
      ) : null}

      <Input
        label="New Password"
        icon={Lock}
        isPassword
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        autoCapitalize="none"
      />
      <Input
        label="Confirm Password"
        icon={Lock}
        isPassword
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        placeholder="••••••••"
        autoCapitalize="none"
        onSubmitEditing={handleSubmit}
      />

      <Button title="Reset Password" size="lg" loading={loading} onPress={handleSubmit} />
      <View style={styles.gap} />
      <Button title="Back to Login" variant="ghost" onPress={() => navigation.navigate('Login')} />
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  gap: { height: 8 },
});
