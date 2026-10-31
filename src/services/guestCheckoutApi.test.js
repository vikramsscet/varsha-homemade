import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as api from './guestCheckoutApi';
import { clearGuestSession, getGuestSession, saveGuestSession } from './guestCheckoutStorage';
import { clearAnonymousCartId, setAnonymousCartId } from './anonCartStorage';
import { tokenStorage } from './tokenStorage';

const res = (status, body) => ({ ok: status < 400, status, json: async () => body, headers: { get: () => null } });
const ok = (data) => res(200, { success: true, data, message: '' });
const fail = (status, code) => res(status, { success: false, error: { code, message: 'm' } });
const TOKEN = 'T'.repeat(43);
const session = { id: 's1', cartId: 'c1', customer: {}, deliveryAddress: {}, isComplete: false, expiresAt: '2030-01-01' };
function fakeStorage() {
  const data = {};
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
    removeItem: (k) => { delete data[k]; },
  };
}
let f, local, sess;
const call = (i = 0) => ({ url: f.mock.calls[i][0], ...f.mock.calls[i][1] });

beforeEach(() => {
  vi.stubEnv('VITE_USER_SERVICE_URL', 'http://api.test');
  f = vi.fn();
  vi.stubGlobal('fetch', f);
  local = fakeStorage();
  sess = fakeStorage();
  vi.stubGlobal('window', { localStorage: local, sessionStorage: sess });
  clearAnonymousCartId();
  tokenStorage.clear();
  clearGuestSession();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('create', () => {
  it('creates a session, stores credentials, returns it without the token', async () => {
    f.mockResolvedValue(ok({ ...session, sessionToken: TOKEN }));
    const s = await api.createGuestSession();
    expect(call()).toMatchObject({ url: 'http://api.test/api/v1/guest-checkout/sessions', method: 'POST' });
    expect(JSON.parse(call().body)).toEqual({});
    expect(s.sessionToken).toBeUndefined();
    expect(getGuestSession()).toEqual({ sessionToken: TOKEN, expiresAt: '2030-01-01' });
  });
  it('passes the anonymous cart id when available, in the body only', async () => {
    setAnonymousCartId('anon-cart-12345');
    f.mockResolvedValue(ok({ ...session, sessionToken: TOKEN }));
    await api.createGuestSession();
    expect(JSON.parse(call().body)).toEqual({ anonymousCartId: 'anon-cart-12345' });
    expect(call().headers['X-Anonymous-Cart-ID']).toBeUndefined();
  });
});

describe('with a session', () => {
  beforeEach(() => saveGuestSession({ sessionToken: TOKEN, expiresAt: 'x' }));

  it('retrieves the current session using the session header', async () => {
    f.mockResolvedValue(ok(session));
    expect(await api.getCurrentGuestSession()).toEqual(session);
    expect(call().headers['X-Guest-Checkout-Session']).toBe(TOKEN);
    expect(call().url).not.toContain(TOKEN);
  });
  it('updates customer and delivery as partial single-group PUTs', async () => {
    f.mockResolvedValue(ok(session));
    await api.updateCustomer({ email: 'a@b.co' });
    await api.updateDeliveryAddress({ city: 'Pune' });
    expect(call(0).method).toBe('PUT');
    expect(JSON.parse(call(0).body)).toEqual({ customer: { email: 'a@b.co' } });
    expect(JSON.parse(call(1).body)).toEqual({ deliveryAddress: { city: 'Pune' } });
  });
  it('rejects an empty update or empty group without a request', async () => {
    await expect(api.updateGuestSession({})).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(() => api.updateGuestSession({ customer: {} })).toThrow(/cannot be empty/);
    expect(f).not.toHaveBeenCalled();
  });
  it('deletes the session and clears credentials', async () => {
    f.mockResolvedValue(ok({}));
    await api.deleteGuestSession();
    expect(call().method).toBe('DELETE');
    expect(getGuestSession()).toBeNull();
  });
  it.each(['GUEST_SESSION_EXPIRED', 'GUEST_SESSION_NOT_FOUND', 'INVALID_GUEST_SESSION'])(
    'restore clears the token on %s and does not retry with it',
    async (code) => {
      f.mockResolvedValue(fail(code === 'GUEST_SESSION_EXPIRED' ? 410 : 404, code));
      expect(await api.restoreGuestSession()).toBeNull();
      expect(getGuestSession()).toBeNull();
      expect(f).toHaveBeenCalledTimes(1);
      expect(await api.restoreGuestSession()).toBeNull();
      expect(f).toHaveBeenCalledTimes(1);
    }
  );
  it('recovers by creating a fresh session after expiry', async () => {
    f.mockResolvedValueOnce(fail(410, 'GUEST_SESSION_EXPIRED'));
    await api.restoreGuestSession();
    f.mockResolvedValueOnce(ok({ ...session, sessionToken: 'N'.repeat(43) }));
    await api.createGuestSession();
    expect(getGuestSession().sessionToken).toBe('N'.repeat(43));
  });
  it('keeps the token and rethrows on server/network errors', async () => {
    f.mockResolvedValue(fail(500, 'INTERNAL_ERROR'));
    await expect(api.restoreGuestSession()).rejects.toMatchObject({ status: 500, code: 'INTERNAL_ERROR' });
    expect(getGuestSession()).not.toBeNull();
  });
  it('surfaces RATE_LIMITED and INVALID_CHECKOUT_DETAILS', async () => {
    f.mockResolvedValue(fail(429, 'RATE_LIMITED'));
    await expect(api.getCurrentGuestSession()).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    f.mockResolvedValue(fail(400, 'INVALID_CHECKOUT_DETAILS'));
    await expect(api.updateCustomer({ email: 'x' })).rejects.toMatchObject({ code: 'INVALID_CHECKOUT_DETAILS' });
  });
  it('rejects session calls locally when no session is stored', async () => {
    clearGuestSession();
    await expect(api.getCurrentGuestSession()).rejects.toMatchObject({ code: 'INVALID_GUEST_SESSION' });
    expect(f).not.toHaveBeenCalled();
  });
});

describe('security', () => {
  it('never sends the JWT on guest requests, even when signed in', async () => {
    tokenStorage.set('jwt');
    saveGuestSession({ sessionToken: TOKEN });
    f.mockResolvedValue(ok(session));
    await api.getCurrentGuestSession();
    await api.createGuestSession().catch(() => {});
    for (const [, init] of f.mock.calls) {
      expect(Object.keys(init.headers).map((k) => k.toLowerCase())).not.toContain('authorization');
    }
    expect(call().headers['X-Guest-Checkout-Session']).toBe(TOKEN);
  });
  it('never stores the token in localStorage, only sessionStorage', () => {
    saveGuestSession({ sessionToken: TOKEN, expiresAt: 'x' });
    expect(JSON.stringify(local.data)).not.toContain(TOKEN);
    expect(JSON.parse(sess.getItem('vh.guestCheckout.session'))).toEqual({ sessionToken: TOKEN, expiresAt: 'x' });
  });
  it('never logs the token', async () => {
    const spies = ['log', 'info', 'warn', 'error', 'debug'].map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    f.mockResolvedValue(ok({ ...session, sessionToken: TOKEN }));
    await api.createGuestSession();
    f.mockResolvedValue(fail(404, 'GUEST_SESSION_NOT_FOUND'));
    await api.restoreGuestSession();
    spies.forEach((s) => expect(s).not.toHaveBeenCalled());
  });
  it('never puts the token in URLs', async () => {
    saveGuestSession({ sessionToken: TOKEN });
    f.mockResolvedValue(ok(session));
    await api.getCurrentGuestSession();
    await api.updateCustomer({ firstName: 'a' });
    f.mock.calls.forEach(([url]) => expect(url).not.toContain(TOKEN));
  });
  it('leaves the anonymous cart id untouched', async () => {
    setAnonymousCartId('anon-cart-12345');
    f.mockResolvedValue(ok({ ...session, sessionToken: TOKEN }));
    await api.createGuestSession();
    await api.deleteGuestSession().catch(() => {});
    expect(local.getItem('vh.cart.anonymousId')).toBe('anon-cart-12345');
  });
});
