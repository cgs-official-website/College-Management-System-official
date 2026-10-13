import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import { clearSession, getSession, loadSession, onAuthExpired, storeSession } from '../api/session';
import { View } from 'react-native';
import { useTheme } from './ThemeContext';
import type { CurrentUser, PermissionsMap, UserData } from '../types/auth';
import { normalizeRole } from '../utils/permissions';

interface AuthContextValue {
  currentUser: CurrentUser | null;
  userData: UserData | null;
  userRole: string | null;
  permissions: PermissionsMap;
  loading: boolean;
  login: (email: string, password: string, collegeSlug?: string | null) => Promise<any>;
  register: (email: string, password: string, additionalData?: Record<string, any>) => Promise<any>;
  logout: () => Promise<void>;
  updateUserData: (newData: Partial<UserData>) => void;
  restoreSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const LOGOUT_NO_SPLASH_KEY = '@zuna_logout_no_splash';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

const omitEmpty = (obj: Record<string, any>) =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== null && value !== undefined && value !== ''));

/** Plain themed background while the stored session is read (no skeleton / logo flash before the Splash). */
function StartupBlank() {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [permissions, setPermissions] = useState<PermissionsMap>({});
  const [loading, setLoading] = useState(true);
  const restoreSequence = useRef(0);

  const clearAuthState = useCallback(() => {
    setCurrentUser(null);
    setUserRole(null);
    setUserData(null);
    setPermissions({});
  }, []);

  const restoreSession = useCallback(async () => {
    const sequence = ++restoreSequence.current;
    await loadSession();
    const session = getSession();

    if (!session || (!session.accessToken && !session.refreshToken)) {
      clearAuthState();
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      if (sequence !== restoreSequence.current) return;

      const data = response.data;
      setCurrentUser({ uid: data.id, email: data.email });

      const normalizedRole = normalizeRole(data.role);
      setUserRole(normalizedRole);

      const permsMap: PermissionsMap = {};
      if (Array.isArray(data.customRole?.permissions)) {
        data.customRole.permissions.forEach((permission: any) => {
          if (permission.module?.key) {
            permsMap[permission.module.key] = {
              canCreate: permission.canCreate,
              canRead: permission.canRead,
              canUpdate: permission.canUpdate,
              canDelete: permission.canDelete,
            };
          }
        });
      }
      setPermissions(permsMap);

      const collegeStatus = data.collegeStatus || data.college?.status || 'active';
      setUserData({
        uid: data.id,
        email: data.email,
        collegeId: data.collegeId,
        collegeName: data.college?.name,
        collegeLogo: data.college?.logoUrl,
        collegeStatus,
        ...data,
        role: normalizedRole,
      });
    } catch (error) {
      console.warn('Session restore failed:', error);
      if (sequence === restoreSequence.current) {
        await clearSession();
        clearAuthState();
      }
    } finally {
      if (sequence === restoreSequence.current) setLoading(false);
    }
  }, [clearAuthState]);

  const login = useCallback(
    async (email: string, password: string, collegeSlug?: string | null) => {
      const response = await api.post('/auth/login', {
        email,
        password,
        ...(collegeSlug ? { collegeSlug } : {}),
      });

      const { accessToken, refreshToken, user } = response.data?.data || response.data || {};

      await storeSession(user?.role, accessToken, refreshToken);
      await restoreSession();
      return user;
    },
    [restoreSession],
  );

  const register = useCallback(
    async (email: string, password: string, additionalData: Record<string, any> = {}) => {
      const role = normalizeRole(additionalData.role);
      if (!role) throw new Error('Registration role is required.');

      try {
        if (role === 'admin') {
          const rawSlug = (additionalData.slug || additionalData.collegeName || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');

          const payload = omitEmpty({
            adminEmail: email.toLowerCase().trim(),
            password,
            collegeName: (additionalData.collegeName || '').trim(),
            name: additionalData.name,
            slug: rawSlug || undefined,
            aicteNumber: additionalData.aicteNumber,
            aicteCode: additionalData.aicteCode,
            ugcRecognition: additionalData.ugcRecognition,
            ugcCode: additionalData.ugcCode,
            affiliationCode: additionalData.affiliationCode,
            pan: additionalData.pan,
            tan: additionalData.tan,
            logoBase64: additionalData.logoBase64,
            affiliationType: (additionalData.affiliationType || 'AUTONOMOUS').toUpperCase(),
          });

          const response = await api.post('/auth/register', payload);
          const { accessToken, refreshToken, user } = response.data?.data || response.data || {};

          await storeSession(user?.role || 'admin', accessToken, refreshToken);
          if (accessToken) await restoreSession();

          return user || response.data?.data || response.data;
        }

        if (role === 'student') {
          if (!additionalData.token) {
            throw new Error(
              'Student registration requires a college-issued registration token. ' +
                'Please use the Student Registration link provided by your college administrator.',
            );
          }

          const payload = omitEmpty({
            token: String(additionalData.token).trim(),
            admissionNumber: String(additionalData.admissionNumber || '').trim(),
            email: email.toLowerCase().trim(),
            firstName: String(additionalData.firstName || additionalData.name || '').trim(),
            lastName: additionalData.lastName,
            phone: additionalData.phone,
            password,
            confirmPassword: additionalData.confirmPassword || password,
          });

          const response = await api.post('/auth/student/register', payload);
          return response.data?.data || response.data;
        }

        throw new Error(
          `Self-service registration for role "${role}" is not supported. ` +
            (role === 'teacher' || role === 'hod'
              ? 'Teachers are invited by the college admin and set up their account via the email invitation link.'
              : 'Please contact your college administrator.'),
        );
      } catch (error: any) {
        const backendMessage =
          error?.data?.error?.message || error?.data?.message || error?.data?.error || error?.data?.details;
        throw new Error(
          typeof backendMessage === 'string' && backendMessage
            ? backendMessage
            : error?.message || 'Registration failed',
        );
      }
    },
    [restoreSession],
  );

  const logout = useCallback(async () => {
    try {
      await AsyncStorage.setItem(LOGOUT_NO_SPLASH_KEY, 'true');
    } catch {
      // Logout should continue even if the flag cannot be persisted.
    }

    const refreshToken = getSession()?.refreshToken;
    if (refreshToken) {
      api.post('/auth/logout', { refreshToken }).catch(() => {});
    }

    await clearSession();
    clearAuthState();
  }, [clearAuthState]);

  const updateUserData = useCallback((newData: Partial<UserData>) => {
    setUserData((prev) => ({ ...(prev || {}), ...newData }));
  }, []);

  useEffect(() => {
    // CMS launch flow is intentionally unauthenticated on every cold start:
    // Splash -> Onboarding (first install) / Login (later launches).
    // The explicit login() path still restores the authenticated user after login.
    (async () => {
      await loadSession();
      clearAuthState();
      setLoading(false);
    })();

    const unsubscribe = onAuthExpired(() => clearAuthState());
    return unsubscribe;
  }, [clearAuthState]);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      userData,
      userRole,
      permissions,
      loading,
      login,
      register,
      logout,
      updateUserData,
      restoreSession,
    }),
    [currentUser, userData, userRole, permissions, loading, login, register, logout, updateUserData, restoreSession],
  );

  return <AuthContext.Provider value={value}>{loading ? <StartupBlank /> : children}</AuthContext.Provider>;
}