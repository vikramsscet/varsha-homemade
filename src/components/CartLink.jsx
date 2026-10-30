import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const MAX_BADGE = 99;

// Reads the server-confirmed count from CartContext; never fetches or counts items itself.
export default function CartLink({ onClick }) {
  const { cart, itemCount } = useCart();

  // No confirmed cart yet (idle/loading/failed first load): unknown, so show no count at all.
  const known = Boolean(cart);
  const label = !known
    ? 'Shopping cart'
    : itemCount === 0
      ? 'Shopping cart, empty'
      : `Shopping cart, ${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;

  return (
    <Link to="/cart" className="cart-link" aria-label={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="20" r="1.5" />
        <circle cx="18" cy="20" r="1.5" />
        <path d="M2 3h3l2.7 12.4a1 1 0 0 0 1 .8h9.6a1 1 0 0 0 1-.8L21 7H6" />
      </svg>
      {known && itemCount > 0 && (
        <span className="cart-badge" aria-hidden="true">{itemCount > MAX_BADGE ? `${MAX_BADGE}+` : itemCount}</span>
      )}
    </Link>
  );
}
