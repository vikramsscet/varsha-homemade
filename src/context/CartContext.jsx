import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { useAuth } from './AuthContext';
import { cartReducer, initialCartState } from './cartReducer';
import * as cartApi from '../services/cartApi';
import { ApiError } from '../services/apiClient';
import { clearAnonymousCartId, getAnonymousCartId } from '../services/anonCartStorage';
import { tokenStorage } from '../services/tokenStorage';

const CartContext = createContext(null);

const MIN_QTY = 1;
const MAX_QTY = 99;
const NO_ITEMS = [];

// Merge errors meaning the guest cart is gone, already merged, or its id is unusable: that
// anonymous id can never produce a successful merge again, so it is retired. This also makes a
// manual retry after an ambiguous network failure safe: if the first merge actually reached the
// backend, the guest cart is no longer active and the retry lands here instead of merging twice.
const MERGE_DEAD_END_CODES = ['CART_NOT_FOUND', 'CART_NOT_ACTIVE', 'INVALID_ANONYMOUS_CART_ID'];

const invalid = (message) => new ApiError({ status: 0, code: 'INVALID_REQUEST', message });
const cancelled = () => new ApiError({ status: 0, code: 'CART_OPERATION_CANCELLED', message: 'Cart identity changed' });

function assertId(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw invalid(`${name} is required`);
}
function assertQuantity(quantity) {
  if (!Number.isInteger(quantity) || quantity < MIN_QTY || quantity > MAX_QTY) {
    throw invalid(`quantity must be an integer between ${MIN_QTY} and ${MAX_QTY}`);
  }
}

// Keeps status/code/message/details for the UI; never includes request data or credentials.
function toErrorInfo(error) {
  return {
    status: error?.status ?? 0,
    code: error?.code ?? 'UNKNOWN_ERROR',
    message: error?.message ?? 'Something went wrong',
    details: error?.details,
  };
}

// Finds the active cart for the current identity, creating one only when none exists.
async function loadActiveCart() {
  const token = tokenStorage.get();
  // A brand-new guest has no identity to look up, so there is nothing to fetch yet.
  if (!token && !getAnonymousCartId()) return cartApi.createCart();
  try {
    return await cartApi.getCurrentCart();
  } catch (error) {
    if (error?.code === 'CART_NOT_FOUND') return cartApi.createCart();
    if (error?.code === 'INVALID_ANONYMOUS_CART_ID' && !token) {
      clearAnonymousCartId();
      return cartApi.createCart();
    }
    throw error; // includes 401: the global handler owns the session, we never retry as a guest
  }
}

// autoLoad: once auth settles, load the cart for an identity that already has one (a token or a
// stored anonymous id) so the UI can show it. Fresh visitors trigger no request and no cart.
export function CartProvider({ children, autoLoad = true }) {
  const auth = useAuth();
  const [state, dispatch] = useReducer(cartReducer, initialCartState);

  // 'pending' while auth bootstraps; otherwise the identity a loaded cart must belong to.
  const identity =
    auth.status === 'authenticated' ? `user:${auth.user?.id}` : auth.status === 'unauthenticated' ? 'anon' : 'pending';
  const currentIdentityRef = useRef(identity);
  currentIdentityRef.current = identity;
  const authStatusRef = useRef(auth.status);
  authStatusRef.current = auth.status;

  const cartIdentityRef = useRef(identity); // identity the refs below were built for
  const generationRef = useRef(0); // bumped on identity change; older async work is discarded
  const cartRef = useRef(null); // last confirmed cart
  const seqRef = useRef(0);
  const appliedSeqRef = useRef(0);
  const initRef = useRef(null); // in-flight load, shared by concurrent callers
  const queueRef = useRef(Promise.resolve()); // mutations run strictly one at a time
  const opIdRef = useRef(0);
  const waitersRef = useRef([]);
  const pendingMergeRef = useRef(null); // { guestCartId } armed on the guest -> user transition
  const failedMergeRef = useRef(null); // kept only for an explicit, user-initiated retry

  const waitForAuth = useCallback(() => {
    if (authStatusRef.current !== 'loading') return Promise.resolve();
    return new Promise((resolve) => waitersRef.current.push(resolve));
  }, []);

  useEffect(() => {
    if (auth.status !== 'loading') waitersRef.current.splice(0).forEach((resolve) => resolve());
  }, [auth.status]);

  // Drops everything loaded under a previous identity, and arms the guest-cart merge when a
  // guest with a stored anonymous id signs in. The anonymous id itself is never cleared by login
  // or logout: only a committed merge, a confirmed-empty guest cart, or a dead-end merge error
  // retires it, so a failed merge can always be recovered by signing out (the guest cart returns).
  const syncIdentity = useCallback(() => {
    const next = currentIdentityRef.current;
    const prev = cartIdentityRef.current;
    if (prev === next) return;
    cartIdentityRef.current = next;
    if (prev === 'pending') return; // nothing was loaded before auth settled
    const previousCart = cartRef.current;
    generationRef.current += 1;
    cartRef.current = null;
    appliedSeqRef.current = 0;
    initRef.current = null;
    queueRef.current = Promise.resolve();
    pendingMergeRef.current = null;
    failedMergeRef.current = null;
    dispatch({ type: 'CART_RESET' });
    if (prev === 'anon' && next.startsWith('user:') && getAnonymousCartId()) {
      if (previousCart && previousCart.itemCount === 0) {
        clearAnonymousCartId(); // confirmed empty: nothing to merge, retire the guest identity
      } else if (previousCart) {
        pendingMergeRef.current = { guestCartId: previousCart.id };
      } else {
        // The guest cart's database id is unknown (its load never finished), so no merge is
        // possible now. The id is kept: signing out brings the guest cart back.
        dispatch({ type: 'MERGE_FAILURE', error: { code: 'MERGE_SOURCE_UNAVAILABLE', retryable: false } });
      }
    }
  }, []);

  useEffect(() => {
    syncIdentity();
  }, [identity, syncIdentity]);

  const confirm = useCallback((cart, seq, generation) => {
    if (generation !== generationRef.current) throw cancelled();
    if (seq >= appliedSeqRef.current) {
      appliedSeqRef.current = seq;
      cartRef.current = cart;
    }
  }, []);

  // Shared by ensureCart and refreshCart: one in-flight load at a time. The first authenticated
  // load after a guest signs in performs the merge, so an ordinary user-cart load can never race
  // with (or overwrite) the merge result - they are the same deduplicated operation.
  const load = useCallback(() => {
    if (initRef.current) return initRef.current;
    const generation = generationRef.current;
    dispatch({ type: 'CART_LOAD_START' });
    const seq = ++seqRef.current;
    const promise = (async () => {
      try {
        const pendingMerge = tokenStorage.get() ? pendingMergeRef.current : null;
        if (pendingMerge) {
          pendingMergeRef.current = null; // one attempt per arming; a retry re-arms explicitly
          dispatch({ type: 'MERGE_START' });
          try {
            const merged = await cartApi.mergeCart(pendingMerge.guestCartId);
            confirm(merged, seq, generation);
            // Only now - after the merged cart is committed to the context - retire the guest id.
            clearAnonymousCartId();
            dispatch({ type: 'CART_LOAD_SUCCESS', cart: merged, seq });
            dispatch({ type: 'MERGE_SUCCESS' });
            return merged;
          } catch (mergeError) {
            if (generation !== generationRef.current) throw mergeError; // identity changed mid-merge
            const code = mergeError?.code;
            if (MERGE_DEAD_END_CODES.includes(code)) {
              clearAnonymousCartId(); // gone, already merged, or invalid: never mergeable again
            } else if (code !== 'MERGE_IDENTITY_MISSING') {
              failedMergeRef.current = pendingMerge;
              dispatch({ type: 'MERGE_FAILURE', error: { code: code ?? 'UNKNOWN_ERROR', retryable: true } });
            }
            // Fall through: the authenticated cart still loads, so login itself never breaks and
            // the guest cart is never shown as the user's cart.
          }
        }
        const cart = await loadActiveCart();
        confirm(cart, seq, generation);
        dispatch({ type: 'CART_LOAD_SUCCESS', cart, seq });
        return cart;
      } catch (error) {
        if (generation === generationRef.current && error?.code !== 'CART_OPERATION_CANCELLED') {
          dispatch({ type: 'CART_LOAD_FAILURE', error: toErrorInfo(error) });
        }
        throw error;
      }
    })();
    initRef.current = promise;
    const release = () => {
      if (initRef.current === promise) initRef.current = null; // failures stay retryable
    };
    promise.then(release, release);
    return promise;
  }, [confirm]);

  const ensureCart = useCallback(async () => {
    await waitForAuth();
    syncIdentity();
    if (cartRef.current) return cartRef.current;
    return load();
  }, [load, syncIdentity, waitForAuth]);

  useEffect(() => {
    if (!autoLoad || identity === 'pending') return;
    if (!tokenStorage.get() && !getAnonymousCartId()) return;
    ensureCart().catch(() => {}); // failures are recorded in state; no automatic retry
  }, [identity, autoLoad, ensureCart]);

  const refreshCart = useCallback(async () => {
    await waitForAuth();
    syncIdentity();
    return load();
  }, [load, syncIdentity, waitForAuth]);

  // Explicit, user-initiated retry of a failed guest-cart merge. Never runs automatically.
  const retryMerge = useCallback(async () => {
    const failed = failedMergeRef.current;
    if (!failed || !tokenStorage.get() || !getAnonymousCartId()) return null;
    failedMergeRef.current = null;
    pendingMergeRef.current = failed;
    return load();
  }, [load]);

  const dismissMergeError = useCallback(() => dispatch({ type: 'MERGE_DISMISS' }), []);

  // Queues a mutation behind earlier ones; each runs only after the previous response is applied,
  // so responses can't arrive out of order. Failed mutations are never replayed.
  const runMutation = useCallback(
    (meta, call) => {
      syncIdentity();
      const generation = generationRef.current;
      const id = ++opIdRef.current;
      dispatch({ type: 'MUTATION_START', op: { id, ...meta } });

      const task = queueRef.current.then(async () => {
        if (generation !== generationRef.current) throw cancelled();
        try {
          const current = await ensureCart();
          if (generation !== generationRef.current) throw cancelled();
          const seq = ++seqRef.current;
          const cart = await call(current.id);
          confirm(cart, seq, generation);
          dispatch({ type: 'MUTATION_SUCCESS', opId: id, cart, seq });
          return cart;
        } catch (error) {
          if (generation === generationRef.current) {
            dispatch({ type: 'MUTATION_FAILURE', opId: id, error: toErrorInfo(error) });
            if (error?.code === 'CART_ITEM_NOT_FOUND') {
              await refreshCart().catch(() => {}); // resync, then still surface the original error
            } else if (error?.code === 'INVALID_ANONYMOUS_CART_ID' && !tokenStorage.get()) {
              clearAnonymousCartId();
              cartRef.current = null; // next ensureCart starts a fresh guest cart
            }
          }
          throw error;
        }
      });
      queueRef.current = task.catch(() => {});
      return task;
    },
    [confirm, ensureCart, refreshCart, syncIdentity]
  );

  const addItem = useCallback(
    async (productId, quantity = 1) => {
      assertId(productId, 'productId');
      assertQuantity(quantity);
      return runMutation({ type: 'add', productId }, (cartId) => cartApi.addItem(cartId, { productId, quantity }));
    },
    [runMutation]
  );

  const updateItem = useCallback(
    async (itemId, quantity) => {
      assertId(itemId, 'itemId');
      assertQuantity(quantity);
      return runMutation({ type: 'update', itemId }, (cartId) => cartApi.updateItem(cartId, itemId, quantity));
    },
    [runMutation]
  );

  const removeItem = useCallback(
    async (itemId) => {
      assertId(itemId, 'itemId');
      return runMutation({ type: 'remove', itemId }, (cartId) => cartApi.removeItem(cartId, itemId));
    },
    [runMutation]
  );

  const clear = useCallback(() => runMutation({ type: 'clear' }, (cartId) => cartApi.clearCart(cartId)), [runMutation]);

  const dismissError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  const value = useMemo(() => {
    const { cart } = state;
    return {
      cart: state.cart,
      status: state.status,
      error: state.error,
      pendingOps: state.pendingOps,
      mergeStatus: state.mergeStatus,
      mergeError: state.mergeError,
      // Straight from the server cart; zero/empty defaults only while there is no cart.
      items: cart?.items ?? NO_ITEMS,
      itemCount: cart?.itemCount ?? 0,
      subtotal: cart?.subtotal ?? 0,
      discountAmount: cart?.discountAmount ?? 0,
      taxAmount: cart?.taxAmount ?? 0,
      totalAmount: cart?.totalAmount ?? 0,
      currency: cart?.currency ?? 'INR',
      ensureCart,
      refreshCart,
      addItem,
      updateItem,
      removeItem,
      clear,
      dismissError,
      retryMerge,
      dismissMergeError,
    };
  }, [state, ensureCart, refreshCart, addItem, updateItem, removeItem, clear, dismissError, retryMerge, dismissMergeError]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
