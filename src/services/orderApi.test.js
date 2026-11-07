import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { listOrders, orderStatusLabel } from './orderApi';
import { saveGuestSession } from './guestCheckoutStorage';
import { saveGuestOrderToken } from './guestOrderStorage';
import { tokenStorage } from './tokenStorage';

const res = (status, body) => ({ ok: status < 400, status, json: async () => body, headers: { get: () => null } });
let f;
beforeEach(() => {
  vi.stubEnv('VITE_USER_SERVICE_URL', 'http://api.test');
  f = vi.fn().mockResolvedValue(res(200, { success: true, data: { items: [{ id: 'a' }], pagination: { nextCursor: 'c1', hasMore: true } } }));
  vi.stubGlobal('fetch', f);
  const d = {};
  vi.stubGlobal('window', { sessionStorage: { getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = v; }, removeItem: (k) => { delete d[k]; } }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
  tokenStorage.set('jwt');
});
afterEach(() => { tokenStorage.clear(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('orderApi', () => {
  it('requests limit=10 with the JWT only, no guest credentials', async () => {
    saveGuestSession({ sessionToken: 'S'.repeat(43) });
    saveGuestOrderToken({ orderId: 'o', token: 'O'.repeat(43) });
    const page = await listOrders();
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('http://api.test/api/v1/orders?limit=10');
    expect(init.headers.Authorization).toBe('Bearer jwt');
    expect(Object.keys(init.headers).filter((k) => /guest|anonymous/i.test(k))).toEqual([]);
    expect(page.pagination).toEqual({ nextCursor: 'c1', hasMore: true });
  });

  it('passes the opaque cursor and status through unchanged', async () => {
    await listOrders({ cursor: 'a+b/c==', status: 'PAID' });
    const q = new URL(f.mock.calls[0][0]).searchParams;
    expect(q.get('cursor')).toBe('a+b/c==');
    expect(q.get('status')).toBe('PAID');
  });

  it('labels statuses', () => {
    expect(orderStatusLabel('PENDING_PAYMENT')).toBe('Payment Pending');
    expect(orderStatusLabel('PARTIALLY_REFUNDED')).toBe('Partially Refunded');
  });
});
