import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import PaymentResult from './PaymentResult';

vi.mock('../../context/CartContext', () => ({ useCart: () => ({ items: [], cart: null }) }));
const text = (n) => n.children.map((c) => (typeof c === 'string' ? c : text(c))).join('');

describe('PaymentResult', () => {
  it('shows backend order number, payment reference, amount and the paid order summary', async () => {
    let r;
    await act(async () => {
      r = TestRenderer.create(
        <MemoryRouter>
          <PaymentResult payment={{
            orderNumber: 'X', paidAt: '2026-11-07T10:00:00Z', currency: 'INR', amount: 1,
            result: { paid: true, orderNumber: 'VH261107-100001', razorpayPaymentId: 'pay_abc', amount: 109750, currency: 'INR' },
            snapshot: { items: [{ id: 'i', productName: 'Kaju Katli', quantity: 1, unitPrice: 1097.5, totalPrice: 1097.5 }], subtotal: 1097.5, totalAmount: 1097.5, currency: 'INR' },
          }} />
        </MemoryRouter>
      );
    });
    const t = text(r.root.findAll((n) => n.type === 'div')[0]);
    expect(t).toContain('Your payment was successful');
    expect(t).toContain('VH261107-100001');
    expect(t).toContain('pay_abc');
    expect(t).toContain('1,097.50');
    expect(t).toContain('Kaju Katli');
  });
});
