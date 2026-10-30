// Real CartProvider + real CartLink badge + real CartPage; only cartApi is mocked.
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CartPage from './Cart';
import CartLink from '../../components/CartLink';
import { CartProvider } from '../../context/CartContext';
import * as cartApi from '../../services/cartApi';
import { ApiError } from '../../services/apiClient';
import { clearAnonymousCartId, setAnonymousCartId } from '../../services/anonCartStorage';
import { tokenStorage } from '../../services/tokenStorage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ status: 'unauthenticated', user: null }) }));
vi.mock('../../services/cartApi');

const item = (over = {}) => ({ id: 'i1', productId: 'p1', productName: 'Kaju Katli', unitPrice: 250, quantity: 2, totalPrice: 500, ...over });
const fx = (items, extra = {}) => ({
  id: 'cart-1', currency: 'INR', status: 'ACTIVE',
  items, itemCount: items.reduce((n, i) => n + i.quantity, 0), // fixture math only; UI must echo these fields
  subtotal: 0, discountAmount: 0, taxAmount: 0, totalAmount: 0, ...extra,
});

const hosts = (r, pred) => r.root.findAll((n) => typeof n.type === 'string' && pred(n.props));
const text = (n) => n.children.map((c) => (typeof c === 'string' ? c : text(c))).join('');
const badge = (r) => hosts(r, (p) => p.className === 'cart-badge').map(text)[0] ?? null;
const byLabel = (r, label) => hosts(r, (p) => p['aria-label'] === label)[0];
const click = async (n) => { await act(async () => { n.props.onClick(); }); };
const pageText = (r) => text(r.root.findAll((n) => n.type === 'main')[0]);

async function mount() {
  let r;
  await act(async () => {
    r = TestRenderer.create(
      <MemoryRouter>
        <CartProvider>
          <CartLink />
          <CartPage />
        </CartProvider>
      </MemoryRouter>
    );
  });
  return r;
}

beforeEach(() => {
  vi.resetAllMocks();
  tokenStorage.clear();
  clearAnonymousCartId();
  setAnonymousCartId('11111111-aaaa-4bbb-8ccc-222222222222');
});

describe('cart page with the real provider', () => {
  it('loads on mount via autoLoad and renders the server cart; badge matches', async () => {
    cartApi.getCurrentCart.mockResolvedValue(fx([item()], { itemCount: 2, totalAmount: 500 }));
    const r = await mount();
    expect(pageText(r)).toContain('Kaju Katli');
    expect(badge(r)).toBe('2');
    expect(cartApi.getCurrentCart).toHaveBeenCalledTimes(1);
    expect(cartApi.createCart).not.toHaveBeenCalled();
  });

  it('quantity update applies the returned cart to page and badge only after confirmation', async () => {
    cartApi.getCurrentCart.mockResolvedValue(fx([item()], { itemCount: 2, totalAmount: 500 }));
    cartApi.updateItem.mockResolvedValue(fx([item({ quantity: 3, totalPrice: 750 })], { itemCount: 3, subtotal: 750, totalAmount: 750 }));
    const r = await mount();
    await click(byLabel(r, 'Increase quantity of Kaju Katli'));
    expect(cartApi.updateItem).toHaveBeenCalledWith('cart-1', 'i1', 3);
    expect(hosts(r, (p) => p.className === 'cart-qty-value').map(text)).toEqual(['3']);
    expect(pageText(r)).toContain('₹750.00');
    expect(badge(r)).toBe('3');
  });

  it('removing the last item shows the empty state and hides the badge', async () => {
    cartApi.getCurrentCart.mockResolvedValue(fx([item()], { itemCount: 2 }));
    cartApi.removeItem.mockResolvedValue(fx([], { itemCount: 0 }));
    const r = await mount();
    await click(byLabel(r, 'Remove Kaju Katli from cart'));
    expect(cartApi.removeItem).toHaveBeenCalledWith('cart-1', 'i1');
    expect(pageText(r)).toContain('Your cart is empty.');
    expect(badge(r)).toBeNull();
  });

  it('clearing after confirmation empties the page and badge with one API call', async () => {
    cartApi.getCurrentCart.mockResolvedValue(fx([item(), item({ id: 'i2', productName: 'Besan Ladoo', quantity: 1 })], { itemCount: 3 }));
    cartApi.clearCart.mockResolvedValue(fx([], { itemCount: 0 }));
    const r = await mount();
    expect(badge(r)).toBe('3');
    await click(hosts(r, (p) => p.className === 'cart-clear')[0]);
    await click(hosts(r, (p) => p.className === 'cart-clear-yes')[0]);
    expect(cartApi.clearCart).toHaveBeenCalledTimes(1);
    expect(cartApi.clearCart).toHaveBeenCalledWith('cart-1');
    expect(pageText(r)).toContain('Your cart is empty.');
    expect(badge(r)).toBeNull();
  });

  it('a failed update leaves the confirmed cart and badge untouched', async () => {
    cartApi.getCurrentCart.mockResolvedValue(fx([item()], { itemCount: 2, totalAmount: 500 }));
    cartApi.updateItem.mockRejectedValue(new ApiError({ status: 422, code: 'QUANTITY_LIMIT_EXCEEDED', message: 'x' }));
    const r = await mount();
    await click(byLabel(r, 'Increase quantity of Kaju Katli'));
    expect(badge(r)).toBe('2');
    expect(hosts(r, (p) => p.className === 'cart-qty-value').map(text)).toEqual(['2']);
    expect(pageText(r)).toContain('You can add at most 99 of each item.');
    expect(cartApi.updateItem).toHaveBeenCalledTimes(1);
  });

  it('a failed load shows the error state with a working Retry', async () => {
    cartApi.getCurrentCart
      .mockRejectedValueOnce(new ApiError({ status: 502, code: 'PRODUCT_SERVICE_UNAVAILABLE', message: 'x' }))
      .mockResolvedValueOnce(fx([item()], { itemCount: 2 }));
    const r = await mount();
    expect(pageText(r)).toContain("We couldn't load your cart.");
    await click(hosts(r, (p) => p.className === 'cart-retry')[0]);
    expect(pageText(r)).toContain('Kaju Katli');
    expect(badge(r)).toBe('2');
    expect(cartApi.createCart).not.toHaveBeenCalled(); // a failed read never creates a cart
  });
});
