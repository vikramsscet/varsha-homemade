import { request, resolveApiBase } from './apiClient';

export const ORDER_PAGE_SIZE = 10;
export const ORDER_STATUSES = ['PENDING_PAYMENT', 'PAYMENT_FAILED', 'PAID', 'CANCELLED', 'EXPIRED', 'PARTIALLY_REFUNDED', 'REFUNDED'];

const base = () => resolveApiBase(import.meta.env.VITE_ORDER_SERVICE_URL || import.meta.env.VITE_USER_SERVICE_URL);

// GET /orders with the signed-in user's JWT (attached by request()). Guest tokens are never used.
// The cursor is opaque: passed through untouched. Returns { items, pagination: { nextCursor, hasMore } }.
export async function listOrders({ limit = ORDER_PAGE_SIZE, cursor, status } = {}) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set('cursor', cursor);
  if (status) params.set('status', status);
  const data = await request(base(), `/orders?${params}`);
  return {
    items: Array.isArray(data?.items) ? data.items : [],
    pagination: { nextCursor: data?.pagination?.nextCursor ?? null, hasMore: data?.pagination?.hasMore === true },
  };
}

// GET /orders/:id (the UUID, never the order number). Normalises only collections; every other
// field is passed through as returned and may be null.
export async function getOrder(id) {
  const data = await request(base(), `/orders/${encodeURIComponent(id)}`);
  return {
    ...data,
    items: Array.isArray(data?.items) ? data.items : [],
    payments: Array.isArray(data?.payments) ? data.payments : [],
  };
}

export const ORDER_STATUS_LABELS = {
  PENDING_PAYMENT: 'Payment Pending',
  PAYMENT_FAILED: 'Payment Failed',
  PAID: 'Paid',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired',
  PARTIALLY_REFUNDED: 'Partially Refunded',
  REFUNDED: 'Refunded',
};

const humanize = (v) => String(v).toLowerCase().replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
export const orderStatusLabel = (s) => ORDER_STATUS_LABELS[s] ?? humanize(s ?? 'Unknown');
export const paymentStatusLabel = (s) => (s ? humanize(s) : null);

export function getOrdersErrorMessage(error) {
  if (error?.code === 'NETWORK_ERROR') return "We couldn't reach the server. Check your connection and try again.";
  if (error?.status === 429 || error?.code === 'RATE_LIMITED') return 'Too many requests. Please wait a moment and try again.';
  if (error?.code === 'INVALID_REQUEST') return 'We could not apply that filter. Please try again.';
  return "We couldn't load your orders. Please try again.";
}

// Never reveals whether an order exists for someone else: 404 is always the same message.
export function getOrderDetailError(error) {
  if (error?.code === 'ORDER_NOT_FOUND' || error?.status === 404) return { notFound: true, message: 'Order not found.' };
  if (error?.code === 'INVALID_REQUEST' || error?.status === 400) return { notFound: true, message: 'Order not found.' };
  if (error?.code === 'NETWORK_ERROR') return { message: "We couldn't reach the server. Check your connection and try again." };
  return { message: "We couldn't load this order. Please try again." };
}

const PAYMENT_METHOD_LABELS = { card: 'Card', netbanking: 'Net Banking', wallet: 'Wallet', upi: 'UPI', emi: 'EMI', paylater: 'Pay Later' };
export const paymentMethodLabel = (m) => (m ? PAYMENT_METHOD_LABELS[String(m).toLowerCase()] ?? humanize(m) : null);

// Method-specific details as [label, value] rows; only non-null backend values, nothing fabricated.
// The UPI handle is shown only as the masked value the API provides.
export function paymentMethodDetails(p) {
  const rows = [];
  const add = (label, value) => { if (value !== null && value !== undefined && value !== '') rows.push([label, String(value)]); };
  switch (String(p?.paymentMethod ?? '').toLowerCase()) {
    case 'card':
      add('Network', p.card?.network);
      add('Card', p.card?.last4 ? `•••• ${p.card.last4}` : null);
      add('Type', p.card?.type ? humanize(p.card.type) : null);
      add('Issuer', p.card?.issuer);
      break;
    case 'netbanking': add('Bank', p.bankCode); break;
    case 'wallet': add('Wallet', p.walletName); break;
    case 'upi': add('UPI', p.upiHandleMasked); break;
    default: break;
  }
  return rows;
}
