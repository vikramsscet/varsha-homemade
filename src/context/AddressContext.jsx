import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import { useAuth } from './AuthContext';
import { addressReducer, initialAddressState } from './addressReducer';
import * as addressApi from '../services/addressApi';
import { toErrorInfo } from '../services/apiErrors';

const AddressContext = createContext(null);

// Address book for signed-in users. Nothing is fetched until a consumer calls refresh().
// Mutations refetch the list (the server owns default/ordering) and rethrow errors for the UI.
export function AddressProvider({ children }) {
  const [state, dispatch] = useReducer(addressReducer, initialAddressState);
  const { status } = useAuth();

  useEffect(() => {
    if (status === 'unauthenticated') dispatch({ type: 'ADDRESSES_RESET' });
  }, [status]);

  const refresh = useCallback(async () => {
    dispatch({ type: 'ADDRESSES_REQUEST' });
    try {
      const addresses = await addressApi.getAddresses();
      dispatch({ type: 'ADDRESSES_SUCCESS', addresses });
      return addresses;
    } catch (error) {
      dispatch({ type: 'ADDRESSES_FAILURE', error: toErrorInfo(error) });
      throw error;
    }
  }, []);

  const mutate = useCallback(
    (fn) => async (...args) => {
      try {
        const result = await fn(...args);
        await refresh().catch(() => {});
        return result;
      } catch (error) {
        dispatch({ type: 'ADDRESSES_FAILURE', error: toErrorInfo(error) });
        throw error;
      }
    },
    [refresh]
  );

  const value = useMemo(
    () => ({
      ...state,
      refresh,
      createAddress: mutate(addressApi.createAddress),
      updateAddress: mutate(addressApi.updateAddress),
      deleteAddress: mutate(addressApi.deleteAddress),
      setDefaultAddress: mutate(addressApi.setDefaultAddress),
    }),
    [state, refresh, mutate]
  );
  return <AddressContext.Provider value={value}>{children}</AddressContext.Provider>;
}

export function useAddresses() {
  const ctx = useContext(AddressContext);
  if (!ctx) throw new Error('useAddresses must be used within AddressProvider');
  return ctx;
}
