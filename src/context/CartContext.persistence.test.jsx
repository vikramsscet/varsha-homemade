// Uses the real cartApi with a stubbed fetch to check the context and Phase 2 layers together,
// including the exact identity headers that cross the wire.
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { CartProvider, useCart } from './CartContext';
import { tokenStorage } from '../services/tokenStorage';
import { clearAnonymousCartId, getAnonymousCartId, setAnonymousCartId } from '../services/anonCartStorage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const authState = { status: 'unauthenticated', user: null };
vi.mock('./AuthContext', () => ({ useAuth: () => authState }));

const ANON = '11111111-aaaa-4bbb-8ccc-222222222222';
const json = (status, data) => ({ ok: true, status, headers: { get: () => null }, json: async () => ({ success: true, data, message: '' }) });

function mount(autoLoad = false) {
  const box = {};
  const Probe = () => { box.ctx = useCart(); return null; };
  const element = () => React.createElement(CartProvider, { autoLoad }, React.createElement(Probe));
  let renderer;
  act(() => { renderer = TestRenderer.create(element()); });
  return { box, rerender: () => act(() => renderer.update(element())) };
}

beforeEach(() => {
  vi.stubEnv('VITE_USER_SERVICE_URL', 'http://svc.test');
  Object.assign(authState, { status: 'unauthenticated', user: null });
  tokenStorage.clear();
  clearAnonymousCartId();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it('a new guest gets a backend-issued anonymous id, and later calls use cart.id in the path and the anonymous header', async () => {
  const created = { id: 'db-cart-id', anonymousId: ANON, items: [], itemCount: 0 };
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(json(201, created))
    .mockResolvedValueOnce(json(200, { ...created, itemCount: 1 }));
  vi.stubGlobal('fetch', fetchMock);

  const { box } = mount();
  await act(async () => { await box.ctx.addItem('p1', 1); });

  expect(getAnonymousCartId()).toBe(ANON);
  expect(getAnonymousCartId()).not.toBe(box.ctx.cart.id);
  const [createCall, addCall] = fetchMock.mock.calls;
  expect(createCall[0]).toBe('http://svc.test/api/v1/carts');
  expect(createCall[1].headers['X-Anonymous-Cart-ID']).toBeUndefined();
  expect(addCall[0]).toBe('http://svc.test/api/v1/carts/db-cart-id/items');
  expect(addCall[1].headers['X-Anonymous-Cart-ID']).toBe(ANON);
  expect(JSON.parse(addCall[1].body)).toEqual({ productId: 'p1', quantity: 1 });
  expect(box.ctx.itemCount).toBe(1);
});

it('login merges at the wire with both identities and no body, then uses Bearer only', async () => {
  const guestCart = { id: 'guest-db', anonymousId: ANON, itemCount: 2, items: [{ id: 'i1' }] };
  const mergedCart = { id: 'user-cart', ownerType: 'USER', itemCount: 3, items: [] };
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(json(200, guestCart)) // guest load on mount
    .mockResolvedValueOnce(json(200, mergedCart)) // the merge
    .mockResolvedValueOnce(json(200, mergedCart)); // a later authenticated refresh
  vi.stubGlobal('fetch', fetchMock);
  setAnonymousCartId(ANON);

  const { box, rerender } = mount(true);
  await act(async () => {});
  expect(box.ctx.cart.id).toBe('guest-db');
  const guestCall = fetchMock.mock.calls[0];
  expect(guestCall[1].headers['X-Anonymous-Cart-ID']).toBe(ANON);
  expect(guestCall[1].headers.Authorization).toBeUndefined();

  Object.assign(authState, { status: 'authenticated', user: { id: 'u1' } });
  tokenStorage.set('tok');
  await act(async () => { rerender(); });

  const [mergeUrl, mergeInit] = fetchMock.mock.calls[1];
  expect(mergeUrl).toBe('http://svc.test/api/v1/carts/guest-db/merge'); // the DB id, not the anon id
  expect(mergeInit.method).toBe('POST');
  expect(mergeInit.body).toBeUndefined();
  expect(mergeInit.headers.Authorization).toBe('Bearer tok');
  expect(mergeInit.headers['X-Anonymous-Cart-ID']).toBe(ANON);
  expect(box.ctx.cart.id).toBe('user-cart');
  expect(box.ctx.itemCount).toBe(3);
  expect(box.ctx.mergeStatus).toBe('merged');
  expect(getAnonymousCartId()).toBeNull(); // cleared only after the committed merge

  await act(async () => { await box.ctx.refreshCart(); });
  const refreshCall = fetchMock.mock.calls[2];
  expect(refreshCall[1].headers.Authorization).toBe('Bearer tok');
  expect(refreshCall[1].headers['X-Anonymous-Cart-ID']).toBeUndefined();
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
