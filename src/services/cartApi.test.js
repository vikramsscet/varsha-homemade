import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addItem, clearCart, createCart, deleteCart, getCart, getCurrentCart, mergeCart, removeItem, updateItem } from './cartApi';
import { ApiError, setUnauthorizedHandler } from './apiClient';
import { tokenStorage } from './tokenStorage';
import { clearAnonymousCartId, getAnonymousCartId, setAnonymousCartId } from './anonCartStorage';

const ANON = '11111111-aaaa-4bbb-8ccc-222222222222';
const OTHER = '99999999-aaaa-4bbb-8ccc-888888888888';
const CART = { id: 'cart-uuid', ownerType: 'ANONYMOUS', anonymousId: ANON, items: [], itemCount: 0 };
const res = (status, body, headers = {}) => ({ ok: status < 400, status, json: async () => body, headers: { get: (n) => headers[n] ?? null } });
const ok = (data = CART, status = 200, headers) => res(status, { success: true, data, message: 'Success' }, headers);
const fail = (status, code) => res(status, { success: false, error: { code, message: code } });

let fetchMock;
const call = (i = 0) => ({ url: fetchMock.mock.calls[i][0], init: fetchMock.mock.calls[i][1] });

beforeEach(() => {
  vi.stubEnv('VITE_USER_SERVICE_URL', 'http://svc.test');
  tokenStorage.clear();
  clearAnonymousCartId();
  fetchMock = vi.fn().mockResolvedValue(ok());
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
});

describe('URLs and methods', () => {
  it('builds /api/v1/carts from a host-only base, and does not duplicate a prefix', async () => {
    await createCart();
    expect(call().url).toBe('http://svc.test/api/v1/carts');
    vi.stubEnv('VITE_USER_SERVICE_URL', 'http://svc.test/api/v1/');
    await getCurrentCart();
    expect(call(1).url).toBe('http://svc.test/api/v1/carts/current');
  });

  it('uses the right method, path and body for each operation', async () => {
    await createCart();
    await getCurrentCart();
    await getCart('c 1');
    await deleteCart('c1');
    await addItem('c1', { productId: 'p1', quantity: 3 });
    await updateItem('c1', 'i1', 2);
    await removeItem('c1', 'i1');
    await clearCart('c1');
    const seen = fetchMock.mock.calls.map(([url, init]) => [init.method, url.replace('http://svc.test/api/v1', ''), init.body]);
    expect(seen).toEqual([
      ['POST', '/carts', undefined],
      ['GET', '/carts/current', undefined],
      ['GET', '/carts/c%201', undefined],
      ['DELETE', '/carts/c1', undefined],
      ['POST', '/carts/c1/items', JSON.stringify({ productId: 'p1', quantity: 3 })],
      ['PATCH', '/carts/c1/items/i1', JSON.stringify({ quantity: 2 })],
      ['DELETE', '/carts/c1/items/i1', undefined],
      ['DELETE', '/carts/c1/items', undefined],
    ]);
  });

  it('addItem defaults quantity to 1 and sends no pricing fields', async () => {
    await addItem('c1', { productId: 'p1' });
    expect(JSON.parse(call().init.body)).toEqual({ productId: 'p1', quantity: 1 });
    await updateItem('c1', 'i1', 5);
    expect(Object.keys(JSON.parse(call(1).init.body))).toEqual(['quantity']);
  });

  it('rejects invalid input locally without a request', () => {
    expect(() => addItem('c1', {})).toThrow(ApiError);
    expect(() => addItem('c1', { productId: 'p', quantity: 0 })).toThrow(ApiError);
    expect(() => addItem('c1', { productId: 'p', quantity: 100 })).toThrow(ApiError);
    expect(() => addItem('c1', { productId: 'p', quantity: 1.5 })).toThrow(ApiError);
    expect(() => updateItem('c1', 'i1', 0)).toThrow(ApiError);
    expect(() => removeItem('', 'i1')).toThrow(ApiError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('identity headers', () => {
  it('signed in: Bearer only, even if an anonymous id is stored', async () => {
    tokenStorage.set('tok');
    setAnonymousCartId(ANON);
    await getCurrentCart();
    const h = call().init.headers;
    expect(h.Authorization).toBe('Bearer tok');
    expect(h['X-Anonymous-Cart-ID']).toBeUndefined();
  });

  it('anonymous with stored id: anonymous header only', async () => {
    setAnonymousCartId(ANON);
    await getCurrentCart();
    const h = call().init.headers;
    expect(h['X-Anonymous-Cart-ID']).toBe(ANON);
    expect(h.Authorization).toBeUndefined();
  });

  it('no identity: neither header', async () => {
    await createCart();
    const h = call().init.headers;
    expect(h.Authorization).toBeUndefined();
    expect(h['X-Anonymous-Cart-ID']).toBeUndefined();
  });

  it('merge sends both headers and no body, and does not clear the anonymous id', async () => {
    tokenStorage.set('tok');
    setAnonymousCartId(ANON);
    await mergeCart('anon-cart-db-id');
    const { url, init } = call();
    expect(url).toBe('http://svc.test/api/v1/carts/anon-cart-db-id/merge');
    expect(init.method).toBe('POST');
    expect(init.body).toBeUndefined();
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.headers['X-Anonymous-Cart-ID']).toBe(ANON);
    expect(getAnonymousCartId()).toBe(ANON);
  });

  it('merge without both identities fails locally', () => {
    tokenStorage.set('tok');
    expect(() => mergeCart('c')).toThrow(expect.objectContaining({ code: 'MERGE_IDENTITY_MISSING' }));
    tokenStorage.clear();
    setAnonymousCartId(ANON);
    expect(() => mergeCart('c')).toThrow(expect.objectContaining({ code: 'MERGE_IDENTITY_MISSING' }));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('createCart anonymous id persistence', () => {
  it('persists the id from the body and keeps it distinct from cart.id', async () => {
    fetchMock.mockResolvedValue(ok(CART, 201));
    const cart = await createCart();
    expect(cart).toEqual(CART);
    expect(getAnonymousCartId()).toBe(ANON);
    expect(getAnonymousCartId()).not.toBe(cart.id);
  });

  it('falls back to the response header when the body has no id', async () => {
    fetchMock.mockResolvedValue(ok({ ...CART, anonymousId: null }, 201, { 'X-Anonymous-Cart-ID': ANON }));
    await createCart();
    expect(getAnonymousCartId()).toBe(ANON);
  });

  it('prefers the body when body and header disagree', async () => {
    fetchMock.mockResolvedValue(ok(CART, 201, { 'X-Anonymous-Cart-ID': OTHER }));
    await createCart();
    expect(getAnonymousCartId()).toBe(ANON);
  });

  it('ignores an invalid id from the body and uses a valid header', async () => {
    fetchMock.mockResolvedValue(ok({ ...CART, anonymousId: 'bad id!' }, 201, { 'X-Anonymous-Cart-ID': OTHER }));
    await createCart();
    expect(getAnonymousCartId()).toBe(OTHER);
  });

  it('never replaces a valid stored id with a different one', async () => {
    setAnonymousCartId(OTHER);
    await createCart();
    expect(call().init.headers['X-Anonymous-Cart-ID']).toBe(OTHER);
    expect(getAnonymousCartId()).toBe(OTHER);
  });

  it('does not persist anything for a signed-in user', async () => {
    tokenStorage.set('tok');
    fetchMock.mockResolvedValue(ok({ ...CART, ownerType: 'USER', anonymousId: ANON }));
    await createCart();
    expect(getAnonymousCartId()).toBeNull();
  });

  it('does not persist or clear anything when the request fails', async () => {
    setAnonymousCartId(OTHER);
    fetchMock.mockResolvedValue(fail(400, 'INVALID_ANONYMOUS_CART_ID'));
    await expect(createCart()).rejects.toMatchObject({ code: 'INVALID_ANONYMOUS_CART_ID' });
    expect(getAnonymousCartId()).toBe(OTHER);
  });
});

describe('responses and errors', () => {
  it('returns the cart object, including data: {} on delete', async () => {
    fetchMock.mockResolvedValueOnce(ok({ ...CART, itemCount: 2 }));
    expect((await getCart('c1')).itemCount).toBe(2);
    fetchMock.mockResolvedValueOnce(ok({}));
    expect(await deleteCart('c1')).toEqual({});
  });

  it.each([
    [400, 'INVALID_REQUEST'], [400, 'INVALID_ANONYMOUS_CART_ID'], [404, 'CART_NOT_FOUND'],
    [404, 'CART_ITEM_NOT_FOUND'], [404, 'PRODUCT_NOT_FOUND'], [409, 'CART_NOT_ACTIVE'],
    [422, 'QUANTITY_LIMIT_EXCEEDED'], [422, 'CART_ITEM_LIMIT_EXCEEDED'],
    [502, 'PRODUCT_SERVICE_UNAVAILABLE'], [502, 'PRODUCT_SERVICE_INVALID_RESPONSE'],
  ])('preserves %i %s', async (status, code) => {
    fetchMock.mockResolvedValue(fail(status, code));
    await expect(addItem('c1', { productId: 'p1' })).rejects.toMatchObject({ status, code });
  });

  it.each([429, 500])('preserves status %i without a code', async (status) => {
    fetchMock.mockResolvedValue(res(status, null));
    await expect(getCurrentCart()).rejects.toMatchObject({ status, code: 'UNKNOWN_ERROR' });
  });

  it('does not retry or silently create a cart after CART_NOT_FOUND', async () => {
    fetchMock.mockResolvedValue(fail(404, 'CART_NOT_FOUND'));
    await expect(getCurrentCart()).rejects.toMatchObject({ code: 'CART_NOT_FOUND' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('does not retry a failed mutation', async () => {
    fetchMock.mockResolvedValue(fail(502, 'PRODUCT_SERVICE_UNAVAILABLE'));
    await expect(addItem('c1', { productId: 'p1' })).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('an authenticated 401 still reaches the global handler', async () => {
    tokenStorage.set('tok');
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValue(fail(401, 'UNAUTHORIZED'));
    await expect(getCurrentCart()).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not log ids or tokens', async () => {
    const spies = ['log', 'warn', 'error', 'info'].map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
    tokenStorage.set('secret-token');
    setAnonymousCartId(ANON);
    fetchMock.mockResolvedValue(fail(500, 'INTERNAL_ERROR'));
    await getCurrentCart().catch(() => {});
    const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(logged).not.toContain(ANON);
    expect(logged).not.toContain('secret-token');
  });
});
