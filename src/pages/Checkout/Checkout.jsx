import { Link } from 'react-router-dom';
import Breadcrumbs from '../../components/Breadcrumbs';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import GuestCheckout from './GuestCheckout';
import AuthCheckout from './AuthCheckout';
import PaymentResult from './PaymentResult';
import OrderSummary from './OrderSummary';
import { usePayment } from './usePayment';
import { useGuestTransition } from './useGuestTransition';
import './checkout.css';

export default function CheckoutPage() {
  const { status: authStatus } = useAuth();
  const { status: cartStatus, items } = useCart();
  const { guestAddress, dismissGuestAddress } = useGuestTransition();
  const { payment, pay } = usePayment();
  const authed = authStatus === 'authenticated';
  const crumbs = [{ label: 'Home', to: '/' }, { label: 'Cart', to: '/cart' }, { label: 'Checkout' }];

  const loading = authStatus === 'loading' || cartStatus === 'loading' || (authed && cartStatus === 'idle');
  let body;
  if (payment.status === 'PAYMENT_SUCCESS') {
    // Backend-confirmed payment: the refreshed (empty) cart must not replace this view.
    body = <PaymentResult payment={payment} />;
  } else if (loading) {
    body = <p role="status" className="checkout-loading">Loading checkout…</p>;
  } else if (items.length === 0) {
    body = (
      <div className="checkout-empty">
        <h2>Your cart is empty</h2>
        <p>Add something delicious before checking out.</p>
        <Link className="btn checkout-primary" to="/category/indian-sweets">Continue shopping</Link>
      </div>
    );
  } else {
    body = (
      <div className="checkout-layout">
        <div className="checkout-main">
          {authed ? <AuthCheckout onPayNow={pay} payment={payment} guestAddress={guestAddress} onGuestAddressDone={dismissGuestAddress} /> : <GuestCheckout onPayNow={pay} payment={payment} />}
        </div>
        <OrderSummary />
      </div>
    );
  }

  return (
    <main className="checkout-page container">
      <Breadcrumbs items={crumbs} />
      <h1>Checkout</h1>
      {body}
    </main>
  );
}
