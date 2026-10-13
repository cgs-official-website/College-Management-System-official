import React from 'react';
import { BaseToast, ToastConfig } from 'react-native-toast-message';

const base = (color: string) => (props: any) => (
  <BaseToast
    {...props}
    style={{ borderLeftColor: color, borderLeftWidth: 5, borderRadius: 12, height: undefined, minHeight: 60, paddingVertical: 8 }}
    contentContainerStyle={{ paddingHorizontal: 14 }}
    text1Style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}
    text2Style={{ fontSize: 12, color: '#475569' }}
    text1NumberOfLines={3}
    text2NumberOfLines={3}
  />
);

export const toastConfig: ToastConfig = {
  success: base('#10b981'),
  error: base('#ef4444'),
  info: base('#3b82f6'),
};
