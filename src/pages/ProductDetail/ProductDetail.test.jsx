import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProductDetailPage from './ProductDetail';
import { ApiError } from '../../services/apiClient';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const cartCtx = { addItem: vi.fn(), refreshCart: vi.fn() };
vi.mock('../../context/CartContext', () => ({ useCart: () => cartCtx }));
vi.mock('../../services/cartApi'); // must never be called by a component
vi.mock('../../components/ProductImageGallery/ProductImageGallery', () => ({ default: () => null }));
vi.mock('../../components/ProductDescription/ProductDescription', () => ({ default: () => null }));
vi.mock('../../components/SocialShare/SocialShare', () => ({ default: () => null }));

import * as cartApi from '../../services/cartApi';

const ID = '3f2b8c1e-aaaa-4bbb-8ccc-1234567890ab';
const product = { id: ID, title: 'Kaju Katli', price: 250, packageSize: '250g', images: [{ url: 'a.jpg', isPrimary: true }], description: 'x' };
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};
const apiError = (status, code) => new ApiError({ status, code, message: 'internal detail' });

async function render(apiProduct = product) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => apiProduct }));
  let r;
  await act(async () => {
    r = TestRenderer.create(
      <MemoryRouter initialEntries={['/products/abc']}>
        <Routes><Route path="/products/:productId" element={<ProductDetailPage />} /></Routes>
      </MemoryRouter>
    );
  });
  return r;
}
const hosts = (r, pred) => r.root.findAll((n) => typeof n.type === 'string' && pred(n.props));
const addButton = (r) => hosts(r, (p) => p.className === 'btn add-to-cart')[0];
const text = (n) => n.children.map((c) => (typeof c === 'string' ? c : text(c))).join('');
const click = async (n) => { await act(async () => { n.props.onClick(); }); };
const status = (r) => text(hosts(r, (p) => p.role === 'status')[0]);
const alert = (r) => text(hosts(r, (p) => p.role === 'alert')[0]);

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('ProductDetail add to cart', () => {
  it('adds the product UUID with the default quantity 1, and only those two values', async () => {
    cartCtx.addItem.mockResolvedValue({});
    const r = await render();
    await click(addButton(r));
    expect(cartCtx.addItem).toHaveBeenCalledTimes(1);
    expect(cartCtx.addItem.mock.calls[0]).toEqual([ID, 1]); // no price/title/total arguments
    expect(cartApi.addItem).not.toHaveBeenCalled(); // components use the context only
  });

  it('uses the quantity chosen in the existing selector, capped at 99', async () => {
    cartCtx.addItem.mockResolvedValue({});
    const r = await render();
    const inc = hosts(r, (p) => p['aria-label'] === 'Increase quantity')[0];
    await click(inc);
    await click(inc);
    await click(addButton(r));
    expect(cartCtx.addItem).toHaveBeenCalledWith(ID, 3);
    for (let i = 0; i < 120; i += 1) await click(inc);
    await click(addButton(r));
    expect(cartCtx.addItem).toHaveBeenLastCalledWith(ID, 99);
  });

  it('shows loading, blocks duplicate submits, and shows success only after the server confirms', async () => {
    const d = deferred();
    cartCtx.addItem.mockReturnValue(d.promise);
    const r = await render();
    await click(addButton(r));
    expect(text(addButton(r))).toBe('ADDING…');
    expect(addButton(r).props.disabled).toBe(true);
    expect(addButton(r).props['aria-busy']).toBe(true);
    await click(addButton(r));
    expect(cartCtx.addItem).toHaveBeenCalledTimes(1);
    expect(status(r)).toBe('');
    await act(async () => { d.resolve({ itemCount: 1 }); });
    expect(status(r)).toContain('Added to cart successfully.');
    expect(text(addButton(r))).toBe('ADD TO CART');
    expect(addButton(r).props.disabled).toBe(false);
  });

  it('keeps the selected quantity after a successful add', async () => {
    cartCtx.addItem.mockResolvedValue({});
    const r = await render();
    await click(hosts(r, (p) => p['aria-label'] === 'Increase quantity')[0]);
    await click(addButton(r));
    await click(addButton(r));
    expect(cartCtx.addItem).toHaveBeenLastCalledWith(ID, 2);
  });

  it('shows a mapped error, no success message, and resets loading on failure', async () => {
    cartCtx.addItem.mockRejectedValue(apiError(404, 'PRODUCT_NOT_FOUND'));
    const r = await render();
    await click(addButton(r));
    expect(alert(r)).toContain('This product is no longer available.');
    expect(alert(r)).not.toContain('internal detail');
    expect(status(r)).toBe('');
    expect(addButton(r).props.disabled).toBe(false);
  });

  it('lets the customer retry explicitly, and never retries on its own', async () => {
    cartCtx.addItem.mockRejectedValueOnce(apiError(0, 'NETWORK_ERROR')).mockResolvedValueOnce({});
    const r = await render();
    await click(addButton(r));
    expect(cartCtx.addItem).toHaveBeenCalledTimes(1);
    expect(alert(r)).toContain("Couldn't add the item. Please try again.");
    await click(addButton(r));
    expect(cartCtx.addItem).toHaveBeenCalledTimes(2);
    expect(status(r)).toContain('Added to cart successfully.');
    expect(alert(r)).toBe('');
  });

  it('refreshes (reads) a stale cart after CART_NOT_ACTIVE without replaying the add', async () => {
    cartCtx.addItem.mockRejectedValue(apiError(409, 'CART_NOT_ACTIVE'));
    cartCtx.refreshCart.mockResolvedValue({});
    const r = await render();
    await click(addButton(r));
    expect(cartCtx.refreshCart).toHaveBeenCalledTimes(1);
    expect(cartCtx.addItem).toHaveBeenCalledTimes(1);
  });

  it('does not send a request when the product has no valid id', async () => {
    const r = await render({ ...product, id: undefined });
    await click(addButton(r));
    expect(cartCtx.addItem).not.toHaveBeenCalled();
    expect(alert(r)).not.toBe('');
  });

  it('leaves Buy Now and the page structure intact', async () => {
    const r = await render();
    expect(hosts(r, (p) => p.className === 'btn buy-now')).toHaveLength(1);
    expect(text(hosts(r, (p) => p.className === 'product-info')[0])).toContain('Kaju Katli');
  });
});
