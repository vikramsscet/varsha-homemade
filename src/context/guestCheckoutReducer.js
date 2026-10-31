// Holds the session as returned by the backend (never the token) plus its expiry. Cart state is
// not duplicated here; the session only references cartId.
export const initialGuestCheckoutState = {
  session: null,
  customer: null,
  deliveryAddress: null,
  expiresAt: null,
  expired: false, // true after the backend reported the session gone/expired
  loading: false,
  error: null,
};

const fromSession = (session) => ({
  session,
  customer: session.customer ?? null,
  deliveryAddress: session.deliveryAddress ?? null,
  expiresAt: session.expiresAt ?? null,
  expired: false,
  loading: false,
  error: null,
});

export function guestCheckoutReducer(state, action) {
  switch (action.type) {
    case 'GUEST_REQUEST':
      return { ...state, loading: true, error: null };
    case 'GUEST_SESSION_LOADED':
      return fromSession(action.session);
    case 'GUEST_SESSION_EXPIRED':
      return { ...initialGuestCheckoutState, expired: true, error: action.error ?? null };
    case 'GUEST_SESSION_CLEARED':
      return initialGuestCheckoutState;
    case 'GUEST_FAILURE':
      return { ...state, loading: false, error: action.error };
    default:
      return state;
  }
}
