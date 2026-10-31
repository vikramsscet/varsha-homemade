// Customer-facing text from backend error codes (never the raw payload).
export const SESSION_EXPIRED_MESSAGE = 'Your checkout session expired, please re-enter your details.';
const NETWORK = "We couldn't reach the server. Check your connection and try again.";
const SERVER = 'Something went wrong on our side. Please try again.';
const RATE = 'Too many requests. Please wait a moment and try again.';

function common(error) {
  if (error?.code === 'NETWORK_ERROR') return NETWORK;
  if (error?.status === 429 || error?.code === 'RATE_LIMITED') return RATE;
  if (error?.code === 'INTERNAL_ERROR' || (error?.status ?? 0) >= 500) return SERVER;
  return null;
}

export function getAddressErrorMessage(error) {
  const messages = {
    INVALID_REQUEST: 'Please check the highlighted fields and try again.',
    INVALID_ADDRESS: 'Please check the highlighted fields and try again.',
    UNAUTHORIZED: 'Your session has expired. Please sign in again.',
    ADDRESS_NOT_FOUND: 'That address no longer exists.',
    ADDRESS_LIMIT_REACHED: 'You can save up to 20 addresses. Delete one to add another.',
  };
  return messages[error?.code] ?? common(error) ?? "Couldn't complete that. Please try again.";
}

export function getGuestCheckoutErrorMessage(error) {
  if (['GUEST_SESSION_EXPIRED', 'GUEST_SESSION_NOT_FOUND', 'INVALID_GUEST_SESSION'].includes(error?.code)) {
    return SESSION_EXPIRED_MESSAGE;
  }
  const messages = {
    INVALID_REQUEST: 'Please check the highlighted fields and try again.',
    INVALID_CHECKOUT_DETAILS: 'Please check the highlighted fields and try again.',
    CART_NOT_FOUND: "We couldn't find your cart. Please return to your cart and try again.",
  };
  return messages[error?.code] ?? common(error) ?? "Couldn't save your details. Please try again.";
}
