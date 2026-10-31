import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import CartFeedback from '../../components/CartFeedback';
import Breadcrumbs from '../../components/Breadcrumbs';
import { STALE_CART_CODES, UNCONFIRMED_CHANGE, getCartErrorMessage } from '../../services/cartErrors';
import { formatCurrency } from '../../services/currency';
import './cart.css';

const SUCCESS_MS = 4000;
const MAX_QTY = 99;

function CartItemRow({ item, currency, pending, onQuantity, onRemove }) {
  const name = item.productName || 'Product';
  return (
    <li className={`cart-item ${pending ? 'is-pending' : ''}`} aria-busy={pending}>
      {/* The cart API carries no product images; a styled initial stands in. */}
      <div className="cart-item-image" aria-hidden="true">{name.charAt(0).toUpperCase()}</div>
      <div className="cart-item-info">
        <h3>{name}</h3>
        <p className="cart-item-unit">{formatCurrency(item.unitPrice, currency)} each</p>
      </div>
      <div className="cart-qty" role="group" aria-label={`Quantity of ${name}`}>
        <button
          type="button"
          className="cart-qty-btn"
          aria-label={`Decrease quantity of ${name}`}
          disabled={pending || item.quantity <= 1}
          onClick={() => onQuantity(item.quantity - 1)}
        >
          −
        </button>
        <span className="cart-qty-value">{item.quantity}</span>
        <button
          type="button"
          className="cart-qty-btn"
          aria-label={`Increase quantity of ${name}`}
          disabled={pending || item.quantity >= MAX_QTY}
          onClick={() => onQuantity(item.quantity + 1)}
        >
          +
        </button>
      </div>
      <strong className="cart-item-total">{formatCurrency(item.totalPrice, currency)}</strong>
      <button
        type="button"
        className="cart-item-remove"
        aria-label={`Remove ${name} from cart`}
        disabled={pending}
        onClick={onRemove}
      >
        Remove
      </button>
    </li>
  );
}

export default function CartPage() {
  const {
    cart, status, error, pendingOps, items,
    itemCount, subtotal, discountAmount, taxAmount, totalAmount, currency,
    refreshCart, updateItem, removeItem, clear,
    mergeStatus, mergeError, retryMerge, dismissMergeError,
  } = useCart();
  const [feedback, setFeedback] = useState(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const counter = useRef(0);
  const timer = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  const show = useCallback((type, message) => {
    if (!mounted.current) return;
    clearTimeout(timer.current);
    setFeedback({ id: ++counter.current, type, message }); // replaces, never stacks
    if (type === 'success') {
      timer.current = setTimeout(() => {
        if (mounted.current) setFeedback(null);
      }, SUCCESS_MS);
    }
  }, []);

  // One wrapper for every mutation: mapped error feedback, optional success announcement, and a
  // read-only resync after stale-cart errors. Failed mutations are never replayed.
  const run = useCallback(
    async (action, successMessage) => {
      try {
        await action();
        if (successMessage) show('success', successMessage);
        else if (mounted.current) setFeedback(null);
      } catch (err) {
        show('error', err?.code === 'NETWORK_ERROR' ? UNCONFIRMED_CHANGE : getCartErrorMessage(err));
        if (STALE_CART_CODES.includes(err?.code)) refreshCart().catch(() => {});
      }
    },
    [refreshCart, show]
  );

  const anyPending = pendingOps.length > 0;
  const clearPending = pendingOps.some((op) => op.type === 'clear');
  const isItemPending = (itemId) => clearPending || pendingOps.some((op) => op.itemId === itemId);

  let body;
  if (!cart && status === 'loading') {
    body = (
      <section className="cart-card cart-loading-state">
        <p role="status">Loading your cart…</p>
        <div className="cart-skeleton" aria-hidden="true" />
      </section>
    );
  } else if (!cart && status === 'error') {
    body = (
      <section className="cart-card cart-error-state" role="alert">
        <p>{getCartErrorMessage(error, "We couldn't load your cart. Please try again.")}</p>
        <button type="button" className="cart-retry" onClick={() => refreshCart().catch(() => {})}>
          Retry
        </button>
      </section>
    );
  } else if (!cart || items.length === 0) {
    body = (
      <section className="cart-card cart-empty">
        <p>Your cart is empty.</p>
        <Link className="cart-continue" to="/category/indian-sweets">Continue shopping</Link>
      </section>
    );
  } else {
    body = (
      <div className="cart-layout">
        <section className="cart-card cart-items-card">
          <ul className="cart-items">
            {items.map((item) => (
              <CartItemRow
                key={item.id}
                item={item}
                currency={currency}
                pending={isItemPending(item.id)}
                onQuantity={(quantity) => run(() => updateItem(item.id, quantity))}
                onRemove={() => run(() => removeItem(item.id), 'Item removed from cart.')}
              />
            ))}
          </ul>
          <div className="cart-clear-row">
            {confirmingClear ? (
              <div className="cart-clear-confirm">
                <span>Remove all items from your cart?</span>
                <button
                  type="button"
                  className="cart-clear-yes"
                  disabled={anyPending}
                  onClick={() => {
                    setConfirmingClear(false);
                    run(() => clear(), 'Cart cleared.');
                  }}
                >
                  Yes, clear cart
                </button>
                {/* Focus moves into the confirmation; Cancel first so Enter is non-destructive. */}
                <button type="button" className="cart-clear-cancel" autoFocus onClick={() => setConfirmingClear(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" className="cart-clear" disabled={anyPending} onClick={() => setConfirmingClear(true)}>
                Clear cart
              </button>
            )}
          </div>
        </section>

        {/* Every amount below is the server's; nothing is summed or derived here. */}
        <aside className="cart-card cart-summary" aria-label="Order summary">
          <h2>Order Summary</h2>
          <dl>
            <div className="cart-summary-row"><dt>Subtotal</dt><dd>{formatCurrency(subtotal, currency)}</dd></div>
            <div className="cart-summary-row"><dt>Discount</dt><dd>{formatCurrency(discountAmount, currency)}</dd></div>
            <div className="cart-summary-row"><dt>Tax</dt><dd>{formatCurrency(taxAmount, currency)}</dd></div>
            <div className="cart-summary-row cart-summary-total"><dt>Total</dt><dd>{formatCurrency(totalAmount, currency)}</dd></div>
          </dl>
          <Link to="/checkout" className="cart-checkout">Checkout</Link>
        </aside>
      </div>
    );
  }

  const showCount = cart && items.length > 0;
  return (
    <main className="cart-page container">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Cart' }]} />
      <h1>
        Your Cart
        {showCount && <span className="cart-count"> ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>}
      </h1>
      <CartFeedback feedback={feedback} />
      {mergeStatus === 'failed' && (
        <section className="cart-card cart-merge-notice" role="alert">
          <p>
            {mergeError?.retryable
              ? 'We couldn\u2019t move your guest cart items into your account. Your items are safe \u2014 please try again.'
              : 'We couldn\u2019t move your guest cart items into your account. Sign out and back in to see them.'}
          </p>
          <div className="cart-merge-actions">
            {mergeError?.retryable && (
              <button type="button" className="cart-merge-retry" onClick={() => retryMerge().catch(() => {})}>
                Try again
              </button>
            )}
            <button type="button" className="cart-merge-dismiss" onClick={dismissMergeError}>
              Dismiss
            </button>
          </div>
        </section>
      )}
      {body}
    </main>
  );
}
