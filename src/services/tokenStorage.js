// Single place that persists the app JWT, so the backing store can be swapped.
//
// Trade-off: the backend issues a 7d token with no refresh endpoint, so surviving a page
// refresh requires persisting it. localStorage is readable by any script on this origin, so an
// XSS bug could exfiltrate the token. Keep third-party scripts minimal, and swap this module for
// an in-memory-only store if refresh persistence is not needed.
const KEY = 'vh.auth.token';
let memoryToken = null;

function safeStorage() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export const tokenStorage = {
  get() {
    if (memoryToken) return memoryToken;
    try {
      memoryToken = safeStorage()?.getItem(KEY) || null;
    } catch {
      memoryToken = null;
    }
    return memoryToken;
  },
  set(token) {
    memoryToken = token;
    try {
      safeStorage()?.setItem(KEY, token);
    } catch {
      // storage unavailable: token stays in memory for this session only
    }
  },
  clear() {
    memoryToken = null;
    try {
      safeStorage()?.removeItem(KEY);
    } catch {
      // ignore
    }
  },
};
