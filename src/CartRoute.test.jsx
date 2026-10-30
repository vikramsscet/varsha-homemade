// Mounts the real App (real providers) at /cart to prove the route renders the cart page
// and the header still works around it. No identity is stored, so no network call happens.
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

beforeEach(() => {
  vi.stubGlobal('window', {
    addEventListener() {}, removeEventListener() {}, scrollTo() {}, scrollY: 0,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  });
  vi.stubGlobal('document', {
    body: { classList: { toggle() {}, remove() {} } },
    getElementById: () => null,
    addEventListener() {}, removeEventListener() {},
  });
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('no network in tests'))));
});
afterEach(() => vi.unstubAllGlobals());

const hosts = (r, pred) => r.root.findAll((n) => typeof n.type === 'string' && pred(n.props));
const text = (n) => n.children.map((c) => (typeof c === 'string' ? c : text(c))).join('');

it('the /cart route renders the cart page inside the app shell', async () => {
  let r;
  await act(async () => {
    r = TestRenderer.create(
      <MemoryRouter initialEntries={['/cart']}>
        <AuthProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </AuthProvider>
      </MemoryRouter>
    );
  });
  const main = hosts(r, (p) => p.className === 'cart-page container');
  expect(main).toHaveLength(1);
  expect(text(main[0])).toContain('Your cart is empty.');
  // Header (with the cart icon) and footer render around the page.
  expect(hosts(r, (p) => p.className === 'cart-link')).toHaveLength(1);
  expect(r.root.findAll((n) => n.type === 'footer')).toHaveLength(1);
  // A fresh visitor with no identity triggers no cart request and no cart creation.
  expect(globalThis.fetch).not.toHaveBeenCalled();
});
