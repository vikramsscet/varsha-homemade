// Journey regression: real CartProvider + real add-to-cart hook + real header badge + real cart
// page, with only cartApi mocked. Follows one new visitor from first add to an emptied cart.
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, expect, it, vi } from 'vitest';
import { CartProvider } from './context/CartContext';
import CartLink from './components/CartLink';
import CartPage from './pages/Cart/Cart';
import { useAddToCart } from './hooks/useAddToCart';
import * as cartApi from './services/cartApi';
import { clearAnonymousCartId } from './services/anonCartStorage';
import { tokenStorage } from './services/tokenStorage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock('./context/AuthContext', () => ({ useAuth: () => ({ status: 'unauthenticated', user: null }) }));
vi.mock('./services/cartApi');

const PRODUCT_ID = '3f2b8c1e-aaaa-4bbb-8ccc-1234567890ab';
const guestCart = (items, extra = {}) => ({
  id: 'guest-db-1', ownerType: 'ANONYMOUS', status: 'ACTIVE', currency: 'INR',
  subtotal: 0, discountAmount: 0, taxAmount: 0, totalAmount: 0, itemCount: 0, items, ...extra,
});
const lineItem = (quantity) => ({
  id: 'item-1', productId: PRODUCT_ID, productName: 'Kaju Katli', productSlug: 'kaju-katli',
  unitPrice: 250, quantity, totalPrice: 250 * quantity,
});

const hosts = (r, pred) => r.root.findAll((n) => typeof n.type === 'string' && pred(n.props));
const text = (n) => n.children.map((c) => (typeof c === 'string' ? c : text(c))).join('');
const badge = (r) => hosts(r, (p) => p.className === 'cart-badge').map(text)[0] ?? null;
const byLabel = (r, label) => hosts(r, (p) => p['aria-label'] === label)[0];
const click = async (n) => { await act(async () => { n.props.onClick(); }); };
const pageText = (r) => text(r.root.findAll((n) => n.type === 'main')[0]);

let hook;
const Adder = () => { hook = useAddToCart(); return null; };

beforeEach(() => {
  vi.resetAllMocks();
  tokenStorage.clear();
  clearAnonymousCartId();
});

it('a new visitor adds, updates, and removes an item with the server as the only authority', async () => {
  let r;
  await act(async () => {
    r = TestRenderer.create(
      <MemoryRouter>
        <CartProvider>
          <CartLink />
          <Adder />
          <CartPage />
        </CartProvider>
      </MemoryRouter>
    );
  });

  // 1-2. Initialization creates nothing for a visitor with no identity.
  expect(cartApi.createCart).not.toHaveBeenCalled();
  expect(cartApi.getCurrentCart).not.toHaveBeenCalled();
  expect(badge(r)).toBeNull();
  expect(pageText(r)).toContain('Your cart is empty.');

  // 3-8. First add: the backend creates the guest cart; only then the item is added.
  cartApi.createCart.mockResolvedValue(guestCart([]));
  cartApi.addItem.mockResolvedValue(guestCart([lineItem(2)], { itemCount: 2, subtotal: 500, totalAmount: 500 }));
  await act(async () => { await hook.add(PRODUCT_ID, 2); });
  expect(cartApi.createCart).toHaveBeenCalledTimes(1);
  expect(cartApi.addItem).toHaveBeenCalledWith('guest-db-1', { productId: PRODUCT_ID, quantity: 2 });
  expect(badge(r)).toBe('2');
  expect(hook.feedback).toMatchObject({ type: 'success' });

  // 9-10. The cart page shows the server-confirmed item and totals.
  expect(pageText(r)).toContain('Kaju Katli');
  expect(pageText(r)).toContain('₹500.00');

  // Journey B: quantity down, then remove — IDs and absolute quantities, UI follows the server.
  cartApi.updateItem.mockResolvedValue(guestCart([lineItem(1)], { itemCount: 1, subtotal: 250, totalAmount: 250 }));
  await click(byLabel(r, 'Decrease quantity of Kaju Katli'));
  expect(cartApi.updateItem).toHaveBeenCalledWith('guest-db-1', 'item-1', 1);
  expect(badge(r)).toBe('1');
  expect(hosts(r, (p) => p.className === 'cart-qty-value').map(text)).toEqual(['1']);
  expect(byLabel(r, 'Decrease quantity of Kaju Katli').props.disabled).toBe(true); // floor of 1

  cartApi.removeItem.mockResolvedValue(guestCart([], { itemCount: 0 }));
  await click(byLabel(r, 'Remove Kaju Katli from cart'));
  expect(cartApi.removeItem).toHaveBeenCalledWith('guest-db-1', 'item-1');
  expect(pageText(r)).toContain('Your cart is empty.');
  expect(badge(r)).toBeNull();

  // Quantity zero was never used as removal, and no mutation carried pricing fields.
  for (const [, payload] of cartApi.addItem.mock.calls) expect(Object.keys(payload).sort()).toEqual(['productId', 'quantity']);
  for (const call of cartApi.updateItem.mock.calls) expect(call[2]).toBeGreaterThanOrEqual(1);
});
