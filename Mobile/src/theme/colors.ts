export const palette = {
  primary50: '#ecfdf5',
  primary100: '#d1fae5',
  primary200: '#a7f3d0',
  primary300: '#6ee7b7',
  primary400: '#34d399',
  primary500: '#10b981',
  primary600: '#059669',
  primary700: '#047857',
  primary800: '#065f46',
  primary900: '#064e3b',
  brand: '#006c49',
};

export interface AppColors {
  bg: string;
  card: string;
  cardAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  inputBg: string;
  placeholder: string;
  primary: string;
  primaryDark: string;
  primarySoft: string;
  onPrimary: string;
  danger: string;
  dangerSoft: string;
  dangerBorder: string;
  warning: string;
  warningSoft: string;
  success: string;
  successSoft: string;
  successBorder: string;
  info: string;
  infoSoft: string;
  overlay: string;
  skeleton: string;
}

export const lightColors: AppColors = {
  bg: '#f8fafc',
  card: '#ffffff',
  cardAlt: '#f1f5f9',
  border: '#e2e8f0',
  text: '#0f172a',
  textMuted: '#64748b',
  textSubtle: '#94a3b8',
  inputBg: '#f8fafc',
  placeholder: '#94a3b8',
  primary: palette.primary600,
  primaryDark: palette.primary700,
  primarySoft: palette.primary50,
  onPrimary: '#ffffff',
  danger: '#ef4444',
  dangerSoft: '#fef2f2',
  dangerBorder: '#fecaca',
  warning: '#f59e0b',
  warningSoft: '#fffbeb',
  success: '#10b981',
  successSoft: '#ecfdf5',
  successBorder: '#a7f3d0',
  info: '#3b82f6',
  infoSoft: '#eff6ff',
  overlay: 'rgba(15,23,42,0.5)',
  skeleton: '#e2e8f0',
};

export const darkColors: AppColors = {
  bg: '#020813',
  card: '#0A0F1C',
  cardAlt: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.10)',
  text: '#f1f5f9',
  textMuted: '#94a3b8',
  textSubtle: '#64748b',
  inputBg: 'rgba(255,255,255,0.05)',
  placeholder: '#64748b',
  primary: palette.primary500,
  primaryDark: palette.primary600,
  primarySoft: 'rgba(16,185,129,0.12)',
  onPrimary: '#ffffff',
  danger: '#f87171',
  dangerSoft: 'rgba(239,68,68,0.10)',
  dangerBorder: 'rgba(239,68,68,0.25)',
  warning: '#fbbf24',
  warningSoft: 'rgba(245,158,11,0.12)',
  success: '#34d399',
  successSoft: 'rgba(16,185,129,0.10)',
  successBorder: 'rgba(16,185,129,0.25)',
  info: '#60a5fa',
  infoSoft: 'rgba(59,130,246,0.12)',
  overlay: 'rgba(0,0,0,0.65)',
  skeleton: 'rgba(255,255,255,0.08)',
};
