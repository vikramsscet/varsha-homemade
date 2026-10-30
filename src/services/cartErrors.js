export const GENERIC_ADD_ERROR = "Couldn't add the item. Please try again.";

const MESSAGES = {
  INVALID_REQUEST: "We couldn't add that item. Please check the quantity and try again.",
  INVALID_ANONYMOUS_CART_ID: 'Your cart session was invalid and has been reset. Please try adding the item again.',
  UNAUTHORIZED: 'Your session has expired. Please sign in again.',
  CART_NOT_FOUND: "We couldn't find your cart. Please try again.",
  CART_NOT_ACTIVE: 'Your cart is no longer active. Please try again.',
  PRODUCT_NOT_FOUND: 'This product is no longer available.',
  CART_ITEM_NOT_FOUND: "Couldn't update your cart. Please try again.",
  QUANTITY_LIMIT_EXCEEDED: 'You can add at most 99 of each item.',
  CART_ITEM_LIMIT_EXCEEDED: 'Your cart has reached its limit of different products. Remove an item to add another.',
};
// PRODUCT_SERVICE_* and unknown codes fall through to the caller's generic fallback.

export const GENERIC_CART_ERROR = "Couldn't update your cart. Please try again.";

// Customer-facing text from the backend error code (never the raw message or payload).
export function getCartErrorMessage(error, fallback = GENERIC_CART_ERROR) {
  if (error?.status === 429) return 'Too many requests. Please wait a moment and try again.';
  return MESSAGES[error?.code] ?? fallback;
}

export function getAddToCartErrorMessage(error) {
  return getCartErrorMessage(error, GENERIC_ADD_ERROR);
}

// After these the cached cart is stale; the customer's explicit retry needs a fresh one.
export const STALE_CART_CODES = ['CART_NOT_FOUND', 'CART_NOT_ACTIVE'];
