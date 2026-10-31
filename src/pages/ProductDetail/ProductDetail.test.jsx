import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProductDetailPage from './ProductDetail';
import { ApiError } from '../../services/apiClient';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const cartCtx = { addItem: vi.fn(), updateItem: vi.fn(), refreshCart: vi.fn(), items: [] };
vi.mock('../../context/CartContext', () => ({ useCart: () => cartCtx }));
vi.mock('../../services/cartApi'); // must never be called by a component
vi.mock('../../components/ProductImageGallery/ProductImageGallery', () => ({ default: () => null }));
vi.mock('../../components/ProductDescription/ProductDescription', () => ({ default: () => null }));
vi.mock('../../components/SocialShare/SocialShare', () => ({ default: () => null }));

import * as cartApi from '../../services/cartApi';

const ID = '3f2b8c1e-aaaa-4bbb-8ccc-1234567890ab';
const product = { id: ID, title: 'Kaju Katli', price: 250, packageSize: '250g', images: [{ url: 'a.jpg', isPrimary: true }], description: 'x' };
const inCart = (quantity) => [{ id: 'item-9', productId: ID, productName: 'Kaju Katli', unitPrice: 250, quantity, totalPrice: 250 * quantity }];
const serverCart = (quantity, extra = {}) => ({ id: 'cart-1', itemCount: quantity, items: inCart(quantity), ...extra });
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};
const apiError = (status, code) => new ApiError({ status, code, message: 'internal detail' });

let renderer;
async function render(apiProduct = product) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => apiProduct }));
  await act(async () => {
    renderer = TestRenderer.create(
      <MemoryRouter initialEntries={['/products/abc']}>
        <Routes><Route path="/products/:productId" element={<ProductDetailPage />} /></Routes>
      </MemoryRouter>
    );
  });
  return renderer;
}
const rerender = async () => { await act(async () => { renderer.update(
  <MemoryRouter initialEntries={['/products/abc']}>
    <Routes><Route path="/products/:productId" element={<ProductDetailPage />} /></Routes>
  </MemoryRouter>
); }); };

// Always re-query nodes: handlers are recreated every render now that the selector is controlled.
const hosts = (r, pred) => r.root.findAll((n) => typeof n.type === 'string' && pred(n.props));
const text = (n) => n.children.map((c) => (typeof c === 'string' ? c : text(c))).join('');
const cta = (r) => hosts(r, (p) => p.className === 'btn add-to-cart')[0];
const qtyValue = (r) => text(hosts(r, (p) => p.className === 'qty-value')[0]);
const note = (r) => hosts(r, (p) => p['data-testid'] === 'in-cart-note').map(text)[0] ?? null;
const status = (r) => hosts(r, (p) => p.role === 'status').map(text).join('');
const alertText = (r) => hosts(r, (p) => p.role === 'alert').map(text).join('');
const click = async (find) => { await act(async () => { find().props.onClick(); }); };
const clickCta = (r) => click(() => cta(r));
const inc = (r) => click(() => hosts(r, (p) => p['aria-label'] === 'Increase quantity')[0]);
const dec = (r) => click(() => hosts(r, (p) => p['aria-label'] === 'Decrease quantity')[0]);

beforeEach(() => {
  vi.resetAllMocks();
  cartCtx.items = [];
});
afterEach(() => vi.unstubAllGlobals());

describe('product not in cart', () => {
  it('starts at quantity 1 with an Add to Cart CTA and no in-cart note', async () => {
    const r = await render();
    expect(qtyValue(r)).toBe('1');
    expect(text(cta(r))).toBe('ADD TO CART');
    expect(cta(r).props.disabled).toBe(false);
    expect(note(r)).toBeNull();
  });

  it('adds the product UUID with the selected quantity, and only those two values', async () => {
    cartCtx.addItem.mockResolvedValue(serverCart(3));
    const r = await render();
    await inc(r); await inc(r);
    await clickCta(r);
    expect(cartCtx.addItem).toHaveBeenCalledTimes(1);
    expect(cartCtx.addItem.mock.calls[0]).toEqual([ID, 3]); // no price/title/total arguments
    expect(cartCtx.updateItem).not.toHaveBeenCalled();
    expect(cartApi.addItem).not.toHaveBeenCalled(); // components use the context only
  });

  it('selection is clamped at 99 by the selector', async () => {
    cartCtx.addItem.mockResolvedValue({});
    const r = await render();
    for (let i = 0; i < 120; i += 1) await inc(r);
    expect(qtyValue(r)).toBe('99');
    expect(hosts(r, (p) => p['aria-label'] === 'Increase quantity')[0].props.disabled).toBe(true);
    await clickCta(r);
    expect(cartCtx.addItem).toHaveBeenCalledWith(ID, 99);
  });

  it('shows Adding…, blocks duplicates, then shows the confirmed state after success', async () => {
    const d = deferred();
    cartCtx.addItem.mockReturnValue(d.promise);
    const r = await render();
    await inc(r); // selected 2
    await clickCta(r);
    expect(text(cta(r))).toBe('ADDING…');
    expect(cta(r).props.disabled).toBe(true);
    expect(cta(r).props['aria-busy']).toBe(true);
    expect(hosts(r, (p) => p['aria-label'] === 'Increase quantity')[0].props.disabled).toBe(true);
    await clickCta(r);
    expect(cartCtx.addItem).toHaveBeenCalledTimes(1);
    expect(status(r)).toBe('');
    await act(async () => { d.resolve(serverCart(2)); });
    // Simulate the context committing the returned cart, as the real provider does.
    cartCtx.items = inCart(2);
    await rerender();
    expect(status(r)).toContain('Added to cart successfully.');
    expect(text(cta(r))).toBe('ADDED TO CART');
    expect(cta(r).props.disabled).toBe(true);
    expect(note(r)).toContain('In your cart: 2');
  });

  it('a failed add keeps Add to Cart, the selection, and shows a mapped error only', async () => {
    cartCtx.addItem.mockRejectedValue(apiError(404, 'PRODUCT_NOT_FOUND'));
    const r = await render();
    await inc(r);
    await clickCta(r);
    expect(alertText(r)).toContain('This product is no longer available.');
    expect(alertText(r)).not.toContain('internal detail');
    expect(status(r)).toBe('');
    expect(text(cta(r))).toBe('ADD TO CART'); // never falsely "Added"
    expect(qtyValue(r)).toBe('2'); // selection preserved for a retry
    await clickCta(r);
    expect(cartCtx.addItem).toHaveBeenCalledTimes(2); // manual retry only
  });

  it('an ambiguous network failure shows the unconfirmed-change message and no success', async () => {
    cartCtx.addItem.mockRejectedValueOnce(apiError(0, 'NETWORK_ERROR')).mockResolvedValueOnce(serverCart(1));
    const r = await render();
    await clickCta(r);
    expect(cartCtx.addItem).toHaveBeenCalledTimes(1);
    expect(alertText(r)).toContain("We couldn't confirm that change. Please check your cart before trying again.");
    await clickCta(r);
    expect(status(r)).toContain('Added to cart successfully.');
  });

  it('a stale-cart error triggers a read-only refresh, never a replay', async () => {
    cartCtx.addItem.mockRejectedValue(apiError(409, 'CART_NOT_ACTIVE'));
    const r = await render();
    await clickCta(r);
    expect(cartCtx.refreshCart).toHaveBeenCalledTimes(1);
    expect(cartCtx.addItem).toHaveBeenCalledTimes(1);
  });

  it('does not send a request when the product has no valid id', async () => {
    const r = await render({ ...product, id: undefined });
    await clickCta(r);
    expect(cartCtx.addItem).not.toHaveBeenCalled();
    expect(cartCtx.updateItem).not.toHaveBeenCalled();
    expect(alertText(r)).not.toBe('');
  });
});

describe('product already in cart', () => {
  beforeEach(() => { cartCtx.items = inCart(3); });

  it('initializes the selection from the confirmed quantity and shows an inert Added to Cart', async () => {
    const r = await render();
    expect(qtyValue(r)).toBe('3');
    expect(note(r)).toContain('In your cart: 3');
    expect(text(cta(r))).toBe('ADDED TO CART');
    expect(cta(r).props.disabled).toBe(true);
    await clickCta(r);
    expect(cartCtx.addItem).not.toHaveBeenCalled();
    expect(cartCtx.updateItem).not.toHaveBeenCalled();
  });

  it('changing the quantity flips the CTA without any API request, and restoring flips it back', async () => {
    const r = await render();
    await inc(r);
    expect(text(cta(r))).toBe('UPDATE CART');
    await inc(r);
    expect(qtyValue(r)).toBe('5');
    await dec(r); await dec(r);
    expect(text(cta(r))).toBe('ADDED TO CART');
    expect(cartCtx.addItem).not.toHaveBeenCalled();
    expect(cartCtx.updateItem).not.toHaveBeenCalled();
  });

  it('Update Cart updates the existing cart item id with the absolute quantity, never adding a duplicate', async () => {
    cartCtx.updateItem.mockResolvedValue(serverCart(4));
    const r = await render();
    await inc(r); // 4
    await clickCta(r);
    expect(cartCtx.updateItem).toHaveBeenCalledTimes(1);
    expect(cartCtx.updateItem).toHaveBeenCalledWith('item-9', 4);
    expect(cartCtx.addItem).not.toHaveBeenCalled();
    cartCtx.items = inCart(4); // context commit
    await rerender();
    expect(text(cta(r))).toBe('ADDED TO CART');
    expect(note(r)).toContain('In your cart: 4');
    expect(status(r)).toContain('Cart updated.');
  });

  it('shows Updating… while the update is pending and blocks duplicate submissions', async () => {
    const d = deferred();
    cartCtx.updateItem.mockReturnValue(d.promise);
    const r = await render();
    await inc(r);
    await clickCta(r);
    expect(text(cta(r))).toBe('UPDATING…');
    expect(cta(r).props.disabled).toBe(true);
    await clickCta(r);
    expect(cartCtx.updateItem).toHaveBeenCalledTimes(1);
    await act(async () => { d.resolve(serverCart(4)); });
  });

  it('a failed update keeps the confirmed quantity, the selection, and the Update Cart CTA for a retry', async () => {
    cartCtx.updateItem.mockRejectedValue(apiError(422, 'QUANTITY_LIMIT_EXCEEDED'));
    const r = await render();
    await inc(r); // 4
    await clickCta(r);
    expect(alertText(r)).toContain('You can add at most 99 of each item.');
    expect(note(r)).toContain('In your cart: 3'); // confirmed state untouched
    expect(qtyValue(r)).toBe('4'); // selection kept
    expect(text(cta(r))).toBe('UPDATE CART');
    await clickCta(r);
    expect(cartCtx.updateItem).toHaveBeenCalledTimes(2); // explicit retry only
  });

  it('an item removed elsewhere is re-added, never updated against the stale item id', async () => {
    cartCtx.addItem.mockResolvedValue(serverCart(4));
    const r = await render();
    await inc(r); // 4, editing
    cartCtx.items = []; // removed from another component
    await rerender();
    expect(note(r)).toBeNull();
    expect(text(cta(r))).toBe('ADD TO CART');
    await clickCta(r);
    expect(cartCtx.updateItem).not.toHaveBeenCalled();
    expect(cartCtx.addItem).toHaveBeenCalledWith(ID, 4);
  });

  it('an external confirmed change updates the selection and note when the customer is not editing', async () => {
    const r = await render();
    cartCtx.items = inCart(5);
    await rerender();
    expect(note(r)).toContain('In your cart: 5');
    expect(qtyValue(r)).toBe('5');
    expect(text(cta(r))).toBe('ADDED TO CART');
  });

  it('an external confirmed change never resets a quantity the customer is editing', async () => {
    const r = await render();
    await inc(r); // 4, dirty
    cartCtx.items = inCart(5);
    await rerender();
    expect(note(r)).toContain('In your cart: 5'); // confirmed state is shown truthfully
    expect(qtyValue(r)).toBe('4'); // but the edit is not clobbered
    expect(text(cta(r))).toBe('UPDATE CART');
  });
});

describe('breadcrumbs', () => {
  const navs = (r) => hosts(r, (p) => p['aria-label'] === 'Breadcrumb');
  const crumbText = (r) => text(navs(r)[0]);

  it('shows Home / Indian Sweets / product name (never the UUID) once the product loads', async () => {
    const r = await render();
    expect(navs(r)).toHaveLength(1);
    expect(crumbText(r)).toBe('Home/Indian Sweets/Kaju Katli');
    const category = hosts(r, (p) => p.href === '/category/indian-sweets');
    expect(category).toHaveLength(1);
    expect(text(category[0])).toBe('Indian Sweets');
    expect(crumbText(r)).not.toContain(ID);
    const current = hosts(r, (p) => p['aria-current'] === 'page')[0];
    expect(current.type).toBe('span');
    expect(text(current)).toBe('Kaju Katli');
    expect(hosts(r, (p) => p.href === '/')).toHaveLength(1);
  });

  it('falls back to the slug when the product has no title', async () => {
    const r = await render({ ...product, title: undefined, slug: 'kaju-katli' });
    expect(crumbText(r)).toBe('Home/Indian Sweets/kaju-katli');
  });

  it('shows a placeholder, not the UUID, while the product is loading', async () => {
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(new Promise(() => {})));
    let r;
    await act(async () => {
      r = TestRenderer.create(
        <MemoryRouter initialEntries={[`/products/${ID}`]}>
          <Routes><Route path="/products/:productId" element={<ProductDetailPage />} /></Routes>
        </MemoryRouter>
      );
    });
    expect(navs(r)).toHaveLength(1);
    expect(crumbText(r)).not.toContain(ID);
    expect(hosts(r, (p) => p.href === '/')).toHaveLength(1); // Home stays clickable
  });

  it('handles a failed product load without the UUID or a crash', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    let r;
    await act(async () => {
      r = TestRenderer.create(
        <MemoryRouter initialEntries={[`/products/${ID}`]}>
          <Routes><Route path="/products/:productId" element={<ProductDetailPage />} /></Routes>
        </MemoryRouter>
      );
    });
    expect(navs(r)).toHaveLength(1);
    expect(crumbText(r)).toBe('Home/Indian Sweets/Product');
    expect(hosts(r, (p) => p.href === '/category/indian-sweets')).toHaveLength(1);
    expect(crumbText(r)).not.toContain(ID);
  });
});

describe('breadcrumb placement', () => {
  it('sits in its own container row above the grid, never inside it', async () => {
    const r = await render();
    const shell = hosts(r, (p) => p.className === 'product-detail-shell')[0];
    const [crumbRow, grid] = shell.children; // DOM order: breadcrumb wrapper, then the grid
    expect(crumbRow.props.className).toBe('container');
    expect(crumbRow.findAll((n) => n.props?.['aria-label'] === 'Breadcrumb')).toHaveLength(1);
    expect(grid.props.className).toBe('container product-detail-grid');
    expect(grid.findAll((n) => n.props?.['aria-label'] === 'Breadcrumb')).toHaveLength(0);
    expect(hosts(r, (p) => p['aria-label'] === 'Breadcrumb')).toHaveLength(1);
  });
});

describe('page structure', () => {
  it('leaves Buy Now and the rest of the page intact', async () => {
    const r = await render();
    expect(hosts(r, (p) => p.className === 'btn buy-now')).toHaveLength(1);
    expect(text(hosts(r, (p) => p.className === 'product-info')[0])).toContain('Kaju Katli');
  });
});

describe('Buy Now', () => {
  const buyNow = (r) => hosts(r, (p) => p.className === 'btn buy-now')[0];
  const goto = { path: null };
  beforeEach(() => { cartCtx.items = []; cartCtx.addItem = vi.fn(); cartCtx.updateItem = vi.fn(); });

  async function renderAt() {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => product }));
    await act(async () => {
      renderer = TestRenderer.create(
        <MemoryRouter initialEntries={['/products/abc']}>
          <Routes>
            <Route path="/products/:productId" element={<ProductDetailPage />} />
            <Route path="/checkout" element={<p data-testid="checkout-page">checkout</p>} />
          </Routes>
        </MemoryRouter>
      );
    });
    return renderer;
  }
  const onCheckout = (r) => hosts(r, (p) => p['data-testid'] === 'checkout-page').length === 1;

  it('adds a new product at the selected quantity, then goes to checkout', async () => {
    cartCtx.addItem.mockResolvedValue(serverCart(1));
    const r = await renderAt();
    await click(() => buyNow(r));
    expect(cartCtx.addItem).toHaveBeenCalledWith(ID, 1);
    expect(cartCtx.updateItem).not.toHaveBeenCalled();
    expect(onCheckout(r)).toBe(true);
  });

  it('updates an existing line instead of adding a duplicate', async () => {
    cartCtx.items = inCart(1);
    cartCtx.updateItem.mockResolvedValue(serverCart(3));
    const r = await renderAt();
    await inc(r); await inc(r);
    await click(() => buyNow(r));
    expect(cartCtx.updateItem).toHaveBeenCalledWith('item-9', 3);
    expect(cartCtx.addItem).not.toHaveBeenCalled();
    expect(onCheckout(r)).toBe(true);
  });

  it('skips the API when the cart already has the selected quantity', async () => {
    cartCtx.items = inCart(2);
    const r = await renderAt();
    await click(() => buyNow(r));
    expect(cartCtx.addItem).not.toHaveBeenCalled();
    expect(cartCtx.updateItem).not.toHaveBeenCalled();
    expect(onCheckout(r)).toBe(true);
  });

  it('stays on the page and shows an error when the cart call fails', async () => {
    cartCtx.addItem.mockRejectedValue(apiError(500, 'INTERNAL_ERROR'));
    const r = await renderAt();
    await click(() => buyNow(r));
    expect(onCheckout(r)).toBe(false);
    expect(alertText(r)).not.toBe('');
  });
});
