const NOT_PROVIDED = 'Not provided';

function toDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// "30 Oct 2026, 9:42 PM" in the browser's local timezone.
export function formatDateTime(value) {
  const date = toDate(value);
  if (!date) return NOT_PROVIDED;
  const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${day}, ${time}`;
}

// "30 Oct 2026"
export function formatDate(value) {
  const date = toDate(value);
  return date ? date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : NOT_PROVIDED;
}

export function orNotProvided(value) {
  return typeof value === 'string' && value.trim() ? value : NOT_PROVIDED;
}

export function getInitials(user) {
  const name = user.displayName || [user.firstName, user.lastName].filter(Boolean).join(' ') || (user.email || '').split('@')[0];
  const parts = name.split(/[\s._-]+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '?') + (parts.length > 1 ? parts[1][0] : '')).toUpperCase();
}

// ACTIVE -> "Active"; unknown values are shown as returned, never assumed active.
export function formatStatus(status) {
  if (!status) return NOT_PROVIDED;
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}
