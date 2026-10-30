import { useCallback, useEffect, useRef, useState } from 'react';
import { useCart } from '../context/CartContext';
import { GENERIC_ADD_ERROR, STALE_CART_CODES, getAddToCartErrorMessage } from '../services/cartErrors';

const SUCCESS_MS = 4000;

const validId = (id) => typeof id === 'string' && id.trim() !== '';
const validQuantity = (q) => Number.isInteger(q) && q >= 1 && q <= 99;

// Per-control add/update state for product pages. Only ids and a quantity ever reach the cart
// context; the server owns pricing. Failures are never retried here: the customer retries
// explicitly. Both operations resolve with the server cart on success and null on failure.
export function useAddToCart() {
  const { addItem, updateItem, refreshCart } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { id, type: 'success' | 'error', message }
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const timer = useRef(null);
  const counter = useRef(0);

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
    if (type === 'success') timer.current = setTimeout(() => setFeedback(null), SUCCESS_MS);
  }, []);

  const perform = useCallback(
    async (mutate, successMessage) => {
      if (inFlight.current) return null;
      inFlight.current = true;
      clearTimeout(timer.current);
      if (mounted.current) {
        setIsSubmitting(true);
        setFeedback(null);
      }
      try {
        const cart = await mutate();
        show('success', successMessage); // only after the server confirmed
        return cart;
      } catch (error) {
        show('error', getAddToCartErrorMessage(error));
        if (STALE_CART_CODES.includes(error?.code)) refreshCart().catch(() => {}); // read only, no replay
        return null;
      } finally {
        inFlight.current = false;
        if (mounted.current) setIsSubmitting(false);
      }
    },
    [refreshCart, show]
  );

  const add = useCallback(
    (productId, quantity = 1) => {
      if (!validId(productId) || !validQuantity(quantity)) {
        show('error', GENERIC_ADD_ERROR);
        return Promise.resolve(null);
      }
      return perform(() => addItem(productId, quantity), 'Added to cart successfully.');
    },
    [addItem, perform, show]
  );

  // Absolute quantity for an existing cart line (cart item id, never the product id).
  const update = useCallback(
    (itemId, quantity) => {
      if (!validId(itemId) || !validQuantity(quantity)) {
        show('error', GENERIC_ADD_ERROR);
        return Promise.resolve(null);
      }
      return perform(() => updateItem(itemId, quantity), 'Cart updated.');
    },
    [perform, show, updateItem]
  );

  return { add, update, isSubmitting, feedback, dismiss: () => setFeedback(null) };
}
