import { ApiError, request, resolveApiBase } from './apiClient';
import { tokenStorage } from './tokenStorage';
import { getGuestSession } from './guestCheckoutStorage';
import { getGuestOrderToken, saveGuestOrderToken } from './guestOrderStorage';

const SESSION_HEADER = 'X-Guest-Checkout-Session';
const ORDER_TOKEN_HEADER = 'X-Guest-Order-Token';

// Orders/payments base URL; falls back to the user & cart service when no dedicated one is set.
const base = () => resolveApiBase(import.meta.env.VITE_USER_SERVICE_URL);

// Exactly one credential per request: JWT, else guest checkout session, else guest order token.
// The anonymous cart id is never used. `auth` tells request() whether to attach the JWT.
function credential(orderId, { preferOrderToken = false } = {}) {
  if (tokenStorage.get()) return { auth: true, headers: {} };
  const session = getGuestSession();
  const orderToken = orderId ? getGuestOrderToken(orderId) : null;
  if (orderToken && (preferOrderToken || !session)) return { auth: false, headers: { [ORDER_TOKEN_HEADER]: orderToken } };
  if (session) return { auth: false, headers: { [SESSION_HEADER]: session.sessionToken } };
  throw new ApiError({ status: 0, code: 'CHECKOUT_DETAILS_INCOMPLETE', message: 'No checkout credential' });
}

const SESSION_DEAD = ['GUEST_SESSION_NOT_FOUND', 'GUEST_SESSION_EXPIRED', 'INVALID_GUEST_SESSION'];

async function send(path, { orderId, body, idempotencyKey, ...options }) {
  const attempt = (pref) => {
    const { auth, headers } = credential(orderId, { preferOrderToken: pref });
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    return request(base(), path, { method: 'POST', body, ...options, auth, headers });
  };
  try {
    return await attempt(false);
  } catch (e) {
    // Expired guest session but a valid order token exists: retry once with the order token only.
    if (SESSION_DEAD.includes(e?.code) && orderId && getGuestOrderToken(orderId)) return attempt(true);
    throw e;
  }
}

// Authenticated: { addressId }. Guest: no body (details come from the guest checkout session).
// A newly created guest order returns guestAccessToken once; it is stored and stripped from the result.
export async function createOrder({ addressId, idempotencyKey } = {}) {
  const authed = !!tokenStorage.get();
  const data = await send('/orders', { body: authed ? { addressId } : undefined, idempotencyKey });
  const { guestAccessToken, ...order } = data;
  if (guestAccessToken) saveGuestOrderToken({ orderId: order.id, token: guestAccessToken });
  return order;
}

export const createRazorpayOrder = (orderId) => send('/payments/create-order', { orderId, body: { orderId } });

export const verifyPayment = ({ internalPaymentId, orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature }) =>
  send('/payments/verify', {
    orderId,
    body: { internalPaymentId, razorpay_order_id, razorpay_payment_id, razorpay_signature },
  });
