import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

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

// Response Interceptor: Centralized error handling & session expiration
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const errorData = error.response?.data?.error;
    const message = errorData?.message || error.message || 'An unexpected error occurred';

    if (status === 401) {
      localStorage.removeItem('zuna_token');
      window.dispatchEvent(new Event('auth-expired'));
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
