import { ApiError, request, resolveApiBase } from './apiClient';
import { tokenStorage } from './tokenStorage';
import { getAnonymousCartId, isValidAnonymousCartId, setAnonymousCartId } from './anonCartStorage';

const ANON_HEADER = 'X-Anonymous-Cart-ID';
const MIN_QTY = 1;
const MAX_QTY = 99;

// Cart endpoints live on the user-and-cart service, under /api/v1/carts.
const cartRequest = (path, options) =>
  request(resolveApiBase(import.meta.env.VITE_USER_SERVICE_URL), `/carts${path}`, options);

// Ordinary requests carry exactly one identity: the Bearer token (attached by request()) when
// signed in, otherwise the stored anonymous cart ID, otherwise nothing.
function identityHeaders() {
  if (tokenStorage.get()) return {};
  const anonymousId = getAnonymousCartId();
  return anonymousId ? { [ANON_HEADER]: anonymousId } : {};
}

function invalid(message) {
  return new ApiError({ status: 0, code: 'INVALID_REQUEST', message });
}

function requireId(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw invalid(`${name} is required`);
  return encodeURIComponent(value);
}

function requireQuantity(quantity) {
  if (!Number.isInteger(quantity) || quantity < MIN_QTY || quantity > MAX_QTY) {
    throw invalid(`quantity must be an integer between ${MIN_QTY} and ${MAX_QTY}`);
  }
  return quantity;
}

// Only anonymous callers persist an id, and a valid stored id is never replaced. With no stored
// id, the id in the cart body wins over the response header (the body matches cart.anonymousId).
function persistAnonymousId(cart, headerId) {
  if (tokenStorage.get() || getAnonymousCartId()) return;
  const candidate = [cart?.anonymousId, headerId].find(isValidAnonymousCartId);
  if (candidate) setAnonymousCartId(candidate);
}

// POST /carts: create or fetch the active cart (200 or 201).
export async function createCart() {
  let headerId = null;
  const cart = await cartRequest('', {
    method: 'POST',
    headers: identityHeaders(),
    onResponse: (response) => {
      headerId = response.headers?.get?.(ANON_HEADER) ?? null;
    },
  });
  persistAnonymousId(cart, headerId);
  return cart;
}

// GET /carts/current. A 404 CART_NOT_FOUND is surfaced to the caller, never auto-recovered.
export function getCurrentCart() {
  return cartRequest('/current', { headers: identityHeaders() });
}

export function getCart(cartId) {
  return cartRequest(`/${requireId(cartId, 'cartId')}`, { headers: identityHeaders() });
}

export function deleteCart(cartId) {
  return cartRequest(`/${requireId(cartId, 'cartId')}`, { method: 'DELETE', headers: identityHeaders() });
}

// Only ids and quantity are sent; prices and totals are always computed by the server.
export function addItem(cartId, { productId, quantity = 1 } = {}) {
  const path = `/${requireId(cartId, 'cartId')}/items`;
  if (typeof productId !== 'string' || !productId.trim()) throw invalid('productId is required');
  return cartRequest(path, {
    method: 'POST',
    body: { productId, quantity: requireQuantity(quantity) },
    headers: identityHeaders(),
  });
}

// quantity is the new absolute value (1-99); use removeItem to delete a line.
export function updateItem(cartId, itemId, quantity) {
  const path = `/${requireId(cartId, 'cartId')}/items/${requireId(itemId, 'itemId')}`;
  return cartRequest(path, { method: 'PATCH', body: { quantity: requireQuantity(quantity) }, headers: identityHeaders() });
}

export function removeItem(cartId, itemId) {
  const path = `/${requireId(cartId, 'cartId')}/items/${requireId(itemId, 'itemId')}`;
  return cartRequest(path, { method: 'DELETE', headers: identityHeaders() });
}

export function clearCart(cartId) {
  return cartRequest(`/${requireId(cartId, 'cartId')}/items`, { method: 'DELETE', headers: identityHeaders() });
}

// cartId is the ANONYMOUS cart's database id. Sends both identities. Does not clear the stored
// anonymous id: the caller does that after a confirmed successful merge.
export function mergeCart(cartId) {
  const path = `/${requireId(cartId, 'cartId')}/merge`;
  const token = tokenStorage.get();
  const anonymousId = getAnonymousCartId();
  if (!token || !anonymousId) {
    throw new ApiError({ status: 0, code: 'MERGE_IDENTITY_MISSING', message: 'Merge requires a signed-in user and an anonymous cart' });
  }
  return cartRequest(path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, [ANON_HEADER]: anonymousId },
  });
}
