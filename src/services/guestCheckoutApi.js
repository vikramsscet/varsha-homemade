import { ApiError, request, resolveApiBase } from './apiClient';
import { getAnonymousCartId } from './anonCartStorage';
import { clearGuestSession, getGuestSession, saveGuestSession } from './guestCheckoutStorage';

const SESSION_HEADER = 'X-Guest-Checkout-Session';
// After these the stored token can never work again: clear it and never retry with it.
export const DEAD_SESSION_CODES = ['GUEST_SESSION_NOT_FOUND', 'GUEST_SESSION_EXPIRED', 'INVALID_GUEST_SESSION'];

// Guest requests never carry the JWT (auth: false) and never use the anonymous cart id as auth.
const guestRequest = (path, options = {}) =>
  request(resolveApiBase(import.meta.env.VITE_USER_SERVICE_URL), `/guest-checkout/sessions${path}`, {
    ...options,
    auth: false,
  });

function sessionHeaders() {
  const stored = getGuestSession();
  if (!stored) {
    throw new ApiError({ status: 0, code: 'INVALID_GUEST_SESSION', message: 'No guest checkout session' });
  }
  return { [SESSION_HEADER]: stored.sessionToken };
}

// Runs an authenticated-by-session call; a dead-session error clears the credentials first.
async function withSession(path, options) {
  let headers;
  try {
    headers = sessionHeaders();
  } catch (e) {
    return Promise.reject(e);
  }
  try {
    return await guestRequest(path, { ...options, headers });
  } catch (error) {
    if (DEAD_SESSION_CODES.includes(error?.code)) clearGuestSession();
    throw error;
  }
}

// Every call creates a new session. The existing anonymous cart id (when any) is only a body
// field linking the cart, not a credential. Stores { sessionToken, expiresAt }; returns the
// session without the token.
export async function createGuestSession() {
  const anonymousCartId = getAnonymousCartId();
  const data = await guestRequest('', {
    method: 'POST',
    body: anonymousCartId ? { anonymousCartId } : {},
  });
  const { sessionToken, ...session } = data;
  saveGuestSession({ sessionToken, expiresAt: session.expiresAt });
  return session;
}

export const getCurrentGuestSession = () => withSession('/current');

// Returns the session, or null when there is no stored session or it is gone/expired (token
// cleared). Other errors (network, 5xx) are rethrown and the token is kept.
export async function restoreGuestSession() {
  if (!getGuestSession()) return null;
  try {
    return await getCurrentGuestSession();
  } catch (error) {
    if (DEAD_SESSION_CODES.includes(error?.code)) return null;
    throw error;
  }
}

function group(name, fields) {
  if (!fields || typeof fields !== 'object' || Object.keys(fields).length === 0) {
    throw new ApiError({ status: 0, code: 'INVALID_REQUEST', message: `${name} cannot be empty` });
  }
  return fields;
}

// Partial update: send only the changed fields of the given groups. At least one group required.
export function updateGuestSession({ customer, deliveryAddress } = {}) {
  const body = {};
  if (customer !== undefined) body.customer = group('customer', customer);
  if (deliveryAddress !== undefined) body.deliveryAddress = group('deliveryAddress', deliveryAddress);
  if (!Object.keys(body).length) {
    return Promise.reject(new ApiError({ status: 0, code: 'INVALID_REQUEST', message: 'customer or deliveryAddress is required' }));
  }
  return withSession('/current', { method: 'PUT', body });
}
export const updateCustomer = (customer) => updateGuestSession({ customer });
export const updateDeliveryAddress = (deliveryAddress) => updateGuestSession({ deliveryAddress });

// The cart is not deleted by the backend. Credentials are cleared on success, and also when the
// session was already gone.
export async function deleteGuestSession() {
  try {
    await withSession('/current', { method: 'DELETE' });
  } catch (error) {
    if (!DEAD_SESSION_CODES.includes(error?.code)) throw error;
  }
  clearGuestSession();
}
