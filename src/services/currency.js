// Formats a server-provided amount; never used to compute one. Falls back to the app's existing
// `₹xxx.xx` style if Intl can't handle the currency code.
export function formatCurrency(amount, currency = 'INR') {
  if (typeof amount !== 'number' || !Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
  } catch {
    return `₹${amount.toFixed(2)}`;
  }
}
