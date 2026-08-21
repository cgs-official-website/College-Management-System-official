const API_BASE_URL = 'http://localhost:5000/api/v1';

export const apiFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('zuna_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    // Handle unauthorized/expired token globally
    localStorage.removeItem('zuna_token');
    window.dispatchEvent(new Event('auth-expired'));
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }

  return data;
};

// Expose standard HTTP methods
export const api = {
  get: (url, options) => apiFetch(url, { ...options, method: 'GET' }),
  post: (url, body, options) => apiFetch(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
  put: (url, body, options) => apiFetch(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
  delete: (url, options) => apiFetch(url, { ...options, method: 'DELETE' }),
};

export default api;
