import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CheckoutPage from './Checkout';
import { ApiError } from '../../services/apiClient';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const auth = {}, cart = {}, guestCtx = {}, addrCtx = {};
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../context/CartContext', () => ({ useCart: () => cart }));
vi.mock('../../context/GuestCheckoutContext', () => ({ useGuestCheckout: () => guestCtx }));
vi.mock('../../context/AddressContext', () => ({ useAddresses: () => addrCtx }));
vi.mock('../../services/guestCheckoutStorage');
import { getGuestSession } from '../../services/guestCheckoutStorage';

const item = { id: 'i1', productId: 'p1', productName: 'Kaju Katli', unitPrice: 250, quantity: 2, totalPrice: 500 };
const addr = (id, over = {}) => ({
  id, firstName: 'Vikram', lastName: 'Rao', phone: '+918319510666', country: 'IN', countryName: 'India',
  addressLine1: `Line ${id}`, addressLine2: null, city: 'Pune', state: 'Maharashtra', postalCode: '411057', isDefault: false, ...over,
});
const err = (status, code, details) => new ApiError({ status, code, message: 'raw', details });

function setup({ authed = false, addresses = [], session = null, merge = null } = {}) {
  [auth, cart, guestCtx, addrCtx].forEach((o) => Object.keys(o).forEach((k) => delete o[k]));
  Object.assign(auth, { status: authed ? 'authenticated' : 'unauthenticated', user: authed ? { displayName: 'Vik', email: 'v@x.in' } : null });
  Object.assign(cart, {
    cart: { id: 'c1' }, status: 'ready', items: [item], subtotal: 500, discountAmount: 0, taxAmount: 0, totalAmount: 500, currency: 'INR', mergeStatus: merge,
  });
  Object.assign(guestCtx, {
    session, expired: false, loading: false, error: null,
    create: vi.fn().mockResolvedValue({ id: 's-new', customer: {}, deliveryAddress: {} }),
    restore: vi.fn().mockResolvedValue(session),
    updateCustomer: vi.fn().mockResolvedValue({}),
    updateDeliveryAddress: vi.fn().mockResolvedValue({}),
    remove: vi.fn().mockResolvedValue(undefined),
  });
  Object.assign(addrCtx, {
    addresses, loading: false, error: null,
    refresh: vi.fn().mockResolvedValue(addresses),
    createAddress: vi.fn().mockResolvedValue({ id: 'new' }),
    updateAddress: vi.fn().mockResolvedValue({}),
    deleteAddress: vi.fn().mockResolvedValue({}),
    setDefaultAddress: vi.fn().mockResolvedValue({}),
  });
  getGuestSession.mockReturnValue(null);
}

let r;
async function render() {
  await act(async () => {
    r = TestRenderer.create(
      <MemoryRouter initialEntries={['/checkout']}><Routes><Route path="/checkout" element={<CheckoutPage />} /></Routes></MemoryRouter>
    );
  });
  return r;
}
const rerender = () => act(async () => { r.update(
  <MemoryRouter initialEntries={['/checkout']}><Routes><Route path="/checkout" element={<CheckoutPage />} /></Routes></MemoryRouter>
); });
const hosts = (pred) => r.root.findAll((n) => typeof n.type === 'string' && pred(n.props));
const text = (n) => n.children.map((c) => (typeof c === 'string' ? c : text(c))).join('');
const allText = () => text(r.root.findAll((n) => n.type === 'main')[0]);
const byId = (id) => hosts((p) => p.id === id)[0];
const type = (id, value) => act(async () => { byId(id).props.onChange({ target: { value, type: 'text' } }); });
const fillGuest = async (over = {}) => {
  const v = { 'guest-email': 'A@B.co', 'guest-firstName': 'V', 'guest-lastName': 'R', 'guest-phone': '+918319510666', 'guest-country': 'India', 'guest-addressLine1': 'x', 'guest-city': 'Pune', 'guest-state': 'MH', 'guest-postalCode': '411057', ...over };
  for (const [id, value] of Object.entries(v)) await type(id, value);
};
const submit = (form = 'checkout-form') => act(async () => { await hosts((p) => p.className === form)[0].props.onSubmit({ preventDefault() {} }); });
const click = (pred) => act(async () => { await hosts(pred)[0].props.onClick(); });
const btnText = (label) => r.root.findAll((n) => n.type === 'button' && text(n) === label)[0];
const press = (label) => act(async () => { await btnText(label).props.onClick(); });

beforeEach(() => vi.clearAllMocks());

describe('guest checkout', () => {
  it('creates a session on entering the details step, only once', async () => {
    setup();
    await render();
    await rerender();
    expect(guestCtx.create).toHaveBeenCalledTimes(1);
    expect(guestCtx.restore).not.toHaveBeenCalled();
  });

  it('restores a stored session and populates the form', async () => {
    const session = { id: 's1', customer: { email: 'a@b.co', firstName: 'V', lastName: 'R', phone: '123456' }, deliveryAddress: { country: 'IN', countryName: 'India', addressLine1: 'Main', city: 'Pune', state: 'MH', postalCode: '411057' } };
    setup({ session: null });
    getGuestSession.mockReturnValue({ sessionToken: 't' });
    guestCtx.restore.mockResolvedValue(session);
    await render();
    expect(guestCtx.restore).toHaveBeenCalledTimes(1);
    expect(guestCtx.create).not.toHaveBeenCalled();
    guestCtx.session = session; // the context would now expose it
    await rerender();
    expect(byId('guest-email').props.value).toBe('a@b.co');
    expect(byId('guest-addressLine1').props.value).toBe('Main');
    expect(byId('guest-country').props.value).toBe('India');
  });

  it('restore finding an expired session shows the message and creates a fresh one', async () => {
    setup();
    getGuestSession.mockReturnValue({ sessionToken: 't' });
    guestCtx.restore.mockResolvedValue(null);
    await render();
    expect(guestCtx.create).toHaveBeenCalledTimes(1);
    expect(allText()).toContain('Your checkout session expired, please re-enter your details.');
  });

  it('shows field errors and saves nothing when invalid', async () => {
    setup({ session: { id: 's', customer: {}, deliveryAddress: {} } });
    await render();
    await submit();
    expect(allText()).toContain('Email is required');
    expect(guestCtx.updateCustomer).not.toHaveBeenCalled();
  });

  it('saves customer then delivery as partial updates, only changed fields', async () => {
    setup({ session: { id: 's', customer: { firstName: 'V' }, deliveryAddress: { country: 'IN', countryName: 'India', city: 'Pune' } } });
    await render();
    await fillGuest();
    await submit();
    expect(guestCtx.updateCustomer).toHaveBeenCalledWith({ email: 'A@B.co', lastName: 'R', phone: '+918319510666' });
    expect(guestCtx.updateDeliveryAddress).toHaveBeenCalledWith({ addressLine1: 'x', state: 'MH', postalCode: '411057' });
    expect(allText()).toContain('Your details have been saved.');
  });

  it('keeps the form, shows the expired message, and creates a new session on resubmit', async () => {
    setup({ session: { id: 's', customer: {}, deliveryAddress: {} } });
    guestCtx.updateCustomer.mockRejectedValueOnce(err(410, 'GUEST_SESSION_EXPIRED'));
    await render();
    await fillGuest();
    await submit();
    guestCtx.session = null; guestCtx.expired = true; // what the context does on a dead session
    await rerender();
    expect(allText()).toContain('Your checkout session expired, please re-enter your details.');
    expect(byId('guest-email').props.value).toBe('A@B.co');
    guestCtx.create.mockResolvedValue({ id: 's2', customer: {}, deliveryAddress: {} });
    await submit();
    expect(guestCtx.create).toHaveBeenCalledTimes(1); // a fresh session after expiry
    expect(guestCtx.updateCustomer).toHaveBeenCalledTimes(2);
  });

  it('maps backend validation details to fields', async () => {
    setup({ session: { id: 's', customer: {}, deliveryAddress: {} } });
    guestCtx.updateCustomer.mockRejectedValueOnce(err(400, 'INVALID_CHECKOUT_DETAILS', [{ field: 'customer.email', message: 'Email taken' }]));
    await render();
    await fillGuest();
    await submit();
    expect(allText()).toContain('Email taken');
  });
});

describe('authenticated checkout', () => {
  const list = [addr('a'), addr('b', { isDefault: true }), addr('c')];

  it('auto-selects the isDefault address, not the first', async () => {
    setup({ authed: true, addresses: list });
    await render();
    const radios = hosts((p) => p.type === 'radio');
    expect(radios.map((x) => x.props.checked)).toEqual([false, true, false]);
    expect(allText()).toContain('Default');
    expect(guestCtx.create).not.toHaveBeenCalled(); // no guest session for signed-in users
  });

  it('switches between saved addresses', async () => {
    setup({ authed: true, addresses: list });
    await render();
    await act(async () => { hosts((p) => p.type === 'radio')[2].props.onChange(); });
    expect(hosts((p) => p.type === 'radio').map((x) => x.props.checked)).toEqual([false, false, true]);
  });

  it('shows the new address form when none are saved, locking default on', async () => {
    setup({ authed: true, addresses: [] });
    await render();
    expect(byId('addr-firstName')).toBeTruthy();
    expect(hosts((p) => p.name === 'isDefault')[0].props.checked).toBe(true);
    expect(hosts((p) => p.name === 'isDefault')[0].props.disabled).toBe(true);
  });

  it('adds an address and selects it', async () => {
    setup({ authed: true, addresses: [] });
    await render();
    for (const [k, v] of Object.entries({ firstName: 'V', lastName: 'R', phone: '+918319510666', country: 'India', addressLine1: 'x', city: 'Pune', state: 'MH', postalCode: '411057' })) await type(`addr-${k}`, v);
    await submit('address-form');
    expect(addrCtx.createAddress).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'V', isDefault: true }));
  });

  it('shows validation errors and the address-limit error', async () => {
    setup({ authed: true, addresses: [] });
    await render();
    await submit('address-form');
    expect(allText()).toContain('First name is required');
    expect(addrCtx.createAddress).not.toHaveBeenCalled();
    addrCtx.createAddress.mockRejectedValue(err(409, 'ADDRESS_LIMIT_REACHED'));
    for (const [k, v] of Object.entries({ firstName: 'V', lastName: 'R', phone: '+918319510666', country: 'India', addressLine1: 'x', city: 'Pune', state: 'MH', postalCode: '411057' })) await type(`addr-${k}`, v);
    await submit('address-form');
    expect(allText()).toContain('up to 20 addresses');
  });

  it('edits an address with the full payload; the current default stays locked', async () => {
    setup({ authed: true, addresses: list });
    await render();
    await click((p) => p['aria-label'] === 'Edit address for Vikram Rao');
    expect(hosts((p) => p.name === 'isDefault')).toHaveLength(1);
    await type('addr-city', 'Mumbai');
    await submit('address-form');
    expect(addrCtx.updateAddress).toHaveBeenCalledWith('a', expect.objectContaining({ city: 'Mumbai', country: 'India', addressLine1: 'Line a' }));
  });

  it('confirms before deleting, and cancel deletes nothing', async () => {
    setup({ authed: true, addresses: list });
    await render();
    await click((p) => p['aria-label'] === 'Delete address for Vikram Rao');
    expect(allText()).toContain('Delete this address?');
    await press('Cancel');
    expect(addrCtx.deleteAddress).not.toHaveBeenCalled();
    await click((p) => p['aria-label'] === 'Delete address for Vikram Rao');
    await click((p) => p.className === 'btn checkout-danger');
    expect(addrCtx.deleteAddress).toHaveBeenCalledWith('a');
  });

  it('after the default is deleted the new default becomes selected', async () => {
    setup({ authed: true, addresses: list });
    await render();
    addrCtx.addresses = [addr('a', { isDefault: true }), addr('c')]; // list returned after deleting b
    await rerender();
    expect(hosts((p) => p.type === 'radio').map((x) => x.props.checked)).toEqual([true, false]);
  });

  it('set as default updates the selection', async () => {
    setup({ authed: true, addresses: list });
    await render();
    await click((p) => p['aria-label'] === 'Set address for Vikram Rao as default');
    expect(addrCtx.setDefaultAddress).toHaveBeenCalledWith('a');
    expect(hosts((p) => p.type === 'radio').map((x) => x.props.checked)).toEqual([true, false, false]);
  });

  it('shows an order summary from server amounts, with an edit link', async () => {
    setup({ authed: true, addresses: list });
    cart.totalAmount = 123.45;
    await render();
    expect(allText()).toContain('Kaju Katli');
    expect(allText()).toContain('123.45');
    expect(r.root.findAll((n) => n.props.to === '/cart').length).toBeGreaterThan(0);
  });
});

describe('guest -> authenticated transition', () => {
  const guestSession = { id: 's', customer: { firstName: 'V', lastName: 'R', phone: '123456' }, deliveryAddress: { countryName: 'India', addressLine1: 'G1', city: 'Pune', state: 'MH', postalCode: '411057' } };

  it('after login + merge: deletes the guest session, loads addresses, selects default, offers to save', async () => {
    setup({ authed: true, addresses: [addr('a'), addr('b', { isDefault: true })], session: guestSession, merge: 'merged' });
    getGuestSession.mockReturnValue({ sessionToken: 't' });
    await render();
    expect(guestCtx.remove).toHaveBeenCalledTimes(1);
    expect(addrCtx.refresh).toHaveBeenCalled();
    expect(hosts((p) => p.type === 'radio').map((x) => x.props.checked)).toEqual([false, true]);
    expect(allText()).toContain('Would you like to save this delivery address to your account?');
    expect(addrCtx.createAddress).not.toHaveBeenCalled(); // never automatic
    await press('Save address');
    expect(addrCtx.createAddress).toHaveBeenCalledWith(expect.objectContaining({ addressLine1: 'G1', isDefault: false }));
  });

  it('does not delete the guest session while merging or after a failed merge', async () => {
    for (const merge of ['merging', 'failed']) {
      setup({ authed: true, addresses: [], session: guestSession, merge });
      getGuestSession.mockReturnValue({ sessionToken: 't' });
      await render();
      expect(guestCtx.remove).not.toHaveBeenCalled();
    }
  });

  it('does not delete anything for a plain guest or when no guest session exists', async () => {
    setup();
    getGuestSession.mockReturnValue({ sessionToken: 't' });
    await render();
    expect(guestCtx.remove).not.toHaveBeenCalled();
    setup({ authed: true, addresses: [addr('a', { isDefault: true })] });
    await render();
    expect(guestCtx.remove).not.toHaveBeenCalled();
  });
});

describe('empty cart', () => {
  it('shows an empty state instead of the form', async () => {
    setup();
    cart.items = [];
    await render();
    expect(allText()).toContain('Your cart is empty');
    expect(guestCtx.create).not.toHaveBeenCalled();
  });
});
