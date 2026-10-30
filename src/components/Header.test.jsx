import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Header from './Header';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const auth = { status: 'unauthenticated', user: null, logout: vi.fn() };
const cartState = { cart: null, itemCount: 0, status: 'idle', error: null };
vi.mock('../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../context/CartContext', () => ({ useCart: () => cartState }));

const navLinks = [{ label: 'About', href: '#about' }, { label: 'Contact', href: '#contact' }];
let location;
const LocationProbe = () => { location = useLocation(); return null; };

function render() {
  const tree = () => (
    <MemoryRouter initialEntries={['/profile']}>
      <Header navLinks={navLinks} logo="logo.png" menuOpen={false} onToggleMenu={() => {}} onCloseMenu={() => {}} />
      <Routes><Route path="*" element={<LocationProbe />} /></Routes>
    </MemoryRouter>
  );
  let r;
  act(() => { r = TestRenderer.create(tree()); });
  return { r, rerender: () => act(() => r.update(tree())) };
}
const click = (node) => act(() => node.props.onClick({ button: 0, defaultPrevented: false, preventDefault() {}, metaKey: false, altKey: false, ctrlKey: false, shiftKey: false }));
// Host (DOM) elements only: findByProps would also match the wrapping Link components.
const hosts = (r, pred) => r.root.findAll((n) => typeof n.type === 'string' && pred(n.props));
const host = (r, pred) => {
  const found = hosts(r, pred);
  expect(found).toHaveLength(1);
  return found[0];
};
const byClass = (name) => (props) => props.className === name;
const cartLink = (r) => host(r, byClass('cart-link'));
const badges = (r) => hosts(r, byClass('cart-badge'));
const badge = (r) => host(r, byClass('cart-badge'));
const text = (node) => node.children.map((c) => (typeof c === 'string' ? c : text(c))).join('');
const signedIn = () => Object.assign(auth, { status: 'authenticated', user: { id: 'u1', email: 'a@b.c', displayName: 'A B', profileImageUrl: null } });
const setCart = (cart, extra = {}) => Object.assign(cartState, { cart, itemCount: cart?.itemCount ?? 0, status: cart ? 'ready' : 'idle', error: null }, extra);

beforeEach(() => {
  vi.stubGlobal('document', { addEventListener() {}, removeEventListener() {}, activeElement: null });
  Object.assign(auth, { status: 'unauthenticated', user: null });
  setCart(null);
  location = null;
});

afterEach(() => vi.unstubAllGlobals());

describe('cart icon', () => {
  it('renders as a link to /cart with an accessible name and no badge before a cart is loaded', () => {
    const { r } = render();
    const link = cartLink(r);
    expect(link.props.href).toBe('/cart');
    expect(link.props['aria-label']).toBe('Shopping cart');
    expect(badges(r)).toHaveLength(0);
  });

  it('shows the server-provided itemCount and mentions it in the accessible name', () => {
    setCart({ itemCount: 5 });
    const { r } = render();
    expect(text(badge(r))).toContain('5');
    expect(cartLink(r).props['aria-label']).toBe('Shopping cart, 5 items');
  });

  it('uses the singular for one item and compacts large counts', () => {
    setCart({ itemCount: 1 });
    let { r } = render();
    expect(cartLink(r).props['aria-label']).toBe('Shopping cart, 1 item');
    setCart({ itemCount: 250 });
    ({ r } = render());
    expect(text(badge(r))).toContain('99+');
    expect(cartLink(r).props['aria-label']).toBe('Shopping cart, 250 items');
  });

  it('does not use the badge as the only signal: the count is in the accessible name', () => {
    setCart({ itemCount: 3 });
    const { r } = render();
    expect(badge(r).props['aria-hidden']).toBe('true');
  });

  it('hides the badge for an empty confirmed cart', () => {
    setCart({ itemCount: 0 });
    const { r } = render();
    expect(badges(r)).toHaveLength(0);
    expect(cartLink(r).props['aria-label']).toBe('Shopping cart, empty');
  });

  it('updates when the cart context changes', () => {
    setCart({ itemCount: 2 });
    const { r, rerender } = render();
    expect(text(badge(r))).toContain('2');
    setCart({ itemCount: 4 });
    rerender();
    expect(text(badge(r))).toContain('4');
    setCart({ itemCount: 0 });
    rerender();
    expect(badges(r)).toHaveLength(0);
  });

  it('keeps the last confirmed count when a refresh fails', () => {
    setCart({ itemCount: 3 }, { error: { status: 500, code: 'INTERNAL_ERROR', message: 'x' } });
    const { r } = render();
    expect(text(badge(r))).toContain('3');
  });

  it('navigates to /cart on click', () => {
    const { r } = render();
    expect(location.pathname).toBe('/profile');
    click(cartLink(r));
    expect(location.pathname).toBe('/cart');
  });

  it('lives outside the collapsible nav links so it stays reachable on mobile', () => {
    const { r } = render();
    const navLinksEl = host(r, (p) => p.className?.startsWith('nav-links'));
    expect(navLinksEl.findAll((n) => n.props.className === 'cart-link')).toHaveLength(0);
    const actions = host(r, byClass('nav-actions'));
    expect(actions.findAll((n) => typeof n.type === 'string' && n.props.className === 'cart-link')).toHaveLength(1);
  });
});

describe('header with cart errors or no cart', () => {
  it('does not break navigation or the account menu when cart initialization failed', () => {
    signedIn();
    setCart(null, { status: 'error', error: { status: 502, code: 'PRODUCT_SERVICE_UNAVAILABLE', message: 'x' } });
    const { r } = render();
    expect(badges(r)).toHaveLength(0);
    click(host(r, byClass('account-trigger')));
    const items = hosts(r, (p) => p.role === 'menuitem');
    expect(items.map(text)).toEqual(['Profile', 'Sign Out']);
  });
});

describe('existing header behavior', () => {
  it('keeps the logo and section links pointing at the homepage', () => {
    const { r } = render();
    expect(host(r, byClass('brand header-brand')).props.href).toBe('/');
    const hrefs = hosts(r, (p) => p.href?.startsWith('/#')).map((n) => n.props.href);
    expect(hrefs).toEqual(['/#about', '/#contact']);
  });

  it('shows Sign in when signed out and the account menu when signed in', () => {
    let { r } = render();
    expect(hosts(r, (p) => p.href === '/login')).toHaveLength(1);
    expect(hosts(r, byClass('account-trigger'))).toHaveLength(0);
    signedIn();
    ({ r } = render());
    expect(hosts(r, byClass('account-trigger'))).toHaveLength(1);
  });

  it('account menu navigates to Profile and signs out through the existing logout', () => {
    signedIn();
    const { r } = render();
    click(host(r, byClass('account-trigger')));
    const [profile, signOut] = hosts(r, (p) => p.role === 'menuitem');
    expect(profile.props.href).toBe('/profile');
    click(signOut);
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(location.pathname).toBe('/login');
  });
});
