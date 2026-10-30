// Route-level breadcrumb checks for the pages without their own test files.
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ProfilePage from '../pages/Profile/Profile';
import IndianSweetsPage from '../pages/IndianSweets/IndianSweets';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock('../services/authApi', () => ({
  getMe: vi.fn(),
  getAuthErrorMessage: () => 'Something went wrong. Please try again.',
}));
import { getMe } from '../services/authApi';

const hosts = (r, pred) => r.root.findAll((n) => typeof n.type === 'string' && pred(n.props));
const text = (n) => n.children.map((c) => (typeof c === 'string' ? c : text(c))).join('');
const navs = (r) => hosts(r, (p) => p['aria-label'] === 'Breadcrumb');
const current = (r) => text(hosts(r, (p) => p['aria-current'] === 'page')[0]);
const homeLink = (r) => hosts(r, (p) => p.href === '/');

async function render(element) {
  let r;
  await act(async () => { r = TestRenderer.create(<MemoryRouter>{element}</MemoryRouter>); });
  return r;
}

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe('profile breadcrumbs', () => {
  it('renders Home / Profile exactly once when loaded', async () => {
    getMe.mockResolvedValue({ id: 'u1', email: 'a@b.c', displayName: 'A B', emailVerified: true, status: 'ACTIVE' });
    const r = await render(<ProfilePage />);
    expect(navs(r)).toHaveLength(1);
    expect(text(navs(r)[0])).toBe('Home/Profile');
    expect(homeLink(r)).toHaveLength(1);
    expect(current(r)).toBe('Profile');
  });

  it('keeps the breadcrumb, once, in the loading and error states', async () => {
    getMe.mockReturnValue(new Promise(() => {})); // stays loading
    let r = await render(<ProfilePage />);
    expect(navs(r)).toHaveLength(1);
    expect(text(navs(r)[0])).toBe('Home/Profile');
    getMe.mockRejectedValue(new Error('boom'));
    r = await render(<ProfilePage />);
    expect(navs(r)).toHaveLength(1);
    expect(current(r)).toBe('Profile');
  });
});

describe('category breadcrumbs', () => {
  it('renders Home / Indian Sweets exactly once, with a clickable Home', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ data: [] }) }));
    const r = await render(<IndianSweetsPage />);
    expect(navs(r)).toHaveLength(1);
    expect(text(navs(r)[0])).toBe('Home/Indian Sweets');
    expect(homeLink(r)).toHaveLength(1);
    expect(current(r)).toBe('Indian Sweets');
    // The old static text-only breadcrumb is gone.
    expect(hosts(r, (p) => p.className === 'breadcrumb')).toHaveLength(0);
  });
});
