// Persists only the backend-issued anonymous cart ID (an opaque identifier, never the cart's
// database id). Same approach as tokenStorage: in-memory copy backed by localStorage. Never log it.
const KEY = 'vh.cart.anonymousId';
// Opaque to us; accept UUID-like tokens and reject anything that could break a header.
const VALID_ID = /^[A-Za-z0-9_-]{8,128}$/;
let memoryId = null;

export function isValidAnonymousCartId(id) {
  return typeof id === 'string' && VALID_ID.test(id);
}

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getAnonymousCartId() {
  if (memoryId) return memoryId;
  let stored = null;
  try {
    stored = safeStorage()?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
  if (stored === null) return null;
  if (!isValidAnonymousCartId(stored)) {
    clearAnonymousCartId();
    return null;
  }
  memoryId = stored;
  return memoryId;
}

// Returns true if stored; invalid ids are ignored.
export function setAnonymousCartId(id) {
  if (!isValidAnonymousCartId(id)) return false;
  memoryId = id;
  try {
    safeStorage()?.setItem(KEY, id);
  } catch {
    // storage unavailable: kept in memory for this session only
  }
  return true;
}

export function clearAnonymousCartId() {
  memoryId = null;
  try {
    safeStorage()?.removeItem(KEY);
  } catch {
    // ignore
  }
}
