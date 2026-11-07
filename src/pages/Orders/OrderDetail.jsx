import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs';
import {
  getOrder, getOrderDetailError, orderStatusLabel, paymentMethodDetails, paymentMethodLabel, paymentStatusLabel,
} from '../../services/orderApi';
import { formatCurrency } from '../../services/currency';
import { formatDateTime } from '../../services/profileFormat';
import './orders.css';

const NA = 'Not available';
const Row = ({ label, children }) => <div><dt>{label}</dt><dd>{children}</dd></div>;
// Payment attempt amounts are in paise; order-level amounts are already rupees.
const paise = (amount, currency) => (typeof amount === 'number' ? formatCurrency(amount / 100, currency) : NA);

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(0);

  const load = useCallback(async () => {
    const run = ++alive.current;
    setLoading(true);
    setError(null);
    try {
      const data = await getOrder(id);
      if (run === alive.current) setOrder(data);
    } catch (e) {
      // 401 is handled globally (sign-out and redirect to login).
      if (run === alive.current) { setOrder(null); setError(getOrderDetailError(e)); }
    } finally {
      if (run === alive.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); return () => { alive.current += 1; }; }, [load]);

  const crumbs = [{ label: 'Home', to: '/' }, { label: 'My Orders', to: '/orders' }, { label: order?.orderNumber ?? 'Order' }];
  const back = <Link className="order-back" to="/orders">← Back to My Orders</Link>;

  if (loading) {
    return <main className="orders-page container" aria-busy="true"><Breadcrumbs items={crumbs} /><p role="status" className="orders-loading">Loading your order…</p></main>;
  }
  if (error || !order) {
    return (
      <main className="orders-page container">
        <Breadcrumbs items={crumbs} />
        <div role="alert" className="orders-error">
          <p>{error?.message ?? 'Order not found.'}</p>
          {!error?.notFound && <button type="button" className="btn checkout-secondary" onClick={load}>Try again</button>}
          {back}
        </div>
      </main>
    );
  }

  const cur = order.currency;
  const money = (n) => (typeof n === 'number' ? formatCurrency(n, cur) : NA);
  const a = order.shippingAddress;
  const payLabel = paymentStatusLabel(order.paymentStatus);

  return (
    <main className="orders-page container order-detail">
      <Breadcrumbs items={crumbs} />
      {back}
      <div className="orders-head"><h1>Order {order.orderNumber}</h1></div>

      <section className="order-card" aria-labelledby="od-info">
        <h2 id="od-info">Order information</h2>
        <dl className="order-meta">
          <Row label="Order number">{order.orderNumber}</Row>
          <Row label="Order date">{order.createdAt ? formatDateTime(order.createdAt) : NA}</Row>
          <Row label="Order status"><span className={`order-badge status-${String(order.status).toLowerCase()}`}>{orderStatusLabel(order.status)}</span></Row>
          <Row label="Payment status">{payLabel ?? 'No payment yet'}</Row>
          <Row label="Payment method">{order.paymentMethodSummary ?? NA}</Row>
          {order.paidAt && <Row label="Paid on">{formatDateTime(order.paidAt)}</Row>}
        </dl>
      </section>

      <section className="order-card" aria-labelledby="od-items">
        <h2 id="od-items">Items</h2>
        <ul className="od-items">
          {order.items.map((it, i) => (
            <li key={`${it.productId ?? i}-${i}`} className="od-item">
              <div>
                {it.productSlug ? <Link to={`/products/${encodeURIComponent(it.productSlug)}`}><strong>{it.productName}</strong></Link> : <strong>{it.productName}</strong>}
                <span>Qty {it.quantity} × {money(it.unitPrice)}</span>
              </div>
              <strong>{money(it.totalPrice)}</strong>
            </li>
          ))}
        </ul>
        <dl className="summary-totals">
          <div><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>
          <div><dt>Discount</dt><dd>{order.discountAmount > 0 ? `−${money(order.discountAmount)}` : money(order.discountAmount)}</dd></div>
          <div><dt>Tax</dt><dd>{money(order.taxAmount)}</dd></div>
          <div><dt>Shipping</dt><dd>{money(order.shippingAmount)}</dd></div>
          <div className="summary-total"><dt>Total</dt><dd>{money(order.totalAmount)}</dd></div>
        </dl>
      </section>

      <section className="order-card" aria-labelledby="od-ship">
        <h2 id="od-ship">Shipping address</h2>
        {a ? (
          <address className="od-address">
            <strong>{[a.firstName, a.lastName].filter(Boolean).join(' ')}</strong>
            {a.phone && <span>{a.phone}</span>}
            {a.addressLine1 && <span>{a.addressLine1}</span>}
            {a.addressLine2 && <span>{a.addressLine2}</span>}
            <span>{[a.city, a.state, a.postalCode].filter(Boolean).join(', ')}</span>
            {a.country && <span>{a.country}</span>}
          </address>
        ) : <p>{NA}</p>}
      </section>

      <section className="order-card" aria-labelledby="od-pay">
        <h2 id="od-pay">Payment history</h2>
        {order.payments.length === 0 ? <p>No payment attempts yet.</p> : (
          <ul className="od-payments">
            {order.payments.map((p, i) => {
              const details = paymentMethodDetails(p);
              return (
                <li key={p.paymentId ?? i} className="od-payment">
                  <div className="order-card-top">
                    <strong>{paymentStatusLabel(p.paymentStatus) ?? 'Unknown'}</strong>
                    <span>{paise(p.amount, p.currency ?? cur)}</span>
                  </div>
                  <dl className="order-meta">
                    <Row label="Method">{paymentMethodLabel(p.paymentMethod) ?? NA}</Row>
                    {p.paymentMethodSummary && <Row label="Summary">{p.paymentMethodSummary}</Row>}
                    {details.map(([l, v]) => <Row key={l} label={l}>{v}</Row>)}
                    <Row label="Attempted">{p.createdAt ? formatDateTime(p.createdAt) : NA}</Row>
                    {p.capturedAt && <Row label="Captured">{formatDateTime(p.capturedAt)}</Row>}
                    {p.razorpayPaymentId && <Row label="Payment ID">{p.razorpayPaymentId}</Row>}
                  </dl>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
