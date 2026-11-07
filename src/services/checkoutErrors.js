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

const GATEWAY = 'Payments are temporarily unavailable. Please try again in a few minutes.';
export function getPaymentErrorMessage(error) {
  const messages = {
    INVALID_REQUEST: 'We could not process your order. Please review your details and try again.',
    ADDRESS_REQUIRED: 'Please select a delivery address.',
    ADDRESS_NOT_FOUND: 'That delivery address no longer exists. Please choose another.',
    CART_NOT_FOUND: "We couldn't find your cart. Please return to your cart and try again.",
    CART_EMPTY: 'Your cart is empty.',
    PRODUCT_UNAVAILABLE: 'One or more items are no longer available. Please review your cart.',
    CART_CHANGED: 'Your cart changed. Please review your order and try again.',
    CART_NOT_ACTIVE: 'This cart can no longer be checked out. Please review your cart.',
    CART_ALREADY_ORDERED: 'This cart has already been ordered.',
    PAYMENT_IN_PROGRESS: 'A payment for this order is already in progress. Please wait a moment.',
    ORDER_TOTAL_INVALID: 'We could not confirm your order total. Please review your cart.',
    CHECKOUT_DETAILS_INCOMPLETE: 'Please complete and save your customer and delivery details.',
    GUEST_SESSION_HAS_NO_CART: 'Your checkout has no cart. Please return to your cart.',
    PRODUCT_SERVICE_UNAVAILABLE: 'We could not check product availability. Please try again shortly.',
    ORDER_NOT_FOUND: "We couldn't find your order. Please try again.",
    ORDER_ALREADY_PAID: 'This order has already been paid.',
    ORDER_NOT_PAYABLE: 'This order can no longer be paid.',
    ORDER_EXPIRED: 'This order has expired. Please start checkout again.',
    PAYMENT_GATEWAY_ERROR: GATEWAY,
    PAYMENT_GATEWAY_UNAVAILABLE: GATEWAY,
    PAYMENT_GATEWAY_INVALID_RESPONSE: GATEWAY,
    PAYMENT_GATEWAY_NOT_CONFIGURED: GATEWAY,
    PAYMENT_SDK_UNAVAILABLE: 'We could not load the payment window. Check your connection and try again.',
  };
  if (['GUEST_SESSION_EXPIRED', 'GUEST_SESSION_NOT_FOUND', 'INVALID_GUEST_SESSION'].includes(error?.code)) return SESSION_EXPIRED_MESSAGE;
  return messages[error?.code] ?? common(error) ?? "Couldn't start your payment. Please try again.";
}
