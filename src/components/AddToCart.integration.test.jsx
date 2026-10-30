// Real CartProvider + real header badge; only the cart API is mocked.
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider } from '../context/CartContext';
import CartLink from './CartLink';
import { useAddToCart } from '../hooks/useAddToCart';
import * as cartApi from '../services/cartApi';
import { ApiError } from '../services/apiClient';
import { clearAnonymousCartId, setAnonymousCartId } from '../services/anonCartStorage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ status: 'unauthenticated', user: null }) }));
vi.mock('../services/cartApi');

const cart = (itemCount) => ({ id: 'cart-1', itemCount, items: [], totalAmount: 999 });
const hosts = (r, pred) => r.root.findAll((n) => typeof n.type === 'string' && pred(n.props));
const text = (n) => n.children.map((c) => (typeof c === 'string' ? c : text(c))).join('');
const badge = (r) => hosts(r, (p) => p.className === 'cart-badge').map(text)[0] ?? null;

let hook;
const Adder = () => { hook = useAddToCart(); return null; };

async function mount() {
  let r;
  await act(async () => {
    r = TestRenderer.create(
      <MemoryRouter><CartProvider autoLoad={false}><CartLink /><Adder /></CartProvider></MemoryRouter>
    );
  });
  return r;
}

beforeEach(() => {
  vi.resetAllMocks();
  clearAnonymousCartId();
  setAnonymousCartId('11111111-aaaa-4bbb-8ccc-222222222222');
  cartApi.getCurrentCart.mockResolvedValue(cart(1));
});

describe('add to cart -> context -> header badge', () => {
  it('updates the badge from the server-returned itemCount, not from local counting', async () => {
    cartApi.addItem.mockResolvedValue(cart(7)); // 1 + 2 would be 3; the server says 7
    const r = await mount();
    expect(badge(r)).toBeNull();
    await act(async () => { await hook.add('p1', 2); });
    expect(cartApi.addItem).toHaveBeenCalledWith('cart-1', { productId: 'p1', quantity: 2 });
    expect(badge(r)).toBe('7');
    expect(hook.feedback.type).toBe('success');
  });

  it('a failed add leaves the last confirmed cart and badge untouched, with no success message', async () => {
    cartApi.addItem.mockResolvedValueOnce(cart(4)).mockRejectedValueOnce(new ApiError({ status: 422, code: 'QUANTITY_LIMIT_EXCEEDED', message: 'x' }));
    const r = await mount();
    await act(async () => { await hook.add('p1', 4); });
    expect(badge(r)).toBe('4');
    await act(async () => { await hook.add('p1', 99); });
    expect(badge(r)).toBe('4');
    expect(hook.feedback).toMatchObject({ type: 'error', message: 'You can add at most 99 of each item.' });
    expect(cartApi.addItem).toHaveBeenCalledTimes(2);
  });
});

describe('update item -> context -> header badge', () => {
  it('updating an existing line flows through the real provider and the server count wins', async () => {
    cartApi.getCurrentCart.mockResolvedValue({ ...cart(2), items: [{ id: 'i1', productId: 'p1', quantity: 2 }] });
    cartApi.updateItem.mockResolvedValue(cart(5));
    const r = await mount();
    await act(async () => { await hook.update('i1', 5); });
    expect(cartApi.updateItem).toHaveBeenCalledWith('cart-1', 'i1', 5);
    expect(cartApi.addItem).not.toHaveBeenCalled(); // no duplicate line
    expect(badge(r)).toBe('5');
    expect(hook.feedback).toMatchObject({ type: 'success', message: 'Cart updated.' });
  });

  it('a failed update keeps the confirmed badge and reports an error', async () => {
    cartApi.getCurrentCart.mockResolvedValue({ ...cart(2), items: [{ id: 'i1', productId: 'p1', quantity: 2 }] });
    cartApi.updateItem.mockRejectedValue(new ApiError({ status: 404, code: 'CART_ITEM_NOT_FOUND', message: 'x' }));
    const r = await mount();
    await act(async () => { await hook.update('i1', 5); });
    expect(badge(r)).toBe('2');
    expect(hook.feedback.type).toBe('error');
  });
});
