import Config from 'react-native-config';

const raw = Config.API_URL || 'http://localhost:5000/api/v1';

/** Backend base URL, always without trailing slash. Example: https://api.example.com/api/v1 */
export const API_URL = raw.replace(/\/+$/, '');
export const SENTRY_DSN = Config.SENTRY_DSN || '';
export const REQUEST_TIMEOUT_MS = 60_000; // remote DB can be slow on first request

/**
 * Public web-app origin used to build shareable registration / invite links
 * (the web uses window.location.origin). Set WEB_URL in .env, e.g. https://app.zuna.com
 * Falls back to the API origin if WEB_URL is not configured.
 */
export const WEB_URL = (Config.WEB_URL || API_URL.replace(/\/api(\/v\d+)?$/, '')).replace(/\/+$/, '');