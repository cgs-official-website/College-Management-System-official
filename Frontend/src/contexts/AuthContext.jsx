import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { FullPageSkeleton } from '../components/ui/FullPageSkeleton';

const AuthContext = createContext();

const normalizeRole = (role) => (typeof role === 'string' ? role.trim().toLowerCase() : '');

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [userData, setUserData] = useState(null);
  const [permissions, setPermissions] = useState({});
  const [loading, setLoading] = useState(true);

  // =========================
  // LOGIN
  // =========================
  async function login(email, password) {
    const response = await api.post('/auth/login', {
      email,
      password
    });

    const { accessToken, refreshToken, user } =
      response.data?.data || response.data || {};

    if (accessToken) {
      localStorage.setItem('zuna_token', accessToken);
    }

    if (refreshToken) {
      localStorage.setItem('zuna_refresh', refreshToken);
    }

    await restoreSession();

    return user;
  }

  // =========================
  // REGISTER
  // =========================
  async function register(email, password, additionalData = {}) {
    const role = normalizeRole(additionalData.role);
    if (!role) {
      throw new Error('Registration role is required.');
    }

    // ── Helper: omit a field if its value is empty/null/undefined ──
    // This prevents sending null for fields that expect a string,
    // which would cause Zod to throw "expected string, received null".
    const omitEmpty = (obj) =>
      Object.fromEntries(
        Object.entries(obj).filter(
          ([, v]) => v !== null && v !== undefined && v !== ''
        )
      );

    try {
      // ──────────────────────────────────────────────────────────────
      // ADMIN REGISTRATION → POST /auth/register
      // Schema: registerAdminSchema (collegeName required, adminEmail
      // required, optional: name, slug, aicteNumber, aicteCode,
      // ugcRecognition, ugcCode, affiliationCode, affiliationType,
      // pan, tan, logoBase64)
      // ──────────────────────────────────────────────────────────────
      if (role === 'admin') {
        const rawSlug = (
          additionalData.slug ||
          additionalData.collegeName ||
          ''
        )
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '');

        const payload = omitEmpty({
          // Required by registerAdminSchema
          adminEmail: email.toLowerCase().trim(),
          password,
          collegeName: (additionalData.collegeName || '').trim(),

          // Optional string fields — only sent when non-empty
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

          // affiliationType always has a valid enum default
          affiliationType: (
            additionalData.affiliationType || 'AUTONOMOUS'
          ).toUpperCase()
        });

        console.log('[AuthContext] Admin registration request →', {
          ...payload,
          password: '********'
        });

        const response = await api.post('/auth/register', payload);

        const { accessToken, refreshToken, user } =
          response.data?.data || response.data || {};

        console.log('[AuthContext] Admin registration response →', {
          success: true,
          userId: user?.id,
          role: user?.role
        });

        if (accessToken) localStorage.setItem('zuna_token', accessToken);
        if (refreshToken) localStorage.setItem('zuna_refresh', refreshToken);
        if (accessToken) await restoreSession();

        return user || response.data?.data || response.data;
      }

      // ──────────────────────────────────────────────────────────────
      // STUDENT REGISTRATION → POST /auth/student/register
      // Schema: studentRegisterSchema (token, admissionNumber, email,
      // firstName, lastName?, phone?, password, confirmPassword)
      //
      // Students must use a college-issued registration token.
      // The dedicated StudentRegister.jsx page handles this flow.
      // This branch allows the general Register.jsx to also call it
      // if additionalData contains the required student fields.
      // ──────────────────────────────────────────────────────────────
      if (role === 'student') {
        if (!additionalData.token) {
          throw new Error(
            'Student registration requires a college-issued registration token. ' +
            'Please use the Student Registration link provided by your college administrator.'
          );
        }

        const payload = omitEmpty({
          token: (additionalData.token || '').trim(),
          admissionNumber: (additionalData.admissionNumber || '').trim(),
          email: email.toLowerCase().trim(),
          firstName: (additionalData.firstName || additionalData.name || '').trim(),
          lastName: additionalData.lastName,
          phone: additionalData.phone,
          password,
          confirmPassword: additionalData.confirmPassword || password
        });

        console.log('[AuthContext] Student registration request →', {
          ...payload,
          password: '********',
          confirmPassword: '********'
        });

        const response = await api.post('/auth/student/register', payload);

        console.log('[AuthContext] Student registration response →', {
          success: true,
          admissionNumber: response.data?.data?.admissionNumber,
          email: response.data?.data?.email
        });

        // Student registration does NOT return tokens — user must log in separately
        return response.data?.data || response.data;
      }

      // ──────────────────────────────────────────────────────────────
      // TEACHER / OTHER ROLES
      // Teachers are added by the Admin and receive a staff-setup
      // invitation email. They complete setup via /staff-setup?token=…
      // There is no self-service teacher registration endpoint.
      // ──────────────────────────────────────────────────────────────
      throw new Error(
        `Self-service registration for role "${role}" is not supported. ` +
        (role === 'teacher' || role === 'hod'
          ? 'Teachers are invited by the college admin and set up their account via the email invitation link.'
          : 'Please contact your college administrator.')
      );

    } catch (error) {
      // Log the full backend error for debugging (never log password)
      if (error.response) {
        console.error('[AuthContext] Registration backend error →', {
          status: error.response.status,
          data: error.response.data
        });
      } else {
        console.error('[AuthContext] Registration error →', error.message);
      }

      // Surface a clean, readable error message to the UI
      const backendMessage =
        error.response?.data?.error?.message ||
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data?.details;

      throw new Error(backendMessage || error.message || 'Registration failed', { cause: error });
    }
  }

  // =========================
  // LOGOUT
  // =========================
  function logout() {
    const refreshToken =
      localStorage.getItem('zuna_refresh');

    if (refreshToken) {
      api
        .post('/auth/logout', {
          refreshToken
        })
        .catch(() => {});
    }

    localStorage.removeItem('zuna_token');
    localStorage.removeItem('zuna_refresh');

    setCurrentUser(null);
    setUserRole(null);
    setUserData(null);
    setPermissions({});
  }

  // =========================
  // RESET PASSWORD
  // =========================
  function resetPassword(email) {
    throw new Error(
      'Password reset not yet implemented in REST API'
    );
  }

  // =========================
  // UPDATE USER DATA
  // =========================
  const updateUserData = (newData) => {
    setUserData((prev) => ({
      ...prev,
      ...newData
    }));
  };

  // =========================
  // RESTORE SESSION
  // =========================
  const restoreSession = async () => {
    const token =
      localStorage.getItem('zuna_token');

    const refreshToken =
      localStorage.getItem('zuna_refresh');

    if (!token && !refreshToken) {
      setLoading(false);
      return;
    }

    try {
      const response =
        await api.get('/auth/me');

      const data = response.data;

      // Current user
      setCurrentUser({
        uid: data.id,
        email: data.email
      });

      // Role
      const normalizedRole = normalizeRole(data.role);
      setUserRole(normalizedRole);

      // =========================
      // PROCESS PERMISSIONS
      // =========================
      const permsMap = {};

      if (
        data.customRole?.permissions
      ) {
        data.customRole.permissions.forEach(
          (p) => {
            if (p.module?.key) {
              permsMap[p.module.key] = {
                canCreate: p.canCreate,
                canRead: p.canRead,
                canUpdate: p.canUpdate,
                canDelete: p.canDelete
              };
            }
          }
        );
      }

      setPermissions(permsMap);

      // =========================
      // COLLEGE DATA
      // =========================
      const collegeStatus =
        data.collegeStatus ||
        data.college?.status ||
        'active';

      setUserData({
        uid: data.id,
        email: data.email,
        collegeId: data.collegeId,

        collegeName:
          data.college?.name,

        collegeLogo:
          data.college?.logoUrl,

        collegeStatus,

        ...data,
        role: normalizedRole
      });

    } catch (error) {
      console.error(
        'Session restore failed:',
        error
      );

      logout();

    } finally {
      setLoading(false);
    }
  };

  // =========================
  // INITIAL SESSION CHECK
  // =========================
  useEffect(() => {
    restoreSession();

    const handleAuthExpired = () => {
      logout();
    };

    window.addEventListener(
      'auth-expired',
      handleAuthExpired
    );

    return () => {
      window.removeEventListener(
        'auth-expired',
        handleAuthExpired
      );
    };
  }, []);

  // =========================
  // PAGE TITLE
  // =========================
  useEffect(() => {
    if (userRole === 'superadmin') {
      document.title =
        'Zuna | College Management System';
    } else if (userData?.collegeName) {
      document.title =
        userData.collegeName;
    } else {
      document.title =
        'Zuna | College Management System';
    }
  }, [userData, userRole]);

  // =========================
  // CONTEXT VALUE
  // =========================
  const value = {
    currentUser,
    userData,
    userRole,
    permissions,
    loading,

    login,
    register,
    logout,
    resetPassword,

    updateUserData,
    restoreSession
  };

  // =========================
  // PROVIDER
  // =========================
  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <FullPageSkeleton />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}