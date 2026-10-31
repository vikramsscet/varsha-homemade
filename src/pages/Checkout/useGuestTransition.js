import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useGuestCheckout } from '../../context/GuestCheckoutContext';
import { getGuestSession } from '../../services/guestCheckoutStorage';

// Delivery address candidate from the guest session, only when complete enough for POST /addresses.
function candidateFrom(session) {
  const { customer: c, deliveryAddress: a } = session ?? {};
  if (!c?.firstName || !c?.lastName || !c?.phone || !a?.addressLine1 || !a?.city || !a?.state || !a?.postalCode) return null;
  const country = a.countryName ?? a.country;
  if (!country) return null;
  return {
    firstName: c.firstName, lastName: c.lastName, phone: c.phone, country,
    addressLine1: a.addressLine1, addressLine2: a.addressLine2 ?? '', city: a.city, state: a.state, postalCode: a.postalCode,
  };
}

// Guest -> signed-in. Login and the cart merge belong to AuthContext/CartContext; this only
// reacts afterwards. Once the user is authenticated, the cart has loaded and the merge is not
// running (or failed), a leftover guest session is deleted and its token cleared.
// A failed merge keeps the guest session so nothing is lost.
export function useGuestTransition() {
  const { status: authStatus } = useAuth();
  const { status: cartStatus, mergeStatus } = useCart();
  const guest = useGuestCheckout();
  const guestRef = useRef(guest);
  guestRef.current = guest;
  const [guestAddress, setGuestAddress] = useState(null);
  const running = useRef(false);

  const ready = authStatus === 'authenticated' && cartStatus === 'ready' && mergeStatus !== 'merging' && mergeStatus !== 'failed';

  useEffect(() => {
    if (!ready || running.current || !getGuestSession()) return;
    running.current = true;
    const candidate = candidateFrom(guestRef.current.session); // snapshot before the state is cleared
    guestRef.current
      .remove()
      .then(() => setGuestAddress(candidate))
      .catch(() => {}) // a failed delete leaves the (harmless, expiring) token; no retry loop
      .finally(() => { running.current = false; });
  }, [ready]);

  return { guestAddress, dismissGuestAddress: () => setGuestAddress(null) };
}
