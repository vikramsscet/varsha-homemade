// Order reference kept for future recovery (not a credential). sessionStorage only.
const KEY = 'vh.payment.ref';
export function savePaymentRef(ref) {
  try { window.sessionStorage.setItem(KEY, JSON.stringify(ref)); } catch { /* ignore */ }
}
export function getPaymentRef() {
  try { return JSON.parse(window.sessionStorage.getItem(KEY) ?? 'null'); } catch { return null; }
}
export function clearPaymentRef() {
  try { window.sessionStorage.removeItem(KEY); } catch { /* ignore */ }
}
