import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { usePayment } from './usePayment';
import * as api from '../../services/paymentApi';
import { loadRazorpay } from '../../services/razorpayLoader';
import { ApiError } from '../../services/apiClient';
import { getPaymentRef, savePaymentRef } from '../../services/paymentRefStorage';
import { saveGuestOrderToken, getGuestOrderToken, clearGuestOrderToken } from '../../services/guestOrderStorage';
import { tokenStorage } from '../../services/tokenStorage';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock('../../services/paymentApi');
vi.mock('../../services/razorpayLoader');
const refreshCart = vi.fn();
const cleanup = vi.fn();
vi.mock('../../context/GuestCheckoutContext', () => ({ useGuestCheckout: () => ({ cleanup }) }));
vi.mock('../../context/CartContext', () => ({
  useCart: () => ({ items: [{ id: 'i1' }], subtotal: 1, discountAmount: 0, taxAmount: 0, totalAmount: 1, currency: 'INR', cart: {}, refreshCart }),
}));

const order = { id: 'o1', orderNumber: 'VH1', amountInPaise: 100 };
const pmt = { paymentId: 'p1', razorpayOrderId: 'order_1', razorpayKeyId: 'rzp_test_x', amount: 109750, currency: 'INR', attemptNumber: 1, status: 'CREATED' };
let opts, hook;
class FakeRazorpay { constructor(o) { opts = o; } open() {} }

async function mount() {
  function C() { hook = usePayment(); return null; }
  await act(async () => { TestRenderer.create(<C />); });
}
const start = (arg = { addressId: 'ad1' }) => { let p; act(() => { p = hook.pay(arg); }); return p; };
const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });

const mem = () => { const d = {}; return { d, getItem: (k) => d[k] ?? null, setItem: (k, v) => { d[k] = v; }, removeItem: (k) => { delete d[k]; } }; };
let sess;
beforeEach(() => {
  vi.clearAllMocks();
  sess = mem();
  vi.stubGlobal('window', { sessionStorage: sess, localStorage: mem() });
  tokenStorage.clear();
  clearGuestOrderToken();
  refreshCart.mockResolvedValue({});
  cleanup.mockResolvedValue(undefined);
  api.createOrder.mockResolvedValue(order);
  api.createRazorpayOrder.mockResolvedValue(pmt);
  api.verifyPayment.mockResolvedValue({ paid: true, orderStatus: 'PAID', paymentStatus: 'CAPTURED', orderNumber: 'VH1', amount: 109750 });
  loadRazorpay.mockResolvedValue(FakeRazorpay);
});

describe('usePayment', () => {
  it('creates the order first, then opens Checkout with the backend amount', async () => {
    await mount();
    start(); await flush(); await flush();
    expect(api.createOrder.mock.invocationCallOrder[0]).toBeLessThan(api.createRazorpayOrder.mock.invocationCallOrder[0]);
    expect(opts).toMatchObject({ key: 'rzp_test_x', order_id: 'order_1', amount: 109750, currency: 'INR', name: 'Varsha Homemade' });
    expect(opts.description).toContain('VH1');
    expect(hook.payment.status).toBe('PAYMENT_IN_PROGRESS');
  });

  it('verifies via the backend and only then reports success', async () => {
    await mount();
    start(); await flush(); await flush();
    await act(async () => { await opts.handler({ razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 'sig' }); });
    expect(api.verifyPayment).toHaveBeenCalledWith(expect.objectContaining({ internalPaymentId: 'p1', razorpay_signature: 'sig' }));
    expect(hook.payment.status).toBe('PAYMENT_SUCCESS');
    expect(refreshCart).toHaveBeenCalledTimes(1);
  });

  const verifyWith = async (setup) => {
    setup();
    await mount();
    start(); await flush(); await flush();
    await act(async () => { await opts.handler({ razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', razorpay_signature: 's' }); });
    return hook.payment;
  };
  const err = (status, code) => new ApiError({ status, code });

  it('202 authorized-not-captured shows confirming, not success, and keeps the cart', async () => {
    const p = await verifyWith(() => api.verifyPayment.mockResolvedValue({ paid: false, paymentStatus: 'AUTHORIZED', orderStatus: 'PENDING_PAYMENT' }));
    expect(p.status).toBe('PAYMENT_CONFIRMING');
    expect(refreshCart).not.toHaveBeenCalled();
    start(); await flush();
    expect(api.createRazorpayOrder).toHaveBeenCalledTimes(1); // no second payment while confirming
  });

  it('402 PAYMENT_FAILED is retryable on the same order and keeps the cart', async () => {
    const p = await verifyWith(() => api.verifyPayment.mockRejectedValue(err(402, 'PAYMENT_FAILED')));
    expect(p.status).toBe('PAYMENT_FAILED');
    expect(p.outcome.retryable).toBe(true);
    expect(refreshCart).not.toHaveBeenCalled();
    await act(async () => { hook.retry(); }); await flush(); await flush();
    expect(api.createOrder).toHaveBeenCalledTimes(1);
    expect(api.createRazorpayOrder).toHaveBeenCalledTimes(2);
  });

  it.each(['INVALID_SIGNATURE', 'RAZORPAY_ORDER_MISMATCH', 'PAYMENT_MISMATCH', 'PAYMENT_NOT_FOUND', 'PAYMENT_CONFLICT'])('%s is a non-retryable failure, never success', async (code) => {
    const p = await verifyWith(() => api.verifyPayment.mockRejectedValue(err(400, code)));
    expect(p.status).toBe('PAYMENT_FAILED');
    expect(p.outcome.retryable).toBe(false);
    expect(refreshCart).not.toHaveBeenCalled();
  });

  it.each(['PAYMENT_GATEWAY_UNAVAILABLE', 'PAYMENT_GATEWAY_ERROR', 'PAYMENT_NOT_VERIFIABLE'])('%s keeps confirming (temporary)', async (code) => {
    const p = await verifyWith(() => api.verifyPayment.mockRejectedValue(err(502, code)));
    expect(p.status).toBe('PAYMENT_CONFIRMING');
  });

  it('PAYMENT_REFUNDED shows a refunded outcome', async () => {
    const p = await verifyWith(() => api.verifyPayment.mockRejectedValue(err(409, 'PAYMENT_REFUNDED')));
    expect(p.outcome.kind).toBe('refunded');
  });

  it.each(['PAYMENT_ALREADY_PROCESSED', 'ORDER_ALREADY_PAID'])('%s re-checks the status and shows success when paid', async (code) => {
    const p = await verifyWith(() => api.verifyPayment.mockRejectedValueOnce(err(409, code)).mockResolvedValueOnce({ paid: true, alreadyProcessed: true, orderNumber: 'VH1' }));
    expect(api.verifyPayment).toHaveBeenCalledTimes(2);
    expect(p.status).toBe('PAYMENT_SUCCESS');
  });

  it('a duplicate callback does not verify twice or restart payment once successful', async () => {
    await verifyWith(() => {});
    start(); await flush();
    expect(api.createRazorpayOrder).toHaveBeenCalledTimes(1);
  });

  it('dismissal keeps the order and does not create another on retry', async () => {
    await mount();
    start(); await flush(); await flush();
    act(() => opts.modal.ondismiss()); await flush();
    expect(hook.payment.status).toBe('IDLE');
    expect(hook.payment.dismissed).toBe(true);
    expect(refreshCart).not.toHaveBeenCalled();
    expect(hook.payment.orderId).toBe('o1');
    start(); await flush(); await flush();
    expect(api.createOrder).toHaveBeenCalledTimes(1);
    expect(api.createRazorpayOrder).toHaveBeenCalledTimes(2);
  });

  it('reuses the idempotency key after a network failure only', async () => {
    api.createOrder.mockRejectedValueOnce(new ApiError({})).mockRejectedValueOnce(new ApiError({ status: 409, code: 'CART_CHANGED' })).mockResolvedValue(order);
    await mount();
    start(); await flush(); await flush();
    start(); await flush(); await flush();
    start(); await flush(); await flush();
    const keys = api.createOrder.mock.calls.map((c) => c[0].idempotencyKey);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[1]);
  });

  it('retry after failure opens Checkout for the NEW attempt on the same order', async () => {
    api.verifyPayment.mockRejectedValueOnce(new ApiError({ status: 402, code: 'PAYMENT_FAILED' }));
    await mount();
    start(); await flush(); await flush();
    await act(async () => { await opts.handler({ razorpay_order_id: 'order_1', razorpay_payment_id: 'p', razorpay_signature: 's' }); });
    api.createRazorpayOrder.mockResolvedValue({ ...pmt, paymentId: 'p2', razorpayOrderId: 'order_2', attemptNumber: 2 });
    await act(async () => { hook.retry(); }); await flush(); await flush();
    expect(opts.order_id).toBe('order_2');
    expect(hook.payment.paymentId).toBe('p2');
    expect(hook.payment.attemptNumber).toBe(2);
    expect(api.createOrder).toHaveBeenCalledTimes(1);
    api.verifyPayment.mockResolvedValue({ paid: true });
    await act(async () => { await opts.handler({ razorpay_order_id: 'order_2', razorpay_payment_id: 'p', razorpay_signature: 's' }); });
    expect(api.verifyPayment).toHaveBeenLastCalledWith(expect.objectContaining({ internalPaymentId: 'p2' }));
    expect(hook.payment.status).toBe('PAYMENT_SUCCESS');
  });

  it('a reused open attempt (reused: true) opens Checkout normally', async () => {
    api.createRazorpayOrder.mockResolvedValue({ ...pmt, reused: true });
    await mount();
    start(); await flush(); await flush();
    expect(opts.order_id).toBe('order_1');
  });

  it('refresh after popup dismissal restores the order and continues without a new order', async () => {
    await mount();
    start(); await flush(); await flush();
    expect(getPaymentRef()).toMatchObject({ orderId: 'o1', orderNumber: 'VH1', customerType: 'GUEST' });
    await mount(); // simulated reload: a fresh hook reads storage only
    expect(hook.payment).toMatchObject({ status: 'IDLE', orderId: 'o1', restored: true });
    start({}); await flush(); await flush();
    expect(api.createOrder).toHaveBeenCalledTimes(1);
    expect(api.createRazorpayOrder).toHaveBeenLastCalledWith('o1');
  });

  it('a payment already submitted restores as confirming and cannot start another attempt', async () => {
    savePaymentRef({ orderId: 'o1', orderNumber: 'VH1', customerType: 'GUEST', status: 'CONFIRMING' });
    await mount();
    expect(hook.payment.status).toBe('PAYMENT_CONFIRMING');
    start({}); await flush();
    expect(api.createRazorpayOrder).not.toHaveBeenCalled();
    expect(api.verifyPayment).not.toHaveBeenCalled(); // never re-verifies without callback data
  });

  it('does not restore an order of the other customer type', async () => {
    savePaymentRef({ orderId: 'o1', customerType: 'USER' });
    await mount();
    expect(hook.payment.orderId).toBeNull();
  });

  it('keeps the idempotency key across a reload after an uncertain network failure', async () => {
    api.createOrder.mockRejectedValueOnce(new ApiError({}));
    await mount();
    start(); await flush(); await flush();
    const first = api.createOrder.mock.calls[0][0].idempotencyKey;
    await mount();
    start(); await flush(); await flush();
    expect(api.createOrder.mock.calls[1][0].idempotencyKey).toBe(first);
  });

  it('success clears recovery data and the guest order token; failure keeps them', async () => {
    saveGuestOrderToken({ orderId: 'o1', token: 'T'.repeat(43) });
    await verifyWith(() => api.verifyPayment.mockRejectedValue(new ApiError({ status: 402, code: 'PAYMENT_FAILED' })));
    expect(getPaymentRef()).toMatchObject({ orderId: 'o1' });
    expect(getGuestOrderToken('o1')).toBeTruthy();
    api.verifyPayment.mockResolvedValue({ paid: true });
    await act(async () => { hook.retry(); }); await flush(); await flush();
    await act(async () => { await opts.handler({ razorpay_order_id: 'o', razorpay_payment_id: 'p', razorpay_signature: 's' }); });
    expect(getPaymentRef()).toBeNull();
    expect(getGuestOrderToken('o1')).toBeNull();
  });

  it('an expired order is forgotten so the next attempt creates a fresh one', async () => {
    api.createRazorpayOrder.mockRejectedValueOnce(new ApiError({ status: 409, code: 'ORDER_EXPIRED' }));
    await mount();
    start(); await flush(); await flush();
    expect(hook.payment.orderId).toBeNull();
    expect(getPaymentRef()?.orderId).toBeUndefined();
    start(); await flush(); await flush();
    expect(api.createOrder).toHaveBeenCalledTimes(2);
  });

  it('never writes tokens or secrets to storage', async () => {
    await mount();
    start(); await flush(); await flush();
    await act(async () => { await opts.handler({ razorpay_order_id: 'o', razorpay_payment_id: 'p', razorpay_signature: 'SIGSECRET' }); });
    const dump = JSON.stringify(sess.d) + JSON.stringify(window.localStorage.d);
    expect(dump).not.toContain('SIGSECRET');
    expect(dump).not.toMatch(/secret/i);
  });

  it('guest: deletes the checkout session only after a PAID success', async () => {
    await verifyWith(() => {});
    expect(cleanup).toHaveBeenCalledTimes(1);
    expect(hook.payment.status).toBe('PAYMENT_SUCCESS');
  });

  it('guest: no cleanup for pending, failed or dismissed payments', async () => {
    await verifyWith(() => api.verifyPayment.mockResolvedValue({ paid: false, paymentStatus: 'AUTHORIZED' }));
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('guest: no cleanup when paid but order is not PAID', async () => {
    await verifyWith(() => api.verifyPayment.mockResolvedValue({ paid: true, orderStatus: 'PENDING_PAYMENT' }));
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('guest: a failing cleanup never turns success into failure', async () => {
    cleanup.mockRejectedValue(new ApiError({}));
    await verifyWith(() => {});
    expect(hook.payment.status).toBe('PAYMENT_SUCCESS');
  });

  it('authenticated: never calls guest cleanup', async () => {
    tokenStorage.set('jwt');
    await verifyWith(() => {});
    expect(cleanup).not.toHaveBeenCalled();
    expect(hook.payment.status).toBe('PAYMENT_SUCCESS');
  });
});
