import { useState } from 'react';
import { useCart } from '../../context/CartContext';
import { PAYMENT_STATUS as S, getVerifyMessage } from '../../services/paymentResult';
import { formatCurrency } from '../../services/currency';
import { getPaymentErrorMessage } from '../../services/checkoutErrors';

// Payment gateway info + Pay Now. Success is shown elsewhere (PaymentResult); this shows progress, pending and failure states.
// `ready` = customer details and delivery address are complete; `busy` = a checkout operation is pending.
export default function PaymentSection({ ready, busy = false, onPayNow, payment }) {
  const { items } = useCart();
  const [pending, setPending] = useState(false);
  const status = payment?.status;
  const inFlight = [S.CREATING_ORDER, S.CREATING_PAYMENT, S.VERIFYING_PAYMENT, S.PAYMENT_CONFIRMING].includes(status);
  // After a failed attempt only a genuine PAYMENT_FAILED may be retried (same internal order).
  const blocked = status === S.PAYMENT_SUCCESS || (status === S.PAYMENT_FAILED && !payment.outcome?.retryable);
  const disabled = items.length === 0 || !ready || busy || pending || inFlight || blocked;
  const retrying = status === S.PAYMENT_FAILED && payment.outcome?.retryable;

  async function handleClick() {
    if (disabled) return;
    setPending(true);
    try {
      await onPayNow?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="payment-title" className="payment-section">
      <h2 id="payment-title">Payment</h2>
      <div className="payment-card">
        <strong>Razorpay</strong>
        <p className="payment-methods">
          Pay using UPI, Credit/Debit Cards, Net Banking or Wallets (subject to availability).
          You will choose your payment method securely in the next step.
        </p>
        <p className="payment-secure">🔒 Payments are processed securely by Razorpay. We never store your card details.</p>
      </div>
      {!ready && <p className="field-hint" id="pay-hint">Complete your customer details and delivery address to continue.</p>}
      {status === S.VERIFYING_PAYMENT && <p role="status" className="checkout-loading">Verifying your payment…</p>}
      {(status === S.PAYMENT_CONFIRMING || status === S.PAYMENT_FAILED) && (
        <div role={status === S.PAYMENT_FAILED ? 'alert' : 'status'} className={`payment-status ${status === S.PAYMENT_FAILED ? 'is-failed' : 'is-pending'}`}>
          <p>{getVerifyMessage(payment.outcome?.kind ?? 'unverified')}</p>
          {payment.orderNumber && <p>Order {payment.orderNumber}{payment.amount != null ? ` · ${formatCurrency(payment.amount / 100, payment.currency)}` : ''}</p>}
        </div>
      )}
      {status === S.IDLE && payment?.dismissed && <p role="status" className="field-hint">Payment window closed. Your order is saved; press Pay Now when you are ready.</p>}
      {status === S.IDLE && payment?.error && <p role="alert" className="form-error">{getPaymentErrorMessage(payment.error)}</p>}
      <div className="form-actions">
        <button type="button" className="btn checkout-primary payment-cta" onClick={handleClick} disabled={disabled} aria-describedby={!ready ? 'pay-hint' : undefined}>
          {inFlight || pending ? 'Please wait…' : retrying ? 'Retry Payment' : 'Pay Now'}
        </button>
      </div>
    </section>
  );
}
