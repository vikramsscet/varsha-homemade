import { Link } from 'react-router-dom';
import { formatCurrency } from '../../services/currency';
import OrderSummary from './OrderSummary';

// Dedicated success view. Rendered only when the backend verified the payment (paid === true).
export default function PaymentResult({ payment }) {
  const { result, orderNumber, snapshot, paidAt } = payment;
  const amount = typeof result?.amount === 'number' ? result.amount : payment.amount;
  const currency = result?.currency ?? payment.currency;
  const when = paidAt ? new Date(paidAt).toLocaleString('en-IN') : null;
  return (
    <div className="checkout-layout payment-result">
      <section className="checkout-main" aria-labelledby="payment-success-title">
        <div className="payment-success-icon" aria-hidden="true">✓</div>
        <h2 id="payment-success-title">Thank you! Your payment was successful.</h2>
        <dl className="result-details">
          <div><dt>Order number</dt><dd>{result?.orderNumber ?? orderNumber}</dd></div>
          {result?.razorpayPaymentId && <div><dt>Payment reference</dt><dd>{result.razorpayPaymentId}</dd></div>}
          <div><dt>Amount paid</dt><dd>{formatCurrency(typeof amount === 'number' ? amount / 100 : undefined, currency)}</dd></div>
          {when && <div><dt>Date</dt><dd>{when}</dd></div>}
        </dl>
        <Link className="btn checkout-primary" to="/category/indian-sweets">Continue shopping</Link>
      </section>
      {snapshot && <OrderSummary snapshot={snapshot} />}
    </div>
  );
}
