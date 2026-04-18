import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns';

export const $ = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);

export const fmtDate = (d) => {
  const date = new Date(d);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'MMM d, yyyy');
};

export const fmtDateFull = (d) => format(new Date(d), 'MMM d, yyyy · h:mm a');
export const fmtRelative = (d) => formatDistanceToNow(new Date(d), { addSuffix: true });

export const fmtIBAN = (iban) => {
  if (!iban) return '';
  return iban.replace(/(.{4})/g, '$1 ').trim();
};

export const maskCard = (num) => {
  if (!num) return '•••• •••• •••• ••••';
  const parts = num.split(' ');
  return parts.map((p, i) => i < 3 ? '••••' : p).join(' ');
};

export const pct = (current, target) => Math.min(100, Math.round((current / target) * 100));
