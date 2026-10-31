import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import { guestCheckoutReducer, initialGuestCheckoutState } from './guestCheckoutReducer';
import * as guestApi from '../services/guestCheckoutApi';
import { toErrorInfo } from '../services/apiErrors';

const GuestCheckoutContext = createContext(null);

// Sessions are never created automatically; the checkout UI calls create() or restore().
export function GuestCheckoutProvider({ children }) {
  const [state, dispatch] = useReducer(guestCheckoutReducer, initialGuestCheckoutState);

  const run = useCallback(async (fn) => {
    dispatch({ type: 'GUEST_REQUEST' });
    try {
      return await fn();
    } catch (error) {
      const info = toErrorInfo(error);
      dispatch(
        guestApi.DEAD_SESSION_CODES.includes(info.code)
          ? { type: 'GUEST_SESSION_EXPIRED', error: info }
          : { type: 'GUEST_FAILURE', error: info }
      );
      throw error;
    }
  }, []);

  const load = (session) => {
    dispatch({ type: 'GUEST_SESSION_LOADED', session });
    return session;
  };

  const value = useMemo(
    () => ({
      ...state,
      create: () => run(async () => load(await guestApi.createGuestSession())),
      // Resolves null (state cleared) when there is no usable session; the caller may create().
      restore: () =>
        run(async () => {
          const session = await guestApi.restoreGuestSession();
          if (session) return load(session);
          dispatch({ type: 'GUEST_SESSION_CLEARED' });
          return null;
        }),
      updateCustomer: (customer) => run(async () => load(await guestApi.updateCustomer(customer))),
      updateDeliveryAddress: (address) => run(async () => load(await guestApi.updateDeliveryAddress(address))),
      remove: () =>
        run(async () => {
          await guestApi.deleteGuestSession();
          dispatch({ type: 'GUEST_SESSION_CLEARED' });
        }),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, run]
  );
  return <GuestCheckoutContext.Provider value={value}>{children}</GuestCheckoutContext.Provider>;
}

export function useGuestCheckout() {
  const ctx = useContext(GuestCheckoutContext);
  if (!ctx) throw new Error('useGuestCheckout must be used within GuestCheckoutProvider');
  return ctx;
}
