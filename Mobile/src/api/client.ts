import axios, { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { API_URL, REQUEST_TIMEOUT_MS } from '../config/env';
import { clearSession, emitAuthExpired, getSession, loadSession, storeSession } from './session';
import type { ApiError } from '../types/api';

interface RetriableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: REQUEST_TIMEOUT_MS,
});

// ---- single-flight refresh queue (same logic as web) ----
let isRefreshing = false;
let failedQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token as string)));
  failedQueue = [];
};

const AUTH_ENDPOINTS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/register',
  '/auth/student/activate',
  '/auth/student/register',
  '/auth/staff-setup',
  '/auth/teacher-register',
  '/auth/forgot-password',
  '/auth/reset-password',
];

const buildError = (message: string, error: any): ApiError => {
  const errorData = error?.response?.data?.error;
  const e = new Error(message) as ApiError;
  e.status = error?.response?.status;
  e.code = errorData?.code;
  e.count = error?.response?.data?.count;
  e.data = error?.response?.data;
  return e;
};

// ---- request: attach Bearer token ----
apiClient.interceptors.request.use(async (config) => {
  await loadSession();
  const session = getSession();
  if (session?.accessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

// ---- response: unwrap body, central error handling, transparent token refresh ----
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config as RetriableConfig | undefined;
    const status: number | undefined = error.response?.status;
    const errorData = error.response?.data?.error;

    let message: string = errorData?.message || error.message || 'An unexpected error occurred';
    if (!error.response) {
      message = __DEV__
        ? `Cannot reach the server (${API_URL}). Check that the backend is running and API_URL / adb reverse is correct.`
        : 'Cannot reach the server. Please check your internet connection and try again.';
    }

    if (status === 401 && originalRequest && !originalRequest._retry) {
      const isAuthEndpoint = AUTH_ENDPOINTS.some((p) => originalRequest.url?.includes(p));
      if (isAuthEndpoint) {
        return Promise.reject(buildError(message, error));
      }

      const session = getSession();
      const refreshToken = session?.refreshToken;
      if (!refreshToken) {
        await clearSession();
        emitAuthExpired();
        return Promise.reject(buildError(message, error));
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((newToken) => {
          originalRequest._retry = true;
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // raw axios -> avoids interceptor recursion
        const refreshResponse = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
        const newAccessToken: string | undefined =
          refreshResponse.data?.data?.accessToken || refreshResponse.data?.accessToken;
        const newRefreshToken: string =
          refreshResponse.data?.data?.refreshToken || refreshResponse.data?.refreshToken || refreshToken;

        if (!newAccessToken) throw new Error('Token refresh did not return a valid access token');

        await storeSession(session!.role, newAccessToken, newRefreshToken);
        processQueue(null, newAccessToken);
        isRefreshing = false;

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        await clearSession();
        emitAuthExpired();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(buildError(message, error));
  },
);

/**
 * Unified wrapper. NOTE: the response interceptor already unwraps `response.data`,
 * so every call resolves to the backend body ({ success, data, ... }) - same as the web app.
 */
export const api = {
  get: <T = any>(url: string, config: AxiosRequestConfig = {}) =>
    apiClient.get(url, config) as unknown as Promise<T>,
  post: <T = any>(url: string, data: any = {}, config: AxiosRequestConfig = {}) =>
    apiClient.post(url, data, config) as unknown as Promise<T>,
  put: <T = any>(url: string, data: any = {}, config: AxiosRequestConfig = {}) =>
    apiClient.put(url, data, config) as unknown as Promise<T>,
  patch: <T = any>(url: string, data: any = {}, config: AxiosRequestConfig = {}) =>
    apiClient.patch(url, data, config) as unknown as Promise<T>,
  delete: <T = any>(url: string, config: AxiosRequestConfig = {}) =>
    apiClient.delete(url, config) as unknown as Promise<T>,
};

export default api;
