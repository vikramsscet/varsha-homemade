import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider, useCart } from './CartContext';
import * as cartApi from '../services/cartApi';
import { ApiError } from '../services/apiClient';
import { tokenStorage } from '../services/tokenStorage';
import { clearAnonymousCartId, getAnonymousCartId, setAnonymousCartId } from '../services/anonCartStorage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const auth = { status: 'unauthenticated', user: null };
vi.mock('./AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../services/cartApi');

const ANON = '11111111-aaaa-4bbb-8ccc-222222222222';
const cart = (over = {}) => ({ id: 'cart-1', ownerType: 'ANONYMOUS', itemCount: 0, items: [], totalAmount: 0, currency: 'INR', ...over });
const apiError = (status, code) => new ApiError({ status, code, message: code });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

function mount(autoLoad = false) {
  const box = {};
  const Probe = () => { box.ctx = useCart(); return null; };
  const element = () => React.createElement(CartProvider, { autoLoad }, React.createElement(Probe));
  let renderer;
  act(() => { renderer = TestRenderer.create(element()); });
  return { box, rerender: () => act(() => renderer.update(element())), unmount: () => act(() => renderer.unmount()) };
}
const run = async (fn) => { let out; await act(async () => { out = await fn(); }); return out; };
const settle = (p) => p.then(() => 'ok', (e) => e);

beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(auth, { status: 'unauthenticated', user: null });
  tokenStorage.clear();
  clearAnonymousCartId();
  setAnonymousCartId(ANON);
});
afterEach(() => vi.restoreAllMocks());

describe('useCart', () => {
  it('throws outside the provider', () => {
    const Bad = () => { useCart(); return null; };
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => act(() => { TestRenderer.create(React.createElement(Bad)); })).toThrow(/CartProvider/);
  });

  it('exposes safe defaults before a cart exists', () => {
    const { box } = mount();
    expect(box.ctx).toMatchObject({ cart: null, status: 'idle', items: [], itemCount: 0, subtotal: 0, discountAmount: 0, taxAmount: 0, totalAmount: 0, currency: 'INR', pendingOps: [] });
  });
});

describe('ensureCart', () => {
  it('loads an existing active cart', async () => {
    cartApi.getCurrentCart.mockResolvedValue(cart({ itemCount: 2, totalAmount: 500 }));
    const { box } = mount();
    const result = await run(() => box.ctx.ensureCart());
    expect(result.id).toBe('cart-1');
    expect(box.ctx).toMatchObject({ status: 'ready', itemCount: 2, totalAmount: 500 });
    expect(cartApi.createCart).not.toHaveBeenCalled();
  });

  it('creates a cart after 404 CART_NOT_FOUND', async () => {
    cartApi.getCurrentCart.mockRejectedValue(apiError(404, 'CART_NOT_FOUND'));
    cartApi.createCart.mockResolvedValue(cart({ id: 'new' }));
    const { box } = mount();
    await run(() => box.ctx.ensureCart());
    expect(box.ctx.cart.id).toBe('new');
    expect(cartApi.createCart).toHaveBeenCalledTimes(1);
  });

  it('creates a cart directly for a guest with no identity yet', async () => {
    clearAnonymousCartId();
    cartApi.createCart.mockResolvedValue(cart());
    const { box } = mount();
    await run(() => box.ctx.ensureCart());
    expect(cartApi.getCurrentCart).not.toHaveBeenCalled();
    expect(cartApi.createCart).toHaveBeenCalledTimes(1);
  });

  it('concurrent calls share one request, and later calls reuse the loaded cart', async () => {
    const d = deferred();
    cartApi.getCurrentCart.mockReturnValue(d.promise);
    const { box } = mount();
    let results;
    await act(async () => {
      const calls = Promise.all([box.ctx.ensureCart(), box.ctx.ensureCart(), box.ctx.refreshCart()]);
      d.resolve(cart());
      results = await calls;
    });
    expect(cartApi.getCurrentCart).toHaveBeenCalledTimes(1);
    expect(results.every((c) => c.id === 'cart-1')).toBe(true);
    await run(() => box.ctx.ensureCart());
    expect(cartApi.getCurrentCart).toHaveBeenCalledTimes(1);
  });

  it('a failed init is retryable and keeps the original error', async () => {
    cartApi.getCurrentCart.mockRejectedValueOnce(apiError(502, 'PRODUCT_SERVICE_UNAVAILABLE')).mockResolvedValueOnce(cart());
    const { box } = mount();
    const err = await run(() => settle(box.ctx.ensureCart()));
    expect(err).toMatchObject({ status: 502, code: 'PRODUCT_SERVICE_UNAVAILABLE' });
    expect(box.ctx).toMatchObject({ status: 'error', error: { status: 502, code: 'PRODUCT_SERVICE_UNAVAILABLE' } });
    await run(() => box.ctx.ensureCart());
    expect(box.ctx.status).toBe('ready');
    expect(box.ctx.error).toBeNull();
  });

  it('INVALID_ANONYMOUS_CART_ID clears the stored id and starts a fresh cart', async () => {
    cartApi.getCurrentCart.mockRejectedValue(apiError(400, 'INVALID_ANONYMOUS_CART_ID'));
    cartApi.createCart.mockResolvedValue(cart({ id: 'fresh' }));
    const { box } = mount();
    await run(() => box.ctx.ensureCart());
    expect(getAnonymousCartId()).toBeNull();
    expect(box.ctx.cart.id).toBe('fresh');
  });

  it('401 is surfaced: no guest retry and no cart creation', async () => {
    cartApi.getCurrentCart.mockRejectedValue(apiError(401, 'UNAUTHORIZED'));
    const { box } = mount();
    const err = await run(() => settle(box.ctx.ensureCart()));
    expect(err).toMatchObject({ status: 401 });
    expect(cartApi.getCurrentCart).toHaveBeenCalledTimes(1);
    expect(cartApi.createCart).not.toHaveBeenCalled();
    expect(getAnonymousCartId()).toBe(ANON);
  });

  it('refreshCart replaces the cart; a failed refresh keeps the old one', async () => {
    cartApi.getCurrentCart.mockResolvedValueOnce(cart({ itemCount: 1 })).mockResolvedValueOnce(cart({ itemCount: 3 })).mockRejectedValueOnce(apiError(500, 'INTERNAL_ERROR'));
    const { box } = mount();
    await run(() => box.ctx.ensureCart());
    await run(() => box.ctx.refreshCart());
    expect(box.ctx.itemCount).toBe(3);
    await run(() => settle(box.ctx.refreshCart()));
    expect(box.ctx).toMatchObject({ itemCount: 3, status: 'ready', error: { status: 500 } });
  });
});

describe('mutations', () => {
  beforeEach(() => cartApi.getCurrentCart.mockResolvedValue(cart()));

  it('addItem uses cart.id, productId and quantity, and stores the server response untouched', async () => {
    const server = cart({ itemCount: 2, subtotal: 1, totalAmount: 777, items: [{ id: 'i1', productId: 'p1', quantity: 2 }] });
    cartApi.addItem.mockResolvedValue(server);
    const { box } = mount();
    const returned = await run(() => box.ctx.addItem('p1', 2));
    expect(cartApi.addItem).toHaveBeenCalledWith('cart-1', { productId: 'p1', quantity: 2 });
    expect(returned).toBe(server);
    expect(box.ctx.cart).toBe(server);
    expect(box.ctx.totalAmount).toBe(777); // not recomputed from items
    expect(box.ctx.pendingOps).toEqual([]);
  });

  it('addItem defaults quantity to 1', async () => {
    cartApi.addItem.mockResolvedValue(cart());
    const { box } = mount();
    await run(() => box.ctx.addItem('p1'));
    expect(cartApi.addItem).toHaveBeenCalledWith('cart-1', { productId: 'p1', quantity: 1 });
  });

  it('updateItem passes the absolute quantity; removeItem and clear call their APIs', async () => {
    cartApi.updateItem.mockResolvedValue(cart({ itemCount: 5 }));
    cartApi.removeItem.mockResolvedValue(cart({ itemCount: 4 }));
    cartApi.clearCart.mockResolvedValue(cart({ itemCount: 0 }));
    const { box } = mount();
    await run(() => box.ctx.updateItem('i1', 5));
    expect(cartApi.updateItem).toHaveBeenCalledWith('cart-1', 'i1', 5);
    expect(box.ctx.itemCount).toBe(5);
    await run(() => box.ctx.removeItem('i1'));
    expect(cartApi.removeItem).toHaveBeenCalledWith('cart-1', 'i1');
    expect(box.ctx.itemCount).toBe(4);
    await run(() => box.ctx.clear());
    expect(cartApi.clearCart).toHaveBeenCalledWith('cart-1');
    expect(box.ctx.itemCount).toBe(0);
  });

  it('rejects invalid arguments before any request or cart creation', async () => {
    const { box } = mount();
    const results = await run(() => Promise.all([
      settle(box.ctx.addItem('', 1)), settle(box.ctx.addItem('p', 0)), settle(box.ctx.addItem('p', 100)),
      settle(box.ctx.addItem('p', 1.5)), settle(box.ctx.updateItem('i', 0)), settle(box.ctx.updateItem('', 1)), settle(box.ctx.removeItem('')),
    ]));
    results.forEach((r) => expect(r).toMatchObject({ code: 'INVALID_REQUEST' }));
    expect(cartApi.getCurrentCart).not.toHaveBeenCalled();
    expect(cartApi.addItem).not.toHaveBeenCalled();
  });

  it('a failed mutation keeps the last confirmed cart, the backend error, and is not retried', async () => {
    const confirmed = cart({ itemCount: 1 });
    cartApi.getCurrentCart.mockResolvedValue(confirmed);
    cartApi.addItem.mockRejectedValue(apiError(422, 'QUANTITY_LIMIT_EXCEEDED'));
    const { box } = mount();
    await run(() => box.ctx.ensureCart());
    const err = await run(() => settle(box.ctx.addItem('p1', 99)));
    expect(err).toMatchObject({ status: 422, code: 'QUANTITY_LIMIT_EXCEEDED' });
    expect(box.ctx.cart).toBe(confirmed);
    expect(box.ctx.error).toMatchObject({ code: 'QUANTITY_LIMIT_EXCEEDED' });
    expect(box.ctx.pendingOps).toEqual([]);
    expect(cartApi.addItem).toHaveBeenCalledTimes(1);
  });

  it('does not recover CART_NOT_ACTIVE / CART_NOT_FOUND by replaying or creating', async () => {
    cartApi.addItem.mockRejectedValueOnce(apiError(409, 'CART_NOT_ACTIVE')).mockRejectedValueOnce(apiError(404, 'CART_NOT_FOUND'));
    const { box } = mount();
    await run(() => settle(box.ctx.addItem('p1')));
    await run(() => settle(box.ctx.addItem('p1')));
    expect(cartApi.addItem).toHaveBeenCalledTimes(2); // one call per user action, no replays
    expect(cartApi.createCart).not.toHaveBeenCalled();
  });

  it('CART_ITEM_NOT_FOUND refreshes the cart and still surfaces the error', async () => {
    cartApi.updateItem.mockRejectedValue(apiError(404, 'CART_ITEM_NOT_FOUND'));
    const { box } = mount();
    await run(() => box.ctx.ensureCart());
    cartApi.getCurrentCart.mockResolvedValue(cart({ itemCount: 7 }));
    const err = await run(() => settle(box.ctx.updateItem('gone', 2)));
    expect(err).toMatchObject({ code: 'CART_ITEM_NOT_FOUND' });
    expect(box.ctx.itemCount).toBe(7);
  });

  it('a 401 on a mutation is surfaced with no guest retry', async () => {
    cartApi.addItem.mockRejectedValue(apiError(401, 'UNAUTHORIZED'));
    const { box } = mount();
    const err = await run(() => settle(box.ctx.addItem('p1')));
    expect(err).toMatchObject({ status: 401 });
    expect(cartApi.addItem).toHaveBeenCalledTimes(1);
    expect(cartApi.createCart).not.toHaveBeenCalled();
  });

  it('INVALID_ANONYMOUS_CART_ID on a mutation clears the stored id', async () => {
    cartApi.addItem.mockRejectedValue(apiError(400, 'INVALID_ANONYMOUS_CART_ID'));
    const { box } = mount();
    await run(() => settle(box.ctx.addItem('p1')));
    expect(getAnonymousCartId()).toBeNull();
  });

  it('serializes mutations: the second request starts only after the first response is applied', async () => {
    const first = deferred();
    const second = deferred();
    cartApi.addItem.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { box } = mount();
    let p1, p2;
    await act(async () => { p1 = box.ctx.addItem('p1'); p2 = box.ctx.addItem('p2'); });
    expect(box.ctx.pendingOps.map((o) => o.productId)).toEqual(['p1', 'p2']);
    expect(cartApi.addItem).toHaveBeenCalledTimes(1);
    await act(async () => { first.resolve(cart({ itemCount: 1 })); await p1; });
    expect(cartApi.addItem).toHaveBeenCalledTimes(2);
    expect(cartApi.addItem.mock.calls[1][1].productId).toBe('p2');
    await act(async () => { second.resolve(cart({ itemCount: 2 })); await p2; });
    expect(box.ctx.itemCount).toBe(2);
    expect(box.ctx.pendingOps).toEqual([]);
  });

  it('a refresh response that started earlier cannot overwrite a newer mutation result', async () => {
    const refresh = deferred();
    cartApi.getCurrentCart.mockResolvedValueOnce(cart({ itemCount: 0 }));
    cartApi.addItem.mockResolvedValue(cart({ itemCount: 3 }));
    const { box } = mount();
    await run(() => box.ctx.ensureCart());
    cartApi.getCurrentCart.mockReturnValueOnce(refresh.promise);
    let pr;
    await act(async () => { pr = box.ctx.refreshCart(); });
    await run(() => box.ctx.addItem('p1'));
    await act(async () => { refresh.resolve(cart({ itemCount: 0 })); await pr; });
    expect(box.ctx.itemCount).toBe(3);
  });
});

describe('authentication awareness', () => {
  it('does not initialize a guest cart while auth is bootstrapping', async () => {
    auth.status = 'loading';
    cartApi.getCurrentCart.mockResolvedValue(cart({ ownerType: 'USER' }));
    const { box, rerender } = mount();
    let pending;
    await act(async () => { pending = box.ctx.ensureCart(); });
    expect(cartApi.getCurrentCart).not.toHaveBeenCalled();
    expect(cartApi.createCart).not.toHaveBeenCalled();
    expect(box.ctx.status).toBe('idle');
    Object.assign(auth, { status: 'authenticated', user: { id: 'u1' } });
    tokenStorage.set('tok');
    await act(async () => { rerender(); await pending; });
    expect(cartApi.getCurrentCart).toHaveBeenCalledTimes(1);
    expect(box.ctx.cart.ownerType).toBe('USER');
  });

  it('mutations queued during bootstrap run once auth settles', async () => {
    auth.status = 'loading';
    cartApi.getCurrentCart.mockResolvedValue(cart());
    cartApi.addItem.mockResolvedValue(cart({ itemCount: 1 }));
    const { box, rerender } = mount();
    let p;
    await act(async () => { p = box.ctx.addItem('p1'); });
    expect(cartApi.addItem).not.toHaveBeenCalled();
    auth.status = 'unauthenticated';
    await act(async () => { rerender(); await p; });
    expect(cartApi.addItem).toHaveBeenCalledTimes(1);
    expect(box.ctx.itemCount).toBe(1);
  });

  it('an identity change hides the previous cart and reinitializes under the new identity', async () => {
    cartApi.getCurrentCart.mockResolvedValueOnce(cart({ id: 'guest-cart', itemCount: 4 }));
    const { box, rerender } = mount();
    await run(() => box.ctx.ensureCart());
    expect(box.ctx.cart.id).toBe('guest-cart');

    Object.assign(auth, { status: 'authenticated', user: { id: 'u1' } });
    rerender();
    expect(box.ctx).toMatchObject({ cart: null, status: 'idle', itemCount: 0 });

    cartApi.getCurrentCart.mockResolvedValueOnce(cart({ id: 'user-cart', ownerType: 'USER' }));
    await run(() => box.ctx.ensureCart());
    expect(box.ctx.cart.id).toBe('user-cart');
    expect(getAnonymousCartId()).toBe(ANON); // merge/cleanup belongs to a later phase
  });

  it('a response that arrives after an identity change is discarded', async () => {
    const old = deferred();
    cartApi.getCurrentCart.mockReturnValueOnce(old.promise);
    const { box, rerender } = mount();
    let pending;
    await act(async () => { pending = settle(box.ctx.ensureCart()); });
    Object.assign(auth, { status: 'authenticated', user: { id: 'u1' } });
    rerender();
    await act(async () => { old.resolve(cart({ id: 'guest-cart' })); await pending; });
    expect(box.ctx.cart).toBeNull();
    cartApi.getCurrentCart.mockResolvedValueOnce(cart({ id: 'user-cart' }));
    await run(() => box.ctx.ensureCart());
    expect(box.ctx.cart.id).toBe('user-cart');
  });
});

describe('autoLoad', () => {
  it('loads an existing cart once for a returning guest, without creating one', async () => {
    cartApi.getCurrentCart.mockResolvedValue(cart({ itemCount: 3 }));
    let m;
    await act(async () => { m = mount(true); });
    expect(cartApi.getCurrentCart).toHaveBeenCalledTimes(1);
    expect(cartApi.createCart).not.toHaveBeenCalled();
    expect(m.box.ctx.itemCount).toBe(3);
    await act(async () => { m.rerender(); });
    expect(cartApi.getCurrentCart).toHaveBeenCalledTimes(1);
  });

  it('does nothing for a brand-new visitor', async () => {
    clearAnonymousCartId();
    await act(async () => { mount(true); });
    expect(cartApi.getCurrentCart).not.toHaveBeenCalled();
    expect(cartApi.createCart).not.toHaveBeenCalled();
  });

  it('waits for auth bootstrap, then loads for the signed-in user', async () => {
    auth.status = 'loading';
    tokenStorage.set('tok');
    cartApi.getCurrentCart.mockResolvedValue(cart({ itemCount: 2 }));
    let m;
    await act(async () => { m = mount(true); });
    expect(cartApi.getCurrentCart).not.toHaveBeenCalled();
    Object.assign(auth, { status: 'authenticated', user: { id: 'u1' } });
    await act(async () => { m.rerender(); });
    expect(cartApi.getCurrentCart).toHaveBeenCalledTimes(1);
    expect(m.box.ctx.itemCount).toBe(2);
  });

  it('a failed auto-load is recorded, not retried, and does not throw', async () => {
    cartApi.getCurrentCart.mockRejectedValue(apiError(502, 'PRODUCT_SERVICE_UNAVAILABLE'));
    let m;
    await act(async () => { m = mount(true); });
    await act(async () => { m.rerender(); });
    expect(cartApi.getCurrentCart).toHaveBeenCalledTimes(1);
    expect(m.box.ctx).toMatchObject({ status: 'error', error: { code: 'PRODUCT_SERVICE_UNAVAILABLE' } });
  });
});

describe('guest cart merge on login', () => {
  const GUEST = () => cart({ id: 'guest-db-1', itemCount: 2, items: [{ id: 'i1' }] });
  const USER_CART = () => cart({ id: 'user-cart-1', ownerType: 'USER', itemCount: 5 });
  const signIn = () => {
    Object.assign(auth, { status: 'authenticated', user: { id: 'u1' } });
    tokenStorage.set('tok');
  };

  async function mountAsGuestWithCart() {
    cartApi.getCurrentCart.mockResolvedValueOnce(GUEST());
    let m;
    await act(async () => { m = mount(true); });
    expect(m.box.ctx.cart.id).toBe('guest-db-1');
    return m;
  }

  it('merges with the guest cart DB id, commits the server cart, then clears the anonymous id', async () => {
    const m = await mountAsGuestWithCart();
    cartApi.mergeCart.mockResolvedValue(USER_CART());
    signIn();
    await act(async () => { m.rerender(); });
    expect(cartApi.mergeCart).toHaveBeenCalledTimes(1);
    expect(cartApi.mergeCart).toHaveBeenCalledWith('guest-db-1'); // DB id, not the anonymous id
    expect(m.box.ctx.cart.id).toBe('user-cart-1');
    expect(m.box.ctx.itemCount).toBe(5); // server count, nothing summed locally
    expect(m.box.ctx.mergeStatus).toBe('merged');
    expect(getAnonymousCartId()).toBeNull();
    // The merge result IS the authenticated load: no separate user-cart read raced with it.
    expect(cartApi.getCurrentCart).toHaveBeenCalledTimes(1);
  });

  it('never merges twice across extra renders and ensureCart calls (StrictMode safety)', async () => {
    const m = await mountAsGuestWithCart();
    cartApi.mergeCart.mockResolvedValue(USER_CART());
    signIn();
    await act(async () => { m.rerender(); });
    await act(async () => { m.rerender(); });
    await run(() => m.box.ctx.ensureCart());
    await run(() => m.box.ctx.ensureCart());
    expect(cartApi.mergeCart).toHaveBeenCalledTimes(1);
  });

  it('concurrent callers during the transition share one merge request', async () => {
    const m = await mountAsGuestWithCart();
    const d = deferred();
    cartApi.mergeCart.mockReturnValue(d.promise);
    signIn();
    let results;
    await act(async () => {
      m.rerender();
      const all = Promise.all([m.box.ctx.ensureCart(), m.box.ctx.refreshCart(), m.box.ctx.ensureCart()]);
      d.resolve(USER_CART());
      results = await all;
    });
    expect(cartApi.mergeCart).toHaveBeenCalledTimes(1);
    expect(results.every((c) => c.id === 'user-cart-1')).toBe(true);
  });

  it('signs in without an anonymous id: no merge, the user cart loads normally', async () => {
    clearAnonymousCartId();
    cartApi.getCurrentCart.mockResolvedValue(USER_CART());
    let m;
    await act(async () => { m = mount(true); });
    signIn();
    await act(async () => { m.rerender(); });
    expect(cartApi.mergeCart).not.toHaveBeenCalled();
    expect(cartApi.createCart).not.toHaveBeenCalled();
    expect(m.box.ctx.cart.id).toBe('user-cart-1');
    expect(m.box.ctx.mergeStatus).toBeNull();
  });

  it('skips the merge for a confirmed-empty guest cart and retires the anonymous id', async () => {
    cartApi.getCurrentCart
      .mockResolvedValueOnce(cart({ id: 'guest-db-1', itemCount: 0, items: [] }))
      .mockResolvedValueOnce(USER_CART());
    let m;
    await act(async () => { m = mount(true); });
    signIn();
    await act(async () => { m.rerender(); });
    expect(cartApi.mergeCart).not.toHaveBeenCalled();
    expect(getAnonymousCartId()).toBeNull();
    expect(m.box.ctx.cart.id).toBe('user-cart-1');
  });

  it('a failed merge keeps the anonymous id, loads the user cart, and never shows the guest cart', async () => {
    const m = await mountAsGuestWithCart();
    cartApi.mergeCart.mockRejectedValue(apiError(500, 'INTERNAL_ERROR'));
    cartApi.getCurrentCart.mockResolvedValue(USER_CART());
    signIn();
    await act(async () => { m.rerender(); });
    expect(getAnonymousCartId()).toBe(ANON); // preserved for recovery
    expect(m.box.ctx.cart.id).toBe('user-cart-1'); // authenticated state stays valid
    expect(m.box.ctx.mergeStatus).toBe('failed');
    expect(m.box.ctx.mergeError).toEqual({ code: 'INTERNAL_ERROR', retryable: true });
    // No automatic retry on later renders or reads.
    await act(async () => { m.rerender(); });
    await run(() => m.box.ctx.refreshCart());
    expect(cartApi.mergeCart).toHaveBeenCalledTimes(1);
  });

  it('a network failure behaves the same: no retry loop, identity preserved', async () => {
    const m = await mountAsGuestWithCart();
    cartApi.mergeCart.mockRejectedValue(apiError(0, 'NETWORK_ERROR'));
    cartApi.getCurrentCart.mockResolvedValue(USER_CART());
    signIn();
    await act(async () => { m.rerender(); });
    await act(async () => { m.rerender(); });
    expect(cartApi.mergeCart).toHaveBeenCalledTimes(1);
    expect(getAnonymousCartId()).toBe(ANON);
  });

  it('retryMerge re-attempts once, explicitly, and completes the lifecycle', async () => {
    const m = await mountAsGuestWithCart();
    cartApi.mergeCart.mockRejectedValueOnce(apiError(502, 'PRODUCT_SERVICE_UNAVAILABLE')).mockResolvedValueOnce(USER_CART());
    cartApi.getCurrentCart.mockResolvedValue(USER_CART());
    signIn();
    await act(async () => { m.rerender(); });
    expect(m.box.ctx.mergeStatus).toBe('failed');
    await run(() => m.box.ctx.retryMerge());
    expect(cartApi.mergeCart).toHaveBeenCalledTimes(2);
    expect(cartApi.mergeCart).toHaveBeenLastCalledWith('guest-db-1');
    expect(m.box.ctx.mergeStatus).toBe('merged');
    expect(getAnonymousCartId()).toBeNull();
    // A second retry has nothing to do.
    expect(await m.box.ctx.retryMerge()).toBeNull();
  });

  it('a dead-end merge error (guest cart gone or already merged) retires the id without a failure banner', async () => {
    const m = await mountAsGuestWithCart();
    cartApi.mergeCart.mockRejectedValue(apiError(409, 'CART_NOT_ACTIVE'));
    cartApi.getCurrentCart.mockResolvedValue(USER_CART());
    signIn();
    await act(async () => { m.rerender(); });
    expect(getAnonymousCartId()).toBeNull();
    expect(m.box.ctx.mergeStatus).not.toBe('failed');
    expect(m.box.ctx.cart.id).toBe('user-cart-1');
  });

  it('an unknown guest cart (load never finished) reports a non-retryable failure and keeps the id', async () => {
    cartApi.getCurrentCart.mockResolvedValue(USER_CART());
    const { box, rerender } = mount(); // autoLoad off: the guest cart was never loaded
    signIn();
    await act(async () => { rerender(); });
    expect(cartApi.mergeCart).not.toHaveBeenCalled();
    expect(getAnonymousCartId()).toBe(ANON);
    expect(box.ctx.mergeStatus).toBe('failed');
    expect(box.ctx.mergeError).toEqual({ code: 'MERGE_SOURCE_UNAVAILABLE', retryable: false });
    expect(await box.ctx.retryMerge()).toBeNull(); // nothing to retry against
  });
});

describe('logout lifecycle', () => {
  const signIn = () => {
    Object.assign(auth, { status: 'authenticated', user: { id: 'u1' } });
    tokenStorage.set('tok');
  };
  const signOut = () => {
    Object.assign(auth, { status: 'unauthenticated', user: null });
    tokenStorage.clear();
  };

  it('clears the previous user cart from state without merging or creating a guest cart', async () => {
    clearAnonymousCartId();
    signIn();
    cartApi.getCurrentCart.mockResolvedValue(cart({ id: 'user-cart-1', ownerType: 'USER', itemCount: 4 }));
    let m;
    await act(async () => { m = mount(true); });
    expect(m.box.ctx.itemCount).toBe(4);
    signOut();
    await act(async () => { m.rerender(); });
    expect(m.box.ctx).toMatchObject({ cart: null, status: 'idle', itemCount: 0 });
    expect(cartApi.mergeCart).not.toHaveBeenCalled();
    expect(cartApi.createCart).not.toHaveBeenCalled();
    expect(cartApi.getCurrentCart).toHaveBeenCalledTimes(1); // no guest load without an anon id
  });

  it('a delayed response from the signed-out user cannot restore their cart', async () => {
    clearAnonymousCartId();
    signIn();
    const d = deferred();
    cartApi.getCurrentCart.mockReturnValueOnce(d.promise);
    let m;
    await act(async () => { m = mount(true); });
    let pending;
    await act(async () => { pending = settle(m.box.ctx.ensureCart()); });
    signOut();
    await act(async () => { m.rerender(); });
    await act(async () => { d.resolve(cart({ id: 'user-cart-1', ownerType: 'USER', itemCount: 9 })); await pending; });
    expect(m.box.ctx.cart).toBeNull();
    expect(m.box.ctx.itemCount).toBe(0);
  });

  it('after a failed merge, signing out restores the guest cart (documented recovery path)', async () => {
    cartApi.getCurrentCart.mockResolvedValueOnce(cart({ id: 'guest-db-1', itemCount: 2 }));
    let m;
    await act(async () => { m = mount(true); });
    cartApi.mergeCart.mockRejectedValue(apiError(500, 'INTERNAL_ERROR'));
    cartApi.getCurrentCart.mockResolvedValue(cart({ id: 'user-cart-1', ownerType: 'USER' }));
    signIn();
    await act(async () => { m.rerender(); });
    expect(getAnonymousCartId()).toBe(ANON);
    signOut();
    cartApi.getCurrentCart.mockResolvedValue(cart({ id: 'guest-db-1', itemCount: 2 }));
    await act(async () => { m.rerender(); });
    expect(m.box.ctx.cart.id).toBe('guest-db-1'); // guest items are back, nothing was lost
    expect(cartApi.mergeCart).toHaveBeenCalledTimes(1); // logout never merges
  });
});
