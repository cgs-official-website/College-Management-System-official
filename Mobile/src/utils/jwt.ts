const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Small base64 decoder (does not depend on global atob). */
const decodeBase64 = (input: string): string => {
  const str = input.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const idx = CHARS.indexOf(str[i]);
    if (idx === -1) continue;
    value = (value << 6) | idx;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out += String.fromCharCode((value >> bits) & 0xff);
    }
  }
  try {
    // handle UTF-8 payloads
    return decodeURIComponent(
      out
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
  } catch {
    return out;
  }
};

export const decodeJwt = (token?: string | null): Record<string, any> | null => {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) return null;
    return JSON.parse(decodeBase64(parts[1]));
  } catch {
    return null;
  }
};

export const getUserIdFromToken = (token?: string | null): string | null => {
  const payload = decodeJwt(token);
  return payload?.userId || payload?.id || null;
};

export const roleFromToken = (token?: string | null): string | null => decodeJwt(token)?.role ?? null;
