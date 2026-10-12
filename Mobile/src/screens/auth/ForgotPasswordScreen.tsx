import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Mail } from 'lucide-react-native';

import { AuthShell } from '../../components/layout/AuthShell';
import { Banner } from '../../components/layout/Banner';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { api } from '../../api/client';
import type { AuthStackParamList } from '../../types/navigation';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    const value = email.trim().toLowerCase();
    if (!value) {
      setStatus('error');
      setMessage('Please enter your email address.');
      return;
    }
    setStatus('loading');
    try {
      const response = await api.post('/auth/forgot-password', { email: value });
      setStatus('success');
      setMessage(response?.message || 'If an account exists, a password reset link has been sent.');
    } catch (error: any) {
      setStatus('error');
      setMessage(error?.message || 'Failed to request password reset. Please try again.');
    }
  };

  return (
    <AuthShell
      title="Forgot Password?"
      subtitle="Enter your email and we will send you a link to reset your password."
      onBack={() => navigation.goBack()}>
      {status === 'success' ? (
        <>
          <Banner type="success" message={message} />
          <View style={styles.gap} />
          <Button title="I have a reset link" onPress={() => navigation.navigate('ResetPassword')} />
          <View style={styles.gap} />
          <Button title="Back to Login" variant="outline" onPress={() => navigation.navigate('Login')} />
        </>
      ) : (
        <>
          {status === 'error' && message ? <Banner type="error" message={message} /> : null}
          <Input
            label="Email"
            icon={Mail}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            onSubmitEditing={handleSubmit}
          />
          <Button title="Send Reset Link" size="lg" loading={status === 'loading'} onPress={handleSubmit} />
        </>
      )}
    </AuthShell>
  );
}

const styles = StyleSheet.create({
  gap: { height: 12 },
});
