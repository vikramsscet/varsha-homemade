import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createOrder, createRazorpayOrder, verifyPayment } from './paymentApi';
import { clearGuestSession, saveGuestSession } from './guestCheckoutStorage';
import { clearGuestOrderToken, getGuestOrderToken, saveGuestOrderToken } from './guestOrderStorage';
import { setAnonymousCartId, clearAnonymousCartId } from './anonCartStorage';
import { tokenStorage } from './tokenStorage';

const res = (status, body) => ({ ok: status < 400, status, json: async () => body, headers: { get: () => null } });
const ok = (data) => res(200, { success: true, data, message: '' });
const fail = (status, code) => res(status, { success: false, error: { code, message: 'm' } });
const store = () => { const d = {}; return { d, getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = v; }, removeItem: (k) => { delete d[k]; } }; };
const ORDER_TOKEN = 'O'.repeat(43);
let f, local, sess;
const call = (i = 0) => ({ url: f.mock.calls[i][0], ...f.mock.calls[i][1] });

beforeEach(() => {
  vi.stubEnv('VITE_USER_SERVICE_URL', 'http://api.test');
  f = vi.fn();
  vi.stubGlobal('fetch', f);
  local = store(); sess = store();
  vi.stubGlobal('window', { localStorage: local, sessionStorage: sess });
  tokenStorage.clear(); clearGuestSession(); clearGuestOrderToken(); clearAnonymousCartId();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('paymentApi credentials', () => {
  it('authenticated: JWT only, addressId body, idempotency key', async () => {
    tokenStorage.set('jwt');
    setAnonymousCartId('a'.repeat(36));
    f.mockResolvedValue(ok({ id: 'o1' }));
    await createOrder({ addressId: 'ad1', idempotencyKey: 'k1' });
    const c = call();
    expect(c.url).toBe('http://api.test/api/v1/orders');
    expect(c.headers.Authorization).toBe('Bearer jwt');
    expect(c.headers['X-Guest-Checkout-Session']).toBeUndefined();
    expect(c.headers['X-Anonymous-Cart-ID']).toBeUndefined();
    expect(c.headers['Idempotency-Key']).toBe('k1');
    expect(JSON.parse(c.body)).toEqual({ addressId: 'ad1' });
  });

  it('guest: session header only, no body, never the JWT or anon cart id', async () => {
    saveGuestSession({ sessionToken: 'S'.repeat(43) });
    setAnonymousCartId('a'.repeat(36));
    f.mockResolvedValue(ok({ id: 'o1' }));
    await createOrder({});
    const c = call();
    expect(c.body).toBeUndefined();
    expect(c.headers['X-Guest-Checkout-Session']).toBe('S'.repeat(43));
    expect(c.headers.Authorization).toBeUndefined();
    expect(c.headers['X-Anonymous-Cart-ID']).toBeUndefined();
  });

  it('stores guestAccessToken in sessionStorage (not localStorage) and strips it from the result', async () => {
    saveGuestSession({ sessionToken: 'S'.repeat(43) });
    f.mockResolvedValue(ok({ id: 'o1', guestAccessToken: ORDER_TOKEN }));
    const order = await createOrder({});
    expect(order.guestAccessToken).toBeUndefined();
    expect(getGuestOrderToken('o1')).toBe(ORDER_TOKEN);
    expect(Object.values(sess.d).join()).toContain(ORDER_TOKEN);
    expect(Object.keys(local.d)).toHaveLength(0);
  });

  it('an existing order response without a token leaves the stored token intact', async () => {
    saveGuestSession({ sessionToken: 'S'.repeat(43) });
    saveGuestOrderToken({ orderId: 'o1', token: ORDER_TOKEN });
    f.mockResolvedValue(ok({ id: 'o1' }));
    await createOrder({});
    expect(getGuestOrderToken('o1')).toBe(ORDER_TOKEN);
  });

  it('expired session: uses the guest order token alone', async () => {
    saveGuestOrderToken({ orderId: 'o1', token: ORDER_TOKEN });
    f.mockResolvedValue(ok({ paymentId: 'p1' }));
    await createRazorpayOrder('o1');
    const c = call();
    expect(c.headers['X-Guest-Order-Token']).toBe(ORDER_TOKEN);
    expect(c.headers['X-Guest-Checkout-Session']).toBeUndefined();
    expect(c.headers.Authorization).toBeUndefined();
    expect(JSON.parse(c.body)).toEqual({ orderId: 'o1' });
  });

  it('a dead session retries once with the order token', async () => {
    saveGuestSession({ sessionToken: 'S'.repeat(43) });
    saveGuestOrderToken({ orderId: 'o1', token: ORDER_TOKEN });
    f.mockResolvedValueOnce(fail(401, 'GUEST_SESSION_EXPIRED')).mockResolvedValueOnce(ok({ paymentId: 'p1' }));
    await createRazorpayOrder('o1');
    expect(call(1).headers['X-Guest-Order-Token']).toBe(ORDER_TOKEN);
    expect(call(1).headers['X-Guest-Checkout-Session']).toBeUndefined();
  });

  it('verify posts the Razorpay response with the internal payment id', async () => {
    tokenStorage.set('jwt');
    f.mockResolvedValue(ok({ status: 'PAID' }));
    await verifyPayment({ internalPaymentId: 'p1', orderId: 'o1', razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig' });
    expect(call().url).toBe('http://api.test/api/v1/payments/verify');
    expect(JSON.parse(call().body)).toEqual({ internalPaymentId: 'p1', razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig' });
  });
});
