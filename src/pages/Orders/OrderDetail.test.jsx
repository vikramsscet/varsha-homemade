import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrderDetailPage from './OrderDetail';
import { getOrder, paymentMethodDetails } from '../../services/orderApi';
import { ApiError } from '../../services/apiClient';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock('../../services/orderApi', async (orig) => ({ ...(await orig()), getOrder: vi.fn() }));

const order = {
  id: 'o-1', orderNumber: 'VH-1', status: 'PAID', currency: 'INR', subtotal: 1000, discountAmount: 100, taxAmount: 45, shippingAmount: 50, totalAmount: 995,
  paymentStatus: 'CAPTURED', paymentMethodSummary: 'Visa •••• 4242', paidAt: '2026-11-01T10:31:00.000Z', createdAt: '2026-11-01T10:25:00.000Z',
  items: [{ productId: 'p', productName: 'Choco Cake', productSlug: 'choco-cake', unitPrice: 500, quantity: 2, totalPrice: 1000 }],
  shippingAddress: { firstName: 'Vikram', lastName: 'Rao', phone: '9876543210', country: 'India', addressLine1: 'L1', addressLine2: null, city: 'Pune', state: 'MH', postalCode: '411001' },
  payments: [
    { paymentId: 'p2', paymentStatus: 'CAPTURED', paymentMethod: 'card', paymentMethodSummary: 'Visa •••• 4242', amount: 109500, currency: 'INR', card: { network: 'Visa', last4: '4242', type: 'credit', issuer: 'HDFC' }, createdAt: '2026-11-01T10:30:00.000Z', capturedAt: '2026-11-01T10:31:00.000Z', razorpayPaymentId: 'pay_2' },
    { paymentId: 'p1', paymentStatus: 'FAILED', paymentMethod: 'upi', amount: 109500, currency: 'INR', upiHandleMasked: 'al***@okhdfc', createdAt: '2026-11-01T10:26:00.000Z' },
    { paymentId: 'p0', paymentStatus: 'CREATED', paymentMethod: null, amount: null, card: null, createdAt: null },
  ],
};
let r;
const text = (n) => n.children.map((c) => (typeof c === 'string' ? c : text(c))).join('');
const all = () => text(r.root.findAll((n) => n.type === 'main')[0]);
const render = async () => { await act(async () => { r = TestRenderer.create(<MemoryRouter initialEntries={['/orders/o-1']}><Routes><Route path="/orders/:id" element={<OrderDetailPage />} /></Routes></MemoryRouter>); }); };
beforeEach(() => { getOrder.mockReset(); });

describe('OrderDetailPage', () => {
  it('loads by UUID and shows snapshots, pricing and payment history', async () => {
    getOrder.mockResolvedValue(order);
    await render();
    expect(getOrder).toHaveBeenCalledWith('o-1');
    const t = all();
    expect(t).toContain('Choco Cake');
    expect(t).toContain('Pune, MH, 411001');
    expect(t).toContain('₹995.00');
    expect(t).toContain('−₹100.00');
    expect(t).toContain('Back to My Orders');
  });

  it('converts payment amounts from paise but leaves order amounts in rupees', async () => {
    getOrder.mockResolvedValue(order);
    await render();
    expect(all()).toContain('₹1,095.00'); // 109500 paise
    expect(all()).not.toContain('₹109,500');
    expect(all()).toContain('₹1,000.00'); // item total, rupees
  });

  it('shows method specifics, masked UPI only, and tolerates null metadata', async () => {
    getOrder.mockResolvedValue(order);
    await render();
    const t = all();
    expect(t).toContain('•••• 4242');
    expect(t).toContain('HDFC');
    expect(t).toContain('al***@okhdfc');
    expect(t).toContain('Not available');
    expect(t).toContain('pay_2');
  });

  it('shows a generic not-found message and no retry', async () => {
    getOrder.mockImplementation(async () => { throw new ApiError({ status: 404, code: 'ORDER_NOT_FOUND' }); });
    await render();
    expect(all()).toContain('Order not found.');
    expect(r.root.findAll((x) => x.type === 'button')).toHaveLength(0);
  });

  it('shows a server error with retry', async () => {
    getOrder.mockImplementationOnce(() => Promise.reject(new ApiError({ status: 500, code: 'INTERNAL_ERROR' }))).mockResolvedValueOnce(order);
    await render();
    expect(all()).toContain("couldn't load this order");
    await act(async () => { r.root.findByType('button').props.onClick(); });
    expect(all()).toContain('VH-1');
  });
});

describe('paymentMethodDetails', () => {
  it('maps netbanking and wallet, and returns nothing for unknown or null data', () => {
    expect(paymentMethodDetails({ paymentMethod: 'netbanking', bankCode: 'HDFC' })).toEqual([['Bank', 'HDFC']]);
    expect(paymentMethodDetails({ paymentMethod: 'wallet', walletName: 'paytm' })).toEqual([['Wallet', 'paytm']]);
    expect(paymentMethodDetails({ paymentMethod: 'card', card: null })).toEqual([]);
    expect(paymentMethodDetails({ paymentMethod: 'emi' })).toEqual([]);
  });
});
