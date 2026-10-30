import { describe, expect, it } from 'vitest';
import { cartReducer, initialCartState } from './cartReducer';

const cartA = { id: 'c1', itemCount: 1, totalAmount: 250, items: [{ id: 'i1' }] };
const cartB = { id: 'c1', itemCount: 2, totalAmount: 500, items: [{ id: 'i1' }, { id: 'i2' }] };
const err = { status: 422, code: 'QUANTITY_LIMIT_EXCEEDED', message: 'x' };
const op = (id, extra) => ({ id, type: 'add', ...extra });

describe('cartReducer', () => {
  it('has the expected initial state', () => {
    expect(initialCartState).toMatchObject({ cart: null, status: 'idle', error: null, pendingOps: [] });
  });

  it('load start -> success', () => {
    const loading = cartReducer(initialCartState, { type: 'CART_LOAD_START' });
    expect(loading.status).toBe('loading');
    const ready = cartReducer(loading, { type: 'CART_LOAD_SUCCESS', cart: cartA, seq: 1 });
    expect(ready).toMatchObject({ status: 'ready', cart: cartA, error: null });
  });

  it('load failure without a cart -> error; with a cart keeps it usable', () => {
    expect(cartReducer(initialCartState, { type: 'CART_LOAD_FAILURE', error: err })).toMatchObject({ status: 'error', cart: null, error: err });
    const ready = cartReducer(initialCartState, { type: 'CART_LOAD_SUCCESS', cart: cartA, seq: 1 });
    expect(cartReducer(ready, { type: 'CART_LOAD_FAILURE', error: err })).toMatchObject({ status: 'ready', cart: cartA, error: err });
  });

  it('stores the server cart as-is (no derived values)', () => {
    const odd = { ...cartA, totalAmount: 9999 };
    const s = cartReducer(initialCartState, { type: 'CART_LOAD_SUCCESS', cart: odd, seq: 1 });
    expect(s.cart).toBe(odd);
    expect(Object.keys(s).sort()).toEqual(['appliedSeq', 'cart', 'error', 'mergeError', 'mergeStatus', 'pendingOps', 'status']);
  });

  it('mutation start tracks the op; success replaces the cart and removes the op', () => {
    let s = cartReducer(initialCartState, { type: 'CART_LOAD_SUCCESS', cart: cartA, seq: 1 });
    s = cartReducer(s, { type: 'MUTATION_START', op: op(1, { productId: 'p' }) });
    expect(s.pendingOps).toEqual([{ id: 1, type: 'add', productId: 'p' }]);
    s = cartReducer(s, { type: 'MUTATION_SUCCESS', opId: 1, cart: cartB, seq: 2 });
    expect(s.cart).toBe(cartB);
    expect(s.pendingOps).toEqual([]);
  });

  it('failed mutation keeps the previous cart, records the error, removes only its op', () => {
    let s = cartReducer(initialCartState, { type: 'CART_LOAD_SUCCESS', cart: cartA, seq: 1 });
    s = cartReducer(s, { type: 'MUTATION_START', op: op(1) });
    s = cartReducer(s, { type: 'MUTATION_START', op: op(2) });
    s = cartReducer(s, { type: 'MUTATION_FAILURE', opId: 1, error: err });
    expect(s.cart).toBe(cartA);
    expect(s.error).toBe(err);
    expect(s.pendingOps.map((o) => o.id)).toEqual([2]);
  });

  it('ignores a stale response (lower seq) but still completes its op', () => {
    let s = cartReducer(initialCartState, { type: 'CART_LOAD_SUCCESS', cart: cartA, seq: 1 });
    s = cartReducer(s, { type: 'MUTATION_START', op: op(1) });
    s = cartReducer(s, { type: 'MUTATION_SUCCESS', opId: 1, cart: cartB, seq: 5 });
    s = cartReducer(s, { type: 'CART_LOAD_SUCCESS', cart: cartA, seq: 3 });
    expect(s.cart).toBe(cartB);
    expect(s.appliedSeq).toBe(5);
  });

  it('does not mutate previous state', () => {
    const before = cartReducer(initialCartState, { type: 'CART_LOAD_SUCCESS', cart: cartA, seq: 1 });
    const snapshot = JSON.stringify(before);
    cartReducer(before, { type: 'MUTATION_START', op: op(1) });
    cartReducer(before, { type: 'MUTATION_SUCCESS', opId: 1, cart: cartB, seq: 2 });
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  it('reset returns to the initial state; clear error resets an error status', () => {
    const s = cartReducer(initialCartState, { type: 'CART_LOAD_SUCCESS', cart: cartA, seq: 1 });
    expect(cartReducer(s, { type: 'CART_RESET' })).toEqual(initialCartState);
    const failed = cartReducer(initialCartState, { type: 'CART_LOAD_FAILURE', error: err });
    expect(cartReducer(failed, { type: 'CLEAR_ERROR' })).toMatchObject({ status: 'idle', error: null });
  });

  it('tracks the merge lifecycle without touching the cart', () => {
    let s = cartReducer(initialCartState, { type: 'CART_LOAD_SUCCESS', cart: cartA, seq: 1 });
    s = cartReducer(s, { type: 'MERGE_START' });
    expect(s).toMatchObject({ mergeStatus: 'merging', mergeError: null, cart: cartA });
    const failed = cartReducer(s, { type: 'MERGE_FAILURE', error: { code: 'INTERNAL_ERROR', retryable: true } });
    expect(failed).toMatchObject({ mergeStatus: 'failed', mergeError: { code: 'INTERNAL_ERROR', retryable: true }, cart: cartA });
    expect(cartReducer(failed, { type: 'MERGE_DISMISS' })).toMatchObject({ mergeStatus: null, mergeError: null });
    expect(cartReducer(s, { type: 'MERGE_SUCCESS' })).toMatchObject({ mergeStatus: 'merged', mergeError: null });
    expect(cartReducer(failed, { type: 'CART_RESET' })).toEqual(initialCartState);
  });

  it('ignores unknown actions', () => {
    expect(cartReducer(initialCartState, { type: 'NOPE' })).toBe(initialCartState);
  });
});
