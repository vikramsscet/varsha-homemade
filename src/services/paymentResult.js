// Classifies a /payments/verify outcome. The backend response is the only source of truth:
// success requires paid === true. Pure functions; no I/O.
export const PAYMENT_STATUS = {
  IDLE: 'IDLE',
  CREATING_ORDER: 'CREATING_ORDER',
  CREATING_PAYMENT: 'CREATING_PAYMENT',
  PAYMENT_IN_PROGRESS: 'PAYMENT_IN_PROGRESS',
  VERIFYING_PAYMENT: 'VERIFYING_PAYMENT',
  PAYMENT_CONFIRMING: 'PAYMENT_CONFIRMING',
  PAYMENT_SUCCESS: 'PAYMENT_SUCCESS',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
};

// 200/202 body -> success only when paid === true, otherwise still confirming.
export const classifySuccessBody = (body) => (body?.paid === true ? PAYMENT_STATUS.PAYMENT_SUCCESS : PAYMENT_STATUS.PAYMENT_CONFIRMING);

const CONFIRMING_CODES = ['PAYMENT_NOT_VERIFIABLE', 'NETWORK_ERROR', 'RATE_LIMITED'];
// Re-ask the backend (verify is idempotent) for the existing payment/order status.
export const RECHECK_CODES = ['PAYMENT_ALREADY_PROCESSED', 'ORDER_ALREADY_PAID'];

// Verification error -> { status, kind, retryable }. `retryable` only for a genuine failed payment.
export function classifyVerifyError(error) {
  const code = error?.code;
  if (code === 'PAYMENT_FAILED') return { status: PAYMENT_STATUS.PAYMENT_FAILED, kind: 'failed', retryable: true };
  if (code === 'PAYMENT_REFUNDED') return { status: PAYMENT_STATUS.PAYMENT_FAILED, kind: 'refunded', retryable: false };
  if (CONFIRMING_CODES.includes(code) || code?.startsWith('PAYMENT_GATEWAY_') || (error?.status ?? 0) >= 500) {
    return { status: PAYMENT_STATUS.PAYMENT_CONFIRMING, kind: 'unverified', retryable: false };
  }
  if (RECHECK_CODES.includes(code)) return { status: PAYMENT_STATUS.PAYMENT_CONFIRMING, kind: 'unverified', retryable: false };
  if (['INVALID_SIGNATURE', 'RAZORPAY_ORDER_MISMATCH'].includes(code)) return { status: PAYMENT_STATUS.PAYMENT_FAILED, kind: 'verification', retryable: false };
  if (['PAYMENT_NOT_FOUND', 'PAYMENT_MISMATCH', 'PAYMENT_CONFLICT'].includes(code)) return { status: PAYMENT_STATUS.PAYMENT_FAILED, kind: 'support', retryable: false };
  if (code === 'ORDER_NOT_PAYABLE') return { status: PAYMENT_STATUS.PAYMENT_FAILED, kind: 'not_payable', retryable: false };
  return { status: PAYMENT_STATUS.PAYMENT_FAILED, kind: 'error', retryable: false };
}

const SUPPORT = 'If money was deducted, please contact support with your order number.';
export function getVerifyMessage(kind) {
  return ({
    failed: 'Your payment could not be completed. You have not been charged, or any amount will be refunded. You can try again.',
    refunded: 'This payment has been refunded.',
    unverified: 'We have received your payment response and are confirming the transaction. Please wait. Do not pay again.',
    verification: `We could not verify your payment. ${SUPPORT}`,
    support: `We could not match your payment. ${SUPPORT}`,
    not_payable: 'This order can no longer be paid. Please return to your cart.',
    error: `We could not confirm your payment. ${SUPPORT}`,
  })[kind] ?? `We could not confirm your payment. ${SUPPORT}`;
}
