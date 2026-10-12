/** Standard backend envelope: { success, data, message, error } */
export interface ApiEnvelope<T = any> {
  success?: boolean;
  data: T;
  message?: string;
  count?: number;
  error?: { code?: string; message?: string };
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
  count?: number;
  data?: any;
}
