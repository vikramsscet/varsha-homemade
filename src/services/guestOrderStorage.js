// Guest order access token (returned once, when a guest order is created). Needed to pay if the
// checkout session expires first. sessionStorage + memory only, never localStorage. Must never be
// logged, put in a URL, or sent to analytics.
const KEY = 'vh.guestOrder.token';
let memory = null;

function safeStorage() {
  try { return window.sessionStorage; } catch { return null; }
}

export function saveGuestOrderToken({ orderId, token } = {}) {
  if (typeof token !== 'string' || !token || typeof orderId !== 'string' || !orderId) return false;
  memory = { orderId, token };
  try { safeStorage()?.setItem(KEY, JSON.stringify(memory)); } catch { /* memory only */ }
  return true;
}

export function getGuestOrderToken(orderId) {
  let found = memory;
  if (!found) {
    try {
      const parsed = JSON.parse(safeStorage()?.getItem(KEY) ?? 'null');
      if (typeof parsed?.token === 'string' && typeof parsed?.orderId === 'string') found = memory = parsed;
    } catch { clearGuestOrderToken(); }
  }
  if (!found || (orderId && found.orderId !== orderId)) return null;
  return found.token;
}

export function clearGuestOrderToken() {
  memory = null;
  try { safeStorage()?.removeItem(KEY); } catch { /* ignore */ }
}
