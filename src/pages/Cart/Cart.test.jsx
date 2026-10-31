import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CartPage from './Cart';
import { ApiError } from '../../services/apiClient';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const ctx = {};
vi.mock('../../context/CartContext', () => ({ useCart: () => ctx }));
vi.mock('../../services/cartApi'); // the page must never touch it
import * as cartApi from '../../services/cartApi';

const item = (over = {}) => ({
  id: 'i1', productId: 'p1', productName: 'Kaju Katli', productSlug: 'kaju-katli',
  unitPrice: 250, quantity: 2, totalPrice: 500, ...over,
});
// Summary values deliberately disagree with any client-side math on the items.
const cartFx = (over = {}) => ({
  id: 'cart-1', ownerType: 'ANONYMOUS', status: 'ACTIVE', currency: 'INR',
  subtotal: 123.45, discountAmount: 10, taxAmount: 5, totalAmount: 118.45, itemCount: 7,
  items: [item(), item({ id: 'i2', productId: 'p2', productName: 'Besan Ladoo', unitPrice: 180, quantity: 1, totalPrice: 180 })],
  ...over,
});

function setCtx(over = {}) {
  const cart = 'cart' in over ? over.cart : cartFx();
  Object.keys(ctx).forEach((k) => delete ctx[k]);
  Object.assign(ctx, {
    cart,
    status: cart ? 'ready' : 'idle',
    error: null,
    pendingOps: [],
    items: cart?.items ?? [],
    itemCount: cart?.itemCount ?? 0,
    subtotal: cart?.subtotal ?? 0,
    discountAmount: cart?.discountAmount ?? 0,
    taxAmount: cart?.taxAmount ?? 0,
    totalAmount: cart?.totalAmount ?? 0,
    currency: cart?.currency ?? 'INR',
    mergeStatus: null,
    mergeError: null,
    retryMerge: vi.fn().mockResolvedValue(null),
    dismissMergeError: vi.fn(),
    refreshCart: vi.fn().mockResolvedValue({}),
    updateItem: vi.fn().mockResolvedValue({}),
    removeItem: vi.fn().mockResolvedValue({}),
    clear: vi.fn().mockResolvedValue({}),
    ensureCart: vi.fn(),
    dismissError: vi.fn(),
    ...over,
  });
}

function render() {
  const tree = () => <MemoryRouter><CartPage /></MemoryRouter>;
  let r;
  act(() => { r = TestRenderer.create(tree()); });
  return { r, rerender: () => act(() => r.update(tree())) };
}
const hosts = (r, pred) => r.root.findAll((n) => typeof n.type === 'string' && pred(n.props));
const byLabel = (r, label) => hosts(r, (p) => p['aria-label'] === label)[0];
const text = (n) => n.children.map((c) => (typeof c === 'string' ? c : text(c))).join('');
const pageText = (r) => text(r.root.findAll((n) => n.type === 'main')[0]);
const click = async (n) => { await act(async () => { n.props.onClick(); }); };
const button = (r, name) => hosts(r, (p) => p.className === name)[0];
const statusText = (r) => hosts(r, (p) => p.role === 'status').map(text).join('');
const alertText = (r) => hosts(r, (p) => p.role === 'alert').map(text).join('');
const apiError = (status, code) => new ApiError({ status, code, message: 'raw backend detail' });

beforeEach(() => {
  vi.clearAllMocks();
  setCtx();
});

describe('rendering states', () => {
  it('shows loading, not a misleading empty message, while the first load is pending', () => {
    setCtx({ cart: null, status: 'loading' });
    const { r } = render();
    expect(statusText(r)).toContain('Loading your cart');
    expect(pageText(r)).not.toContain('Your cart is empty');
  });

  it('shows the empty state with a continue-shopping link, and no summary', () => {
    setCtx({ cart: cartFx({ items: [], itemCount: 0, subtotal: 0, totalAmount: 0 }) });
    const { r } = render();
    expect(pageText(r)).toContain('Your cart is empty.');
    const link = hosts(r, (p) => p.className === 'cart-continue')[0];
    expect(link.props.href).toBe('/category/indian-sweets');
    expect(pageText(r)).not.toContain('Order Summary');
  });

  it('treats a fresh visitor (idle, no cart) as empty, and a failed load as an error, distinctly', () => {
    setCtx({ cart: null, status: 'idle' });
    let { r } = render();
    expect(pageText(r)).toContain('Your cart is empty.');
    setCtx({ cart: null, status: 'error', error: { status: 502, code: 'PRODUCT_SERVICE_UNAVAILABLE', message: 'raw' } });
    ({ r } = render());
    expect(pageText(r)).not.toContain('Your cart is empty');
    expect(alertText(r)).toContain("We couldn't load your cart. Please try again.");
    expect(alertText(r)).not.toContain('raw');
  });

  it('Retry uses the context refresh', async () => {
    setCtx({ cart: null, status: 'error', error: { status: 500 } });
    const { r } = render();
    await click(button(r, 'cart-retry'));
    expect(ctx.refreshCart).toHaveBeenCalledTimes(1);
  });

  it('renders every item with name, unit price, quantity, line total and an initial placeholder', () => {
    const { r } = render();
    const page = pageText(r);
    expect(page).toContain('Kaju Katli');
    expect(page).toContain('Besan Ladoo');
    expect(page).toContain('₹250.00 each');
    expect(page).toContain('₹500.00');
    expect(page).toContain('₹180.00');
    expect(hosts(r, (p) => p.className === 'cart-item-image').map(text)).toEqual(['K', 'B']);
    expect(pageText(r)).toContain('(7 items)');
  });

  it('shows the summary amounts exactly as the server sent them (no client math)', () => {
    // Items sum to 680; the server says subtotal 123.45 and total 118.45. The page must obey.
    const { r } = render();
    const summary = text(hosts(r, (p) => p.className?.includes('cart-summary ') || p.className === 'cart-card cart-summary')[0]);
    expect(summary).toContain('₹123.45');
    expect(summary).toContain('₹10.00');
    expect(summary).toContain('₹5.00');
    expect(summary).toContain('₹118.45');
  });

  it('handles missing optional item fields without crashing', () => {
    setCtx({ cart: cartFx({ items: [item({ productName: undefined, unitPrice: undefined, totalPrice: undefined })] }) });
    const { r } = render();
    expect(pageText(r)).toContain('Product');
    expect(pageText(r)).toContain('—');
  });

  it('shows an enabled Checkout link to /checkout', () => {
    const { r } = render();
    const link = r.root.findAll((n) => n.props?.className === 'cart-checkout' && n.props.to)[0];
    expect(link.props.to).toBe('/checkout');
    expect(text(r.root.findAll((n) => n.type === 'a' && n.props.className === 'cart-checkout')[0])).toBe('Checkout');
  });
});

describe('quantity updates', () => {
  it('increase calls updateItem with the absolute next quantity', async () => {
    const { r } = render();
    await click(byLabel(r, 'Increase quantity of Kaju Katli'));
    expect(ctx.updateItem).toHaveBeenCalledWith('i1', 3);
  });

  it('decrease calls updateItem with the absolute previous quantity', async () => {
    const { r } = render();
    await click(byLabel(r, 'Decrease quantity of Kaju Katli'));
    expect(ctx.updateItem).toHaveBeenCalledWith('i1', 1);
  });

  it('never goes below 1: decrease is disabled at quantity 1', () => {
    const { r } = render();
    expect(byLabel(r, 'Decrease quantity of Besan Ladoo').props.disabled).toBe(true);
  });

  it('never goes above 99: increase is disabled at quantity 99', () => {
    setCtx({ cart: cartFx({ items: [item({ quantity: 99 })] }) });
    const { r } = render();
    expect(byLabel(r, 'Increase quantity of Kaju Katli').props.disabled).toBe(true);
  });

  it('disables that item’s controls while its update is pending, leaving other items usable', () => {
    setCtx({ pendingOps: [{ id: 1, type: 'update', itemId: 'i1' }] });
    const { r } = render();
    expect(byLabel(r, 'Increase quantity of Kaju Katli').props.disabled).toBe(true);
    expect(byLabel(r, 'Remove Kaju Katli from cart').props.disabled).toBe(true);
    expect(hosts(r, (p) => p.className?.includes('cart-item '))[0].props['aria-busy']).toBe(true);
    expect(byLabel(r, 'Increase quantity of Besan Ladoo').props.disabled).toBe(false);
  });

  it('shows only the server-confirmed quantity: clicking + does not change the display by itself', async () => {
    const d = { resolve: null };
    ctx.updateItem.mockReturnValue(new Promise((res) => { d.resolve = res; }));
    const { r } = render();
    await click(byLabel(r, 'Increase quantity of Kaju Katli'));
    expect(hosts(r, (p) => p.className === 'cart-qty-value').map(text)).toEqual(['2', '1']);
    await act(async () => { d.resolve({}); });
  });

  it('a failed update keeps the cart on screen and shows a mapped error', async () => {
    ctx.updateItem.mockRejectedValue(apiError(422, 'QUANTITY_LIMIT_EXCEEDED'));
    const { r } = render();
    await click(byLabel(r, 'Increase quantity of Kaju Katli'));
    expect(alertText(r)).toContain('You can add at most 99 of each item.');
    expect(alertText(r)).not.toContain('raw backend detail');
    expect(pageText(r)).toContain('Kaju Katli');
    expect(ctx.updateItem).toHaveBeenCalledTimes(1); // no automatic retry
  });

  it('a stale-cart error triggers a read-only refresh, never a replay', async () => {
    ctx.updateItem.mockRejectedValue(apiError(409, 'CART_NOT_ACTIVE'));
    const { r } = render();
    await click(byLabel(r, 'Increase quantity of Kaju Katli'));
    expect(ctx.refreshCart).toHaveBeenCalledTimes(1);
    expect(ctx.updateItem).toHaveBeenCalledTimes(1);
    expect(alertText(r)).toContain('Your cart is no longer active.');
  });
});

describe('remove and clear', () => {
  it('remove uses the cart item id, not the product id, and announces success', async () => {
    const { r } = render();
    await click(byLabel(r, 'Remove Kaju Katli from cart'));
    expect(ctx.removeItem).toHaveBeenCalledWith('i1');
    expect(ctx.removeItem).not.toHaveBeenCalledWith('p1');
    expect(statusText(r)).toContain('Item removed from cart.');
  });

  it('a failed removal keeps the cart and shows an error', async () => {
    ctx.removeItem.mockRejectedValue(apiError(404, 'CART_ITEM_NOT_FOUND'));
    const { r } = render();
    await click(byLabel(r, 'Remove Kaju Katli from cart'));
    expect(alertText(r)).toContain("Couldn't update your cart.");
    expect(pageText(r)).toContain('Kaju Katli');
  });

  it('clear asks for confirmation first; cancelling calls nothing', async () => {
    const { r } = render();
    await click(button(r, 'cart-clear'));
    expect(ctx.clear).not.toHaveBeenCalled();
    expect(pageText(r)).toContain('Remove all items from your cart?');
    await click(button(r, 'cart-clear-cancel'));
    expect(ctx.clear).not.toHaveBeenCalled();
    expect(pageText(r)).not.toContain('Remove all items');
  });

  it('confirming clears the cart once and announces it', async () => {
    const { r } = render();
    await click(button(r, 'cart-clear'));
    await click(button(r, 'cart-clear-yes'));
    expect(ctx.clear).toHaveBeenCalledTimes(1);
    expect(statusText(r)).toContain('Cart cleared.');
  });

  it('a failed clear shows an error and keeps the items', async () => {
    ctx.clear.mockRejectedValue(apiError(500, 'INTERNAL_ERROR'));
    const { r } = render();
    await click(button(r, 'cart-clear'));
    await click(button(r, 'cart-clear-yes'));
    expect(alertText(r)).toContain("Couldn't update your cart.");
    expect(pageText(r)).toContain('Kaju Katli');
  });

  it('no clear button is offered for an empty cart', () => {
    setCtx({ cart: cartFx({ items: [], itemCount: 0 }) });
    const { r } = render();
    expect(hosts(r, (p) => p.className === 'cart-clear')).toHaveLength(0);
  });

  it('the clear button is disabled while any operation is pending', () => {
    setCtx({ pendingOps: [{ id: 1, type: 'update', itemId: 'i1' }] });
    const { r } = render();
    expect(button(r, 'cart-clear').props.disabled).toBe(true);
  });
});

describe('breadcrumbs', () => {
  it('renders Home / Cart once, with a non-clickable current page, in every state', () => {
    for (const over of [{}, { cart: null, status: 'loading' }, { cart: null, status: 'error', error: { status: 500 } }]) {
      setCtx(over);
      const { r } = render();
      const navs = hosts(r, (p) => p['aria-label'] === 'Breadcrumb');
      expect(navs).toHaveLength(1);
      expect(text(navs[0])).toBe('Home/Cart');
      expect(hosts(r, (p) => p.href === '/')).toHaveLength(1);
      const current = hosts(r, (p) => p['aria-current'] === 'page')[0];
      expect(current.type).toBe('span');
      expect(text(current)).toBe('Cart');
    }
  });
});

describe('merge-failure notice', () => {
  it('is absent by default', () => {
    const { r } = render();
    expect(hosts(r, (p) => p.className?.includes('cart-merge-notice'))).toHaveLength(0);
  });

  it('shows a retryable failure with a working Try again and Dismiss', async () => {
    setCtx({ mergeStatus: 'failed', mergeError: { code: 'INTERNAL_ERROR', retryable: true } });
    const { r } = render();
    const notice = hosts(r, (p) => p.className?.includes('cart-merge-notice'))[0];
    expect(notice.props.role).toBe('alert');
    expect(text(notice)).toContain('please try again');
    await click(button(r, 'cart-merge-retry'));
    expect(ctx.retryMerge).toHaveBeenCalledTimes(1);
    await click(button(r, 'cart-merge-dismiss'));
    expect(ctx.dismissMergeError).toHaveBeenCalledTimes(1);
  });

  it('shows the sign-out recovery hint without a retry button when not retryable', () => {
    setCtx({ mergeStatus: 'failed', mergeError: { code: 'MERGE_SOURCE_UNAVAILABLE', retryable: false } });
    const { r } = render();
    const notice = hosts(r, (p) => p.className?.includes('cart-merge-notice'))[0];
    expect(text(notice)).toContain('Sign out and back in');
    expect(hosts(r, (p) => p.className === 'cart-merge-retry')).toHaveLength(0);
    expect(hosts(r, (p) => p.className === 'cart-merge-dismiss')).toHaveLength(1);
  });

  it('still renders the authenticated cart below a failed-merge notice', () => {
    setCtx({ mergeStatus: 'failed', mergeError: { code: 'INTERNAL_ERROR', retryable: true } });
    const { r } = render();
    expect(pageText(r)).toContain('Kaju Katli');
    expect(pageText(r)).toContain('Order Summary');
  });
});

describe('boundaries', () => {
  it('the page never calls cartApi directly', async () => {
    const { r } = render();
    await click(byLabel(r, 'Increase quantity of Kaju Katli'));
    await click(byLabel(r, 'Remove Besan Ladoo from cart'));
    for (const fn of Object.values(cartApi)) if (typeof fn === 'function' && 'mock' in fn) expect(fn).not.toHaveBeenCalled();
  });
});

describe('ambiguous outcomes and accessibility details', () => {
  it('a network failure on a mutation says the change is unconfirmed, keeping the confirmed cart', async () => {
    ctx.updateItem.mockRejectedValue(new ApiError({ status: 0, code: 'NETWORK_ERROR', message: 'offline' }));
    const { r } = render();
    await click(byLabel(r, 'Increase quantity of Kaju Katli'));
    expect(alertText(r)).toContain("We couldn't confirm that change. Please check your cart before trying again.");
    expect(pageText(r)).toContain('Kaju Katli');
    expect(ctx.updateItem).toHaveBeenCalledTimes(1); // never replayed
  });

  it('quantity controls are grouped and named per product', () => {
    const { r } = render();
    const groups = hosts(r, (p) => p.role === 'group').map((n) => n.props['aria-label']);
    expect(groups).toEqual(['Quantity of Kaju Katli', 'Quantity of Besan Ladoo']);
  });

  it('the clear-cart confirmation puts initial focus on the non-destructive Cancel', async () => {
    const { r } = render();
    await click(button(r, 'cart-clear'));
    expect(button(r, 'cart-clear-cancel').props.autoFocus).toBe(true);
    expect(button(r, 'cart-clear-yes').props.autoFocus).toBeUndefined();
  });
});
