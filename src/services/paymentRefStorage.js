// Minimum data needed to recover an unpaid order after a refresh. Not a credential: no JWT, guest
// session token, guest order token (kept in guestOrderStorage) or any Razorpay secret/signature.
// sessionStorage only. Shape: { orderId, orderNumber, customerType, addressId, paymentId, amount,
// currency, status, pendingKey } where pendingKey is the idempotency key of an in-flight order creation.
const KEY = 'vh.payment.ref';
const store = () => { try { return window.sessionStorage; } catch { return null; } };

export function getPaymentRef() {
  try {
    const v = JSON.parse(store()?.getItem(KEY) ?? 'null');
    return v && typeof v === 'object' ? v : null;
  } catch { return null; }
}
export function savePaymentRef(ref) {
  try { store()?.setItem(KEY, JSON.stringify(ref)); } catch { /* ignore */ }
}
export function updatePaymentRef(patch) {
  savePaymentRef({ ...(getPaymentRef() ?? {}), ...patch });
}
export function clearPaymentRef() {
  try { store()?.removeItem(KEY); } catch { /* ignore */ }
}
