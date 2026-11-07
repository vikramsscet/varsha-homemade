import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OrdersPage from './Orders';
import { listOrders } from '../../services/orderApi';
import { ApiError } from '../../services/apiClient';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock('../../services/orderApi', async (orig) => ({ ...(await orig()), listOrders: vi.fn() }));

const order = (id, over = {}) => ({ id, orderNumber: `VH-${id}`, status: 'PAID', currency: 'INR', totalAmount: 995, paymentStatus: 'CAPTURED', paymentMethodSummary: 'Visa •••• 4242', createdAt: '2026-11-01T10:30:00.000Z', ...over });
const page = (items, nextCursor = null) => ({ items, pagination: { nextCursor, hasMore: !!nextCursor } });
let r;
const text = (n) => n.children.map((c) => (typeof c === 'string' ? c : text(c))).join('');
const all = () => text(r.root.findAll((n) => n.type === 'main')[0]);
const render = async () => { await act(async () => { r = TestRenderer.create(<MemoryRouter><OrdersPage /></MemoryRouter>); }); };
const button = (label) => r.root.findAll((n) => n.type === 'button' && text(n) === label)[0];
const flush = () => act(async () => { await Promise.resolve(); });

beforeEach(() => { listOrders.mockReset(); });

describe('OrdersPage', () => {
  it('shows order details from the API, with payment method only when present', async () => {
    listOrders.mockResolvedValue(page([order('1'), order('2', { status: 'PENDING_PAYMENT', paymentStatus: null, paymentMethodSummary: null })]));
    await render();
    expect(all()).toContain('VH-1');
    expect(all()).toContain('Visa •••• 4242');
    expect(all()).toContain('Payment Pending');
    expect(all()).toContain('995.00');
    expect(r.root.findAll((n) => n.type === 'a' || n.props?.to).some((n) => n.props.to === '/orders/1')).toBe(true);
    expect(text(r.root.findAll((n) => n.props?.className === 'order-meta')[1])).not.toContain('Method');
  });

  it('shows the empty state with a shopping CTA', async () => {
    listOrders.mockResolvedValue(page([]));
    await render();
    expect(all()).toContain('No orders yet');
    expect(all()).toContain('Continue shopping');
  });

  it('shows an error with retry', async () => {
    listOrders.mockRejectedValueOnce(new ApiError({ status: 500, code: 'INTERNAL_ERROR' })).mockResolvedValueOnce(page([order('1')]));
    await render();
    expect(all()).toContain("couldn't load your orders");
    await act(async () => { button('Try again').props.onClick(); });
    expect(all()).toContain('VH-1');
  });

  it('loads more with the opaque cursor, appends without duplicates, and ignores double clicks', async () => {
    let release;
    listOrders.mockResolvedValueOnce(page([order('1')], 'CUR1'))
      .mockImplementationOnce(() => new Promise((res) => { release = () => res(page([order('1'), order('2')])); }));
    await render();
    act(() => { button('Load More').props.onClick(); button('Load More')?.props.onClick(); });
    expect(listOrders).toHaveBeenCalledTimes(2);
    expect(listOrders.mock.calls[1][0]).toMatchObject({ cursor: 'CUR1' });
    await act(async () => { release(); });
    expect(r.root.findAll((n) => n.props?.className === 'order-card')).toHaveLength(2);
    expect(r.root.findAll((n) => n.type === 'button' && text(n) === 'Load More')).toHaveLength(0);
  });

  it('changing the filter resets list and cursor and fetches the first page with that status', async () => {
    listOrders.mockResolvedValueOnce(page([order('1')], 'CUR1')).mockResolvedValueOnce(page([]));
    await render();
    await act(async () => { r.root.findByType('select').props.onChange({ target: { value: 'REFUNDED' } }); });
    const args = listOrders.mock.calls[1][0];
    expect(args).toMatchObject({ status: 'REFUNDED' });
    expect(args.cursor).toBeUndefined();
    expect(all()).toContain('No orders match this filter');
  });
});
