import { useCallback, useReducer, useRef } from 'react';
import { createOrder, createRazorpayOrder, verifyPayment } from '../../services/paymentApi';
import { loadRazorpay } from '../../services/razorpayLoader';
import { toErrorInfo } from '../../services/apiErrors';
import { useCart } from '../../context/CartContext';
import { PAYMENT_STATUS as S, RECHECK_CODES, classifySuccessBody, classifyVerifyError } from '../../services/paymentResult';
import { clearPaymentRef, getPaymentRef, updatePaymentRef } from '../../services/paymentRefStorage';
import { clearGuestOrderToken } from '../../services/guestOrderStorage';
import { tokenStorage } from '../../services/tokenStorage';
import { initialPaymentState, paymentReducer, restoreState } from '../../context/paymentReducer';

const customerType = () => (tokenStorage.get() ? 'USER' : 'GUEST');
// Order-creation failures after which the order can never be paid: stop recovering it.
const UNRECOVERABLE = ['ORDER_EXPIRED', 'ORDER_ALREADY_PAID', 'ORDER_NOT_PAYABLE', 'ORDER_NOT_FOUND'];

const newKey = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

// Order -> Razorpay order -> Standard Checkout -> backend verification. Success is only reported
// after /payments/verify succeeds. A dismissed modal keeps the order/payment for a later retry.
export function usePayment() {
  const { items, subtotal, discountAmount, taxAmount, totalAmount, currency, cart, refreshCart } = useCart();
  const [state, dispatch] = useReducer(paymentReducer, initialPaymentState, () => restoreState(getPaymentRef(), customerType()));
  const ref = useRef(state);
  ref.current = state;
  const busy = useRef(false);
  const idemKey = useRef(getPaymentRef()?.pendingKey ?? null); // one key per logical order creation; reused across network retries

  const snapshot = () => ({ items, subtotal, discountAmount, taxAmount, totalAmount, currency, shippingAmount: cart?.shippingAmount });
  const lastArgs = useRef(null);
  const cartActions = useRef({});
  cartActions.current = { refreshCart };
  const fail = (e) => dispatch({ type: 'ERROR', error: toErrorInfo(e) });

  const pay = useCallback(async ({ addressId, prefill } = {}) => {
    if (busy.current || ref.current.status === S.PAYMENT_CONFIRMING || ref.current.status === S.VERIFYING_PAYMENT || ref.current.status === S.PAYMENT_SUCCESS) return;
    busy.current = true;
    lastArgs.current = { addressId, prefill };
    try {
      let { orderId, orderNumber, addressId: orderAddress } = ref.current;
      // Reuse the existing internal order unless the chosen address changed.
      if (!orderId || (addressId && orderAddress !== addressId)) {
        dispatch({ type: 'STATUS', status: S.CREATING_ORDER, snapshot: ref.current.snapshot ?? snapshot() });
        idemKey.current = idemKey.current ?? newKey();
        updatePaymentRef({ pendingKey: idemKey.current, customerType: customerType() }); // survives a refresh mid-request
        const order = await createOrder({ addressId, idempotencyKey: idemKey.current });
        dispatch({ type: 'ORDER_CREATED', order, addressId });
        updatePaymentRef({ orderId: order.id, orderNumber: order.orderNumber, customerType: customerType(), addressId: addressId ?? null, pendingKey: null });
        idemKey.current = null;
        orderId = order.id;
        orderNumber = order.orderNumber;
      }
      dispatch({ type: 'STATUS', status: S.CREATING_PAYMENT });
      const payment = await createRazorpayOrder(orderId);
      dispatch({ type: 'PAYMENT_CREATED', payment }); // payment.reused === true is an open attempt: same flow
      updatePaymentRef({ paymentId: payment.paymentId, amount: payment.amount, currency: payment.currency, status: 'IN_PROGRESS' });

      let Razorpay;
      try {
        Razorpay = await loadRazorpay();
      } catch {
        throw Object.assign(new Error('sdk'), { code: 'PAYMENT_SDK_UNAVAILABLE' });
      }
      dispatch({ type: 'STATUS', status: S.PAYMENT_IN_PROGRESS });

      await new Promise((resolve) => {
        const rzp = new Razorpay({
          key: payment.razorpayKeyId,
          order_id: payment.razorpayOrderId,
          amount: payment.amount, // backend-provided, in paise
          currency: payment.currency,
          name: 'Varsha Homemade',
          description: `Order ${orderNumber}`,
          prefill,
          theme: { color: '#7a1f2b' },
          handler: async (response) => {
            dispatch({ type: 'STATUS', status: S.VERIFYING_PAYMENT });
            const body = {
              internalPaymentId: payment.paymentId,
              orderId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            };
            const apply = async (result) => {
              const status = classifySuccessBody(result);
              dispatch({ type: 'VERIFIED', status, result, at: new Date().toISOString() });
              // Cart is refreshed only after backend-confirmed payment.
              if (status === S.PAYMENT_SUCCESS) {
                // Lifecycle complete: recovery data is no longer needed.
                clearPaymentRef();
                clearGuestOrderToken();
                cartActions.current.refreshCart?.().catch(() => {});
              } else updatePaymentRef({ status: 'CONFIRMING' });
            };
            try {
              await apply(await verifyPayment(body));
            } catch (e) {
              let err = e;
              // Already processed / already paid: ask again for the existing status (once).
              if (RECHECK_CODES.includes(e?.code)) {
                try { await apply(await verifyPayment(body)); err = null; } catch (e2) { err = e2; }
              }
              if (err) {
                const outcome = classifyVerifyError(err);
                updatePaymentRef({ status: outcome.status === S.PAYMENT_CONFIRMING ? 'CONFIRMING' : 'FAILED' });
              }
              if (err) dispatch({ type: 'VERIFY_ISSUE', ...(({ status, ...outcome }) => ({ status, outcome }))(classifyVerifyError(err)), error: toErrorInfo(err) });
            }
            resolve();
          },
          modal: {
            // Closing the popup is not a failure; order and payment attempt are kept.
            ondismiss: () => {
              // Closing after a payment was submitted is handled by the verify flow.
              if (ref.current.status !== S.PAYMENT_IN_PROGRESS) return; // verify flow resolves itself
              dispatch({ type: 'DISMISSED' });
              resolve();
            },
          },
        });
        rzp.open();
      });
    } catch (e) {
      if (e?.code !== 'NETWORK_ERROR') {
        idemKey.current = null; // only a network retry reuses the key
        updatePaymentRef({ pendingKey: null });
      }
      if (UNRECOVERABLE.includes(e?.code)) {
        clearPaymentRef();
        clearGuestOrderToken();
        dispatch({ type: 'FORGET_ORDER' });
      }
      fail(e);
    } finally {
      busy.current = false;
    }
  }, []);

  const retry = useCallback(() => pay(lastArgs.current ?? {}), [pay]);
  return { payment: state, pay, retry };
}
