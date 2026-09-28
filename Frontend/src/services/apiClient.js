import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
const API_BASE_URL = (() => {
  if (!import.meta.env.DEV) return configuredApiUrl;

  const apiUrl = new URL(configuredApiUrl, window.location.origin);
  const localHosts = ['localhost', '127.0.0.1'];
  if (localHosts.includes(apiUrl.hostname) && !localHosts.includes(window.location.hostname)) {
    apiUrl.hostname = window.location.hostname;
  }
  return apiUrl.toString().replace(/\/$/, '');
})();

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

const routeRoles = () => {
  const { pathname, search } = window.location;
  if (pathname.startsWith('/student/register')) return [];
  if (pathname === '/admin/login') return ['admin'];
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return ['admin', 'teacher', 'hod', 'faculty', 'superadmin'];
  if (pathname === '/student' || pathname.startsWith('/student/')) return ['student', 'superadmin'];
  if (pathname === '/teacher' || pathname.startsWith('/teacher/')) return ['teacher', 'hod', 'faculty', 'superadmin'];
  if (pathname === '/parent' || pathname.startsWith('/parent/')) return ['parent', 'superadmin'];
  if (pathname === '/super' || pathname.startsWith('/super/')) return ['superadmin'];
  if (pathname === '/dashboard') return ['admin', 'student', 'teacher', 'hod', 'faculty', 'parent', 'superadmin'];
  if (pathname === '/login' && new URLSearchParams(search).has('college')) return ['student'];
  return [];
};

const tokenKey = (role) => `zuna_${role}_token`;
const refreshKey = (role) => `zuna_${role}_refresh`;

const roleFromToken = (token) => {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload)).role;
  } catch {
    return null;
  }
};

export const storeAuthSession = (role, accessToken, refreshToken) => {
  if (!role) return;
  if (accessToken) localStorage.setItem(tokenKey(role), accessToken);
  if (refreshToken) localStorage.setItem(refreshKey(role), refreshToken);
};

export const clearAuthSession = (role) => {
  if (!role) return;
  localStorage.removeItem(tokenKey(role));
  localStorage.removeItem(refreshKey(role));

  const legacyRole = localStorage.getItem('zuna_session_role') || roleFromToken(localStorage.getItem('zuna_token') || '');
  if (legacyRole === role) {
    localStorage.removeItem('zuna_token');
    localStorage.removeItem('zuna_refresh');
    localStorage.removeItem('zuna_session_role');
  }
};

export const getAuthSessionForCurrentRoute = (preferredRole) => {
  const allowedRoles = preferredRole ? [preferredRole] : routeRoles();
  for (const role of allowedRoles) {
    const token = localStorage.getItem(tokenKey(role));
    const refreshToken = localStorage.getItem(refreshKey(role));
    if (token || refreshToken) return { role, token, refreshToken };
  }

  const legacyToken = localStorage.getItem('zuna_token');
  const legacyRefreshToken = localStorage.getItem('zuna_refresh');
  const legacyRole = localStorage.getItem('zuna_session_role') || roleFromToken(legacyToken || '');
  if (legacyRole && allowedRoles.includes(legacyRole) && (legacyToken || legacyRefreshToken)) {
    storeAuthSession(legacyRole, legacyToken, legacyRefreshToken);
    localStorage.removeItem('zuna_token');
    localStorage.removeItem('zuna_refresh');
    localStorage.removeItem('zuna_session_role');
    return { role: legacyRole, token: legacyToken, refreshToken: legacyRefreshToken };
  }

  return null;
};

// Single-flight refresh token state & queue
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor: Attach JWT Bearer Token
apiClient.interceptors.request.use(
  (config) => {
    const session = getAuthSessionForCurrentRoute(config.authRole);
    if (session?.token && !config.headers.Authorization) {
      const token = session.token;
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Centralized error handling & transparent single-flight session refresh
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;
    const errorData = error.response?.data?.error;
    const message = errorData?.message || error.message || 'An unexpected error occurred';

    // Check if error is 401 Unauthorized and not already retried
    if (status === 401 && originalRequest && !originalRequest._retry) {
      const isAuthEndpoint = originalRequest.url?.includes('/auth/login') ||
                             originalRequest.url?.includes('/auth/refresh') ||
                             originalRequest.url?.includes('/auth/register') ||
                             originalRequest.url?.includes('/auth/student/activate') ||
                             originalRequest.url?.includes('/auth/student/register') ||
                             originalRequest.url?.includes('/auth/staff-setup');

      if (isAuthEndpoint) {
        return Promise.reject(new Error(message));
      }

      const session = getAuthSessionForCurrentRoute(originalRequest.authRole);
      const refreshToken = session?.refreshToken;
      if (!refreshToken) {
        if (session?.role) clearAuthSession(session.role);
        window.dispatchEvent(new Event('auth-expired'));
        return Promise.reject(new Error(message));
      }

      if (isRefreshing) {
        // Refresh already in flight -> queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((newToken) => {
            originalRequest._retry = true;
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Call /auth/refresh using raw axios to avoid interceptor recursion
        const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken
        });

        const newAccessToken = refreshResponse.data?.data?.accessToken || refreshResponse.data?.accessToken;
        const newRefreshToken = refreshResponse.data?.data?.refreshToken || refreshResponse.data?.refreshToken || refreshToken;

        if (newAccessToken) {
          storeAuthSession(session.role, newAccessToken, newRefreshToken);

          processQueue(null, newAccessToken);
          isRefreshing = false;

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return apiClient(originalRequest);
        } else {
          throw new Error('Token refresh did not return a valid access token');
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;

        clearAuthSession(session?.role);
        window.dispatchEvent(new Event('auth-expired'));
        return Promise.reject(refreshErr);
      }
    }

    // Return customized error object with status code and code
    const enhancedError = new Error(message);
    enhancedError.status = status;
    enhancedError.code = errorData?.code;
    enhancedError.count = error.response?.data?.count;
    enhancedError.data = error.response?.data;

    return Promise.reject(enhancedError);
  }
);

// Unified wrapper object
export const api = {
  get: (url, config = {}) => apiClient.get(url, config),
  post: (url, data = {}, config = {}) => apiClient.post(url, data, config),
  put: (url, data = {}, config = {}) => apiClient.put(url, data, config),
  patch: (url, data = {}, config = {}) => apiClient.patch(url, data, config),
  delete: (url, config = {}) => apiClient.delete(url, config),
};

export default api;
