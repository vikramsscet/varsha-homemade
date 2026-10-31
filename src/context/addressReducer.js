export const initialAddressState = { addresses: [], loading: false, error: null };

export function addressReducer(state, action) {
  switch (action.type) {
    case 'ADDRESSES_REQUEST':
      return { ...state, loading: true, error: null };
    case 'ADDRESSES_SUCCESS':
      return { addresses: action.addresses, loading: false, error: null };
    case 'ADDRESSES_FAILURE':
      return { ...state, loading: false, error: action.error };
    case 'ADDRESSES_RESET':
      return initialAddressState;
    default:
      return state;
  }
}
