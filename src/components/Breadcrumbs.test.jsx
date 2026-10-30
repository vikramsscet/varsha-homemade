import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Breadcrumbs from './Breadcrumbs';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let location;
const LocationProbe = () => { location = useLocation(); return null; };

function render(items, initialEntry = '/cart') {
  let r;
  act(() => {
    r = TestRenderer.create(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Breadcrumbs items={items} />
        <Routes><Route path="*" element={<LocationProbe />} /></Routes>
      </MemoryRouter>
    );
  });
  return r;
}
const hosts = (r, pred) => r.root.findAll((n) => typeof n.type === 'string' && pred(n.props));
const text = (n) => n.children.map((c) => (typeof c === 'string' ? c : text(c))).join('');
const nav = (r) => hosts(r, (p) => p['aria-label'] === 'Breadcrumb');

describe('Breadcrumbs', () => {
  it('renders a semantic nav with an ordered list, links for ancestors, text for the current page', () => {
    const r = render([{ label: 'Home', to: '/' }, { label: 'Cart' }]);
    expect(nav(r)).toHaveLength(1);
    expect(nav(r)[0].type).toBe('nav');
    expect(r.root.findAll((n) => n.type === 'ol')).toHaveLength(1);
    const link = hosts(r, (p) => p.href === '/')[0];
    expect(text(link)).toBe('Home');
    const current = hosts(r, (p) => p['aria-current'] === 'page')[0];
    expect(current.type).toBe('span');
    expect(text(current)).toBe('Cart');
    expect(text(nav(r)[0])).toBe('Home/Cart');
  });

  it('never renders the current page as a link, even when it has a `to`', () => {
    const r = render([{ label: 'Home', to: '/' }, { label: 'Cart', to: '/cart' }]);
    expect(hosts(r, (p) => p.href === '/cart')).toHaveLength(0);
    expect(text(hosts(r, (p) => p['aria-current'] === 'page')[0])).toBe('Cart');
  });

  it('the Home link navigates to /', async () => {
    const r = render([{ label: 'Home', to: '/' }, { label: 'Cart' }]);
    expect(location.pathname).toBe('/cart');
    const link = hosts(r, (p) => p.href === '/')[0];
    await act(async () => {
      link.props.onClick({ button: 0, defaultPrevented: false, preventDefault() {}, metaKey: false, altKey: false, ctrlKey: false, shiftKey: false });
    });
    expect(location.pathname).toBe('/');
  });

  it('separators are decorative and hidden from assistive technology', () => {
    const r = render([{ label: 'Home', to: '/' }, { label: 'Cart' }]);
    const seps = hosts(r, (p) => p.className === 'breadcrumbs-sep');
    expect(seps).toHaveLength(1);
    expect(seps[0].props['aria-hidden']).toBe('true');
  });

  it('skips empty items and renders nothing without any labels', () => {
    expect(nav(render([{ label: '' }, null])).length).toBe(0);
    const r = render([{ label: 'Home', to: '/' }, { label: '' }, { label: 'Cart' }]);
    expect(text(nav(r)[0])).toBe('Home/Cart');
  });
});
