import { useCallback, useEffect, useRef, useState } from 'react';
import { useCart } from '../context/CartContext';
import { GENERIC_ADD_ERROR, STALE_CART_CODES, getAddToCartErrorMessage } from '../services/cartErrors';

const SUCCESS_MS = 4000;

// Per-control add-to-cart state. Only productId and quantity ever reach the cart context; the
// server owns pricing. A failed add is never retried here: the customer retries explicitly.
export function useAddToCart() {
  const { addItem, refreshCart } = useCart();
  const [isAdding, setIsAdding] = useState(false);
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

  const add = useCallback(
    async (productId, quantity = 1) => {
      if (inFlight.current) return null;
      if (typeof productId !== 'string' || !productId.trim() || !Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
        show('error', GENERIC_ADD_ERROR);
        return null;
      }
      inFlight.current = true;
      clearTimeout(timer.current);
      if (mounted.current) {
        setIsAdding(true);
        setFeedback(null);
      }
      try {
        const cart = await addItem(productId, quantity);
        show('success', 'Added to cart successfully.'); // only after the server confirmed
        return cart;
      } catch (error) {
        show('error', getAddToCartErrorMessage(error));
        if (STALE_CART_CODES.includes(error?.code)) refreshCart().catch(() => {}); // read only, no replay
        return null;
      } finally {
        inFlight.current = false;
        if (mounted.current) setIsAdding(false);
      }
    },
    [addItem, refreshCart, show]
  );

  return { add, isAdding, feedback, dismiss: () => setFeedback(null) };
}
