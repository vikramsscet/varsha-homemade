import { describe, expect, it } from 'vitest';
import { GENERIC_ADD_ERROR, getAddToCartErrorMessage } from './cartErrors';

const e = (code, status = 400) => ({ code, status, message: 'internal detail: stack at x.js' });

describe('getAddToCartErrorMessage', () => {
  it.each([
    ['PRODUCT_NOT_FOUND', 'This product is no longer available.'],
    ['QUANTITY_LIMIT_EXCEEDED', 'You can add at most 99 of each item.'],
    ['CART_ITEM_LIMIT_EXCEEDED', 'Your cart has reached its limit of different products. Remove an item to add another.'],
    ['PRODUCT_SERVICE_UNAVAILABLE', GENERIC_ADD_ERROR],
    ['PRODUCT_SERVICE_INVALID_RESPONSE', GENERIC_ADD_ERROR],
    ['CART_ITEM_NOT_FOUND', "Couldn't update your cart. Please try again."],
    ['CART_NOT_FOUND', "We couldn't find your cart. Please try again."],
    ['CART_NOT_ACTIVE', 'Your cart is no longer active. Please try again.'],
    ['UNAUTHORIZED', 'Your session has expired. Please sign in again.'],
    ['INVALID_ANONYMOUS_CART_ID', 'Your cart session was invalid and has been reset. Please try adding the item again.'],
    ['INVALID_REQUEST', "We couldn't add that item. Please check the quantity and try again."],
  ])('%s', (code, message) => expect(getAddToCartErrorMessage(e(code))).toBe(message));

  it('maps 429 by status', () => {
    expect(getAddToCartErrorMessage(e('RATE_LIMITED', 429))).toMatch(/Too many requests/);
  });

  it.each([e('INTERNAL_ERROR', 500), e('NETWORK_ERROR', 0), e('SOMETHING_NEW'), null, undefined, new Error('boom')])(
    'falls back to the generic message for unknown/500/network errors',
    (err) => expect(getAddToCartErrorMessage(err)).toBe(GENERIC_ADD_ERROR)
  );

  it('never leaks the raw backend message', () => {
    expect(getAddToCartErrorMessage(e('SOMETHING_NEW'))).not.toContain('stack');
  });
});
