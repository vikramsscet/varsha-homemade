import { PAYMENT_STATUS as S } from '../services/paymentResult';

// Payment attempt state. Holds no secrets: the Razorpay key id is public; the key secret, the
// signature and guest tokens are never kept here.
export const initialPaymentState = {
  status: S.IDLE,
  dismissed: false, // modal closed without paying: not a failure, not an error
  orderId: null,
  orderNumber: null,
  addressId: null,
  paymentId: null,
  razorpayOrderId: null,
  razorpayKeyId: null,
  amount: null, // paise, from the backend
  currency: null,
  attemptNumber: null,
  paymentStatus: null,
  result: null, // backend verify body (paid / pending)
  paidAt: null,
  outcome: null, // { kind, retryable } for FAILED / CONFIRMING issues
  snapshot: null, // order summary captured when payment started (cart is refreshed after success)
  error: null, // request-level error before checkout opened
};

export function paymentReducer(state, action) {
  switch (action.type) {
    case 'STATUS':
      return { ...state, status: action.status, dismissed: false, error: null, outcome: null, snapshot: action.snapshot ?? state.snapshot };
    case 'ORDER_CREATED':
      return { ...state, orderId: action.order.id, orderNumber: action.order.orderNumber, addressId: action.addressId ?? null };
    case 'PAYMENT_CREATED': {
      const p = action.payment;
      return {
        ...state, paymentId: p.paymentId, razorpayOrderId: p.razorpayOrderId, razorpayKeyId: p.razorpayKeyId,
        amount: p.amount, currency: p.currency, attemptNumber: p.attemptNumber, paymentStatus: p.status,
      };
    }
    case 'DISMISSED':
      return { ...state, status: S.IDLE, dismissed: true };
    case 'VERIFIED':
      return {
        ...state, status: action.status, result: action.result, outcome: null, error: null,
        paymentStatus: action.result?.paymentStatus ?? state.paymentStatus,
        paidAt: action.status === S.PAYMENT_SUCCESS ? action.at : state.paidAt,
      };
    case 'VERIFY_ISSUE':
      return { ...state, status: action.status, outcome: action.outcome, error: action.error };
    case 'ERROR': // order / payment creation failed, nothing was charged
      return { ...state, status: S.IDLE, error: action.error };
    case 'RESET':
      return initialPaymentState;
    default:
      return state;
  }
}
