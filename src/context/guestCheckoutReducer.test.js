import { describe, expect, it } from 'vitest';
import { guestCheckoutReducer as r, initialGuestCheckoutState as s0 } from './guestCheckoutReducer';
import { addressReducer, initialAddressState } from './addressReducer';

describe('guestCheckoutReducer', () => {
  it('loads a session and exposes customer, delivery and expiry', () => {
    const session = { customer: { email: 'a' }, deliveryAddress: { city: 'P' }, expiresAt: 'e' };
    expect(r(s0, { type: 'GUEST_SESSION_LOADED', session })).toMatchObject({ session, customer: session.customer, deliveryAddress: session.deliveryAddress, expiresAt: 'e', expired: false });
  });
  it('flags expiry and clears session data', () => {
    const loaded = r(s0, { type: 'GUEST_SESSION_LOADED', session: { expiresAt: 'e' } });
    expect(r(loaded, { type: 'GUEST_SESSION_EXPIRED', error: { code: 'GUEST_SESSION_EXPIRED' } })).toMatchObject({ session: null, expired: true, error: { code: 'GUEST_SESSION_EXPIRED' } });
  });
  it('keeps the session on a plain failure', () => {
    const loaded = r(s0, { type: 'GUEST_SESSION_LOADED', session: { expiresAt: 'e' } });
    expect(r(loaded, { type: 'GUEST_FAILURE', error: { code: 'X' } }).session).not.toBeNull();
  });
});

describe('addressReducer', () => {
  it('request -> success -> failure keeps the list', () => {
    const ok = addressReducer(addressReducer(initialAddressState, { type: 'ADDRESSES_REQUEST' }), { type: 'ADDRESSES_SUCCESS', addresses: [{ id: '1' }] });
    expect(ok).toEqual({ addresses: [{ id: '1' }], loading: false, error: null });
    expect(addressReducer(ok, { type: 'ADDRESSES_FAILURE', error: { code: 'E' } }).addresses).toHaveLength(1);
    expect(addressReducer(ok, { type: 'ADDRESSES_RESET' })).toEqual(initialAddressState);
  });
});
