import { tokenStorage } from '../services/tokenStorage';

export function initialAuthState() {
  const token = tokenStorage.get();
  return { user: null, token, status: token ? 'loading' : 'unauthenticated', error: null };
}

export function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return { user: action.user, token: action.token, status: 'authenticated', error: null };
    case 'USER_LOADED':
      return { ...state, user: action.user, status: 'authenticated', error: null };
    case 'SIGNED_OUT':
      return { user: null, token: null, status: 'unauthenticated', error: null };
    case 'FAILED':
      // Transient failure (network/5xx): signed out in the UI, stored token kept for next load.
      return { user: null, token: null, status: 'unauthenticated', error: action.error };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
}
