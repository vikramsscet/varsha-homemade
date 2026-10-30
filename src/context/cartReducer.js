// Pure cart state. The cart object is the server's response, stored as-is: no totals are derived
// here. `appliedSeq` is the sequence number of the newest response applied; a response with a
// lower number started earlier and is ignored, so stale responses can't overwrite newer ones.
export const initialCartState = {
  cart: null,
  status: 'idle', // idle | loading | ready | error
  error: null,
  pendingOps: [], // { id, type: 'add' | 'update' | 'remove' | 'clear', itemId?, productId? }
  appliedSeq: 0,
  mergeStatus: null, // null | 'merging' | 'merged' | 'failed' (guest-cart merge after login)
  mergeError: null, // { code, retryable } when mergeStatus is 'failed'
};

const withoutOp = (ops, id) => ops.filter((op) => op.id !== id);

function applyCart(state, cart, seq) {
  return seq >= state.appliedSeq
    ? { cart, appliedSeq: seq }
    : { cart: state.cart, appliedSeq: state.appliedSeq };
}

export function cartReducer(state, action) {
  switch (action.type) {
    case 'CART_LOAD_START':
      return { ...state, status: 'loading', error: null };
    case 'CART_LOAD_SUCCESS':
      return { ...state, ...applyCart(state, action.cart, action.seq), status: 'ready', error: null };
    case 'CART_LOAD_FAILURE':
      // Keep a previously confirmed cart usable; only report 'error' when there is none.
      return { ...state, status: state.cart ? 'ready' : 'error', error: action.error };
    case 'MUTATION_START':
      return { ...state, pendingOps: [...state.pendingOps, action.op] };
    case 'MUTATION_SUCCESS':
      return {
        ...state,
        ...applyCart(state, action.cart, action.seq),
        status: 'ready',
        error: null,
        pendingOps: withoutOp(state.pendingOps, action.opId),
      };
    case 'MUTATION_FAILURE':
      return { ...state, error: action.error, pendingOps: withoutOp(state.pendingOps, action.opId) };
    case 'CART_RESET':
      return initialCartState;
    case 'MERGE_START':
      return { ...state, mergeStatus: 'merging', mergeError: null };
    case 'MERGE_SUCCESS':
      return { ...state, mergeStatus: 'merged', mergeError: null };
    case 'MERGE_FAILURE':
      return { ...state, mergeStatus: 'failed', mergeError: action.error };
    case 'MERGE_DISMISS':
      return { ...state, mergeStatus: null, mergeError: null };
    case 'CLEAR_ERROR':
      return { ...state, error: null, status: state.status === 'error' ? 'idle' : state.status };
    default:
      return state;
  }
}
