import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

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
    const token = localStorage.getItem('zuna_token');
    if (token) {
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
                             originalRequest.url?.includes('/auth/register');

      if (isAuthEndpoint) {
        // Auth endpoints failing with 401 should not attempt refresh
        if (originalRequest.url?.includes('/auth/refresh')) {
          localStorage.removeItem('zuna_token');
          localStorage.removeItem('zuna_refresh');
          window.dispatchEvent(new Event('auth-expired'));
        }
        return Promise.reject(new Error(message));
      }

      const refreshToken = localStorage.getItem('zuna_refresh');
      if (!refreshToken) {
        // No refresh token available, session is expired
        localStorage.removeItem('zuna_token');
        localStorage.removeItem('zuna_refresh');
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
          localStorage.setItem('zuna_token', newAccessToken);
          localStorage.setItem('zuna_refresh', newRefreshToken);
          apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;

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

        localStorage.removeItem('zuna_token');
        localStorage.removeItem('zuna_refresh');
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
