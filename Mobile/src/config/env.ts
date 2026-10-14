const PROD_API_URL = 'https://college-management-system-official-production.up.railway.app/api/v1';
const DEV_API_URL = 'http://localhost:5000/api/v1';

const raw = __DEV__ ? DEV_API_URL : PROD_API_URL;

/** Backend base URL, always without trailing slash. Example: https://api.example.com/api/v1 */
export const API_URL = raw.replace(/\/+$/, '');
export const SENTRY_DSN = '';
export const REQUEST_TIMEOUT_MS = 60_000; // remote DB can be slow on first request

/**
 * Public web-app origin used to build shareable registration / invite links.
 * Falls back to the API origin (Railway) since WEB_URL is no longer read from .env.
 */
export const WEB_URL = API_URL.replace(/\/api(\/v\d+)?$/, '').replace(/\/+$/, '');