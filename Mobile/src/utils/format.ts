export const formatDate = (value?: string | number | Date | null): string => {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const formatDateTime = (value?: string | number | Date | null): string => {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatCurrency = (amount?: number | string | null): string => {
  const n = Number(amount ?? 0);
  if (isNaN(n)) return '₹0';
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 2 });
};

export const formatNumber = (n?: number | string | null): string => {
  const v = Number(n ?? 0);
  return isNaN(v) ? '0' : v.toLocaleString('en-IN');
};

export const initials = (name?: string | null): string => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const titleCase = (s?: string | null): string =>
  (s || '')
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

export const truncate = (s: string, max = 40): string => (s.length > max ? s.slice(0, max - 1) + '…' : s);

export const fullName = (u?: { firstName?: string; lastName?: string; name?: string; email?: string } | null): string => {
  if (!u) return '';
  const n = [u.firstName, u.lastName].filter(Boolean).join(' ').trim();
  return n || u.name || u.email || '';
};
