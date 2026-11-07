import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../services/currency';

// Read-only view of the server cart: every amount is the backend's, none is computed here.
// `snapshot` (captured when payment started) lets the paid order be shown after the cart refreshes.
export default function OrderSummary({ snapshot }) {
  const live = useCart();
  const { items, subtotal, discountAmount, taxAmount, totalAmount, currency } = snapshot ?? live;
  const money = (n) => formatCurrency(n, currency);
  const delivery = typeof (snapshot ? snapshot.shippingAmount : live.cart?.shippingAmount) === 'number' ? (snapshot ? snapshot.shippingAmount : live.cart.shippingAmount) : null;
  return (
    <aside className="checkout-summary" aria-labelledby="order-summary-title">
      <div className="summary-head">
        <h2 id="order-summary-title">Order summary</h2>
        {!snapshot && <Link to="/cart">Edit cart</Link>}
      </div>
      <ul className="summary-items">
        {items.map((item) => {
          const name = item.productName || 'Product';
          return (
            <li key={item.id} className="summary-item">
              {item.imageUrl
                ? <img className="summary-thumb" src={item.imageUrl} alt={name} />
                : <div className="summary-thumb" aria-hidden="true">{name.charAt(0).toUpperCase()}</div>}
              <div className="summary-item-info">
                <strong>{name}</strong>
                {(item.variantName || item.packageSize) && <span>{item.variantName || item.packageSize}</span>}
                <span>Qty {item.quantity} × {money(item.unitPrice)}</span>
              </div>
              <span className="summary-item-total">{money(item.totalPrice)}</span>
            </li>
          );
        })}
      </ul>
      <dl className="summary-totals">
        <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
        {discountAmount > 0 && <div><dt>Discount</dt><dd>−{money(discountAmount)}</dd></div>}
        {taxAmount > 0 && <div><dt>Tax</dt><dd>{money(taxAmount)}</dd></div>}
        {delivery !== null && <div><dt>Delivery</dt><dd>{money(delivery)}</dd></div>}
        <div className="summary-total"><dt>Total</dt><dd>{money(totalAmount)}</dd></div>
      </dl>
      {!snapshot && <p className="summary-note">Final payable amount is confirmed when your order is placed.</p>}
    </aside>
  );
}
