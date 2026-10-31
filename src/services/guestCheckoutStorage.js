// Guest checkout session credentials. sessionStorage (tab-scoped) with an in-memory copy; never
// localStorage. Holds only { sessionToken, expiresAt }, kept separate from the anonymous cart id.
// The token must never be logged, put in a URL, or sent to analytics/error reporting.
const KEY = 'vh.guestCheckout.session';
let memory = null;

function safeStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveGuestSession({ sessionToken, expiresAt } = {}) {
  if (typeof sessionToken !== 'string' || !sessionToken) return false;
  memory = { sessionToken, expiresAt: expiresAt ?? null };
  try {
    safeStorage()?.setItem(KEY, JSON.stringify(memory));
  } catch {
    // storage unavailable: kept in memory for this page only
  }
  return true;
}

export function getGuestSession() {
  if (memory) return { ...memory };
  try {
    const raw = safeStorage()?.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.sessionToken !== 'string' || !parsed.sessionToken) throw new Error('invalid');
    memory = { sessionToken: parsed.sessionToken, expiresAt: parsed.expiresAt ?? null };
    return { ...memory };
  } catch {
    clearGuestSession();
    return null;
  }
}

export function clearGuestSession() {
  memory = null;
  try {
    safeStorage()?.removeItem(KEY);
  } catch {
    // ignore
  }
}
